import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const calculateMonthlyDepreciation = functions
  .region('europe-west1')
  .pubsub.schedule('1 of month 03:00')
  .onRun(async () => {
    const db     = admin.firestore();
    const now    = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const assetsSnap = await db.collectionGroup('fixedAssets')
      .where('status', '==', 'ACTIVE')
      .where('depreciationMethod', 'in', ['LINEAR', 'DEGRESSIVE'])
      .get();

    let processed   = 0;
    let alertsSent  = 0;

    for (const assetDoc of assetsSnap.docs) {
      const asset    = assetDoc.data();
      const tenantId = asset.tenantId as string;
      if (!tenantId) continue;

      const existing = await db.collection(`tenants/${tenantId}/depreciationEntries`)
        .where('assetId', '==', assetDoc.id).where('period', '==', period).limit(1).get();
      if (!existing.empty) continue;

      const acquisitionValue       = (asset.acquisitionValue as number) ?? 0;
      const usefulLifeMonths       = (asset.usefulLifeMonths as number) ?? 60;
      const accumulatedDepreciation = (asset.accumulatedDepreciation as number) ?? 0;
      const bookValue              = acquisitionValue - accumulatedDepreciation;
      if (bookValue <= 0) continue;

      let monthly: number;
      if (asset.depreciationMethod === 'LINEAR') {
        monthly = Math.min(bookValue, acquisitionValue / usefulLifeMonths);
      } else {
        const annualRate = ((asset.degressiveRate as number) ?? 20) / 100;
        monthly = Math.min(bookValue, (bookValue * annualRate) / 12);
      }
      monthly = Math.round(monthly * 100) / 100;

      await db.collection(`tenants/${tenantId}/depreciationEntries`).add({
        tenantId,
        assetId:        assetDoc.id,
        assetName:      asset.name ?? '',
        period,
        amount:         monthly,
        bookValueBefore: bookValue,
        bookValueAfter: Math.max(0, bookValue - monthly),
        accountDebit:   asset.depreciationAccount ?? '401',
        accountCredit:  asset.accumulatedDepreciationAccount ?? '071',
        createdAt:      admin.firestore.FieldValue.serverTimestamp(),
      });

      await assetDoc.ref.update({
        accumulatedDepreciation: admin.firestore.FieldValue.increment(monthly),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Alert when book value drops below 10%
      const newBook = bookValue - monthly;
      if (newBook / acquisitionValue < 0.1 && bookValue / acquisitionValue >= 0.1) {
        const ownerId = (await db.collection('tenants').doc(tenantId).get()).data()?.ownerId as string | undefined;
        if (ownerId) {
          await db.collection(`tenants/${tenantId}/notifications`).add({
            tenantId, recipientId: ownerId,
            documentTitle: asset.name ?? 'Środek trwały',
            type: 'ASSET_NEARLY_DEPRECIATED',
            message: `Środek trwały "${asset.name}" jest zamortyzowany w >90% (wartość: ${newBook.toFixed(2)} PLN).`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            actionUrl: '/finance/assets',
          });
          alertsSent++;
        }
      }

      processed++;
    }

    functions.logger.info('calculateMonthlyDepreciation complete', { period, processed, alertsSent });
  });
