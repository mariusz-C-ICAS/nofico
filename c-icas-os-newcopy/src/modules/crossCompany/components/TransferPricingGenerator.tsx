/**
 * TransferPricingGenerator.tsx
 * Kreator dokumentacji cen transferowych z AI.
 * CC-IMP-05
 */
import React, { useState } from 'react';
import { 
  FileText, Sparkles, Send, Download, 
  RotateCcw, Save, History, FileCheck,
  Languages, BrainCircuit, Loader2, CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { CrossCompanyService } from '../services/CrossCompanyService';
import { useAuth } from '../../../shared/hooks/AuthContext';

export default function TransferPricingGenerator() {
  const { activeTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [period, setPeriod] = useState('FY2025');

  const generateReport = async () => {
    if (!activeTenantId) return;
    setLoading(true);
    try {
      // Symulacja danych transakcyjnych
      const transactions = [
        { type: 'Service', amount: 45000, desc: 'IT Consulting' },
        { type: 'License', amount: 12000, desc: 'Software Subscription' }
      ];
      const result = await CrossCompanyService.generateTPDocumentation(activeTenantId, period, transactions);
      setContent(result.content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Configuration */}
      <div className="lg:col-span-1 space-y-4 flex flex-col">
        <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4 shadow-sm flex-grow">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-indigo-600" size={20} />
            <h3 className="font-bold text-gray-900 font-sans tracking-tight">AI TP Generator</h3>
          </div>
          <p className="text-xs text-gray-500 font-mono italic">CC-IMP-05: Transfer Pricing Engine</p>

          <div className="space-y-4 mt-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Okres Rozliczeniowy</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option>FY2023</option>
                <option>FY2024</option>
                <option>FY2025</option>
                <option>Q1-Q2 2025</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Strona Transakcji</label>
              <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500">
                Wykryto 2 podmioty powiązane:
                <ul className="mt-2 space-y-1 font-mono">
                  <li>• Logistix International</li>
                  <li>• BudPol Holding</li>
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Model Analizy</label>
              <div className="flex flex-col gap-2">
                 <button className="flex items-center justify-between px-3 py-2 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
                    Metoda Ceny Niekonrolowanej (CUP)
                    <CheckCircle2 size={12} />
                 </button>
                 <button className="flex items-center justify-between px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                    Metoda Marży Transakcyjnej (TNMM)
                 </button>
              </div>
            </div>
          </div>

          <button 
            onClick={generateReport}
            disabled={loading}
            className="w-full mt-8 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
            Generuj Dokumentację TP
          </button>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
          <FileCheck className="text-emerald-600" size={24} />
          <div className="text-[10px] text-emerald-800 italic leading-tight">
            Zgodność z wytycznymi OECD 2022 oraz Rozporządzeniem Ministra Finansów.
          </div>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="lg:col-span-2 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono font-bold text-gray-400">PODGLĄD DRAFTU</span>
            <div className="h-4 w-px bg-gray-200" />
            {content && <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Gotowy do weryfikacji</span>}
          </div>
          <div className="flex items-center gap-2">
             <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 transition-colors" title="Poprzednie wersje">
                <History size={16} />
             </button>
             <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 transition-colors">
                <Languages size={16} />
             </button>
             <div className="h-4 w-px bg-gray-200 mx-1" />
             <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                <Download size={14} />
                PDF
             </button>
             <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors">
                <Save size={14} />
                Zatwierdź
             </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-10 bg-[#FAF9F6]">
          {content ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-sm max-w-none text-gray-800 font-serif leading-relaxed"
            >
              <ReactMarkdown>{content}</ReactMarkdown>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
              <FileText size={64} strokeWidth={1} />
              <p className="font-mono text-xs uppercase tracking-widest italic">Oczekiwanie na parametry generowania...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
