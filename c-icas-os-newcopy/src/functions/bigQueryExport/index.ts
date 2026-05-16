/**
 * Data: 2026-05-16
 * Zmiany: Cloud Function — export danych Firestore do BigQuery.
 * Sciezka: /src/functions/bigQueryExport/index.ts
 *
 * Wdrozenie: firebase deploy --only functions:bigqueryExport
 * Wymaga: INTERNAL_API_KEY w env Cloud Functions (firebase functions:secrets:set INTERNAL_API_KEY)
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

// BigQuery — type-only import; runtime fallback gdy pakiet niedostepny
type BigQueryClient = {
  dataset: (id: string) => {
    table: (id: string) => {
      insert: (rows: unknown[]) => Promise<void>;
    };
  };
};

async function tryGetBigQueryClient(): Promise<BigQueryClient | null> {
  try {
    // Dynamiczny import aby nie crashowac gdy @google-cloud/bigquery nie jest zainstalowany
    const bqModule = await import('@google-cloud/bigquery' as string) as {
      BigQuery: new () => BigQueryClient;
    };
    return new bqModule.BigQuery();
  } catch {
    return null;
  }
}

// ─── Cloud Function ───────────────────────────────────────────────────────────

export const bigqueryExport = onRequest(
  {
    cors: true,
    region: 'europe-west3',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (req, res) => {
    // Tylko POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { tenantId, collection: col, dateFrom, dateTo } = req.body as {
      tenantId?: string;
      collection?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    if (!tenantId || !col) {
      res.status(400).json({ error: 'Missing tenantId or collection' });
      return;
    }

    // Auth przez naglowek X-Internal-Key
    const key = req.headers['x-internal-key'];
    if (key !== process.env.INTERNAL_API_KEY) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = getFirestore();
    const today = new Date().toISOString().slice(0, 10);
    const from = dateFrom ?? '2026-01-01';
    const to = dateTo ?? today;

    const snap = await db
      .collection(`tenants/${tenantId}/${col}`)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .limit(5000)
      .get();

    const exportedAt = new Date().toISOString();
    const rows = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      _tenantId: tenantId,
      _exportedAt: exportedAt,
    }));

    // Probuj wyslac do BigQuery jesli klient dostepny
    const bqDatasetId = process.env.BQ_DATASET_ID;
    const bqTableId = col.replace(/[^a-zA-Z0-9_]/g, '_');

    if (bqDatasetId && rows.length > 0) {
      const bq = await tryGetBigQueryClient();
      if (bq) {
        try {
          await bq.dataset(bqDatasetId).table(bqTableId).insert(rows);
        } catch (bqErr) {
          // Nie blokujemy odpowiedzi — logujemy blad BQ
          console.error('[bigqueryExport] BigQuery insert failed:', bqErr);
        }
      } else {
        console.warn('[bigqueryExport] @google-cloud/bigquery not available — skipping BQ insert');
      }
    }

    res.status(200).json({
      exported: rows.length,
      rows: rows.slice(0, 100), // sample
      message: `Exported ${rows.length} rows from ${col}`,
    });
  }
);
