import * as functions from 'firebase-functions';
import { PubSub } from '@google-cloud/pubsub';
import { withAuthAndAudit } from '../_shared/middleware';

const pubsub = new PubSub();
const PROJECT = process.env.GCLOUD_PROJECT ?? 'cicas-os';

export const publishEvent = withAuthAndAudit(async (req, res) => {
  const { topic, payload, tenantId } = req.body as {
    topic: string;
    payload: unknown;
    tenantId?: string;
  };

  if (!topic || payload === undefined) {
    res.status(400).json({ error: 'topic and payload are required' });
    return;
  }

  const topicName = `projects/${PROJECT}/topics/${topic}`;
  const message = {
    topic,
    payload,
    tenantId,
    publishedAt: new Date().toISOString(),
    messageId: crypto.randomUUID(),
  };

  const data = Buffer.from(JSON.stringify(message));
  const attributes: Record<string, string> = { topic };
  if (tenantId) attributes['tenantId'] = tenantId;

  const msgId = await pubsub.topic(topicName).publishMessage({ data, attributes });

  functions.logger.info('publishEvent', { topic, tenantId, msgId });
  res.json({ success: true, messageId: msgId });
});
