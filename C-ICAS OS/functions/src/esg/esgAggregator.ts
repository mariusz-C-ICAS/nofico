import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const CO2_GRID_KG_PER_KWH = 0.233; // Polish national grid factor
const CO2_TRAVEL_KG_PER_KM = 0.12;

export const aggregateEsgMetrics = functions
  .region('europe-west1')
  .pubsub.schedule('1 of month 04:00')
  .onRun(async () => {
    const db   = admin.firestore();
    const now  = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const tenantsSnap = await db.collection('tenants').where('esgEnabled', '==', true).get();
    let processed = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;

      const existing = await db.collection(`tenants/${tenantId}/esgReports`)
        .where('period', '==', period).limit(1).get();
      if (!existing.empty) continue;

      const [energySnap, wasteSnap, travelSnap] = await Promise.all([
        db.collection(`tenants/${tenantId}/esgMeasurements`).where('type', '==', 'ENERGY').where('period', '==', period).get(),
        db.collection(`tenants/${tenantId}/esgMeasurements`).where('type', '==', 'WASTE').where('period', '==', period).get(),
        db.collection(`tenants/${tenantId}/esgMeasurements`).where('type', '==', 'TRAVEL').where('period', '==', period).get(),
      ]);

      const sum = (snap: admin.firestore.QuerySnapshot, field: string) =>
        snap.docs.reduce((s, d) => s + (((d.data()[field]) as number) ?? 0), 0);

      const r    = (v: number) => Math.round(v * 10) / 10;
      const kwh  = sum(energySnap, 'valueKwh');
      const wasteKg    = sum(wasteSnap, 'valueKg');
      const recycledKg = sum(wasteSnap, 'recycledKg');
      const travelKm   = sum(travelSnap, 'valueKm');

      await db.collection(`tenants/${tenantId}/esgReports`).add({
        tenantId,
        period,
        environmental: {
          energyKwh:      r(kwh),
          co2EnergyKg:    r(kwh * CO2_GRID_KG_PER_KWH),
          wasteKg:        r(wasteKg),
          wasteRecycledKg: r(recycledKg),
          recyclingRate:  wasteKg > 0 ? Math.round((recycledKg / wasteKg) * 1000) / 10 : 0,
          travelKm:       Math.round(travelKm),
          co2TravelKg:    r(travelKm * CO2_TRAVEL_KG_PER_KM),
          totalCo2Kg:     r(kwh * CO2_GRID_KG_PER_KWH + travelKm * CO2_TRAVEL_KG_PER_KM),
        },
        status:      'DRAFT',
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      processed++;
    }

    functions.logger.info('aggregateEsgMetrics complete', { period, processed });
  });
