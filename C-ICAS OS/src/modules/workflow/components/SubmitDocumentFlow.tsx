import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Wallet, FileText, Truck, Clock, ShoppingCart, FileSignature, Layers, Camera, ShieldAlert,
  AlertOctagon, CalendarDays, Car, MonitorOff, Package,
} from 'lucide-react';
import SubmitProjectDeliveryWizard from './SubmitProjectDeliveryWizard';
import SubmitDamageClaimWizard from './SubmitDamageClaimWizard';
import SubmitBhpIncidentWizard from './SubmitBhpIncidentWizard';
import SubmitLeaveRequestWizard from './SubmitLeaveRequestWizard';
import SubmitVehicleIncidentWizard from './SubmitVehicleIncidentWizard';
import SubmitItIncidentWizard from './SubmitItIncidentWizard';
import SubmitAssetHandoverWizard from './SubmitAssetHandoverWizard';
import type { DocumentType } from '../types';
import { DOC_TYPE_LABELS } from '../types';
import SubmitExpenseWizard from './SubmitExpenseWizard';
import SubmitVendorInvoiceWizard from './SubmitVendorInvoiceWizard';
import SubmitTravelExpenseWizard from './SubmitTravelExpenseWizard';
import SubmitGenericDocumentWizard from './SubmitGenericDocumentWizard';

interface Props {
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

const DOC_TYPE_META: Record<DocumentType, { icon: React.ElementType; color: string; bg: string; description: string }> = {
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
  CUSTOM: { icon: Layers, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', description: 'Dowolny typ dokumentu wymagający obiegu zatwierdzeń.' },
};

const QUICK_TYPES: DocumentType[] = ['OUT_OF_POCKET', 'VENDOR_INVOICE', 'TRAVEL_EXPENSE', 'PROJECT_DELIVERY'];
const FIELD_TYPES: DocumentType[] = ['DAMAGE_CLAIM', 'BHP_INCIDENT', 'VEHICLE_INCIDENT'];
const HR_TYPES: DocumentType[] = ['LEAVE_REQUEST', 'ASSET_HANDOVER'];
const IT_TYPES: DocumentType[] = ['IT_INCIDENT'];
const OTHER_TYPES: DocumentType[] = ['TIMESHEET', 'PURCHASE_ORDER', 'CONTRACT', 'CUSTOM'];

export default function SubmitDocumentFlow({ onComplete, onCancel }: Props) {
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);

  if (selectedType === 'OUT_OF_POCKET') {
    return <SubmitExpenseWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'VENDOR_INVOICE') {
    return <SubmitVendorInvoiceWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'TRAVEL_EXPENSE') {
    return <SubmitTravelExpenseWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'PROJECT_DELIVERY') {
    return <SubmitProjectDeliveryWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'DAMAGE_CLAIM') {
    return <SubmitDamageClaimWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'BHP_INCIDENT') {
    return <SubmitBhpIncidentWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'LEAVE_REQUEST') {
    return <SubmitLeaveRequestWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'VEHICLE_INCIDENT') {
    return <SubmitVehicleIncidentWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'IT_INCIDENT') {
    return <SubmitItIncidentWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType === 'ASSET_HANDOVER') {
    return <SubmitAssetHandoverWizard onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }
  if (selectedType) {
    return <SubmitGenericDocumentWizard type={selectedType} onComplete={onComplete} onCancel={() => setSelectedType(null)} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nowy dokument</h3>
        <p className="text-slate-400 text-sm font-medium mt-1">Wybierz typ dokumentu, który chcesz złożyć do obiegu.</p>
      </div>

      {/* Quick types */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Najczęstsze</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_TYPES.map((type, i) => (
            <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />
          ))}
        </div>
      </div>

      {/* Field / on-site types */}
      <div>
        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-3">W terenie</p>
        <div className="grid grid-cols-1 gap-3">
          {FIELD_TYPES.map((type, i) => (
            <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />
          ))}
        </div>
      </div>

      {/* HR types */}
      <div>
        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3">HR / Pracownicy</p>
        <div className="grid grid-cols-2 gap-3">
          {HR_TYPES.map((type, i) => (
            <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />
          ))}
        </div>
      </div>

      {/* IT types */}
      <div>
        <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-3">IT / Bezpieczeństwo</p>
        <div className="grid grid-cols-1 gap-3">
          {IT_TYPES.map((type, i) => (
            <TypeCard key={type} type={type} index={i} onSelect={setSelectedType} />
          ))}
        </div>
      </div>

      {/* Other types */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Inne</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OTHER_TYPES.map((type, i) => (
            <TypeCard key={type} type={type} index={i} compact onSelect={setSelectedType} />
          ))}
        </div>
      </div>

      <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
        ← Anuluj
      </button>
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
      transition={{ delay: index * 0.06 }}
      onClick={() => onSelect(type)}
      className={`text-left border rounded-[2rem] p-5 transition-all hover:shadow-lg hover:scale-[1.02] ${meta.bg}`}
    >
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center mb-3 bg-white/80`}>
        <Icon size={16} className={meta.color} />
      </div>
      <p className={`text-xs font-black uppercase tracking-tight ${meta.color}`}>{DOC_TYPE_LABELS[type]}</p>
      {!compact && (
        <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-snug">{meta.description}</p>
      )}
    </motion.button>
  );
}
