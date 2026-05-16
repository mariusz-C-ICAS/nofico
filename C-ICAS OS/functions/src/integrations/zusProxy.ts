import * as functions from 'firebase-functions';
import { withAuth } from '../_shared/middleware';

const ZUS_PUE_BASE = 'https://api-praca.zus.pl';

export interface ZusInsuredStatus {
  nip: string;
  pesel?: string;
  insured: boolean;
  employerNip?: string;
  insuranceFrom?: string;
  statusCode?: string;
  statusDescription?: string;
}

export interface ZusContributionStatus {
  nip: string;
  hasArrears: boolean;
  arrearsAmount?: number;
  checkDate: string;
}

export const checkZusInsured = withAuth(async (req, res) => {
  const { pesel, nip } = req.query as { pesel?: string; nip?: string };

  if (!pesel && !nip) {
    res.status(400).json({ error: 'pesel or nip is required' });
    return;
  }

  const cfg = functions.config().zus ?? {};
  const apiKey = cfg.api_key;

  if (!apiKey) {
    res.status(503).json({ error: 'ZUS API key not configured' });
    return;
  }

  const params = new URLSearchParams();
  if (pesel) params.set('pesel', pesel);
  if (nip) params.set('nip', nip);

  const url = `${ZUS_PUE_BASE}/api/v1/ubezpieczony/status?${params.toString()}`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });

  if (!r.ok) {
    const body = await r.text();
    functions.logger.error('ZUS insured check failed', { status: r.status, body });
    res.status(r.status).json({ error: 'ZUS API error', status: r.status });
    return;
  }

  const data = await r.json();
  functions.logger.info('checkZusInsured', { pesel: !!pesel, nip: !!nip });
  res.json(data as ZusInsuredStatus);
});

export const checkZusContributions = withAuth(async (req, res) => {
  const { nip } = req.query as { nip?: string };

  if (!nip) {
    res.status(400).json({ error: 'nip is required' });
    return;
  }

  const cfg = functions.config().zus ?? {};
  const apiKey = cfg.api_key;

  if (!apiKey) {
    res.status(503).json({ error: 'ZUS API key not configured' });
    return;
  }

  const url = `${ZUS_PUE_BASE}/api/v1/platnik/${encodeURIComponent(nip)}/zaleglosci`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });

  if (!r.ok) {
    functions.logger.error('ZUS contributions check failed', { nip, status: r.status });
    res.status(r.status).json({ error: 'ZUS API error', status: r.status });
    return;
  }

  const data = await r.json();
  const result: ZusContributionStatus = {
    nip,
    hasArrears: data.hasArrears ?? false,
    arrearsAmount: data.arrearsAmount,
    checkDate: new Date().toISOString().split('T')[0],
  };

  functions.logger.info('checkZusContributions', { nip, hasArrears: result.hasArrears });
  res.json(result);
});
