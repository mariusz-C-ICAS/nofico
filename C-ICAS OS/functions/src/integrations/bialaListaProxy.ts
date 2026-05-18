// @ts-ignore
import * as functions from 'firebase-functions';
import { withAuth } from '../_shared/middleware';

const BL_URL = 'https://wl-api.mf.gov.pl/api/search/nip/{nip}?date={date}';

export const validateBialaLista = withAuth(async (req, res) => {
  const { nip } = req.body as { nip?: string };
  if (!nip) { res.status(400).json({ error: 'nip required' }); return; }

  const cleanNip = nip.replace(/[\s\-]/g, '');
  const date = new Date().toISOString().slice(0, 10);
  const url = BL_URL.replace('{nip}', cleanNip).replace('{date}', date);

  const blRes = await fetch(url);
  if (!blRes.ok) {
    res.status(502).json({ error: `Biała Lista upstream error: ${blRes.status}` });
    return;
  }
  const data = await blRes.json() as any;
  const entry = data.result?.subject;
  res.json({
    valid: !!entry,
    nip: cleanNip,
    accountNumbers: entry?.accountNumbers ?? [],
    statusVat: entry?.statusVat ?? 'Niezarejestrowany',
  });
});
