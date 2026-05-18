/**
 * Data: 2026-05-12
 * Zmiany: Generator paczek przelewów Elixir XML / SEPA.
 * Ścieżka: /src/modules/finance/psd2/BatchTransfer.tsx
 */
import React, { useState } from 'react';
import { 
  Download, FileCode, CheckCircle2, AlertCircle, 
  ShieldCheck, ArrowRight, BookOpen, Trash2
} from 'lucide-react';
import { motion } from 'motion/react';

export default function BatchTransfer() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'selection' | 'download'>('selection');
  const [downloadHref, setDownloadHref] = useState<string | null>(null);

  const pendingPayments = [
    { id: '1', invoice: 'FV/12/2026', amount: 4500.00, counterpart: 'Client Alpha', status: 'ready' },
    { id: '2', invoice: 'FV/05/MAJ', amount: 123.00, counterpart: 'T-Mobile', status: 'ready' },
    { id: '3', invoice: 'ZAKUP/001', amount: 890.50, counterpart: 'Hurtownia Bud', status: 'ready' },
  ];

  const handleGenerate = () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const msgId = `NOFICO-${today}-${Date.now().toString(36).toUpperCase()}`;
    const payments = pendingPayments.map((p, i) => `
    <CdtTrfTxInf>
      <PmtId><EndToEndId>${msgId}-${i + 1}</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="PLN">${p.amount.toFixed(2)}</InstdAmt></Amt>
      <Cdtr><Nm>${p.counterpart}</Nm></Cdtr>
      <RmtInf><Ustrd>${p.invoice}</Ustrd></RmtInf>
    </CdtTrfTxInf>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${pendingPayments.length}</NbOfTxs>
      <CtrlSum>${pendingPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}</CtrlSum>
      <InitgPty><Nm>NoFiCo ERP</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-PI</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <ReqdExctnDt>${new Date().toISOString().split('T')[0]}</ReqdExctnDt>
      <Dbtr><Nm>Firma</Nm></Dbtr>${payments}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const href = URL.createObjectURL(blob);
    setDownloadHref(href);
    setLoading(false);
    setStep('download');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex justify-between items-center">
         <div>
            <h4 className="text-xl font-black text-slate-900 uppercase italic">Paczka Przelewów (Elixir)</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Eksportuj zbiorczy plik do bankowości elektronicznej</p>
         </div>
         <button 
           onClick={handleGenerate}
           disabled={loading}
           className="bg-slate-900 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl"
         >
            {loading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Download size={16} />}
            Generuj Plik XML
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-8">
               <BookOpen className="text-indigo-600" size={20} />
               <h5 className="text-sm font-black text-slate-900 uppercase italic">Kolejka Płatności (3)</h5>
            </div>
            
            <div className="space-y-4">
               {pendingPayments.map(p => (
                 <div key={p.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <div>
                       <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{p.counterpart}</div>
                       <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.invoice}</div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <div className="text-xs font-black text-slate-900 italic">{p.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</div>
                          <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Weryfikacja OK</div>
                       </div>
                       <button className="text-slate-200 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
               <ShieldCheck className="text-indigo-200 mb-6" size={32} />
               <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Gwarancja Białej Listy</h5>
               <p className="text-xs font-medium text-indigo-100 leading-relaxed mb-8 italic">
                  NoFiCo automatycznie weryfikuje rachunki IBAN wszystkich kontrahentów w bazie MF (Biała Lista) przed wygenerowaniem paczki.
               </p>
               <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl w-fit">
                  <span className="text-[9px] font-black uppercase">Ostatnie sprawdzenie: dzisiaj, 18:20</span>
               </div>
            </div>

            {step === 'download' && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-emerald-50 border-2 border-emerald-100 rounded-[3rem] p-10 flex flex-col items-center text-center"
              >
                 <div className="bg-white p-6 rounded-3xl shadow-xl shadow-emerald-100/50 mb-6">
                    <FileCode className="text-emerald-500" size={40} />
                 </div>
                 <h5 className="text-xl font-black text-slate-900 uppercase italic mb-2">Plik Gotowy!</h5>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Paczka ELIXIR_XML_2026_05_12.xml (52 KB)</p>
                 <a
                   href={downloadHref ?? '#'}
                   download={`ELIXIR_XML_${new Date().toISOString().split('T')[0]}.xml`}
                   className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                 >
                   <Download size={16} /> Pobierz Paczkę
                 </a>
              </motion.div>
            )}
         </div>
      </div>
    </div>
  );
}
