import React, { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { subscribeAutomationRules, saveAutomationRule, toggleAutomationRule, deleteAutomationRule } from '../services/crmService';
import type { AutomationRule, AutomationTrigger, AutomationAction, TaskType, TaskPriority } from '../types';

interface Props { tenantId: string }

const TRIGGER_META: Record<AutomationTrigger, { label: string; desc: string; hasValue: boolean }> = {
  no_activity_days:     { label: 'Brak aktywności',      desc: 'X dni bez kontaktu',           hasValue: true },
  deal_moved:           { label: 'Deal przesunięty',      desc: 'Do wybranego etapu',            hasValue: false },
  service_count_reached: { label: 'Liczba wizyt',         desc: 'Po X wizytach serwisowych',    hasValue: true },
  deal_won:             { label: 'Deal wygrany',          desc: 'Po zamknięciu sprzedaży',       hasValue: false },
  deal_lost:            { label: 'Deal utracony',         desc: 'Po stracie szansy',             hasValue: false },
};

const ACTION_META: Record<AutomationAction, { label: string }> = {
  create_task:  { label: 'Utwórz zadanie' },
  send_email:   { label: 'Wyślij email' },
  add_tag:      { label: 'Dodaj tag' },
  flag_upsell:  { label: 'Oznacz upsell' },
};

const DEFAULT_RULE: Omit<AutomationRule, 'id' | 'createdAt' | 'runCount'> = {
  tenantId: '',
  name: '',
  isActive: true,
  trigger: 'no_activity_days',
  triggerValue: 30,
  action: 'create_task',
  actionPayload: { taskTitle: 'Follow-up z klientem', taskType: 'follow_up', taskPriority: 'medium', daysUntilDue: 1 },
};

export default function AutomationRules({ tenantId }: Props) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_RULE, tenantId });

  useEffect(() => {
    return subscribeAutomationRules(tenantId, r => { setRules(r); setLoading(false); });
  }, [tenantId]);

  const upd = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const updPayload = (k: string, v: any) => setForm(p => ({ ...p, actionPayload: { ...p.actionPayload, [k]: v } }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await saveAutomationRule(tenantId, { ...form, tenantId });
    setForm({ ...DEFAULT_RULE, tenantId });
    setShowForm(false);
    setSaving(false);
  };

  const tm = TRIGGER_META;
  const am = ACTION_META;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Automatyzacje CRM</h3>
          <p className="text-xs text-slate-500 mt-0.5">{rules.filter(r => r.isActive).length} aktywnych reguł</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest">
          <Plus size={13} /> Nowa reguła
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
          <input value={form.name} onChange={e => upd('name', e.target.value)}
            placeholder="Nazwa reguły *"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Wyzwalacz</p>
              <select value={form.trigger} onChange={e => upd('trigger', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {(Object.entries(tm) as [AutomationTrigger, any][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} — {v.desc}</option>
                ))}
              </select>
              {tm[form.trigger].hasValue && (
                <input type="number" value={form.triggerValue ?? ''} onChange={e => upd('triggerValue', parseInt(e.target.value))}
                  placeholder="Wartość (liczba)"
                  className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
              )}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Akcja</p>
              <select value={form.action} onChange={e => upd('action', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {(Object.entries(am) as [AutomationAction, any][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.action === 'create_task' && (
            <div className="grid grid-cols-3 gap-3">
              <input value={form.actionPayload.taskTitle ?? ''} onChange={e => updPayload('taskTitle', e.target.value)}
                placeholder="Tytuł zadania"
                className="col-span-3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
              <select value={form.actionPayload.taskType ?? 'follow_up'} onChange={e => updPayload('taskType', e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                {(['call','email','meeting','follow_up','proposal'] as TaskType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={form.actionPayload.taskPriority ?? 'medium'} onChange={e => updPayload('taskPriority', e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                {(['low','medium','high'] as TaskPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="number" value={form.actionPayload.daysUntilDue ?? 1} onChange={e => updPayload('daysUntilDue', parseInt(e.target.value))}
                placeholder="Dni na wykonanie"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
          )}
          {form.action === 'add_tag' && (
            <input value={form.actionPayload.tag ?? ''} onChange={e => updPayload('tag', e.target.value)}
              placeholder="Nazwa tagu"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-400 px-3 py-1.5">Anuluj</button>
            <button onClick={handleSave} disabled={!form.name || saving}
              className="flex items-center gap-1.5 bg-indigo-600 disabled:opacity-40 text-white font-black text-xs px-5 py-2 rounded-xl">
              {saving && <RefreshCw size={10} className="animate-spin" />}
              Zapisz regułę
            </button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin" /></div>}

      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${rule.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${rule.isActive ? 'bg-indigo-100' : 'bg-slate-100'}`}>
              <Zap size={14} className={rule.isActive ? 'text-indigo-600' : 'text-slate-400'} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-slate-800">{rule.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Gdy <span className="font-bold text-indigo-600">{tm[rule.trigger]?.label}</span>
                {rule.triggerValue ? ` (${rule.triggerValue})` : ''}
                {' → '}
                <span className="font-bold text-emerald-600">{am[rule.action]?.label}</span>
                {rule.actionPayload.taskTitle ? ` "${rule.actionPayload.taskTitle}"` : ''}
              </p>
              {rule.runCount > 0 && <p className="text-[9px] text-slate-400 mt-0.5">Wykonano {rule.runCount}×</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => toggleAutomationRule(tenantId, rule.id, !rule.isActive)}>
                {rule.isActive
                  ? <ToggleRight size={20} className="text-indigo-600" />
                  : <ToggleLeft size={20} className="text-slate-400" />
                }
              </button>
              <button onClick={() => deleteAutomationRule(tenantId, rule.id)}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!loading && rules.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Brak reguł automatyzacji. Dodaj pierwszą aby zautomatyzować follow-upy.</p>
        )}
      </div>

      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex gap-3">
        <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-700">
          Reguły są zapisywane w Firestore. Wykonanie wymaga Cloud Function lub procesu cyklicznego po stronie serwera — reguły nie są uruchamiane automatycznie w przeglądarce.
        </p>
      </div>
    </div>
  );
}
