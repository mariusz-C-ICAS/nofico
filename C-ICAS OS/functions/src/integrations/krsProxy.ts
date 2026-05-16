import { withAuth } from '../_shared/middleware';

const KRS_BASE = 'https://api-krs.ms.gov.pl/api/krs/OdpisAktualny';

export const checkKrs = withAuth(async (req, res) => {
  const { krs } = req.body as { krs?: string };
  if (!krs) { res.status(400).json({ error: 'krs required' }); return; }

  const cleanKrs = krs.replace(/\D/g, '').padStart(10, '0');
  if (cleanKrs.length !== 10) {
    res.status(400).json({ error: 'krs must be 10 digits' });
    return;
  }

  const krsRes = await fetch(`${KRS_BASE}/${cleanKrs}?rejestr=P&format=json`, {
    headers: { Accept: 'application/json' },
  });

  if (krsRes.status === 404) {
    res.json({ krs: cleanKrs, found: false });
    return;
  }

  if (!krsRes.ok) {
    res.status(502).json({ error: `KRS API error: ${krsRes.status}` });
    return;
  }

  const data = await krsRes.json() as any;
  const podmiot = data?.odpis?.dane?.dzial1?.danePodmiotu;
  const likwidacja = data?.odpis?.dane?.dzial6?.likwidacja;

  res.json({
    krs: cleanKrs,
    found: true,
    name: podmiot?.nazwa,
    nip: podmiot?.nip,
    regon: podmiot?.regon,
    address: podmiot?.siedzibaIAdresPodmiotu,
    status: likwidacja ? 'LIQUIDATED' : 'ACTIVE',
  });
});
