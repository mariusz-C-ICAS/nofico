import * as functions from 'firebase-functions';
import { CloudTasksClient } from '@google-cloud/tasks';
import { withAuth } from '../_shared/middleware';

const tasksClient = new CloudTasksClient();

const PROJECT = process.env.GCLOUD_PROJECT ?? 'cicas-os';
const LOCATION = 'europe-west1';
const QUEUE = 'cicas-default-queue';

export interface EnqueueTaskRequest {
  url: string;
  payload?: unknown;
  delaySeconds?: number;
  tenantId?: string;
  taskId?: string;
}

function queuePath(): string {
  return tasksClient.queuePath(PROJECT, LOCATION, QUEUE);
}

export const enqueueTask = withAuth(async (req, res) => {
  const body = req.body as EnqueueTaskRequest;

  if (!body.url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const payload = body.payload ? JSON.stringify(body.payload) : '{}';

  const task: Record<string, unknown> = {
    httpRequest: {
      httpMethod: 'POST',
      url: body.url,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(payload).toString('base64'),
    },
  };

  if (body.delaySeconds) {
    const scheduleTime = new Date(Date.now() + body.delaySeconds * 1000);
    task['scheduleTime'] = {
      seconds: Math.floor(scheduleTime.getTime() / 1000),
    };
  }

  if (body.taskId) {
    task['name'] = `${queuePath()}/tasks/${body.taskId}`;
  }

  const [response] = await tasksClient.createTask({
    parent: queuePath(),
    task,
  });

  functions.logger.info('enqueueTask', { url: body.url, name: response.name });
  res.json({ success: true, taskName: response.name });
});

export const deleteTask = withAuth(async (req, res) => {
  const { taskName } = req.body as { taskName: string };

  if (!taskName) {
    res.status(400).json({ error: 'taskName is required' });
    return;
  }

  await tasksClient.deleteTask({ name: taskName });
  functions.logger.info('deleteTask', { taskName });
  res.json({ success: true });
});
