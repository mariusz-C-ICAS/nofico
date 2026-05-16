/**
 * Firebase Cloud Functions — C-ICAS OS
 * DEPLOYMENT: firebase deploy --only functions
 * REQUIRES: firebase-tools (npm i -g firebase-tools) + firebase login
 *
 * Env vars (firebase functions:config:set):
 *   email.smtp_host   — np. "smtp.gmail.com"
 *   email.smtp_port   — np. "587"
 *   email.smtp_user   — konto SMTP
 *   email.smtp_pass   — hasło SMTP / App Password
 *   email.from        — nadawca, np. "C-ICAS OS <no-reply@c-icas.gg>"
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();
const db = admin.firestore();

// ── Email helper ─────────────────────────────────────────────────────────────

function getTransporter(): nodemailer.Transporter {
  const cfg = functions.config().email ?? {};
  return nodemailer.createTransport({
    host: cfg.smtp_host ?? 'smtp.gmail.com',
    port: Number(cfg.smtp_port ?? 587),
    secure: Number(cfg.smtp_port ?? 587) === 465,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
}

const FROM = () => functions.config().email?.from ?? 'C-ICAS OS <no-reply@c-icas.gg>';

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const u = await admin.auth().getUser(userId);
    return u.email ?? null;
  } catch {
    return null;
  }
}

const EMAIL_TEMPLATES: Record<string, (title: string, tenantName: string) => { subject: string; html: string }> = {
  APPROVAL_REQUIRED: (title, tenant) => ({
    subject: `[${tenant}] Wymagane zatwierdzenie: ${title}`,
    html: `<p>Dokument <strong>${title}</strong> czeka na Twoje zatwierdzenie w systemie <strong>${tenant}</strong>.</p>
           <p><a href="https://app.c-icas.gg/workflow">Przejdź do systemu →</a></p>`,
  }),
  DOCUMENT_APPROVED: (title, tenant) => ({
    subject: `[${tenant}] Zatwierdzono: ${title}`,
    html: `<p>Twój dokument <strong>${title}</strong> został zatwierdzony w systemie <strong>${tenant}</strong>.</p>`,
  }),
  DOCUMENT_REJECTED: (title, tenant) => ({
    subject: `[${tenant}] Odrzucono: ${title}`,
    html: `<p>Twój dokument <strong>${title}</strong> został odrzucony. Sprawdź szczegóły w systemie <strong>${tenant}</strong>.</p>
           <p><a href="https://app.c-icas.gg/workflow">Przejdź do systemu →</a></p>`,
  }),
};

// ── Trigger: nowe powiadomienie → email ────────────────────────────────────────

export const sendEmailOnNotification = functions
  .region('europe-west1')
  .firestore.document('tenants/{tenantId}/notifications/{notifId}')
  .onCreate(async (snap, ctx) => {
    const notif = snap.data();
    const { tenantId } = ctx.params;

    const template = EMAIL_TEMPLATES[notif.type];
    if (!template) return;

    const email = await getUserEmail(notif.recipientId);
    if (!email) return;

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantName = tenantDoc.data()?.name ?? 'C-ICAS OS';

    const { subject, html } = template(notif.documentTitle, tenantName);

    try {
      await getTransporter().sendMail({ from: FROM(), to: email, subject, html });
    } catch (err) {
      functions.logger.error('sendEmailOnNotification failed', { err, notifId: snap.id });
    }
  });

// ── Scheduled: SLA reminder co 4 godziny ─────────────────────────────────────

export const checkSlaReminders = functions
  .region('europe-west1')
  .pubsub.schedule('every 4 hours')
  .onRun(async () => {
    const now = Date.now();

    // SLA w ms
    const SLA: Record<string, number> = {
      SUBMITTED: 72 * 3600 * 1000,
      PENDING_APPROVAL: 48 * 3600 * 1000,
      UNDER_INVESTIGATION: 168 * 3600 * 1000,
    };

    for (const [status, slaMs] of Object.entries(SLA)) {
      const cutoff = admin.firestore.Timestamp.fromMillis(now - slaMs);
      const snap = await db.collectionGroup('documentInstances')
        .where('status', '==', status)
        .where('createdAt', '<', cutoff)
        .get();

      for (const docSnap of snap.docs) {
        const doc = docSnap.data();
        const tenantId = doc.tenantId;
        if (!tenantId) continue;

        const assignees: string[] = doc.assignedTo ?? [];
        for (const userId of assignees) {
          const email = await getUserEmail(userId);
          if (!email) continue;

          const tenantDoc = await db.collection('tenants').doc(tenantId).get();
          const tenantName = tenantDoc.data()?.name ?? 'C-ICAS OS';
          const title = doc.metadata?.title ?? 'Dokument';

          // Unikaj duplikatów: sprawdź czy reminder już wysłany w ostatnich 4h
          const recentReminder = await db
            .collection(`tenants/${tenantId}/notifications`)
            .where('recipientId', '==', userId)
            .where('documentInstanceId', '==', docSnap.id)
            .where('type', '==', 'STEP_TIMEOUT')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

          if (!recentReminder.empty) {
            const lastTs = recentReminder.docs[0].data().createdAt?.toMillis?.() ?? 0;
            if (now - lastTs < 4 * 3600 * 1000) continue;
          }

          // Zapisz powiadomienie in-app (trigger sendEmailOnNotification)
          await db.collection(`tenants/${tenantId}/notifications`).add({
            tenantId,
            recipientId: userId,
            documentInstanceId: docSnap.id,
            documentTitle: title,
            type: 'STEP_TIMEOUT',
            message: `PRZYPOMNIENIE: "${title}" czeka na zatwierdzenie — przekroczono SLA.`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            actionUrl: '/workflow',
          });

          // Wyślij email bezpośrednio
          try {
            await getTransporter().sendMail({
              from: FROM(),
              to: email,
              subject: `[${tenantName}] Przypomnienie SLA: ${title}`,
              html: `<p>Dokument <strong>${title}</strong> przekroczył czas zatwierdzenia (SLA: ${status}).</p>
                     <p><a href="https://app.c-icas.gg/workflow">Przejdź i zatwierdź →</a></p>`,
            });
          } catch (err) {
            functions.logger.error('SLA email failed', { err });
          }
        }
      }
    }

    functions.logger.info('checkSlaReminders completed', { timestamp: new Date().toISOString() });
  });
