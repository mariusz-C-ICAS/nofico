import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Info, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  getTwilioConfig,
  sendSms,
  subscribeSmsHistory,
  saveSmsToCrm,
  type TwilioConfig,
  type CrmSmsMessage,
  type SmsStatus,
} from '../services/crmSmsService';

interface Props {
  tenantId: string;
  customerId: string;
  customerPhone: string;
}

type ConfigState = 'loading' | 'missing' | 'ready';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusIcon({ status }: { status: SmsStatus }) {
  if (status === 'delivered') return <CheckCircle2 size={11} className="text-emerald-500" />;
  if (status === 'failed') return <XCircle size={11} className="text-red-500" />;
  return <Clock size={11} className="text-slate-400" />;
}

export default function SmsCrmPanel({ tenantId, customerId, customerPhone }: Props) {
  const [cfg, setCfg] = useState<TwilioConfig | null>(null);
  const [configState, setConfigState] = useState<ConfigState>('loading');
  const [messages, setMessages] = useState<CrmSmsMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTwilioConfig(tenantId).then(config => {
      setCfg(config);
      setConfigState(config ? 'ready' : 'missing');
    });
  }, [tenantId]);

  useEffect(() => {
    if (configState !== 'ready') return;
    const unsub = subscribeSmsHistory(tenantId, customerId, setMessages);
    return unsub;
  }, [tenantId, customerId, configState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (configState === 'loading') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-400 py-4">
        <RefreshCw size={11} className="animate-spin" /> Ladowanie konfiguracji Twilio...
      </div>
    );
  }

  if (configState === 'missing') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3">
        <Info size={12} className="flex-shrink-0 text-slate-400" />
        Skonfiguruj Twilio w Integracjach (format klucza: AccountSID:AuthToken), aby wyslac SMS.
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || !cfg) return;
    setSending(true);
    setSendError(null);
    const body = input.trim();
    setInput('');

    const ok = await sendSms(cfg.accountSid, cfg.authToken, customerPhone, body);
    const status: SmsStatus = ok ? 'sent' : 'failed';

    await saveSmsToCrm(tenantId, customerId, {
      customerId,
      direction: 'sent',
      body,
      status,
      timestamp: Date.now(),
      to: customerPhone,
    });

    if (!ok) {
      setSendError('Blad wysylania SMS. Sprawdz konfiguracje Twilio.');
      setInput(body);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white" style={{ height: 420 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 text-white">
        <MessageSquare size={16} />
        <span className="text-xs font-black uppercase tracking-widest">Historia SMS — Twilio</span>
        <span className="ml-auto text-[10px] opacity-60">{customerPhone}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
        {messages.length === 0 && (
          <p className="text-center text-[11px] text-slate-400 mt-8">Brak wiadomosci SMS dla tego klienta.</p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${
                msg.direction === 'sent'
                  ? 'bg-slate-800 text-white rounded-br-sm'
                  : 'bg-white text-slate-900 rounded-bl-sm border border-slate-200'
              }`}
            >
              <p className="text-sm leading-snug">{msg.body}</p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <p className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</p>
                {msg.direction === 'sent' && <StatusIcon status={msg.status} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {sendError && (
        <div className="px-4 py-1 text-[10px] text-red-600 bg-red-50 border-t border-red-100">
          {sendError}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-slate-200 bg-white">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Wpisz SMS..."
          maxLength={160}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
        />
        <span className="self-center text-[10px] text-slate-400 min-w-[2rem] text-right">
          {input.length}/160
        </span>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl transition-all flex-shrink-0"
        >
          {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
