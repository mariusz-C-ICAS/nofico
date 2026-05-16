import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { withAuthAndAudit } from '../_shared/middleware';

export const fcmTopicSubscribe = withAuthAndAudit(async (req, res) => {
  const { fcmToken, topic } = req.body as { fcmToken: string; topic: string };

  if (!fcmToken || !topic) {
    res.status(400).json({ error: 'fcmToken and topic are required' });
    return;
  }

  const response = await admin.messaging().subscribeToTopic([fcmToken], topic);

  if (response.failureCount > 0) {
    const err = response.errors[0]?.error?.message ?? 'subscribe failed';
    functions.logger.error('fcmTopicSubscribe error', { topic, err });
    res.status(400).json({ error: err });
    return;
  }

  functions.logger.info('fcmTopicSubscribe', { topic });
  res.json({ success: true, successCount: response.successCount });
});

export const fcmTopicUnsubscribe = withAuthAndAudit(async (req, res) => {
  const { fcmToken, topic } = req.body as { fcmToken: string; topic: string };

  if (!fcmToken || !topic) {
    res.status(400).json({ error: 'fcmToken and topic are required' });
    return;
  }

  const response = await admin.messaging().unsubscribeFromTopic([fcmToken], topic);

  if (response.failureCount > 0) {
    const err = response.errors[0]?.error?.message ?? 'unsubscribe failed';
    functions.logger.error('fcmTopicUnsubscribe error', { topic, err });
    res.status(400).json({ error: err });
    return;
  }

  functions.logger.info('fcmTopicUnsubscribe', { topic });
  res.json({ success: true, successCount: response.successCount });
});

export const fcmTopicBroadcast = withAuthAndAudit(async (req, res) => {
  const { topic, notification, data } = req.body as {
    topic: string;
    notification: { title: string; body: string };
    data?: Record<string, string>;
  };

  if (!topic || !notification?.title || !notification?.body) {
    res.status(400).json({ error: 'topic, notification.title, notification.body are required' });
    return;
  }

  const message: admin.messaging.Message = {
    topic,
    notification,
    data: data ?? {},
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  };

  const messageId = await admin.messaging().send(message);

  functions.logger.info('fcmTopicBroadcast', { topic, messageId });
  res.json({ success: true, messageId });
});
