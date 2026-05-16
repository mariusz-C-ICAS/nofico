export interface PubSubMessage<T = any> {
  topic: string;
  payload: T;
  tenantId?: string;
  publishedAt: number;
  messageId?: string;
}

export type PubSubHandler<T = any> = (msg: PubSubMessage<T>) => void | Promise<void>;

export type AppTopic =
  | 'workflow.status-changed'
  | 'payment.completed'
  | 'notification.sent'
  | 'tenant.member-added'
  | 'ksef.invoice-verified'
  | 'hr.employee-updated'
  | 'crm.deal-closed';
