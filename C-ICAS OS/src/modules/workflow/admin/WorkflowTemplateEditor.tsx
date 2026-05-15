import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, Save, GripVertical, ChevronDown, Settings,
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

const DEFAULT_STEPS: Record<DocumentType, { name: string; steps: WorkflowStepDef[] }> = {
  OUT_OF_POCKET: {
    name: 'Domyślny flow Out-of-Pocket',
    steps: [
      { id: 'step-1', order: 1, label: 'Zatwierdzenie przez managera', type: 'APPROVAL', requiredRoles: ['manager', 'owner'], timeoutHours: 48, onApprove: 'APPROVED', onReject: 'REJECTED' },
      { id: 'step-2', order: 2, label: 'Weryfikacja faktury KSeF', type: 'KSEF_VERIFY', requiredRoles: ['system'], timeoutHours: 24, onApprove: 'KSEF_VERIFIED', onReject: 'APPROVED' },
      { id: 'step-3', order: 3, label: 'Zaksięgowanie wydatku', type: 'BOOK', requiredRoles: ['accountant', 'owner'], timeoutHours: 72, onApprove: 'BOOKED', onReject: 'APPROVED' },
      { id: 'step-4', order: 4, label: 'Zwrot pracownikowi', type: 'SETTLE', requiredRoles: ['accountant', 'hr'], timeoutHours: 72, onApprove: 'SETTLED', onReject: 'BOOKED' },
      { id: 'step-5', order: 5, label: 'Archiwizacja do Skarbca', type: 'ARCHIVE', requiredRoles: ['system'], onApprove: 'ARCHIVED', onReject: 'SETTLED' },
    ],
  },
  VENDOR_INVOICE: {
    name: 'Faktura od dostawcy',
    steps: [
      { id: 'step-1', order: 1, label: 'Weryfikacja faktury KSeF', type: 'KSEF_VERIFY', requiredRoles: ['system'], timeoutHours: 24, onApprove: 'KSEF_VERIFIED', onReject: 'REJECTED' },
      { id: 'step-2', order: 2, label: 'Zatwierdzenie przez managera', type: 'APPROVAL', requiredRoles: ['manager', 'owner'], timeoutHours: 48, onApprove: 'APPROVED', onReject: 'REJECTED' },
      { id: 'step-3', order: 3, label: 'Zaksięgowanie faktury', type: 'BOOK', requiredRoles: ['accountant'], timeoutHours: 72, onApprove: 'BOOKED', onReject: 'APPROVED' },
      { id: 'step-4', order: 4, label: 'Płatność do dostawcy', type: 'SETTLE', requiredRoles: ['accountant', 'owner'], timeoutHours: 72, onApprove: 'SETTLED', onReject: 'BOOKED' },
      { id: 'step-5', order: 5, label: 'Archiwizacja WORM', type: 'ARCHIVE', requiredRoles: ['system'], onApprove: 'ARCHIVED', onReject: 'SETTLED' },
    ],
  },
  TRAVEL_EXPENSE: {
    name: 'Delegacja służbowa',
    steps: [
      { id: 'step-1', order: 1, label: 'Zatwierdzenie delegacji przez managera', type: 'APPROVAL', requiredRoles: ['manager', 'owner'], timeoutHours: 48, onApprove: 'APPROVED', onReject: 'REJECTED' },
      { id: 'step-2', order: 2, label: 'Weryfikacja rachunków KSeF', type: 'KSEF_VERIFY', requiredRoles: ['system'], timeoutHours: 24, onApprove: 'KSEF_VERIFIED', onReject: 'APPROVED' },
      { id: 'step-3', order: 3, label: 'Zaksięgowanie delegacji', type: 'BOOK', requiredRoles: ['accountant'], timeoutHours: 72, onApprove: 'BOOKED', onReject: 'APPROVED' },
      { id: 'step-4', order: 4, label: 'Zwrot kosztów pracownikowi', type: 'SETTLE', requiredRoles: ['accountant', 'hr'], timeoutHours: 72, onApprove: 'SETTLED', onReject: 'BOOKED' },
      { id: 'step-5', order: 5, label: 'Archiwizacja', type: 'ARCHIVE', requiredRoles: ['system'], onApprove: 'ARCHIVED', onReject: 'SETTLED' },
    ],
  },
  CONTRACT: {
    name: 'Umowa',
    steps: [
      { id: 'step-1', order: 1, label: 'Przegląd prawny', type: 'APPROVAL', requiredRoles: ['legal', 'manager'], timeoutHours: 72, onApprove: 'APPROVED', onReject: 'REJECTED' },
      { id: 'step-2', order: 2, label: 'Zatwierdzenie przez zarząd', type: 'APPROVAL', requiredRoles: ['owner'], timeoutHours: 48, onApprove: 'APPROVED', onReject: 'REJECTED' },
      { id: 'step-3', order: 3, label: 'Archiwizacja WORM z datą wygaśnięcia', type: 'ARCHIVE', requiredRoles: ['system'], onApprove: 'ARCHIVED', onReject: 'APPROVED' },
    ],
  },
  PURCHASE_ORDER: {
    name: 'Zamówienie zakupu',
    steps: [
      { id: 'step-1', order: 1, label: 'Zatwierdzenie zakupu', type: 'APPROVAL', requiredRoles: ['manager', 'owner'], timeoutHours: 48, onApprove: 'APPROVED', onReject: 'REJECTED' },
      { id: 'step-2', order: 2, label: 'Zaksięgowanie zamówienia', type: 'BOOK', requiredRoles: ['accountant'], timeoutHours: 72, onApprove: 'BOOKED', onReject: 'APPROVED' },
      { id: 'step-3', order: 3, label: 'Archiwizacja', type: 'ARCHIVE', requiredRoles: ['system'], onApprove: 'ARCHIVED', onReject: 'BOOKED' },
    ],
  },
  TIMESHEET: {
    name: 'Karta czasu pracy',
    steps: [
      { id: 'step-1', order: 1, label: 'Zatwierdzenie przez managera', type: 'APPROVAL', requiredRoles: ['manager'], timeoutHours: 48, onApprove: 'APPROVED', onReject: 'REJECTED' },
      { id: 'step-2', order: 2, label: 'Naliczenie wynagrodzenia (HR)', type: 'BOOK', requiredRoles: ['hr', 'accountant'], timeoutHours: 72, onApprove: 'BOOKED', onReject: 'APPROVED' },
      { id: 'step-3', order: 3, label: 'Archiwizacja', type: 'ARCHIVE', requiredRoles: ['system'], onApprove: 'ARCHIVED', onReject: 'BOOKED' },
    ],
  },
  CUSTOM: {
    name: 'Własny flow',
    steps: [
      { id: 'step-1', order: 1, label: 'Zatwierdzenie', type: 'APPROVAL', requiredRoles: ['manager'], timeoutHours: 48, onApprove: 'APPROVED', onReject: 'REJECTED' },
      { id: 'step-2', order: 2, label: 'Archiwizacja', type: 'ARCHIVE', requiredRoles: ['system'], onApprove: 'ARCHIVED', onReject: 'APPROVED' },
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
  const [steps, setSteps] = useState<WorkflowStepDef[]>(DEFAULT_STEPS['OUT_OF_POCKET'].steps);
  const [templateName, setTemplateName] = useState(DEFAULT_STEPS['OUT_OF_POCKET'].name);
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
                setSteps(DEFAULT_STEPS[t].steps);
                setTemplateName(DEFAULT_STEPS[t].name);
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
