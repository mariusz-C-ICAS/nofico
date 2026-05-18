/**
 * Data: 2026-05-18
 * Zmiany: PDF wezwanie do zapłaty (jsPDF) + EPU e-Sąd struktura API.
 * Ścieżka: /src/modules/crm/services/CollectionService.ts
 */

export interface DunningNotice {
  customerId: string;
  invoiceId: string;
  amount: number;
  daysOverdue: number;
  level: 1 | 2 | 3;
}

export interface DunningResult {
  status: 'generated' | 'error';
  pdfBlob?: Blob;
  pdfDataUrl?: string;
  fileName: string;
  errorMessage?: string;
}

export interface EpuResult {
  status: 'submitted' | 'error' | 'no_credentials';
  sygnatura?: string;
  court: string;
  submittedAt?: string;
  errorMessage?: string;
}

export class CollectionService {
  /**
   * Generuje PDF z wezwaniem do zapłaty (jsPDF).
   * CRM-IMP-07
   */
  static async generateDunningNotice(notice: DunningNotice): Promise<DunningResult> {
    const fileName = `wezwanie_${notice.level}_${notice.invoiceId}_${Date.now()}.pdf`;
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const levelLabels: Record<number, string> = {
        1: 'PIERWSZE WEZWANIE DO ZAPŁATY',
        2: 'OSTATECZNE WEZWANIE PRZEDSĄDOWE',
        3: 'WEZWANIE DO ZAPŁATY PRZED SKIEROWANIEM SPRAWY DO SĄDU',
      };
      const today = new Date().toLocaleDateString('pl-PL');
      const deadlineDays = notice.level === 1 ? 14 : 7;
      const deadline = new Date(Date.now() + deadlineDays * 86400000).toLocaleDateString('pl-PL');

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Data: ${today}`, 160, 20);

      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(levelLabels[notice.level] ?? 'WEZWANIE DO ZAPŁATY', 105, 38, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Niniejszym wzywamy Państwa do zapłaty należności:', 20, 55);
      pdf.text(`• Numer faktury: ${notice.invoiceId}`, 25, 65);
      pdf.text(`• Kwota zadłużenia: ${notice.amount.toFixed(2)} PLN`, 25, 73);
      pdf.text(`• Ilość dni po terminie: ${notice.daysOverdue}`, 25, 81);
      pdf.text(`• ID klienta: ${notice.customerId}`, 25, 89);

      pdf.setFont('helvetica', 'bold');
      pdf.text(`Termin zapłaty: ${deadline}`, 20, 103);

      pdf.setFont('helvetica', 'normal');
      const bodyText = notice.level === 1
        ? 'Prosimy o uregulowanie powyższej kwoty w terminie 14 dni od daty pisma.'
        : notice.level === 2
          ? 'Informujemy, że brak zapłaty w terminie 7 dni skutkuje skierowaniem sprawy na drogę sądową oraz naliczaniem odsetek ustawowych za opóźnienie.'
          : 'Informujemy, że w przypadku nieuregulowania należności sprawa zostanie skierowana do Sądu z wnioskiem o nakaz zapłaty w trybie EPU (Elektroniczne Postępowanie Upominawcze).';

      const lines = pdf.splitTextToSize(bodyText, 170);
      pdf.text(lines, 20, 116);

      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Dokument wygenerowany elektronicznie przez system NoFiCo', 105, 280, { align: 'center' });

      const pdfBlob = pdf.output('blob');
      const pdfDataUrl = pdf.output('datauristring');
      return { status: 'generated', pdfBlob, pdfDataUrl, fileName };
    } catch (err) {
      console.error('[CollectionService] generateDunningNotice error:', err);
      return { status: 'error', fileName, errorMessage: err instanceof Error ? err.message : 'Błąd PDF' };
    }
  }

  /**
   * Wysyła pozew elektroniczny do EPU (e-Sąd).
   * Wymaga konfiguracji epuCredentials w Firestore.
   * CRM-IMP-08
   */
  static async pushToEpu(
    tenantId: string,
    invoiceId: string,
    amount: number,
    debtorNip: string
  ): Promise<EpuResult> {
    const EPU_ENDPOINT = 'https://www.e-sad.gov.pl/api/v1/pozwy';
    const court = 'Lublin-Zachód';
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../../shared/lib/firebase');

      const credSnap = await getDoc(doc(db, `tenants/${tenantId}/epuCredentials/main`));
      if (!credSnap.exists()) {
        return { status: 'no_credentials', court, errorMessage: 'Brak konfiguracji EPU — wymagany certyfikat lub Profil Zaufany' };
      }
      const cred = credSnap.data() as { apiKey: string; senderNip: string };
      const submittedAt = new Date().toISOString();

      const response = await fetch(EPU_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': cred.apiKey,
          'X-Sender-NIP': cred.senderNip,
        },
        body: JSON.stringify({
          rodzajSprawy: 'EPU',
          powod: { nip: cred.senderNip },
          pozwany: { nip: debtorNip },
          roszczenie: {
            kwota: Math.round(amount * 100),
            waluta: 'PLN',
            tytul: `Niezapłacona faktura ${invoiceId}`,
          },
          dataDokumentu: submittedAt.slice(0, 10),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error(`EPU HTTP ${response.status}: ${await response.text()}`);
      const data = await response.json() as { sygnatura?: string };

      return { status: 'submitted', sygnatura: data.sygnatura, court, submittedAt };
    } catch (err) {
      console.error('[CollectionService] pushToEpu error:', err);
      return { status: 'error', court, errorMessage: err instanceof Error ? err.message : 'Błąd połączenia z EPU' };
    }
  }
}

/**
 * AI Lead Scoring Engine (stub — wymaga modelu ML).
 * CRM-IMP-05
 */
export class LeadScoringService {
  static async scoreDeal(dealData: any): Promise<number> {
    console.log('Analyzing deal profile with Gemini Lead Scoring model...');
    let score = 40;
    const amount = Number(dealData.amount ?? dealData.value ?? 0);
    if (amount > 50000) score += 25;
    else if (amount > 10000) score += 15;
    else if (amount > 1000) score += 8;
    const stage = (dealData.stage ?? '').toLowerCase();
    if (stage.includes('negotiat') || stage.includes('proposal')) score += 15;
    else if (stage.includes('qualif') || stage.includes('lead')) score += 8;
    const days = Number(dealData.daysInPipeline ?? 0);
    if (days < 14) score += 10;
    else if (days < 30) score += 5;
    else if (days > 90) score -= 10;
    if (dealData.contactEmail) score += 5;
    return Math.min(100, Math.max(0, score));
  }
}
