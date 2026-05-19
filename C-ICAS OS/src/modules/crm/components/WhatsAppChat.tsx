import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Info, MessageCircle } from 'lucide-react';
import {
  getWhatsappConfig,
  sendMessage,
  subscribeConversationHistory,
  saveIncomingMessage,
  type WhatsAppConfig,
  type WhatsAppMessage,
} from '../services/whatsappService';

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

export default function WhatsAppChat({ tenantId, customerId, customerPhone }: Props) {
  const [cfg, setCfg] = useState<WhatsAppConfig | null>(null);
  const [configState, setConfigState] = useState<ConfigState>('loading');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getWhatsappConfig(tenantId).then(config => {
      setCfg(config);
      setConfigState(config ? 'ready' : 'missing');
    });
  }, [tenantId]);

  useEffect(() => {
    if (configState !== 'ready') return;
    const unsub = subscribeConversationHistory(tenantId, customerId, setMessages);
    return unsub;
  }, [tenantId, customerId, configState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (configState === 'loading') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-400 py-4">
        <RefreshCw size={11} className="animate-spin" /> Ladowanie konfiguracji WhatsApp...
      </div>
    );
  }

  if (configState === 'missing') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3">
        <Info size={12} className="flex-shrink-0 text-slate-400" />
        Skonfiguruj WhatsApp Business w Integracjach, aby wyslac wiadomosc.
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || !cfg) return;
    setSending(true);
    setSendError(null);
    const body = input.trim();
    setInput('');

    const ok = await sendMessage(cfg.apiKey, cfg.phoneId, customerPhone, body);
    if (ok) {
      await saveIncomingMessage(tenantId, customerId, {
        customerId,
        direction: 'sent',
        body,
        timestamp: Date.now(),
        status: 'sent',
      });
    } else {
      setSendError('Blad wysylania. Sprawdz konfiguracje WhatsApp Business.');
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
      <div className="flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white">
        <MessageCircle size={16} />
        <span className="text-xs font-black uppercase tracking-widest">WhatsApp Business</span>
        <span className="ml-auto text-[10px] opacity-80">{customerPhone}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#ece5dd]">
        {messages.length === 0 && (
          <p className="text-center text-[11px] text-slate-400 mt-8">Brak wiadomosci — zacznij rozmowe.</p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                msg.direction === 'sent'
                  ? 'bg-[#dcf8c6] text-slate-900 rounded-br-sm'
                  : 'bg-white text-slate-900 rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-snug">{msg.body}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 text-right">
                {formatTime(msg.timestamp)}
                {msg.direction === 'sent' && msg.status && (
                  <span className="ml-1 opacity-70">· {msg.status}</span>
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {sendError && (
        <div className="px-4 py-1 text-[10px] text-red-600 bg-red-50 border-t border-red-100">
          {sendError}
        </div>
      )}
      <div className="flex gap-2 p-3 border-t border-slate-200 bg-white">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Napisz wiadomosc..."
          rows={1}
          className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex items-center justify-center w-10 h-10 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-40 text-white rounded-xl transition-all flex-shrink-0"
        >
          {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
