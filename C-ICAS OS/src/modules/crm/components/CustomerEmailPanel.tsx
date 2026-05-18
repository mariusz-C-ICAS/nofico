import React, { useState } from 'react';
import { Send, RefreshCw, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { addActivity } from '../services/crmService';

interface Props {
  tenantId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
}

interface Template {
  id: string;
  label: string;
  subject: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'follow_up',
    label: 'Follow-up po wizycie',
    subject: 'Dziękujemy za skorzystanie z naszych usług',
    body: `Szanowni Państwo,\n\ndziękujemy za skorzystanie z naszych usług serwisowych.\nMamy nadzieję, że wszystko zostało wykonane zgodnie z oczekiwaniami.\n\nW razie pytań prosimy o kontakt.\n\nZ poważaniem`,
  },
  {
    id: 'offer',
    label: 'Propozycja oferty',
    subject: 'Propozycja współpracy — oferta specjalna',
    body: `Szanowni Państwo,\n\nprzesyłamy propozycję rozszerzenia współpracy. Na podstawie historii naszych usług przygotowaliśmy dla Państwa dedykowaną ofertę abonamentową.\n\nProsimy o kontakt w celu omówienia szczegółów.\n\nZ poważaniem`,
  },
  {
    id: 'upsell',
    label: 'Upsell — kontrakt abonamentowy',
    subject: 'Propozycja kontraktu serwisowego — oszczędność do 20%',
    body: `Szanowni Państwo,\n\nzważywszy na częstotliwość korzystania z naszych usług serwisowych, chcielibyśmy zaproponować zawarcie kontraktu abonamentowego.\n\nDzięki stałej umowie:\n• Priorytetowe terminy obsługi\n• Ceny niższe o 15-20%\n• Dedykowany opiekun\n\nProsimy o kontakt w celu przedstawienia szczegółów.\n\nZ poważaniem`,
  },
  {
    id: 'nps',
    label: 'Prośba o ocenę NPS',
    subject: 'Twoja opinia jest dla nas ważna',
    body: `Szanowni Państwo,\n\nchcielibyśmy poznać Państwa opinię na temat naszych usług.\nW skali 0-10, jak bardzo poleciliby Państwo nasze usługi znajomym?\n\nProsimy o krótką odpowiedź na ten email lub kontakt telefoniczny.\n\nDziękujemy za każdą opinię — pomagają nam się rozwijać.\n\nZ poważaniem`,
  },
  {
    id: 'reminder',
    label: 'Przypomnienie o przeglądzie',
    subject: 'Czas na przegląd serwisowy',
    body: `Szanowni Państwo,\n\nchcieliśmy przypomnieć, że nadszedł czas na planowy przegląd serwisowy.\n\nProsimy o kontakt lub zarezerwowanie terminu poprzez nasz portal klienta.\n\nZ poważaniem`,
  },
];

export default function CustomerEmailPanel({ tenantId, customerId, customerName, customerEmail }: Props) {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [to, setTo] = useState(customerEmail ?? '');
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const applyTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setSubject(t.subject);
    setBody(t.body);
    setSent(false);
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !user) return;
    setSending(true);
    try {
      // Queue email via Trigger Email extension
      await addDoc(collection(db, `tenants/${tenantId}/emailQueue`), {
        to: [to.trim()],
        message: {
          subject,
          text: body,
          html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-line">${body.replace(/\n/g, '<br/>')}</div>`,
        },
        metadata: {
          tenantId, customerId, customerName,
          sentBy: user.uid, sentByEmail: user.email ?? '',
        },
        createdAt: serverTimestamp(),
      });

      // Log CRM activity
      await addActivity(tenantId, {
        tenantId, customerId,
        type: 'email',
        title: `Email: ${subject}`,
        body: `Do: ${to} · Szablon: ${selectedTemplate.label}`,
        createdBy: user.uid,
        createdByEmail: user.email ?? '',
      });

      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Template selector */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Szablon</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)}
              className={`text-[9px] font-black px-2.5 py-1.5 rounded-xl border transition-all ${
                selectedTemplate.id === t.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* To */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Do</p>
        <input value={to} onChange={e => { setTo(e.target.value); setSent(false); }}
          placeholder="email@klienta.pl"
          type="email"
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>

      {/* Subject */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Temat</p>
        <input value={subject} onChange={e => { setSubject(e.target.value); setSent(false); }}
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>

      {/* Body */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Treść</p>
        <textarea value={body} onChange={e => { setBody(e.target.value); setSent(false); }} rows={8}
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-y font-mono" />
      </div>

      {/* Send */}
      <div className="flex items-center gap-3">
        <button onClick={handleSend} disabled={!to.trim() || !subject.trim() || sending || sent}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-5 py-2.5 rounded-xl uppercase tracking-widest">
          {sending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
          {sent ? 'Wysłano' : 'Wyślij email'}
        </button>
        {sent && (
          <span className="text-[10px] font-black text-emerald-600">
            ✓ Email dodany do kolejki wysyłki
          </span>
        )}
      </div>

      <p className="text-[9px] text-slate-400">
        Email trafia do kolejki emailQueue (Firebase Trigger Email). Wysyłka następuje automatycznie przez Cloud Function.
      </p>
    </div>
  );
}
