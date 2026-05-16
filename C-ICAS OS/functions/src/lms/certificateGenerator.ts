import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generateCertificateOnCompletion = functions
  .region('europe-west1')
  .firestore.document('tenants/{tenantId}/trainingCompletions/{completionId}')
  .onCreate(async (snap, ctx) => {
    const { tenantId, completionId } = ctx.params;
    const completion = snap.data();

    if (completion.status !== 'COMPLETED') return;
    if (!completion.userId || !completion.courseId) return;

    const db = admin.firestore();

    const existing = await db.collection(`tenants/${tenantId}/certificates`)
      .where('completionId', '==', completionId).limit(1).get();
    if (!existing.empty) return;

    const courseDoc = await db.collection(`tenants/${tenantId}/courses`).doc(completion.courseId as string).get();
    const course    = courseDoc.data();
    if (!course?.generatesCertificate) return;

    const certNumber = `CERT-${tenantId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const validUntil = course.validityMonths
      ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + (course.validityMonths as number) * 30 * 86400_000))
      : null;

    const certRef = await db.collection(`tenants/${tenantId}/certificates`).add({
      tenantId,
      completionId,
      userId:          completion.userId,
      courseId:        completion.courseId,
      courseName:      course.name ?? '',
      certificateNumber: certNumber,
      issuedAt:        admin.firestore.FieldValue.serverTimestamp(),
      validUntil,
      score:           completion.score ?? null,
      status:          'ISSUED',
    });

    await db.collection(`tenants/${tenantId}/notifications`).add({
      tenantId,
      recipientId:   completion.userId,
      documentTitle: `Certyfikat: ${course.name}`,
      type: 'CERTIFICATE_ISSUED',
      message: `Ukończyłeś/aś szkolenie "${course.name}". Certyfikat ${certNumber} dostępny w profilu.`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      actionUrl: '/lms',
    });

    functions.logger.info('Certificate generated', { tenantId, certId: certRef.id, certNumber });
  });
