import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Wallet, FileText, Truck, Clock, ShoppingCart, FileSignature, Layers, Camera, ShieldAlert,
  AlertOctagon, CalendarDays, Car, MonitorOff, Package,
  Banknote, ClipboardList, HardHat, FileMinus, PiggyBank, Receipt, Send, Scale,
  PackageCheck, PackageOpen, RotateCcw, Lock, Shield, CircleSlash, AlertCircle,
  Microscope, Eye, ShoppingBag, FileCheck, MessageSquareX, Tag, GitPullRequest,
  TriangleAlert, FolderCheck, HeartPulse, Pill, Factory, Wrench, Gauge, ClipboardCheck,
  Globe, Home, Package2,
} from 'lucide-react';
import SubmitProjectDeliveryWizard from './SubmitProjectDeliveryWizard';
import SubmitDamageClaimWizard from './SubmitDamageClaimWizard';
import SubmitBhpIncidentWizard from './SubmitBhpIncidentWizard';
import SubmitLeaveRequestWizard from './SubmitLeaveRequestWizard';
import SubmitVehicleIncidentWizard from './SubmitVehicleIncidentWizard';
import SubmitItIncidentWizard from './SubmitItIncidentWizard';
import SubmitAssetHandoverWizard from './SubmitAssetHandoverWizard';
import SubmitExpenseAdvanceWizard from './SubmitExpenseAdvanceWizard';
import SubmitQualityNcrWizard from './SubmitQualityNcrWizard';
import SubmitSubcontractorWizard from './SubmitSubcontractorWizard';
import SubmitWhistleblowerWizard from './SubmitWhistleblowerWizard';
import SubmitCustomerComplaintWizard from './SubmitCustomerComplaintWizard';
import SubmitPatientIncidentWizard from './SubmitPatientIncidentWizard';
import SubmitContractWizard from './SubmitContractWizard';
import SubmitTimesheetWizard from './SubmitTimesheetWizard';
import SubmitPurchaseOrderWizard from './SubmitPurchaseOrderWizard';
import SubmitCreditNoteWizard from './SubmitCreditNoteWizard';
import SubmitBudgetRequestWizard from './SubmitBudgetRequestWizard';
import SubmitNdaWizard from './SubmitNdaWizard';
import SubmitGdprRequestWizard from './SubmitGdprRequestWizard';
import SubmitSalesOrderWizard from './SubmitSalesOrderWizard';
import SubmitRfqWizard from './SubmitRfqWizard';
import SubmitGoodsReceiptWizard from './SubmitGoodsReceiptWizard';
import type { DocumentType } from '../types';
import { DOC_TYPE_LABELS } from '../types';
import SubmitExpenseWizard from './SubmitExpenseWizard';
import SubmitVendorInvoiceWizard from './SubmitVendorInvoiceWizard';
import SubmitTravelExpenseWizard from './SubmitTravelExpenseWizard';
import SubmitWriteOffWizard from './SubmitWriteOffWizard';
import SubmitTaxDocumentWizard from './SubmitTaxDocumentWizard';
import SubmitBidEvaluationWizard from './SubmitBidEvaluationWizard';
import SubmitGoodsIssueWizard from './SubmitGoodsIssueWizard';
import SubmitReturnMerchandiseWizard from './SubmitReturnMerchandiseWizard';
import SubmitPolicyExceptionWizard from './SubmitPolicyExceptionWizard';
import SubmitRegulatoryBreachWizard from './SubmitRegulatoryBreachWizard';
import SubmitAuditFindingWizard from './SubmitAuditFindingWizard';
import SubmitQuoteApprovalWizard from './SubmitQuoteApprovalWizard';
import SubmitDiscountApprovalWizard from './SubmitDiscountApprovalWizard';
import SubmitChangeRequestWizard from './SubmitChangeRequestWizard';
import SubmitRiskRegisterWizard from './SubmitRiskRegisterWizard';
import SubmitProjectClosureWizard from './SubmitProjectClosureWizard';
import SubmitMedicationErrorWizard from './SubmitMedicationErrorWizard';
import SubmitProductionOrderWizard from './SubmitProductionOrderWizard';
import SubmitEngineeringChangeWizard from './SubmitEngineeringChangeWizard';
import SubmitCalibrationRecordWizard from './SubmitCalibrationRecordWizard';
import SubmitInspectionReportWizard from './SubmitInspectionReportWizard';
import SubmitTransportOrderWizard from './SubmitTransportOrderWizard';
import SubmitCustomsDeclarationWizard from './SubmitCustomsDeclarationWizard';
import SubmitInsuranceClaimWizard from './SubmitInsuranceClaimWizard';
import SubmitLeaseAgreementWizard from './SubmitLeaseAgreementWizard';
import SubmitGenericDocumentWizard from './SubmitGenericDocumentWizard';

interface Props {
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

const DOC_TYPE_META: Record<DocumentType, { icon: React.ElementType; color: string; bg: string; description: string }> = {
  // Existing types
  OUT_OF_POCKET: { icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', description: 'Zakupy gotówką, kartą lub przelewem. Refundacja przez dział finansów.' },
  VENDOR_INVOICE: { icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', description: 'Faktura VAT od dostawcy. Weryfikacja KSeF, akceptacja przez FI.' },
  TRAVEL_EXPENSE: { icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', description: 'Delegacja krajowa lub zagraniczna z kalkulatorem diet.' },
  PROJECT_DELIVERY: { icon: Camera, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200', description: 'Zdjęcia i filmy z realizacji projektu. Dowód pracy, fakturowanie i publikacja na stronie.' },
  DAMAGE_CLAIM: { icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', description: 'Szkoda na budowie lub u klienta. Notatka głosowa + foto → szef → backoffice → ubezpieczyciel.' },
  BHP_INCIDENT: { icon: AlertOctagon, color: 'text-red-700', bg: 'bg-red-50 border-red-200', description: 'Wypadek przy pracy. Foto/wideo + notatka → BeHaPowiec + ubezpieczyciel + zarząd. WORM.' },
  VEHICLE_INCIDENT: { icon: Car, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', description: 'Kolizja lub wypadek pojazdu służbowego. Dowody foto → ubezpieczyciel.' },
  LEAVE_REQUEST: { icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', description: 'Urlop, L4, opieka nad dzieckiem, urlop bezpłatny — wniosek do przełożonego.' },
  IT_INCIDENT: { icon: MonitorOff, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', description: 'Awaria systemu, naruszenie bezpieczeństwa, incydent RODO — log audytowy.' },
  ASSET_HANDOVER: { icon: Package, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200', description: 'Wydanie / zwrot / transfer laptopa, telefonu, samochodu, sprzętu.' },
  TIMESHEET: { icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', description: 'Karta czasu pracy: godziny, projekty, zlecenia.' },
  PURCHASE_ORDER: { icon: ShoppingCart, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200', description: 'Zamówienie zakupu (PO) do akceptacji przed zakupem.' },
  CONTRACT: { icon: FileSignature, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', description: 'Umowa cywilnoprawna, umowa o dzieło, B2B — wymaga akceptacji prawnej.' },
  EXPENSE_ADVANCE: { icon: Banknote, color: 'text-green-600', bg: 'bg-green-50 border-green-200', description: 'Przedpłata przed podróżą lub zakupem — kwota + cel + termin rozliczenia.' },
  QUALITY_NCR: { icon: ClipboardList, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', description: 'Karta Niezgodności ISO 9001 — wykrycie, analiza, CAPA. Notatka głosowa Whisper.' },
  SUBCONTRACTOR_APPROVAL: { icon: HardHat, color: 'text-stone-600', bg: 'bg-stone-50 border-stone-200', description: 'Zatwierdzenie podwykonawcy (budownictwo, IT, logistyka) — NIP, zakres, ważność.' },
  // Finance
  CREDIT_NOTE: { icon: FileMinus, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', description: 'Faktura korygująca VAT — korekta kwoty, stawki lub danych. Weryfikacja KSeF.' },
  BUDGET_REQUEST: { icon: PiggyBank, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', description: 'Wniosek o przyznanie lub zmianę budżetu. Akceptacja managera i CFO.' },
  WRITE_OFF: { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', description: 'Odpisanie nieściągalnej należności. Wymaga zatwierdzenia zarządu i zaksięgowania.' },
  TAX_DOCUMENT: { icon: Receipt, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', description: 'Deklaracja podatkowa, JPK, informacja podatkowa — wymaga weryfikacji i archiwizacji.' },
  // Supply Chain
  RFQ: { icon: Send, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200', description: 'Zapytanie ofertowe do dostawców. Zatwierdzenie zakresu i wysyłka.' },
  BID_EVALUATION: { icon: Scale, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', description: 'Ocena i ranking ofert. Wybór najlepszego dostawcy z uzasadnieniem.' },
  GOODS_RECEIPT: { icon: PackageCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200', description: 'Przyjęcie towaru do magazynu (PZ). Weryfikacja ilości i stanu dostawy.' },
  GOODS_ISSUE: { icon: PackageOpen, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', description: 'Wydanie towaru z magazynu (WZ). Zatwierdzenie i zaksięgowanie.' },
  RETURN_MERCHANDISE: { icon: RotateCcw, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', description: 'Zwrot towaru do dostawcy. Dokumentacja przyczyny i korekta księgowa.' },
  // Legal & Compliance
  NDA: { icon: Lock, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', description: 'Umowa o zachowaniu poufności (NDA). Przegląd prawny + podpis zarządu.' },
  GDPR_REQUEST: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', description: 'Żądanie podmiotu danych (DSAR) — dostęp, usunięcie, przeniesienie. Termin 30 dni.' },
  POLICY_EXCEPTION: { icon: CircleSlash, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', description: 'Wyjątek od obowiązującej polityki. Wymaga akceptacji prawnej i zarządu.' },
  REGULATORY_BREACH: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', description: 'Naruszenie regulacyjne. Natychmiastowe dochodzenie + zgłoszenie do regulatora.' },
  AUDIT_FINDING: { icon: Microscope, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', description: 'Wynik audytu wewnętrznego lub zewnętrznego. Plan naprawczy i akceptacja.' },
  WHISTLEBLOWER: { icon: Eye, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', description: 'Zgłoszenie sygnalisty — anonimowe lub imienne. Ochrona prawna, termin 7/90 dni (Dyrektywa UE 2019/1937).' },
  // Sales & CRM
  SALES_ORDER: { icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', description: 'Zamówienie sprzedaży od klienta. Akceptacja przez Sales Manager i zaksięgowanie.' },
  QUOTE_APPROVAL: { icon: FileCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200', description: 'Zatwierdzenie oferty handlowej. Przy rabacie >20% wymagane zatwierdzenie zarządu.' },
  CUSTOMER_COMPLAINT: { icon: MessageSquareX, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', description: 'Reklamacja klienta — produkt, usługa, dostawa, fakturowanie. Termin rozwiązania 30 dni.' },
  DISCOUNT_APPROVAL: { icon: Tag, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', description: 'Zatwierdzenie rabatu handlowego. >30% wymaga CFO.' },
  // Project Management
  CHANGE_REQUEST: { icon: GitPullRequest, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', description: 'Zmiana zakresu, harmonogramu lub budżetu projektu. Analiza wpływu i akceptacja sponsora.' },
  RISK_REGISTER: { icon: TriangleAlert, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', description: 'Rejestracja i ocena ryzyka projektowego. Plan mitygacji zatwierdzony przez PM i zarząd.' },
  PROJECT_CLOSURE: { icon: FolderCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', description: 'Formalne zamknięcie projektu. Rozliczenie finansowe, lessons learned, archiwizacja.' },
  // Healthcare
  PATIENT_INCIDENT: { icon: HeartPulse, color: 'text-red-700', bg: 'bg-red-50 border-red-200', description: 'Zdarzenie niepożądane w opiece nad pacjentem. Obowiązkowe zgłoszenie do organów regulacyjnych.' },
  MEDICATION_ERROR: { icon: Pill, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', description: 'Błąd lekowy — zła dawka, lek, pacjent. Natychmiastowe działanie + zgłoszenie do URPL.' },
  // Manufacturing
  PRODUCTION_ORDER: { icon: Factory, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', description: 'Zlecenie produkcyjne — produkt, ilość, maszyna, zmiana. Akceptacja Production Manager.' },
  ENGINEERING_CHANGE: { icon: Wrench, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', description: 'ECO — zmiana inżynierska w produkcie lub procesie. Przegląd techniczny + powiadomienie produkcji.' },
  CALIBRATION_RECORD: { icon: Gauge, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200', description: 'Karta kalibracji przyrządu pomiarowego. Wyniki + termin następnej kalibracji. ISO wymagany.' },
  // Sector-specific
  INSPECTION_REPORT: { icon: ClipboardCheck, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', description: 'Protokół z inspekcji wewnętrznej lub zewnętrznej. Lista usterek + wynik PASS/FAIL.' },
  TRANSPORT_ORDER: { icon: Package2, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200', description: 'Zlecenie transportowe — przewoźnik, trasa, ładunek, termin dostawy.' },
  CUSTOMS_DECLARATION: { icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', description: 'Zgłoszenie celne importu/eksportu — kod HS, kraj pochodzenia, wartość celna.' },
  INSURANCE_CLAIM: { icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', description: 'Roszczenie ubezpieczeniowe — majątek, OC, D&O. Zgłoszenie do ubezpieczyciela.' },
  LEASE_AGREEMENT: { icon: Home, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', description: 'Umowa najmu nieruchomości lub sprzętu. Przegląd prawny + zatwierdzenie zarządu.' },
  CUSTOM: { icon: Layers, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', description: 'Dowolny typ dokumentu wymagający obiegu zatwierdzeń.' },
};

const QUICK_TYPES: DocumentType[] = ['OUT_OF_POCKET', 'VENDOR_INVOICE', 'TRAVEL_EXPENSE', 'PROJECT_DELIVERY'];
const FIELD_TYPES: DocumentType[] = ['DAMAGE_CLAIM', 'BHP_INCIDENT', 'VEHICLE_INCIDENT'];
const HR_TYPES: DocumentType[] = ['LEAVE_REQUEST', 'ASSET_HANDOVER'];
const IT_TYPES: DocumentType[] = ['IT_INCIDENT'];
const FINANCE_TYPES: DocumentType[] = ['EXPENSE_ADVANCE', 'CREDIT_NOTE', 'BUDGET_REQUEST', 'WRITE_OFF', 'TAX_DOCUMENT'];
const QUALITY_TYPES: DocumentType[] = ['QUALITY_NCR', 'SUBCONTRACTOR_APPROVAL', 'CALIBRATION_RECORD', 'INSPECTION_REPORT'];
const SUPPLY_TYPES: DocumentType[] = ['RFQ', 'BID_EVALUATION', 'GOODS_RECEIPT', 'GOODS_ISSUE', 'RETURN_MERCHANDISE'];
const LEGAL_TYPES: DocumentType[] = ['NDA', 'GDPR_REQUEST', 'POLICY_EXCEPTION', 'REGULATORY_BREACH', 'AUDIT_FINDING', 'WHISTLEBLOWER'];
const SALES_TYPES: DocumentType[] = ['SALES_ORDER', 'QUOTE_APPROVAL', 'CUSTOMER_COMPLAINT', 'DISCOUNT_APPROVAL'];
const PM_TYPES: DocumentType[] = ['CHANGE_REQUEST', 'RISK_REGISTER', 'PROJECT_CLOSURE'];
const HEALTHCARE_TYPES: DocumentType[] = ['PATIENT_INCIDENT', 'MEDICATION_ERROR'];
const MANUFACTURING_TYPES: DocumentType[] = ['PRODUCTION_ORDER', 'ENGINEERING_CHANGE'];
const OTHER_TYPES: DocumentType[] = ['TIMESHEET', 'PURCHASE_ORDER', 'CONTRACT', 'TRANSPORT_ORDER', 'CUSTOMS_DECLARATION', 'INSURANCE_CLAIM', 'LEASE_AGREEMENT', 'CUSTOM'];

export default function SubmitDocumentFlow({ onComplete, onCancel }: Props) {
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);

  if (selectedType === 'OUT_OF_POCKET') return <SubmitExpenseWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'VENDOR_INVOICE') return <SubmitVendorInvoiceWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'TRAVEL_EXPENSE') return <SubmitTravelExpenseWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'PROJECT_DELIVERY') return <SubmitProjectDeliveryWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'DAMAGE_CLAIM') return <SubmitDamageClaimWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'BHP_INCIDENT') return <SubmitBhpIncidentWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'LEAVE_REQUEST') return <SubmitLeaveRequestWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'VEHICLE_INCIDENT') return <SubmitVehicleIncidentWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'IT_INCIDENT') return <SubmitItIncidentWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'ASSET_HANDOVER') return <SubmitAssetHandoverWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'EXPENSE_ADVANCE') return <SubmitExpenseAdvanceWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'QUALITY_NCR') return <SubmitQualityNcrWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'SUBCONTRACTOR_APPROVAL') return <SubmitSubcontractorWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'WHISTLEBLOWER') return <SubmitWhistleblowerWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'CUSTOMER_COMPLAINT') return <SubmitCustomerComplaintWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'PATIENT_INCIDENT') return <SubmitPatientIncidentWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'CONTRACT') return <SubmitContractWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'TIMESHEET') return <SubmitTimesheetWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'PURCHASE_ORDER') return <SubmitPurchaseOrderWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'CREDIT_NOTE') return <SubmitCreditNoteWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'BUDGET_REQUEST') return <SubmitBudgetRequestWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'NDA') return <SubmitNdaWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'GDPR_REQUEST') return <SubmitGdprRequestWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'SALES_ORDER') return <SubmitSalesOrderWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'RFQ') return <SubmitRfqWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'GOODS_RECEIPT') return <SubmitGoodsReceiptWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'WRITE_OFF') return <SubmitWriteOffWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'TAX_DOCUMENT') return <SubmitTaxDocumentWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'BID_EVALUATION') return <SubmitBidEvaluationWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'GOODS_ISSUE') return <SubmitGoodsIssueWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'RETURN_MERCHANDISE') return <SubmitReturnMerchandiseWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'POLICY_EXCEPTION') return <SubmitPolicyExceptionWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'REGULATORY_BREACH') return <SubmitRegulatoryBreachWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'AUDIT_FINDING') return <SubmitAuditFindingWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'QUOTE_APPROVAL') return <SubmitQuoteApprovalWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'DISCOUNT_APPROVAL') return <SubmitDiscountApprovalWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'CHANGE_REQUEST') return <SubmitChangeRequestWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'RISK_REGISTER') return <SubmitRiskRegisterWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'PROJECT_CLOSURE') return <SubmitProjectClosureWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'MEDICATION_ERROR') return <SubmitMedicationErrorWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'PRODUCTION_ORDER') return <SubmitProductionOrderWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'ENGINEERING_CHANGE') return <SubmitEngineeringChangeWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'CALIBRATION_RECORD') return <SubmitCalibrationRecordWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'INSPECTION_REPORT') return <SubmitInspectionReportWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'TRANSPORT_ORDER') return <SubmitTransportOrderWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'CUSTOMS_DECLARATION') return <SubmitCustomsDeclarationWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'INSURANCE_CLAIM') return <SubmitInsuranceClaimWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType === 'LEASE_AGREEMENT') return <SubmitLeaseAgreementWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  if (selectedType) return <SubmitGenericDocumentWizard type={selectedType} onComplete={onComplete} onCancel={() => setSelectedType(null)} />;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nowy dokument</h3>
        <p className="text-slate-400 text-sm font-medium mt-1">Wybierz typ dokumentu, który chcesz złożyć do obiegu.</p>
      </div>

      <Section label="Najczęstsze" color="text-slate-400">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="W terenie" color="text-orange-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FIELD_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="HR / Pracownicy" color="text-blue-500">
        <div className="grid grid-cols-2 gap-3">
          {HR_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="IT / Bezpieczeństwo" color="text-violet-500">
        <div className="grid grid-cols-1 gap-3">
          {IT_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Finanse" color="text-green-500">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FINANCE_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Sprzedaż / CRM" color="text-blue-600">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SALES_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Łańcuch dostaw / Magazyn" color="text-cyan-600">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SUPPLY_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Jakość / Compliance" color="text-yellow-500">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUALITY_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Prawne / Regulacje" color="text-purple-500">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {LEGAL_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Zarządzanie projektami" color="text-violet-600">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PM_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Ochrona zdrowia" color="text-red-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HEALTHCARE_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Produkcja / Inżynieria" color="text-slate-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MANUFACTURING_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />)}
        </div>
      </Section>

      <Section label="Inne" color="text-slate-400">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OTHER_TYPES.map((type, i) => <TypeCard key={type} type={type} index={i} compact onSelect={setSelectedType} />)}
        </div>
      </Section>

      <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
        ← Anuluj
      </button>
    </div>
  );
}

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${color}`}>{label}</p>
      {children}
    </div>
  );
}

function TypeCard({ type, index, compact, onSelect }: { type: DocumentType; index: number; compact?: boolean; onSelect: (t: DocumentType) => void }) {
  const meta = DOC_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onSelect(type)}
      className={`text-left border rounded-[2rem] p-5 transition-all hover:shadow-lg hover:scale-[1.02] ${meta.bg}`}
    >
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-3 bg-white/80">
        <Icon size={16} className={meta.color} />
      </div>
      <p className={`text-xs font-black uppercase tracking-tight ${meta.color}`}>{DOC_TYPE_LABELS[type]}</p>
      {!compact && (
        <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-snug">{meta.description}</p>
      )}
    </motion.button>
  );
}
