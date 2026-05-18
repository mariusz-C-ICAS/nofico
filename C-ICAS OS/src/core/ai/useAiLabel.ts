import { useTenant } from '../auth/TenantContext';

export interface AiLabels {
  name: string;        // e.g. "AI Coach"
  shortName: string;   // e.g. "Coach"
  description: string; // one-liner for UI
  badge: string;       // badge text, e.g. "AI"
}

const LABELS: Record<string, AiLabels> = {
  coach: {
    name: 'AI Coach',
    shortName: 'Coach',
    description: 'Automatyzuje zadania, wypełnia dane, generuje raporty — pracuje za Ciebie',
    badge: 'AI',
  },
  assistant: {
    name: 'AI Asystent',
    shortName: 'Asystent',
    description: 'Odpowiada na pytania i wyjaśnia dane — nie modyfikuje rekordów',
    badge: 'AI',
  },
};

const DEFAULT_LABELS = LABELS.coach;

export function useAiLabel(): AiLabels {
  const { currentTenant } = useTenant();

  if (!currentTenant) return DEFAULT_LABELS;

  if (currentTenant.aiCustomName) {
    return {
      name: currentTenant.aiCustomName,
      shortName: currentTenant.aiCustomName,
      description: '',
      badge: 'AI',
    };
  }

  return LABELS[currentTenant.aiMode ?? 'coach'] ?? DEFAULT_LABELS;
}
