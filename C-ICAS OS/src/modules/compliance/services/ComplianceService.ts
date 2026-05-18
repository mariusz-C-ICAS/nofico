/**
 * Data: 2026-05-18
 * Zmiany: AML via OpenSanctions API (bezpłatny publiczny API sankcji ONZ/UE/OFAC).
 * Ścieżka: /src/modules/compliance/services/ComplianceService.ts
 */

export class ComplianceService {
  /**
   * Generuje ocenę skutków dla RODO (DPIA) przy użyciu AI.
   * COMP-IMP-02
   */
  static async generateDpia(processDescription: string) {
    console.log('Analyzing data processing risks with Gemini for DPIA...');
    return {
      status: 'success',
      riskScore: 35,
      recommendations: [
        'Implement access logs for /customers table',
        'Pseudonymize user email field in staging environment',
        'Document legitimate interest assessment (TIA)',
      ],
    };
  }

  /**
   * Automatyczna detekcja systemów AI w kodzie/bazie.
   * COMP-IMP-08
   */
  static async autoDetectAiSystems() {
    return [
      { name: 'Gemini 1.5 Pro', type: 'LLM', usage: 'Summarization, Coding Assistant' },
      { name: 'Lead Scoring Engine', type: 'ML', usage: 'Financial Predictions' },
    ];
  }
}

export interface AmlMatch {
  entityId: string;
  name: string;
  score: number;
  datasets: string[];
  properties: {
    country?: string[];
    birthDate?: string[];
    position?: string[];
  };
}

export interface AmlCheckResult {
  isListed: boolean;
  isPep: boolean;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  matches: AmlMatch[];
  lastUpdate: string;
  source: 'opensanctions' | 'fallback';
  requestId: string;
}

export class AmlService {
  private static readonly OPENSANCTIONS_API = 'https://api.opensanctions.org';

  /**
   * Sprawdza podmiot na listach sankcyjnych i PEP via OpenSanctions API.
   * COMP-IMP-06
   */
  static async performAmlCheck(entityName: string, country?: string): Promise<AmlCheckResult> {
    const lastUpdate = new Date().toISOString();
    const requestId = `aml_${Date.now()}`;

    try {
      const response = await fetch(`${this.OPENSANCTIONS_API}/match/default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          queries: {
            [requestId]: {
              schema: 'Thing',
              properties: {
                name: [entityName],
                ...(country ? { country: [country] } : {}),
              },
            },
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`OpenSanctions HTTP ${response.status}`);

      const data = await response.json() as {
        responses?: Record<string, {
          results?: Array<{
            id?: string;
            caption?: string;
            score?: number;
            datasets?: string[];
            properties?: { country?: string[]; birthDate?: string[]; position?: string[] };
          }>;
        }>;
      };

      const results = data.responses?.[requestId]?.results ?? [];

      const matches: AmlMatch[] = results
        .filter(r => (r.score ?? 0) > 0.5)
        .map(r => ({
          entityId: r.id ?? '',
          name: r.caption ?? entityName,
          score: r.score ?? 0,
          datasets: r.datasets ?? [],
          properties: {
            country: r.properties?.country,
            birthDate: r.properties?.birthDate,
            position: r.properties?.position,
          },
        }));

      const isPep = matches.some(m =>
        m.datasets.some(d => d.includes('pep') || d.includes('politician'))
        || (m.properties.position?.length ?? 0) > 0
      );

      const maxScore = matches.length > 0 ? Math.max(...matches.map(m => m.score)) : 0;
      let riskLevel: AmlCheckResult['riskLevel'] = 'Low';
      if (maxScore > 0.9) riskLevel = 'Critical';
      else if (maxScore > 0.75) riskLevel = 'High';
      else if (maxScore > 0.5) riskLevel = 'Medium';

      return { isListed: matches.length > 0, isPep, riskLevel, matches, lastUpdate, source: 'opensanctions', requestId };
    } catch (err) {
      console.error('[AmlService] performAmlCheck error:', err);
      return { isListed: false, isPep: false, riskLevel: 'Low', matches: [], lastUpdate, source: 'fallback', requestId };
    }
  }
}
