import * as functions from 'firebase-functions';
import { withAuth } from '../_shared/middleware';

const PROJECT = process.env.GCLOUD_PROJECT ?? 'cicas-os';
const LOCATION = 'global';
const DATA_STORE_ID = 'cicas-documents';

const DISCOVERY_BASE = `https://discoveryengine.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}`;

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  link?: string;
  score?: number;
}

export const vertexSearchDocuments = withAuth(async (req, res) => {
  const { query, pageSize = 10, tenantId } = req.body as {
    query: string;
    pageSize?: number;
    tenantId?: string;
  };

  if (!query) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const body: Record<string, unknown> = {
    query,
    pageSize: Math.min(pageSize, 50),
    queryExpansionSpec: { condition: 'AUTO' },
    spellCorrectionSpec: { mode: 'AUTO' },
  };

  if (tenantId) {
    body['filter'] = `tenantId: "${tenantId}"`;
  }

  const r = await fetch(`${DISCOVERY_BASE}/servingConfigs/default_search:search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    functions.logger.error('vertexSearch failed', { status: r.status, text });
    res.status(r.status).json({ error: 'Vertex Search error' });
    return;
  }

  const data = await r.json();
  const results: SearchResult[] = (data.results ?? []).map((item: any) => ({
    id: item.id ?? '',
    title: item.document?.derivedStructData?.title ?? item.document?.name ?? '',
    snippet: item.document?.derivedStructData?.snippets?.[0]?.snippet ?? '',
    link: item.document?.derivedStructData?.link,
    score: item.modelScores?.relevance_score?.values?.[0],
  }));

  functions.logger.info('vertexSearchDocuments', { query, count: results.length });
  res.json({ results, totalSize: data.totalSize ?? results.length });
});

export const vertexIndexDocument = withAuth(async (req, res) => {
  const { documentId, content, metadata, tenantId } = req.body as {
    documentId: string;
    content: string;
    metadata?: Record<string, string>;
    tenantId: string;
  };

  if (!documentId || !content || !tenantId) {
    res.status(400).json({ error: 'documentId, content, tenantId are required' });
    return;
  }

  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const docBody = {
    id: documentId,
    jsonData: JSON.stringify({
      id: documentId,
      content,
      tenantId,
      ...metadata,
      indexedAt: new Date().toISOString(),
    }),
  };

  const r = await fetch(`${DISCOVERY_BASE}/branches/default_branch/documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(docBody),
  });

  if (!r.ok) {
    functions.logger.error('vertexIndexDocument failed', { documentId, status: r.status });
    res.status(r.status).json({ error: 'Vertex index error' });
    return;
  }

  functions.logger.info('vertexIndexDocument', { documentId, tenantId });
  res.json({ success: true, documentId });
});
