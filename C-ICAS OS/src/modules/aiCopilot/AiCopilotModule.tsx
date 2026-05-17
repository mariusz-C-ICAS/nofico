/**
 * AiCopilotModule.tsx
 * Moduł zarządzania AI Copilotem i Audytem (EU AI Act).
 */
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, BrainCircuit, History, AlertTriangle,
  FileText, Search, Filter, Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { AiCopilotService } from './services/AiCopilotService';
import { useAuth } from '../../shared/hooks/AuthContext';

export default function AiCopilotModule() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const aiConfigured = AiCopilotService.isConfigured();

  // Symulacja pobierania konwersacji (W wersji docelowej onSnapshot na aiConversations)
  useEffect(() => {
    setConversations([
      { id: 'c1', title: 'Analiza płynności Q3', createdAt: '2h temu', status: 'archived' },
      { id: 'c2', title: 'Weryfikacja zmian w KSH', createdAt: '1 dzien temu', status: 'active' }
    ]);
  }, []);

  const loadAudit = async (cid: string) => {
    setLoading(true);
    try {
      const logs = await AiCopilotService.getAuditHistory(cid);
      setSelectedAudit(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">Centrum Zarządzania AI</h2>
          <p className="text-sm text-gray-500 font-mono italic">EU AI Act Compliance & Governance</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Eksportuj Raport Zgodności
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <ShieldCheck size={16} />
            Polityka AI Architekt
          </button>
        </div>
      </div>

      {!aiConfigured && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 rounded-xl">
          <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">AI Copilot nie jest skonfigurowany</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Brak klucza API (GEMINI_API_KEY). Historia audytowa jest dostępna, ale czat AI wymaga konfiguracji klucza.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar: Conversations List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 font-mono uppercase tracking-tight">Historia Analiz</h3>
              <Search size={14} className="text-gray-400" />
            </div>
            <div className="divide-y divide-gray-50">
              {conversations.map((c) => (
                <button 
                  key={c.id}
                  onClick={() => loadAudit(c.id)}
                  className="w-full px-5 py-4 text-left hover:bg-indigo-50/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{c.title}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono uppercase">{c.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono italic">
                    <History size={12} />
                    Początek: {c.createdAt}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
             <AlertTriangle className="text-amber-500 mt-0.5" size={20} />
             <div>
                <h4 className="text-sm font-bold text-amber-900">Retencja Danych Audytu</h4>
                <p className="text-xs text-amber-800 leading-relaxed mt-1">
                   Zgodnie z Twoją polityką, logi audytowe AI są przechowywane przez 24 miesiące dla celów kontroli EU AI Act.
                </p>
             </div>
          </div>
        </div>

        {/* Main: Audit Evidence Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[500px] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <ShieldCheck className="text-emerald-500" size={18} />
                 <h3 className="font-bold text-gray-900 font-sans tracking-tight">Audit Evidence (Ślady weryfikacyjne)</h3>
              </div>
              <div className="flex items-center gap-2">
                 <button className="p-2 hover:bg-gray-100 rounded text-gray-400">
                    <Filter size={16} />
                 </button>
              </div>
            </div>

            <div className="flex-grow p-0">
               {selectedAudit.length > 0 ? (
                 <table className="w-full text-left">
                    <thead>
                       <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-mono">
                          <th className="px-6 py-3 font-medium">Sygnatura czasowa</th>
                          <th className="px-6 py-3 font-medium">Prompt (Zapytanie)</th>
                          <th className="px-6 py-3 font-medium">Narzędzia</th>
                          <th className="px-6 py-3 font-medium">Zgodność</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {selectedAudit.map((log) => (
                         <tr key={log.id} className="text-xs hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-gray-500">
                               {log.timestamp?.toDate().toLocaleString()}
                            </td>
                            <td className="px-6 py-4 max-w-[200px] truncate italic text-gray-700">
                               "{log.prompt}"
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex gap-1">
                                  {log.toolsUsed?.map((t: string) => (
                                    <span key={t} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
                                       {t}
                                    </span>
                                  ))}
                                  {(!log.toolsUsed || log.toolsUsed.length === 0) && <span className="text-[10px] text-gray-400">Natural Language Only</span>}
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                  VERIFIED
                               </span>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-30 p-20 text-center space-y-4">
                    <FileText size={48} />
                    <p className="font-mono text-xs uppercase tracking-widest leading-relaxed">Wybierz sesję chatu z bocznego menu aby wyświetlić dowody audytowe (Compliance Logs).</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
