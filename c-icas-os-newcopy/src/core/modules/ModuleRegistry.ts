/**
 * Data: 2026-05-12
 * Zmiany: Inicjalizacja Centralnego Rejestru Modułów dla Wariantu 1
 * Ścieżka: /src/core/modules/ModuleRegistry.ts
 * Cel: Plug&Play. Jeśli dodajesz nowy dział do firmy (np. Sklep), dopisujesz go tutaj.
 * System automatycznie utworzy mu kafle, uprawnienia i wepnie do systemu.
 */

import { SystemModuleDefinition } from './types';

export const MODULE_REGISTRY: SystemModuleDefinition[] = [
  // --- DZIAŁY TECHNICZNE / WSPIERAJĄCE (Back-office) ---
  {
    id: 'crm',
    name: 'Sprzedaż i CRM',
    category: 'technical',
    iconName: 'Building2',
    path: '/crm',
    description: 'Zarządzanie leadami, pipeline sprzedażowy, oferty.',
    defaultActive: true
  },
  {
    id: 'finance',
    name: 'Finanse & Controling',
    category: 'technical',
    iconName: 'Landmark',
    path: '/finance',
    description: 'Zarządzanie płatnościami, KSeF, fakturami i skarbcem.',
    defaultActive: true
  },
  {
    id: 'payments',
    name: 'Płatności Premium',
    category: 'technical',
    iconName: 'CreditCard',
    path: '/payments',
    description: 'Stripe, BLIK, PayU i prognozy płynności ML.',
    defaultActive: true
  },
  {
    id: 'hr',
    name: 'HR & Płace (Payroll)',
    category: 'technical',
    iconName: 'Users',
    path: '/hr',
    description: 'Zarządzanie kadrą, umowy, paski wypłat.',
    defaultActive: true
  },
  {
    id: 'compliance',
    name: 'Compliance (RODO/NIS2)',
    category: 'technical',
    iconName: 'ShieldCheck',
    path: '/compliance',
    description: 'Zgodność z RODO, NIS2, AI Act, AML.',
    defaultActive: true
  },
  {
    id: 'cross-company',
    name: 'Doradca i Zarząd (Cross)',
    category: 'technical',
    iconName: 'Globe',
    path: '/cross-company',
    description: 'Konsolidacja multi-tenant, intercompany, TP documentation.',
    defaultActive: true
  },
  {
    id: 'logistics',
    name: 'Logistyka i Magazyn',
    category: 'technical',
    iconName: 'Truck',
    path: '/logistics',
    description: 'Flota, sprzęt, inwentarz magazynowy.',
    defaultActive: true
  },
  {
    id: 'shop',
    name: 'Sklep (E-commerce)',
    category: 'technical',
    iconName: 'ShoppingCart',
    path: '/shop',
    defaultActive: false
  },
  
  // --- DZIAŁY OPERACYJNE / LINIOWE (Front-office / Field) ---
  {
    id: 'construction',
    name: 'Budownictwo',
    category: 'operational',
    iconName: 'Hammer',
    path: '/industry/construction',
    defaultActive: false
  },
  {
    id: 'gardening',
    name: 'Ogrodnictwo',
    category: 'operational',
    iconName: 'Leaf',
    path: '/industry/gardening',
    defaultActive: false
  },
  {
    id: 'cleaning',
    name: 'Sprzątanie / Cleaning',
    category: 'operational',
    iconName: 'Sparkles',
    path: '/industry/cleaning',
    defaultActive: false
  },
  {
    id: 'mechanics',
    name: 'Warsztat & Mechanika',
    category: 'operational',
    iconName: 'Wrench',
    path: '/industry/mechanics',
    defaultActive: false
  },

  // --- OGÓLNOSYSTEMOWE ---
  {
    id: 'dms',
    name: 'Skarbiec (DMS)',
    category: 'system',
    iconName: 'Briefcase',
    path: '/dms',
    description: 'Elektroniczny obieg dokumentów.',
    defaultActive: true
  },
  {
    id: 'esignature',
    name: 'E-Podpis (QES)',
    category: 'system',
    iconName: 'PenTool',
    path: '/esignature',
    description: 'Elektroniczne podpisywanie dokumentów (eIDAS 2.0).',
    defaultActive: true
  },
  {
    id: 'system',
    name: 'Konfiguracja',
    category: 'system',
    iconName: 'Settings',
    path: '/system',
    defaultActive: true,
    requiredPermissions: ['roles.manage']
  },
  {
    id: 'tenancy',
    name: 'Ustawienia Workspace',
    category: 'system',
    iconName: 'Building2',
    path: '/tenancy',
    description: 'Zarządzanie tożsamością firmy, brandingiem i politykami.',
    defaultActive: true,
    requiredPermissions: ['roles.manage']
  },
  {
    id: 'ai-copilot',
    name: 'AI Copilot (Mózg)',
    category: 'system',
    iconName: 'BrainCircuit',
    path: '/ai-copilot',
    description: 'Analiza danych, wsparcie CEO/CFO, audyt AI (EU AI Act).',
    defaultActive: true
  }
];

/**
 * Zwraca definicję modułu na podstawie ID.
 */
export const getModuleDef = (moduleId: string) => {
  return MODULE_REGISTRY.find(m => m.id === moduleId);
};
