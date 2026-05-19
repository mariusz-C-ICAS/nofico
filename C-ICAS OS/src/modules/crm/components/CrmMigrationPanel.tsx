import React, { useState } from 'react';
import { Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import {
  getHubSpotConfig,
  fetchHubSpotContacts,
  getPipedriveConfig,
  fetchPipedrivePersons,
  importContactsToCRM,
  type ImportContact,
  type CrmImportSource,
} from '../services/crmMigrationService';

interface Props {
  tenantId: string;
}

type ActiveTab = 'hubspot' | 'pipedrive';
type Phase = 'idle' | 'fetching' | 'preview' | 'importing' | 'done' | 'error';

interface ImportState {
  phase: Phase;
  contacts: ImportContact[];
  selected: Set<number>;
  result?: { imported: number; skipped: number };
  error?: string;
}

const INIT: ImportState = {
  phase: 'idle',
  contacts: [],
  selected: new Set(),
};

function ContactRow({
  contact,
  checked,
  onToggle,
}: {
  contact: ImportContact;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0">
      <input type="checkbox" checked={checked} onChange={onToggle} className="rounded accent-indigo-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{contact.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{contact.email} {contact.company ? `· ${contact.company}` : ''}</p>
      </div>
    </label>
  );
}

export default function CrmMigrationPanel({ tenantId }: Props) {
  const [tab, setTab] = useState<ActiveTab>('hubspot');
  const [state, setState] = useState<ImportState>(INIT);

  const reset = () => setState(INIT);

  const handleFetch = async () => {
    setState({ phase: 'fetching', contacts: [], selected: new Set() });
    try {
      let contacts: ImportContact[];
      if (tab === 'hubspot') {
        const token = await getHubSpotConfig(tenantId);
        if (!token) throw new Error('Brak konfiguracji HubSpot — dodaj w Integracjach.');
        contacts = await fetchHubSpotContacts(token);
      } else {
        const token = await getPipedriveConfig(tenantId);
        if (!token) throw new Error('Brak konfiguracji Pipedrive — dodaj w Integracjach.');
        contacts = await fetchPipedrivePersons(token);
      }
      const selected = new Set(contacts.map((_, i) => i));
      setState({ phase: 'preview', contacts, selected });
    } catch (err) {
      setState({ phase: 'error', contacts: [], selected: new Set(), error: String(err) });
    }
  };

  const toggleAll = () => {
    setState(prev => {
      const allSelected = prev.selected.size === prev.contacts.length;
      return {
        ...prev,
        selected: allSelected ? new Set() : new Set(prev.contacts.map((_, i) => i)),
      };
    });
  };

  const toggleOne = (i: number) => {
    setState(prev => {
      const next = new Set(prev.selected);
      next.has(i) ? next.delete(i) : next.add(i);
      return { ...prev, selected: next };
    });
  };

  const handleImport = async () => {
    const toImport = state.contacts.filter((_, i) => state.selected.has(i));
    setState(prev => ({ ...prev, phase: 'importing' }));
    try {
      const result = await importContactsToCRM(tenantId, toImport, tab as CrmImportSource);
      setState(prev => ({ ...prev, phase: 'done', result }));
    } catch (err) {
      setState(prev => ({ ...prev, phase: 'error', error: String(err) }));
    }
  };

  const tabBtnClass = (t: ActiveTab) =>
    `flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
      tab === t ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
          <Upload size={18} className="text-indigo-700" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter">Import kontaktow z CRM</h3>
          <p className="text-[10px] text-slate-400">HubSpot lub Pipedrive — z deduplikacja po emailu</p>
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex p-1 bg-slate-100 rounded-[2rem]">
        <button className={tabBtnClass('hubspot')} onClick={() => { setTab('hubspot'); reset(); }}>
          HubSpot
        </button>
        <button className={tabBtnClass('pipedrive')} onClick={() => { setTab('pipedrive'); reset(); }}>
          Pipedrive
        </button>
      </div>

      {/* Idle / fetch button */}
      {(state.phase === 'idle' || state.phase === 'error') && (
        <div className="space-y-3">
          {state.phase === 'error' && (
            <div className="flex items-center gap-2 text-[11px] text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
              <AlertTriangle size={12} className="flex-shrink-0" /> {state.error}
            </div>
          )}
          <button
            onClick={handleFetch}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-3 rounded-xl"
          >
            <Download size={14} /> Pobierz kontakty z {tab === 'hubspot' ? 'HubSpot' : 'Pipedrive'}
          </button>
        </div>
      )}

      {/* Fetching */}
      {state.phase === 'fetching' && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 py-4">
          <RefreshCw size={13} className="animate-spin" /> Pobieranie kontaktow...
        </div>
      )}

      {/* Preview */}
      {state.phase === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              Znaleziono <span className="font-black text-slate-800">{state.contacts.length}</span> kontaktow
            </p>
            <button onClick={toggleAll} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">
              {state.selected.size === state.contacts.length ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
            </button>
          </div>
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
            {state.contacts.map((c, i) => (
              <ContactRow key={i} contact={c} checked={state.selected.has(i)} onToggle={() => toggleOne(i)} />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="border border-slate-200 text-slate-500 font-black text-xs px-5 py-2.5 rounded-xl">
              Anuluj
            </button>
            <button
              onClick={handleImport}
              disabled={state.selected.size === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-6 py-2.5 rounded-xl"
            >
              <Upload size={13} /> Importuj zaznaczonych ({state.selected.size})
            </button>
          </div>
        </div>
      )}

      {/* Importing */}
      {state.phase === 'importing' && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 py-4">
          <RefreshCw size={13} className="animate-spin" /> Importowanie...
        </div>
      )}

      {/* Done */}
      {state.phase === 'done' && state.result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-slate-900">Import zakonczony</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Zaimportowano <span className="font-black text-emerald-700">{state.result.imported}</span> kontaktow
                {state.result.skipped > 0 && (
                  <> · <span className="font-black text-slate-500">{state.result.skipped}</span> pominieto (duplikaty)</>
                )}
              </p>
            </div>
          </div>
          <button onClick={reset} className="flex items-center gap-2 border border-slate-200 text-slate-500 font-black text-xs px-5 py-2.5 rounded-xl">
            <Users size={13} /> Importuj ponownie
          </button>
        </div>
      )}
    </div>
  );
}
