import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import type { Request, Response } from 'express';

export interface AuthContext {
  uid: string;
  email: string;
  tenantId: string;
  role: string;
}

export type HandlerFn = (req: Request, res: Response, ctx: AuthContext) => Promise<void>;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function verifyIdToken(req: Request): Promise<admin.auth.DecodedIdToken> {
  const authHeader = req.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) throw new Error('Missing Bearer token');
  const token = authHeader.slice(7);
  return admin.auth().verifyIdToken(token);
}

async function getTenantRole(uid: string, tenantId: string): Promise<string> {
  try {
    const snap = await admin.firestore().doc(`tenants/${tenantId}/members/${uid}`).get();
    return snap.data()?.role ?? 'viewer';
  } catch {
    return 'viewer';
  }
}

async function writeAuditLog(ctx: AuthContext, fn: string, req: Request): Promise<void> {
  try {
    await admin.firestore().collection('auditLogs').add({
      userId: ctx.uid,
      userEmail: ctx.email,
      type: 'function.call',
      tenantId: ctx.tenantId,
      category: 'system',
      details: { fn, method: req.method, path: req.path },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // audit failure must never block the handler
  }
}

// ── Middleware composer ───────────────────────────────────────────────────────

export function withAuth(handler: HandlerFn): functions.HttpsFunction {
  return functions.region('europe-west1').https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await verifyIdToken(req);
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = (req.body?.tenantId ?? req.query.tenantId ?? '') as string;
    const role = tenantId ? await getTenantRole(decoded.uid, tenantId) : 'system';

    const ctx: AuthContext = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      tenantId,
      role,
    };

    try {
      await handler(req, res, ctx);
    } catch (err) {
      functions.logger.error('withAuth handler error', { err, uid: ctx.uid });
      if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
    }
  });
}

export function withAuthAndAudit(handler: HandlerFn): functions.HttpsFunction {
  return withAuth(async (req, res, ctx) => {
    const fnName = req.path || 'unknown';
    await writeAuditLog(ctx, fnName, req);
    await handler(req, res, ctx);
  });
}

export function requireRole(...roles: string[]): (handler: HandlerFn) => HandlerFn {
  return (handler) => async (req, res, ctx) => {
    if (!roles.includes(ctx.role) && ctx.role !== 'owner') {
      res.status(403).json({ error: 'Forbidden — insufficient role' });
      return;
    }
    await handler(req, res, ctx);
  };
}
