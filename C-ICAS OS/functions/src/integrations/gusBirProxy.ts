import * as functions from 'firebase-functions';
import { withAuth } from '../_shared/middleware';

// GUS BIR1 API — requires API key from api.stat.gov.pl
const GUS_URL = 'https://wyszukiwarkaregon.stat.gov.pl/api/action/DaneSzukajPodmioty';

export const validateGUSBIR = withAuth(async (req, res) => {
  const { nip } = req.body as { nip?: string };
  if (!nip) { res.status(400).json({ error: 'nip required' }); return; }

  const apiKey = functions.config().gus?.api_key;
  if (!apiKey) {
    res.status(501).json({ error: 'GUS API key not configured (gus.api_key)' });
    return;
  }

  const cleanNip = nip.replace(/[\s\-]/g, '');
  const loginUrl = `https://wyszukiwarkaregon.stat.gov.pl/api/action/Zaloguj?pKluczUzytkownika=${apiKey}`;

  // Session-based GUS BIR1 protocol: Zaloguj → DaneSzukajPodmioty → Wyloguj
  const loginRes = await fetch(loginUrl, { method: 'GET' });
  const sessionId = (await loginRes.text()).replace(/[<>]/g, '').trim();

  const searchRes = await fetch(GUS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      sid: sessionId,
    },
    body: JSON.stringify({ pParametryWyszukiwania: { Nip: cleanNip } }),
  });

  if (!searchRes.ok) {
    res.status(502).json({ error: `GUS BIR error: ${searchRes.status}` });
    return;
  }
  const raw = await searchRes.json() as any;
  const item = raw?.DaneSzukajPodmiotyResult?.[0];
  res.json({
    nip: cleanNip,
    name: item?.Nazwa,
    regon: item?.Regon,
    address: item ? `${item.Ulica} ${item.NrNieruchomosci}, ${item.KodPocztowy} ${item.Miejscowosc}` : undefined,
    found: !!item,
  });
});
