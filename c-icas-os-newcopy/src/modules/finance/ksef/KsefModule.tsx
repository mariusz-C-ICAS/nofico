/**
 * Data: 2026-05-16
 * Zmiany: Dodano tab settings z konfiguracją, pobieraniem i wysyłką faktur KSeF.
 * Sciezka: /src/modules/finance/ksef/KsefModule.tsx
 */
import React, { useState } from 'react';
import {
  Download, Send, Activity, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import KsefStatusBanner from './KsefStatusBanner';
import KsefInvoiceList from './KsefInvoiceList';
import KsefAuthModal from './KsefAuthModal';
import {
  initKsefSession,
  fetchReceivedInvoices,
  sendInvoicesToKsef,
  KsefAuthError,
  KsefApiError,
  type KsefSession,
} from '../services/ksefService';
import { useTenant } from '../../../shared/hooks/useTenant';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type KsefTab = 'sent' | 'received' | 'settings';
type ToastState = { type: 'success' | 'error'; message: string } | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
        toast.type === 'success'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {toast.type === 'success'
        ? <CheckCircle2 size={16} />
        : <AlertCircle size={16} />}
      {toast.message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------
interface SettingsTabProps {
  tenantId: string;
}

function SettingsTab({ tenantId }: SettingsTabProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function getActiveSession(): Promise<KsefSession | null> {
    const credSnap = await getDoc(doc(db, `tenants/${tenantId}/ksefCredentials/main`));
    if (!credSnap.exists()) return null;
    const cred = credSnap.data() as {
      nip?: string;
      tokenHash?: string;
      environment?: string;
    };
    if (!cred.nip || !cred.tokenHash) return null;
    const token = atob(cred.tokenHash);
    const environment = (cred.environment ?? 'sandbox') as 'sandbox' | 'production';
    return initKsefSession(tenantId, { nip: cred.nip, token, environment });
  }

  async function handleFetchInvoices() {
    setFetching(true);
    try {
      const session = await getActiveSession();
      if (!session) {
        showToast('error', 'Brak konfiguracji KSeF. Skonfiguruj polaczenie najpierw.');
        return;
      }
      const now = new Date();
      const dateTo = now.toISOString().slice(0, 10);
      const dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const invoices = await fetchReceivedInvoices(tenantId, dateFrom, dateTo, session);
      showToast('success', `Pobrano ${invoices.length} faktur z KSeF (ostatnie 30 dni).`);
    } catch (err) {
      if (err instanceof KsefAuthError) {
        showToast('error', 'Blad autoryzacji KSeF. Sprawdz konfiguracje.');
      } else if (err instanceof KsefApiError) {
        showToast('error', `Blad API KSeF (${err.statusCode}).`);
      } else {
        showToast('error', 'Blad polaczenia z KSeF.');
      }
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm space-y-6">
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Konfiguracja
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic">
            Autoryzacja KSeF MF
          </h3>
        </div>

        <p className="text-sm text-slate-500">
          Skonfiguruj NIP podmiotu i token API z portalu KSeF MF. Token jest przechowywany
          w trybie base64 w Firestore — nie jest wysylany na zewnetrzne serwery.
        </p>

        <button
          onClick={() => setAuthModalOpen(true)}
          className="flex items-center gap-3 px-6 py-4 bg-slate-900 hover:bg-slate-700 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-colors"
        >
          <Activity size={16} />
          Konfiguruj polaczenie KSeF
        </button>
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm space-y-6">
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Synchronizacja
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic">
            Operacje KSeF
          </h3>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleFetchInvoices}
            disabled={fetching}
            className="flex items-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-colors"
          >
            {fetching
              ? <Loader2 size={16} className="animate-spin" />
              : <Download size={16} />}
            Pobierz faktury (30 dni)
          </button>
        </div>

        <Toast toast={toast} />
      </div>

      <KsefAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        tenantId={tenantId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SentTab — wybor faktur i wysylka do KSeF
// ---------------------------------------------------------------------------
interface SentTabProps {
  tenantId: string;
}

function SentTab({ tenantId }: SentTabProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleSend() {
    if (selectedIds.length === 0) {
      showToast('error', 'Zaznacz faktury do wyslania.');
      return;
    }
    setSending(true);
    try {
      const credSnap = await getDoc(doc(db, `tenants/${tenantId}/ksefCredentials/main`));
      if (!credSnap.exists()) {
        showToast('error', 'Brak konfiguracji KSeF. Skonfiguruj w zakladce Konfiguracja.');
        return;
      }
      const cred = credSnap.data() as {
        nip?: string;
        tokenHash?: string;
        environment?: string;
      };
      if (!cred.nip || !cred.tokenHash) {
        showToast('error', 'Brak NIP lub tokenu. Skonfiguruj KSeF.');
        return;
      }
      const token = atob(cred.tokenHash);
      const environment = (cred.environment ?? 'sandbox') as 'sandbox' | 'production';
      const session = await initKsefSession(tenantId, {
        nip: cred.nip,
        token,
        environment,
      });
      const results = await sendInvoicesToKsef(tenantId, selectedIds, session);
      const sent = results.filter((r) => r.referenceNumber).length;
      showToast('success', `Wyslano ${sent} z ${results.length} faktur do KSeF.`);
      setSelectedIds([]);
    } catch (err) {
      if (err instanceof KsefAuthError) {
        showToast('error', 'Blad autoryzacji KSeF.');
      } else if (err instanceof KsefApiError) {
        showToast('error', `Blad API KSeF (${err.statusCode}).`);
      } else {
        showToast('error', 'Blad wysylki do KSeF.');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
          Zaznaczono: {selectedIds.length}
        </span>
        <button
          onClick={handleSend}
          disabled={sending || selectedIds.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors"
        >
          {sending
            ? <Loader2 size={14} className="animate-spin" />
            : <Send size={14} />}
          Wyslij do KSeF
        </button>
      </div>

      <Toast toast={toast} />

      {/* Lista faktur — KsefInvoiceList renderuje sales type */}
      <KsefInvoiceList type="sales" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main KsefModule
// ---------------------------------------------------------------------------
export default function KsefModule() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? 'default';
  const [activeTab, setActiveTab] = useState<KsefTab>('received');

  const tabs: { id: KsefTab; label: string; Icon: typeof Download }[] = [
    { id: 'received', label: 'Faktury Zakupowe', Icon: Download },
    { id: 'sent', label: 'Wyslane (Przychody)', Icon: Send },
    { id: 'settings', label: 'Konfiguracja', Icon: Activity },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <KsefStatusBanner />

      <div className="flex p-2 bg-slate-100 rounded-[2rem] w-fit">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.75rem] transition-all text-[11px] font-black uppercase tracking-widest ${
              activeTab === id
                ? 'bg-white text-slate-900 shadow-xl scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'received' && (
          <KsefInvoiceList type="purchase" />
        )}
        {activeTab === 'sent' && (
          <SentTab tenantId={tenantId} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab tenantId={tenantId} />
        )}
      </div>
    </div>
  );
}
