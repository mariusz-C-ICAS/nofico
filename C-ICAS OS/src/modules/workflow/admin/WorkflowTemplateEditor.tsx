import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, Save, GripVertical, Settings,
  CheckCircle2, ShieldCheck, BookOpen, Banknote, Archive, Bell,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { listTemplates, saveTemplate } from '../services/workflowEngine';
import type {
  WorkflowTemplate, WorkflowStepDef, WorkflowStepType, DocumentType,
} from '../types';
import { DOC_TYPE_LABELS } from '../types';

const STEP_TYPE_CONFIG: Record<WorkflowStepType, { label: string; icon: React.ReactNode; color: string }> = {
  APPROVAL: { label: 'Zatwierdzenie', icon: <CheckCircle2 size={14} />, color: 'text-emerald-600 bg-emerald-50' },
  KSEF_VERIFY: { label: 'Weryfikacja KSeF', icon: <ShieldCheck size={14} />, color: 'text-violet-600 bg-violet-50' },
  BOOK: { label: 'Księgowanie', icon: <BookOpen size={14} />, color: 'text-indigo-600 bg-indigo-50' },
  SETTLE: { label: 'Rozliczenie', icon: <Banknote size={14} />, color: 'text-teal-600 bg-teal-50' },
  NOTIFY: { label: 'Powiadomienie', icon: <Bell size={14} />, color: 'text-amber-600 bg-amber-50' },
  ARCHIVE: { label: 'Archiwizacja', icon: <Archive size={14} />, color: 'text-slate-600 bg-slate-100' },
};

const DOCUMENT_TYPES = Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][];

const S = (id: string, order: number, label: string, type: WorkflowStepType, roles: string[], timeout: number | undefined, onApprove: any, onReject: any): WorkflowStepDef => ({
  id, order, label, type, requiredRoles: roles, timeoutHours: timeout, onApprove, onReject,
});

const APPROVE_ARCHIVE = (roles = ['manager', 'owner']): WorkflowStepDef[] => [
  S('step-1', 1, 'Zatwierdzenie', 'APPROVAL', roles, 48, 'APPROVED', 'REJECTED'),
  S('step-2', 2, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
];

const APPROVE_BOOK_ARCHIVE = (approverRoles = ['manager', 'owner']): WorkflowStepDef[] => [
  S('step-1', 1, 'Zatwierdzenie', 'APPROVAL', approverRoles, 48, 'APPROVED', 'REJECTED'),
  S('step-2', 2, 'Zaksięgowanie', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
  S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
];

const LEGAL_APPROVE_ARCHIVE = (): WorkflowStepDef[] => [
  S('step-1', 1, 'Przegląd prawny', 'APPROVAL', ['legal', 'manager'], 72, 'APPROVED', 'REJECTED'),
  S('step-2', 2, 'Zatwierdzenie zarządu', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
  S('step-3', 3, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
];

const DEFAULT_STEPS: Partial<Record<DocumentType, { name: string; steps: WorkflowStepDef[] }>> = {
  OUT_OF_POCKET: {
    name: 'Domyślny flow Out-of-Pocket',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez managera', 'APPROVAL', ['manager', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Weryfikacja faktury KSeF', 'KSEF_VERIFY', ['system'], 24, 'KSEF_VERIFIED', 'APPROVED'),
      S('step-3', 3, 'Zaksięgowanie wydatku', 'BOOK', ['accountant', 'owner'], 72, 'BOOKED', 'APPROVED'),
      S('step-4', 4, 'Zwrot pracownikowi', 'SETTLE', ['accountant', 'hr'], 72, 'SETTLED', 'BOOKED'),
      S('step-5', 5, 'Archiwizacja do Skarbca', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'SETTLED'),
    ],
  },
  VENDOR_INVOICE: {
    name: 'Faktura od dostawcy',
    steps: [
      S('step-1', 1, 'Weryfikacja faktury KSeF', 'KSEF_VERIFY', ['system'], 24, 'KSEF_VERIFIED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przez managera', 'APPROVAL', ['manager', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Zaksięgowanie faktury', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-4', 4, 'Płatność do dostawcy', 'SETTLE', ['accountant', 'owner'], 72, 'SETTLED', 'BOOKED'),
      S('step-5', 5, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'SETTLED'),
    ],
  },
  TRAVEL_EXPENSE: {
    name: 'Delegacja służbowa',
    steps: [
      S('step-1', 1, 'Zatwierdzenie delegacji', 'APPROVAL', ['manager', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Weryfikacja rachunków KSeF', 'KSEF_VERIFY', ['system'], 24, 'KSEF_VERIFIED', 'APPROVED'),
      S('step-3', 3, 'Zaksięgowanie delegacji', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-4', 4, 'Zwrot kosztów pracownikowi', 'SETTLE', ['accountant', 'hr'], 72, 'SETTLED', 'BOOKED'),
      S('step-5', 5, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'SETTLED'),
    ],
  },
  CONTRACT: {
    name: 'Umowa',
    steps: [
      S('step-1', 1, 'Przegląd prawny', 'APPROVAL', ['legal', 'manager'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przez zarząd', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja WORM z datą wygaśnięcia', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  PURCHASE_ORDER: {
    name: 'Zamówienie zakupu',
    steps: [
      S('step-1', 1, 'Zatwierdzenie zakupu', 'APPROVAL', ['manager', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zaksięgowanie zamówienia', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  TIMESHEET: {
    name: 'Karta czasu pracy',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez managera', 'APPROVAL', ['manager'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Naliczenie wynagrodzenia (HR)', 'BOOK', ['hr', 'accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  PROJECT_DELIVERY: {
    name: 'Realizacja projektu',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez PM', 'APPROVAL', ['manager', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Weryfikacja jakościowa', 'APPROVAL', ['quality', 'manager'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  DAMAGE_CLAIM: {
    name: 'Zgłoszenie szkody',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez kierownika', 'APPROVAL', ['manager', 'owner'], 24, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zgłoszenie do ubezpieczyciela', 'NOTIFY', ['backoffice'], 48, 'CLAIM_FILED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'CLAIM_FILED'),
    ],
  },
  BHP_INCIDENT: {
    name: 'Wypadek / Incydent BHP',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez BHP', 'APPROVAL', ['bhp', 'manager'], 4, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Dispatch do wszystkich stron', 'NOTIFY', ['system'], 24, 'BHP_DISPATCHED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BHP_DISPATCHED'),
    ],
  },
  LEAVE_REQUEST: {
    name: 'Wniosek urlopowy',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez przełożonego', 'APPROVAL', ['manager'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Rejestracja w HR', 'BOOK', ['hr'], 24, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  VEHICLE_INCIDENT: {
    name: 'Kolizja pojazdu służbowego',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez managera', 'APPROVAL', ['manager', 'owner'], 24, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zgłoszenie do ubezpieczyciela', 'NOTIFY', ['backoffice'], 48, 'CLAIM_FILED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'CLAIM_FILED'),
    ],
  },
  IT_INCIDENT: {
    name: 'Incydent IT',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez IT Manager', 'APPROVAL', ['it_manager', 'manager'], 4, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Powiadomienie zarządu', 'NOTIFY', ['system'], 24, 'BHP_DISPATCHED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BHP_DISPATCHED'),
    ],
  },
  ASSET_HANDOVER: {
    name: 'Przekazanie mienia',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez IT / HR', 'APPROVAL', ['hr', 'it_manager'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Rejestracja w ewidencji', 'BOOK', ['hr'], 24, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  EXPENSE_ADVANCE: {
    name: 'Zaliczka pracownicza',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez managera', 'APPROVAL', ['manager', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Wydanie zaliczki przez FI', 'SETTLE', ['accountant', 'hr'], 24, 'ADVANCE_ISSUED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja po rozliczeniu', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'SETTLED'),
    ],
  },
  QUALITY_NCR: {
    name: 'Karta Niezgodności (NCR)',
    steps: [
      S('step-1', 1, 'Zatwierdzenie NCR przez Quality', 'APPROVAL', ['quality', 'manager'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Weryfikacja CAPA', 'APPROVAL', ['quality'], 120, 'NCR_VERIFIED', 'NCR_OPEN'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'NCR_VERIFIED'),
    ],
  },
  SUBCONTRACTOR_APPROVAL: {
    name: 'Zatwierdzenie podwykonawcy',
    steps: [
      S('step-1', 1, 'Weryfikacja dokumentów', 'APPROVAL', ['legal', 'manager'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie zarządu', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  // ── Finance ────────────────────────────────────────────────────────────────
  CREDIT_NOTE: {
    name: 'Faktura korygująca',
    steps: [
      S('step-1', 1, 'Weryfikacja korekty KSeF', 'KSEF_VERIFY', ['system'], 24, 'KSEF_VERIFIED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przez księgowość', 'APPROVAL', ['accountant', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Zaksięgowanie korekty', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-4', 4, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  BUDGET_REQUEST: {
    name: 'Wniosek budżetowy',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez managera', 'APPROVAL', ['manager'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przez CFO / Zarząd', 'APPROVAL', ['owner', 'cfo'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Zaksięgowanie budżetu', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-4', 4, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  WRITE_OFF: {
    name: 'Odpisanie należności',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez zarząd', 'APPROVAL', ['owner', 'cfo'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zaksięgowanie odpisu', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  TAX_DOCUMENT: {
    name: 'Dokument podatkowy',
    steps: [
      S('step-1', 1, 'Weryfikacja przez księgowość', 'APPROVAL', ['accountant', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przez zarząd', 'APPROVAL', ['owner'], 24, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  // ── Supply Chain ───────────────────────────────────────────────────────────
  RFQ: {
    name: 'Zapytanie ofertowe',
    steps: [
      S('step-1', 1, 'Zatwierdzenie zakresu RFQ', 'APPROVAL', ['manager', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Wysyłka do dostawców', 'NOTIFY', ['procurement'], 24, 'SUBMITTED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'SUBMITTED'),
    ],
  },
  BID_EVALUATION: {
    name: 'Ocena ofert',
    steps: [
      S('step-1', 1, 'Analiza ofert przez procurement', 'APPROVAL', ['procurement', 'manager'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Wybór dostawcy przez zarząd', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  GOODS_RECEIPT: {
    name: 'Przyjęcie towaru (PZ)',
    steps: [
      S('step-1', 1, 'Weryfikacja dostawy przez magazyn', 'APPROVAL', ['warehouse', 'manager'], 24, 'GOODS_RECEIVED', 'REJECTED'),
      S('step-2', 2, 'Zaksięgowanie PZ', 'BOOK', ['accountant'], 48, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  GOODS_ISSUE: {
    name: 'Wydanie towaru (WZ)',
    steps: [
      S('step-1', 1, 'Zatwierdzenie wydania', 'APPROVAL', ['warehouse', 'manager'], 24, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zaksięgowanie WZ', 'BOOK', ['accountant'], 48, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  RETURN_MERCHANDISE: {
    name: 'Zwrot towaru',
    steps: [
      S('step-1', 1, 'Zatwierdzenie zwrotu', 'APPROVAL', ['manager', 'warehouse'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zaksięgowanie zwrotu', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  // ── Legal & Compliance ─────────────────────────────────────────────────────
  NDA: { name: 'Umowa NDA', steps: LEGAL_APPROVE_ARCHIVE() },
  GDPR_REQUEST: {
    name: 'Żądanie RODO (DSAR)',
    steps: [
      S('step-1', 1, 'Weryfikacja przez DPO', 'APPROVAL', ['dpo', 'legal'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Realizacja żądania', 'NOTIFY', ['system'], 720, 'SETTLED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'SETTLED'),
    ],
  },
  POLICY_EXCEPTION: {
    name: 'Wyjątek od polityki',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez dział prawny', 'APPROVAL', ['legal', 'manager'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przez zarząd', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  REGULATORY_BREACH: {
    name: 'Naruszenie regulacyjne',
    steps: [
      S('step-1', 1, 'Zgłoszenie do compliance', 'APPROVAL', ['compliance', 'legal'], 4, 'UNDER_INVESTIGATION', 'REJECTED'),
      S('step-2', 2, 'Dochodzenie wewnętrzne', 'APPROVAL', ['legal', 'owner'], 120, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Zgłoszenie do regulatora', 'NOTIFY', ['legal'], 24, 'BHP_DISPATCHED', 'APPROVED'),
      S('step-4', 4, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BHP_DISPATCHED'),
    ],
  },
  AUDIT_FINDING: {
    name: 'Wynik audytu',
    steps: [
      S('step-1', 1, 'Weryfikacja przez audytora', 'APPROVAL', ['auditor', 'manager'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie planu naprawczego', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  WHISTLEBLOWER: {
    name: 'Zgłoszenie sygnalisty',
    steps: [
      S('step-1', 1, 'Potwierdzenie przyjęcia (7 dni)', 'APPROVAL', ['compliance', 'legal'], 168, 'UNDER_INVESTIGATION', 'REJECTED'),
      S('step-2', 2, 'Dochodzenie wewnętrzne (3 miesiące)', 'APPROVAL', ['legal', 'owner'], 2160, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Przekazanie wyników sygnaliście', 'NOTIFY', ['compliance'], 48, 'BHP_DISPATCHED', 'APPROVED'),
      S('step-4', 4, 'Archiwizacja WORM (5 lat)', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BHP_DISPATCHED'),
    ],
  },
  // ── Sales & CRM ────────────────────────────────────────────────────────────
  SALES_ORDER: {
    name: 'Zamówienie sprzedaży',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez Sales Manager', 'APPROVAL', ['sales_manager', 'manager'], 24, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zaksięgowanie zamówienia', 'BOOK', ['accountant'], 48, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  QUOTE_APPROVAL: {
    name: 'Zatwierdzenie oferty handlowej',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez managera sprzedaży', 'APPROVAL', ['sales_manager', 'manager'], 48, 'QUOTE_SENT', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przy rabacie >20%', 'APPROVAL', ['owner'], 24, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  CUSTOMER_COMPLAINT: {
    name: 'Reklamacja klienta',
    steps: [
      S('step-1', 1, 'Przyjęcie i analiza reklamacji', 'APPROVAL', ['customer_service', 'manager'], 24, 'UNDER_INVESTIGATION', 'REJECTED'),
      S('step-2', 2, 'Rozwiązanie reklamacji', 'APPROVAL', ['manager', 'owner'], 120, 'COMPLAINT_RESOLVED', 'REJECTED'),
      S('step-3', 3, 'Powiadomienie klienta', 'NOTIFY', ['customer_service'], 24, 'SETTLED', 'COMPLAINT_RESOLVED'),
      S('step-4', 4, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'SETTLED'),
    ],
  },
  DISCOUNT_APPROVAL: {
    name: 'Zatwierdzenie rabatu',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez Sales Manager', 'APPROVAL', ['sales_manager'], 24, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie CFO (rabat >30%)', 'APPROVAL', ['cfo', 'owner'], 24, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  // ── Project Management ─────────────────────────────────────────────────────
  CHANGE_REQUEST: {
    name: 'Zmiana zakresu projektu',
    steps: [
      S('step-1', 1, 'Ocena wpływu przez PM', 'APPROVAL', ['project_manager', 'manager'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przez sponsora', 'APPROVAL', ['owner'], 72, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  RISK_REGISTER: {
    name: 'Rejestr ryzyk',
    steps: [
      S('step-1', 1, 'Analiza ryzyka przez PM', 'APPROVAL', ['project_manager', 'manager'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie planu mitygacji', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  PROJECT_CLOSURE: {
    name: 'Zamknięcie projektu',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez PM', 'APPROVAL', ['project_manager', 'manager'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Rozliczenie finansowe projektu', 'BOOK', ['accountant'], 120, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Zatwierdzenie przez sponsor', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-4', 4, 'Archiwizacja dokumentacji', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  // ── Healthcare ─────────────────────────────────────────────────────────────
  PATIENT_INCIDENT: {
    name: 'Zdarzenie niepożądane (medyczne)',
    steps: [
      S('step-1', 1, 'Zgłoszenie do Risk Managera', 'APPROVAL', ['risk_manager', 'medical_director'], 4, 'UNDER_INVESTIGATION', 'REJECTED'),
      S('step-2', 2, 'Analiza przyczyn źródłowych', 'APPROVAL', ['medical_director', 'quality'], 120, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Zgłoszenie do organów regulacyjnych', 'NOTIFY', ['system'], 72, 'BHP_DISPATCHED', 'APPROVED'),
      S('step-4', 4, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BHP_DISPATCHED'),
    ],
  },
  MEDICATION_ERROR: {
    name: 'Błąd lekowy',
    steps: [
      S('step-1', 1, 'Zgłoszenie do lekarza prowadzącego', 'APPROVAL', ['physician', 'head_nurse'], 1, 'UNDER_INVESTIGATION', 'REJECTED'),
      S('step-2', 2, 'Analiza zdarzenia przez komisję', 'APPROVAL', ['medical_director', 'pharmacy'], 72, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Zgłoszenie do URPL', 'NOTIFY', ['system'], 24, 'BHP_DISPATCHED', 'APPROVED'),
      S('step-4', 4, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BHP_DISPATCHED'),
    ],
  },
  // ── Manufacturing ──────────────────────────────────────────────────────────
  PRODUCTION_ORDER: {
    name: 'Zlecenie produkcyjne',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez Production Manager', 'APPROVAL', ['production_manager', 'manager'], 24, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zaksięgowanie zlecenia', 'BOOK', ['accountant'], 48, 'BOOKED', 'APPROVED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  ENGINEERING_CHANGE: {
    name: 'Zmiana inżynierska (ECO)',
    steps: [
      S('step-1', 1, 'Przegląd techniczny', 'APPROVAL', ['engineer', 'quality'], 72, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie przez Chief Engineer', 'APPROVAL', ['chief_engineer', 'owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Powiadomienie produkcji', 'NOTIFY', ['system'], 24, 'SUBMITTED', 'APPROVED'),
      S('step-4', 4, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'SUBMITTED'),
    ],
  },
  CALIBRATION_RECORD: {
    name: 'Karta kalibracji',
    steps: [
      S('step-1', 1, 'Weryfikacja kalibracji przez Quality', 'APPROVAL', ['quality', 'technician'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Archiwizacja karty', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  // ── Sector-specific ────────────────────────────────────────────────────────
  INSPECTION_REPORT: {
    name: 'Protokół z inspekcji',
    steps: [
      S('step-1', 1, 'Weryfikacja przez inspekcję wewnętrzną', 'APPROVAL', ['inspector', 'manager'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie wyników', 'APPROVAL', ['owner'], 48, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
  TRANSPORT_ORDER: {
    name: 'Zlecenie transportowe',
    steps: [
      S('step-1', 1, 'Zatwierdzenie przez logistykę', 'APPROVAL', ['logistics', 'manager'], 24, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Potwierdzenie dostawy', 'APPROVAL', ['warehouse'], 168, 'GOODS_RECEIVED', 'APPROVED'),
      S('step-3', 3, 'Zaksięgowanie', 'BOOK', ['accountant'], 48, 'BOOKED', 'GOODS_RECEIVED'),
      S('step-4', 4, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  CUSTOMS_DECLARATION: {
    name: 'Zgłoszenie celne',
    steps: [
      S('step-1', 1, 'Weryfikacja przez agenta celnego', 'APPROVAL', ['customs_agent', 'logistics'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zatwierdzenie zarządu', 'APPROVAL', ['owner'], 24, 'APPROVED', 'REJECTED'),
      S('step-3', 3, 'Zaksięgowanie', 'BOOK', ['accountant'], 72, 'BOOKED', 'APPROVED'),
      S('step-4', 4, 'Archiwizacja WORM', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'BOOKED'),
    ],
  },
  INSURANCE_CLAIM: {
    name: 'Roszczenie ubezpieczeniowe',
    steps: [
      S('step-1', 1, 'Weryfikacja szkody przez managera', 'APPROVAL', ['manager', 'owner'], 24, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Zgłoszenie do ubezpieczyciela', 'NOTIFY', ['backoffice'], 48, 'CLAIM_FILED', 'APPROVED'),
      S('step-3', 3, 'Obsługa roszczenia', 'APPROVAL', ['legal', 'owner'], 720, 'CLAIM_APPROVED', 'CLAIM_REJECTED'),
      S('step-4', 4, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'CLAIM_APPROVED'),
    ],
  },
  LEASE_AGREEMENT: {
    name: 'Umowa najmu',
    steps: LEGAL_APPROVE_ARCHIVE(),
  },
  CUSTOM: {
    name: 'Własny flow',
    steps: [
      S('step-1', 1, 'Zatwierdzenie', 'APPROVAL', ['manager'], 48, 'APPROVED', 'REJECTED'),
      S('step-2', 2, 'Archiwizacja', 'ARCHIVE', ['system'], undefined, 'ARCHIVED', 'APPROVED'),
    ],
  },
};

function StepRow({
  step,
  index,
  onChange,
  onRemove,
}: {
  step: WorkflowStepDef;
  index: number;
  onChange: (s: WorkflowStepDef) => void;
  onRemove: () => void;
}) {
  const config = STEP_TYPE_CONFIG[step.type];
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 group transition-colors">
      <div className="mt-1 text-slate-300 cursor-grab group-hover:text-slate-400">
        <GripVertical size={16} />
      </div>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={step.label}
          onChange={e => onChange({ ...step, label: e.target.value })}
          className="col-span-2 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500"
          placeholder="Nazwa kroku"
        />
        <select
          value={step.type}
          onChange={e => onChange({ ...step, type: e.target.value as WorkflowStepType })}
          className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
        >
          {(Object.keys(STEP_TYPE_CONFIG) as WorkflowStepType[]).map(t => (
            <option key={t} value={t}>{STEP_TYPE_CONFIG[t].label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase">SLA (h)</span>
          <input
            type="number"
            value={step.timeoutHours ?? ''}
            onChange={e => onChange({ ...step, timeoutHours: e.target.value ? Number(e.target.value) : undefined })}
            className="w-20 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
            placeholder="—"
          />
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">Role (przecinek)</span>
          <input
            value={step.requiredRoles.join(', ')}
            onChange={e => onChange({ ...step, requiredRoles: e.target.value.split(',').map(r => r.trim()).filter(Boolean) })}
            className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
            placeholder="manager, owner"
          />
        </div>
      </div>
      <button
        onClick={onRemove}
        className="mt-1 p-2 text-slate-200 hover:text-red-400 transition-colors rounded-xl hover:bg-red-50 flex-shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function WorkflowTemplateEditor() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType>('OUT_OF_POCKET');
  const [steps, setSteps] = useState<WorkflowStepDef[]>(DEFAULT_STEPS['OUT_OF_POCKET']!.steps);
  const [templateName, setTemplateName] = useState(DEFAULT_STEPS['OUT_OF_POCKET']!.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!activeTenantId) return;
    listTemplates(activeTenantId).then(setTemplates);
  }, [activeTenantId]);

  const addStep = () => {
    const newStep: WorkflowStepDef = {
      id: `step-${Date.now()}`,
      order: steps.length + 1,
      label: 'Nowy krok',
      type: 'APPROVAL',
      requiredRoles: ['manager'],
      onApprove: 'APPROVED',
      onReject: 'REJECTED',
    };
    setSteps(prev => [...prev, newStep]);
  };

  const updateStep = (index: number, updated: WorkflowStepDef) => {
    setSteps(prev => prev.map((s, i) => (i === index ? updated : s)));
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!activeTenantId || !user) return;
    setSaving(true);
    await saveTemplate(activeTenantId, user.uid, {
      tenantId: activeTenantId,
      documentType: selectedType,
      name: templateName,
      steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
      isDefault: true,
      createdBy: user.uid,
    });
    const updated = await listTemplates(activeTenantId);
    setTemplates(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={18} className="text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
            Admin — Szablony Workflow
          </span>
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter italic">
          Definicja Przepływów
        </h2>
        <p className="text-slate-400 text-sm mt-2">
          Każdy typ dokumentu może mieć własne kroki, role i SLA.
        </p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Typ dokumentu
            </label>
            <select
              value={selectedType}
              onChange={e => {
                const t = e.target.value as DocumentType;
                setSelectedType(t);
                const def = DEFAULT_STEPS[t] ?? DEFAULT_STEPS['CUSTOM']!;
                setSteps(def.steps);
                setTemplateName(def.name);
              }}
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {DOCUMENT_TYPES.map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Nazwa szablonu
            </label>
            <input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              index={index}
              onChange={s => updateStep(index, s)}
              onRemove={() => removeStep(index)}
            />
          ))}
        </div>

        <button
          onClick={addStep}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
        >
          <Plus size={16} /> Dodaj krok
        </button>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-xl"
          >
            <Save size={14} />
            {saved ? 'Zapisano!' : saving ? 'Zapisuję...' : 'Zapisz szablon'}
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-4">
            Zdefiniowane szablony ({templates.length})
          </h3>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-sm font-black text-slate-800">{t.name}</span>
                  <span className="ml-3 text-[9px] font-black text-slate-400 uppercase">
                    {DOC_TYPE_LABELS[t.documentType]} • {t.steps.length} kroków
                  </span>
                </div>
                {t.isDefault && (
                  <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase">
                    Domyślny
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
