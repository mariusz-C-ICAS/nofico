/**
 * Data: 2026-05-17
 * Opis: Punkt wejsciowy generatora IDES.
 */

import { generateHR }        from './generators/hr';
import { generateCRM }       from './generators/crm';
import { generateFinance }   from './generators/finance';
import { generateProjects }  from './generators/projects';
import { generateWorkflows } from './generators/workflow';
import { generateAssets }    from './generators/assets';
import { generateDocuments } from './generators/documents';
import type { CompanyProfile, IdesGenerationResult } from './types';

export type { CompanyProfile, IdesGenerationResult };

export interface AllIdesResult {
  results: IdesGenerationResult[];
  totalCreated: number;
  totalErrors: number;
  durationMs: number;
}

export const MODULE_GENERATORS: Record<string, (p: CompanyProfile) => Promise<IdesGenerationResult>> = {
  hr:        generateHR,
  crm:       generateCRM,
  finance:   generateFinance,
  projects:  generateProjects,
  workflow:  generateWorkflows,
  assets:    generateAssets,
  documents: generateDocuments,
};

export async function generateAllIdesData(
  profile: CompanyProfile,
  onProgress?: (module: string, index: number, total: number) => void,
): Promise<AllIdesResult> {
  const start   = Date.now();
  const results: IdesGenerationResult[] = [];
  const modules = profile.modules.length > 0 ? profile.modules : Object.keys(MODULE_GENERATORS);

  for (let i = 0; i < modules.length; i++) {
    const key = modules[i];
    onProgress?.(key, i, modules.length);
    const generator = MODULE_GENERATORS[key] ?? generateHR;
    const result    = await generator(profile);
    results.push(result);
  }

  return {
    results,
    totalCreated: results.reduce((s, r) => s + r.created, 0),
    totalErrors:  results.reduce((s, r) => s + r.errors, 0),
    durationMs:   Date.now() - start,
  };
}
