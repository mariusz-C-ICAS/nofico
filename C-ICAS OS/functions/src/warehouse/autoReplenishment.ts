import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const checkWarehouseReplenishment = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db = admin.firestore();
    let alertsCreated = 0;

    const productsSnap = await db.collectionGroup('warehouseProducts')
      .where('status', '==', 'ACTIVE')
      .get();

    for (const docSnap of productsSnap.docs) {
      const product = docSnap.data();
      const tenantId = product.tenantId as string;
      if (!tenantId || product.currentStock > product.minStock) continue;

      const existing = await db
        .collection(`tenants/${tenantId}/replenishmentAlerts`)
        .where('productId', '==', docSnap.id)
        .where('status', '==', 'PENDING')
        .limit(1)
        .get();
      if (!existing.empty) continue;

      await db.collection(`tenants/${tenantId}/replenishmentAlerts`).add({
        tenantId,
        productId: docSnap.id,
        warehouseId: product.warehouseId,
        currentStock: product.currentStock,
        minStock: product.minStock,
        suggestedOrderQuantity: product.reorderQuantity ?? (product.minStock * 2),
        supplierId: product.supplierId ?? null,
        status: 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      const ownerId = tenantDoc.data()?.ownerId as string | undefined;
      if (ownerId) {
        await db.collection(`tenants/${tenantId}/notifications`).add({
          tenantId,
          recipientId: ownerId,
          productId: docSnap.id,
          documentTitle: product.name,
          type: 'STOCK_LOW',
          message: `Niski stan magazynowy: "${product.name}" — ${product.currentStock} ${product.unit} (min: ${product.minStock}).`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          actionUrl: '/warehouse',
        });
      }

      alertsCreated++;
    }

    functions.logger.info('checkWarehouseReplenishment completed', { alertsCreated });
  });
