export type SyncOp = 'create' | 'update' | 'delete';

export interface PendingOp {
  id?: number;
  collection: string;
  docId: string;
  op: SyncOp;
  data: any;
  tenantId: string;
  createdAt: number;
  retries: number;
}
