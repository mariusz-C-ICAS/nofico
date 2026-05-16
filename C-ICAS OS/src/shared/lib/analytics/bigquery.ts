// BigQuery export — triggers Cloud Function that writes to BQ dataset

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export type BqDataset = 'audit_logs' | 'analytics_events' | 'financial_transactions';

export interface BqExportJob {
  jobId: string;
  dataset: BqDataset;
  status: 'pending' | 'running' | 'done' | 'error';
  rowsExported?: number;
  createdAt: string;
}

export async function triggerBqExport(
  dataset: BqDataset,
  tenantId: string,
  dateFrom: string,
  dateTo: string,
  idToken: string
): Promise<BqExportJob> {
  const res = await fetch(`${FUNCTIONS_BASE}/exportToBigQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ dataset, tenantId, dateFrom, dateTo }),
  });
  if (!res.ok) throw new Error(`BQ export error: ${res.status}`);
  return res.json();
}

export async function getBqJobStatus(jobId: string, idToken: string): Promise<BqExportJob> {
  const res = await fetch(`${FUNCTIONS_BASE}/bqJobStatus?jobId=${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`BQ status error: ${res.status}`);
  return res.json();
}
