/**
 * Data: 2026-05-14
 * Zmiany: Rozbudowa rejestru o wszystkie moduły (HR, LMS, eRecruitment, Controlling, Logistics).
 * Ścieżka: /src/core/modules/ModuleRegistry.ts
 * Cel: Plug&Play. Dodaj tu nowy moduł → system automatycznie stworzy kafel, uprawnienia i routing.
 */

import { SystemModuleDefinition } from './types';

export const MODULE_REGISTRY: SystemModuleDefinition[] = [
  // --- PULPIT I AI ---
  {
    id: 'dashboard',
    name: 'Dashboard',
    category: 'system',
    iconName: 'LayoutDashboard',
    path: '/',
    description: 'Centralny pulpit z KPI i alertami.',
    defaultActive: true
  },
  {
    id: 'ai-copilot',
    name: 'AI Copilot (Mózg)',
    category: 'system',
    iconName: 'BrainCircuit',
    path: '/ai-copilot',
    description: 'Analiza danych, wsparcie CEO/CFO, audyt AI (EU AI Act). Zasilany Google Gemini.',
    defaultActive: true
  },

  // --- OPERACJE ---
  {
    id: 'time-tracking',
    name: 'Czas Pracy (Geofencing)',
    category: 'operational',
    iconName: 'Clock',
    path: '/time',
    description: 'Rejestracja czasu, GPS, geofencing, tryb offline.',
    defaultActive: true
  },
  {
    id: 'projects',
    name: 'Projekty & Kanban',
    category: 'operational',
    iconName: 'LayoutKanban',
    path: '/kanban',
    description: 'Zarządzanie projektami, tablice Kanban, zasoby, budżety.',
    defaultActive: true
  },
  {
    id: 'crm',
    name: 'Sprzedaż & CRM',
    category: 'technical',
    iconName: 'Building2',
    path: '/crm',
    description: 'Leady, pipeline sprzedażowy, oferty, umowy. Leads-to-Cash.',
    defaultActive: true
  },

  // --- FINANSE & CONTROLLING ---
  {
    id: 'finance',
    name: 'Finanse (FI)',
    category: 'technical',
    iconName: 'Landmark',
    path: '/finance',
    description: 'Księgowość, KPiR, KSeF, JPK, PSD2, środki trwałe.',
    defaultActive: true
  },
  {
    id: 'controlling',
    name: 'Controlling (CO)',
    category: 'technical',
    iconName: 'BarChart3',
    path: '/controlling',
    description: 'Budżetowanie, analiza kosztów, MPK, prognozowanie, rentowność.',
    defaultActive: true
  },
  {
    id: 'payments',
    name: 'Płatności Premium',
    category: 'technical',
    iconName: 'CreditCard',
    path: '/payments',
    description: 'Stripe, BLIK, PayU, prognozy płynności, abonament SaaS.',
    defaultActive: true
  },

  // --- KADRY & ROZWÓJ ---
  {
    id: 'hr',
    name: 'HR & Płace (Payroll)',
    category: 'technical',
    iconName: 'Users',
    path: '/hr',
    description: 'Zarządzanie kadrą, umowy, struktura org, paski wypłat, urlopy.',
    defaultActive: true
  },
  {
    id: 'e-recruitment',
    name: 'eRekrutacja (ATS)',
    category: 'technical',
    iconName: 'UserSearch',
    path: '/hr/recruitment',
    description: 'Oferty pracy, pipeline kandydatów (Kanban), harmonogram rozmów, onboarding.',
    defaultActive: false
  },
  {
    id: 'lms',
    name: 'Szkolenia (LMS)',
    category: 'technical',
    iconName: 'GraduationCap',
    path: '/lms',
    description: 'E-learning, kursy, egzaminy, certyfikaty BHP i RODO.',
    defaultActive: false
  },

  // --- COMPLIANCE & BEZPIECZEŃSTWO ---
  {
    id: 'compliance',
    name: 'Compliance / RODO / ISMS',
    category: 'technical',
    iconName: 'ShieldCheck',
    path: '/compliance',
    description: 'RODO/GDPR, NIS2, ISMS (ISO 27001), AML, BHP, EU AI Act.',
    defaultActive: true
  },

  // --- DOKUMENTY ---
  {
    id: 'workflow',
    name: 'Obieg Dokumentów',
    category: 'system',
    iconName: 'GitBranch',
    path: '/workflow',
    description: 'E2E obieg dokumentów: wydatki, zatwierdzenia, KSeF, księgowanie, zwroty. GoBD/GDPR.',
    defaultActive: true
  },
  {
    id: 'dms',
    name: 'Skarbiec (DMS)',
    category: 'system',
    iconName: 'Briefcase',
    path: '/dms',
    description: 'Elektroniczny obieg dokumentów, WORM, prywatna kieszeń RODO.',
    defaultActive: true
  },
  {
    id: 'esignature',
    name: 'E-Podpis (QES/eIDAS)',
    category: 'system',
    iconName: 'PenTool',
    path: '/esignature',
    description: 'Elektroniczne podpisywanie dokumentów zgodne z eIDAS 2.0.',
    defaultActive: true
  },

  // --- LOGISTYKA ---
  {
    id: 'logistics',
    name: 'Logistyka & Magazyn',
    category: 'operational',
    iconName: 'Truck',
    path: '/logistics',
    description: 'Flota, sprzęt, inwentarz magazynowy, rezerwacje przeglądów.',
    defaultActive: false
  },

  // --- BRANŻOWE (opcjonalne) ---
  {
    id: 'construction',
    name: 'Budownictwo',
    category: 'operational',
    iconName: 'Hammer',
    path: '/industry/construction',
    description: 'Dziennik budowy, kosztorysy, BIOZ, protokoły odbioru.',
    defaultActive: false
  },
  {
    id: 'gardening',
    name: 'Ogrodnictwo',
    category: 'operational',
    iconName: 'Leaf',
    path: '/industry/gardening',
    description: 'Harmonogramy obsługi, monitoring pogody, rekomendacje AI.',
    defaultActive: false
  },
  {
    id: 'cleaning',
    name: 'Usługi Sprzątające',
    category: 'operational',
    iconName: 'Sparkles',
    path: '/industry/cleaning',
    description: 'Harmonogramy, checklista jakości, zdjęcia przed/po.',
    defaultActive: false
  },
  {
    id: 'mechanics',
    name: 'Warsztat & Mechanika',
    category: 'operational',
    iconName: 'Wrench',
    path: '/industry/mechanics',
    description: 'Zlecenia napraw, AI Vision weryfikacja, historia pojazdu.',
    defaultActive: false
  },
  {
    id: 'shop',
    name: 'Sklep (E-commerce)',
    category: 'operational',
    iconName: 'ShoppingCart',
    path: '/shop',
    description: 'Katalog produktów, zamówienia, integracja z platformami.',
    defaultActive: false
  },

  // --- ZARZĄDZANIE I SYSTEM ---
  {
    id: 'cross-company',
    name: 'Zarząd & Multi-Firma',
    category: 'system',
    iconName: 'Globe',
    path: '/cross-company',
    description: 'Konsolidacja multi-tenant, intercompany, Transfer Pricing.',
    defaultActive: true
  },
  {
    id: 'admin',
    name: 'Panel Administracyjny',
    category: 'system',
    iconName: 'Settings',
    path: '/admin',
    description: 'Zarządzanie modułami, rolami, licencjami, integracjami.',
    defaultActive: true,
    requiredPermissions: ['roles.manage']
  },
  {
    id: 'tenancy',
    name: 'Ustawienia Workspace',
    category: 'system',
    iconName: 'Building2',
    path: '/tenancy',
    description: 'Tożsamość firmy, branding, polityki systemowe.',
    defaultActive: true,
    requiredPermissions: ['roles.manage']
  }
];

export const getModuleDef = (moduleId: string) =>
  MODULE_REGISTRY.find(m => m.id === moduleId);

export const getActiveModules = (activeIds: string[]) =>
  MODULE_REGISTRY.filter(m => activeIds.includes(m.id));

export const getDefaultModules = () =>
  MODULE_REGISTRY.filter(m => m.defaultActive);
