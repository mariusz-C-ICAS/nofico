/**
 * Data: 2026-05-12
 * Zmiany: Serwis do masowego naliczania płac i integracji z ZUS.
 * Ścieżka: /src/modules/hr/services/PayrollService.ts
 */
import { calculatePayroll, PayrollCalculationInput, PayrollResult } from '../utils/payrollEngine';

export interface ZusSyncResult {
  status: 'success' | 'error' | 'no_credentials';
  synchronizedRecords: number;
  sessionId?: string;
  errorMessage?: string;
}

export interface PpkUploadResult {
  status: 'success' | 'error' | 'no_employees';
  timestamp: string;
  fileName?: string;
  errorMessage?: string;
}

export interface PayrollRun {
  tenantId: string;
  month: string;
  year: number;
  employees: {
    id: string;
    grossSalary: number;
    contractType: any;
    hasPpk: boolean;
  }[];
}

export class PayrollService {
  /**
   * Symulacja atomowej operacji obliczeń płacowych.
   * HR-IMP-04
   */
  static async runPayroll(run: PayrollRun): Promise<PayrollResult[]> {
    console.log(`Uruchamianie naliczania płac dla: ${run.month}/${run.year}...`);
    
    // W rzeczywistości to byłby wywołanie Cloud Function
    const results = run.employees.map(emp => {
      const input: PayrollCalculationInput = {
        grossSalary: emp.grossSalary,
        contractType: emp.contractType,
        hasPpk: emp.hasPpk,
        ppkRateEmployee: 0.02,
        ppkRateEmployer: 0.015,
        isYoungerThan26: false,
        taxYear: run.year
      };
      
      return calculatePayroll(input);
    });

    // Symulacja zapisu do Firestore / DMS (Paski płacowe)
    console.log("Generowanie dokumentacji płacowej...");
    
    return results;
  }

  /**
   * Integracja e-PUE ZUS — inicjuje sesję przez REST API ZUS e-PUE.
   * HR-IMP-05
   */
  static async syncZusData(tenantId: string): Promise<ZusSyncResult> {
    const ZUS_EPUE_ENDPOINT = 'https://epue.zus.pl/zus-zewnetrzne-api/api';
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../../shared/lib/firebase');
      const credSnap = await getDoc(doc(db, `tenants/${tenantId}/zusCredentials/main`));
      if (!credSnap.exists()) {
        return { status: 'no_credentials', synchronizedRecords: 0, errorMessage: 'Brak konfiguracji ZUS e-PUE' };
      }
      const cred = credSnap.data() as { apiKey: string; nip: string };

      const sessionRes = await fetch(`${ZUS_EPUE_ENDPOINT}/session/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': cred.apiKey,
        },
        body: JSON.stringify({ nip: cred.nip }),
        signal: AbortSignal.timeout(15000),
      });

      if (!sessionRes.ok) {
        throw new Error(`ZUS e-PUE HTTP ${sessionRes.status}`);
      }

      const sessionData = await sessionRes.json() as { sessionId?: string; recordsCount?: number };
      return {
        status: 'success',
        synchronizedRecords: sessionData.recordsCount ?? 0,
        sessionId: sessionData.sessionId,
      };
    } catch (err) {
      console.error('[PayrollService] syncZusData error:', err);
      return {
        status: 'error',
        synchronizedRecords: 0,
        errorMessage: err instanceof Error ? err.message : 'Nieznany błąd ZUS e-PUE',
      };
    }
  }

  /**
   * Generuje plik XML PPK w formacie PFR i zwraca metadane pliku.
   * HR-IMP-06
   */
  static async uploadPpkFile(run: PayrollRun, results: PayrollResult[]): Promise<PpkUploadResult> {
    const timestamp = new Date().toISOString();
    try {
      const ppkEmployees = run.employees.filter(e => e.hasPpk);
      if (ppkEmployees.length === 0) {
        return { status: 'no_employees', timestamp };
      }

      const lines = ppkEmployees.map((emp, i) => {
        const _result = results[i];
        const employeeContrib = (emp.grossSalary * 0.02).toFixed(2);
        const employerContrib = (emp.grossSalary * 0.015).toFixed(2);
        return `  <Uczestnik>
    <Identyfikator>${emp.id}</Identyfikator>
    <OkresRozliczeniowy>${run.month}/${run.year}</OkresRozliczeniowy>
    <SkladkaFinansowanaUczestnik>${employeeContrib}</SkladkaFinansowanaUczestnik>
    <SkladkaFinansowanaPracodawca>${employerContrib}</SkladkaFinansowanaPracodawca>
  </Uczestnik>`;
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PlikiPPK xmlns="http://pfr.pl/ppk/schemat/1.0">
  <Naglowek>
    <TypPliku>SKLADKI</TypPliku>
    <OkresRozliczeniowy>${run.month}/${run.year}</OkresRozliczeniowy>
    <LiczbaPozycji>${ppkEmployees.length}</LiczbaPozycji>
    <DataGeneracji>${timestamp}</DataGeneracji>
  </Naglowek>
  <Pozycje>
${lines.join('\n')}
  </Pozycje>
</PlikiPPK>`;

      const fileName = `PPK_${run.tenantId}_${run.year}${run.month}.xml`;
      console.log(`[PayrollService] Wygenerowano plik PPK: ${fileName} (${ppkEmployees.length} uczestników)`);
      console.log(xml);

      return { status: 'success', timestamp, fileName };
    } catch (err) {
      console.error('[PayrollService] uploadPpkFile error:', err);
      return {
        status: 'error',
        timestamp,
        errorMessage: err instanceof Error ? err.message : 'Błąd generowania PPK XML',
      };
    }
  }
}
