// @ts-ignore
import * as functions from 'firebase-functions';
import { withAuth } from '../_shared/middleware';

const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{country}/vat/{vat}';

export const validateVIES = withAuth(async (req, res) => {
  const { countryCode, vatNumber } = req.body as { countryCode?: string; vatNumber?: string };
  if (!countryCode || !vatNumber) {
    res.status(400).json({ error: 'countryCode and vatNumber required' });
    return;
  }
  const url = VIES_URL.replace('{country}', countryCode.toUpperCase()).replace('{vat}', vatNumber.replace(/\s/g, ''));
  const viesRes = await fetch(url);
  if (!viesRes.ok) {
    res.status(502).json({ error: `VIES upstream error: ${viesRes.status}` });
    return;
  }
  const data = await viesRes.json() as any;
  res.json({
    valid: data.isValid ?? false,
    name: data.traderName,
    address: data.traderAddress,
    countryCode,
    vatNumber,
  });
});
