import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { withAuth } from '../_shared/middleware';

const KSEF_BASE = process.env.KSEF_URL ?? 'https://ksef-test.mf.gov.pl/api';

export const ksefInitSession = withAuth(async (req, res, ctx) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { nip, apiToken } = req.body as { nip?: string; apiToken?: string };
  if (!nip || !apiToken) { res.status(400).json({ error: 'Missing nip or apiToken' }); return; }
  if (!ctx.tenantId)     { res.status(400).json({ error: 'Missing tenantId' }); return; }
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  // Step 1 — get authorisation challenge
  const challengeResp = await fetch(`${KSEF_BASE}/online/Session/AuthorisationChallenge`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ contextIdentifier: { type: 'onip', identifier: nip } }),
  });
  if (!challengeResp.ok) {
    const body = await challengeResp.text().catch(() => '');
    res.status(502).json({ error: 'KSeF AuthorisationChallenge failed', details: body });
    return;
  }
  const { timestamp, challenge } = await challengeResp.json() as { timestamp: number; challenge: string };

  // Step 2 — SHA256(apiToken || timestamp as 8-byte big-endian)
  const tsBuf = Buffer.alloc(8);
  tsBuf.writeBigInt64BE(BigInt(timestamp));
  const signature = createHash('sha256').update(apiToken, 'utf8').update(tsBuf).digest('base64');

  // Step 3 — build XML authorisation body (FA(2) format)
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ns3:InitSessionTokenRequest',
    '  xmlns="http://ksef.mf.gov.pl/schema/gtw/svc/online/types/2020/07/01/0001"',
    '  xmlns:ns2="http://ksef.mf.gov.pl/schema/gtw/svc/types/2020/07/01/0001"',
    '  xmlns:ns3="http://ksef.mf.gov.pl/schema/gtw/svc/online/auth/request/2020/07/01/0001">',
    '  <ns2:Context>',
    '    <ns2:Identifier xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="ns2:SubjectIdentifierByCompanyType">',
    `      <ns2:Identifier>${nip}</ns2:Identifier>`,
    '    </ns2:Identifier>',
    '    <ns2:DocumentType>',
    '      <ns2:Service>KSeF</ns2:Service>',
    '      <ns2:FormCode>',
    '        <ns2:SystemCode>FA (2)</ns2:SystemCode>',
    '        <ns2:SchemaVersion>1-0E</ns2:SchemaVersion>',
    '        <ns2:TargetNamespace>http://crd.gov.pl/wzor/2023/06/29/12648/</ns2:TargetNamespace>',
    '        <ns2:Value>FA</ns2:Value>',
    '      </ns2:FormCode>',
    '    </ns2:DocumentType>',
    `    <ns2:Challenge>${challenge}</ns2:Challenge>`,
    '  </ns2:Context>',
    `  <ns3:Token>${signature}</ns3:Token>`,
    '</ns3:InitSessionTokenRequest>',
  ].join('\n');

  // Step 4 — authorise
  const authResp = await fetch(`${KSEF_BASE}/online/Session/Authorise`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/xml' },
    body:    xml,
  });
  if (!authResp.ok) {
    const body = await authResp.text().catch(() => '');
    res.status(502).json({ error: 'KSeF Authorise failed', details: body });
    return;
  }
  const authData    = await authResp.json() as { sessionToken?: { token: string } };
  const sessionToken = authData.sessionToken?.token;
  if (!sessionToken) {
    res.status(502).json({ error: 'KSeF did not return session token', data: authData });
    return;
  }

  // Step 5 — persist to Firestore (admin SDK bypasses security rules)
  await admin.firestore().collection('tenants').doc(ctx.tenantId).update({
    ksefEnabled:                         true,
    'ksefConfig.nip':                    nip,
    'ksefConfig.sessionToken':           sessionToken,
    'ksefConfig.sessionStartedAt':       admin.firestore.FieldValue.serverTimestamp(),
    'ksefConfig.environment':            KSEF_BASE.includes('ksef-test') ? 'test' : 'prod',
  });

  functions.logger.info('ksefInitSession — session started', { tenantId: ctx.tenantId, nip });
  res.json({ ok: true, preview: sessionToken.slice(0, 8) + '…' });
});
