export interface AppEventMap {
  'tenant:changed': { tenantId: string };
  'workflow:status-changed': { documentId: string; status: string; tenantId: string };
  'notification:received': { notifId: string; tenantId: string; message: string };
  'sync:completed': { module: string };
  'payment:processed': { paymentId: string; amount: number };
  'crm:deal-updated': { dealId: string; stage: string };
  'hr:employee-updated': { employeeId: string };
}

export type AppEventType = keyof AppEventMap;
