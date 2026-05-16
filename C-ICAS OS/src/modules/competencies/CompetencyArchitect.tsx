import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { Sparkles, BrainCircuit, Wand2, CheckCircle2, AlertCircle, Loader2, MessageSquare, Building2, Target, Globe, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CompetencyArchitect() {
  const { activeTenantId } = useAuth();
  const [step, setStep] = useState<'intro' | 'interview' | 'generating' | 'results'>('intro');
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyDetails, setCompanyDetails] = useState('');
  const [needs, setNeeds] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationReport, setGenerationReport] = useState<{
    sources: string[];
    count: number;
    missingInfo: string[];
    industry: string;
  } | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const currentResults = results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const scrapeWebsite = async () => {
    if (!websiteUrl) return;
    let url = websiteUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    setWebsiteUrl(url);
    setIsScraping(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/utils/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (data.text) {
        const filteredText = data.text.split('\n').filter((line: string) => line.trim().length > 10).join('\n').substring(0, 7000);
        setCompanyDetails(prev => prev + (prev ? '\n\n' : '') + "Dane ze strony firmowej:\n" + filteredText);
      } else if (data.error) setError(data.error);
    } catch (err) {
      setError("Nie udało się pobrać danych ze strony.");
    } finally {
      setIsScraping(false);
    }
  };

  const generateCompetencies = async (isMore = false) => {
    setIsGenerating(true);
    setStep('generating');
    setError(null);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError("Brak klucza API Gemini. Skonfiguruj go w ustawieniach platformy.");
      setStep('interview');
      setIsGenerating(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const masterSnap = await getDocs(query(collection(db, 'master_competencies'), limit(20)));
      const masterContext = masterSnap.docs.map(d => d.data().name.pl).join(', ');

      const prompt = `Jesteś Ekspertem HR i Architektem Kompetencji. Zbuduj szczegółową bazę kompetencji dla firmy z branży: ${industry}.
      KONTEKST: ${companyDetails}
      POTRZEBY: ${needs}
      Wygeneruj minimum 60 kompetencji (${isMore ? 'KOLEJNA partia' : 'PIERWSZA partia'}). Każda musi mieć 5 poziomów biegłości.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.OBJECT, properties: { pl: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["pl", "en"] },
                description: { type: Type.OBJECT, properties: { pl: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["pl", "en"] },
                category: { type: Type.STRING, enum: ["SOFT", "TECHNICAL", "LEADERSHIP", "DOMAIN", "FORMAL"] },
                industry: { type: Type.STRING },
                sector: { type: Type.STRING },
                proficiencyLevels: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      level: { type: Type.NUMBER },
                      label: { type: Type.OBJECT, properties: { pl: { type: Type.STRING }, en: { type: Type.STRING } } },
                      behavior: { type: Type.OBJECT, properties: { pl: { type: Type.STRING }, en: { type: Type.STRING } } }
                    },
                    required: ["level", "label", "behavior"]
                  }
                }
              },
              required: ["name", "description", "category", "proficiencyLevels"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      const generated = JSON.parse(text);
      setResults(prev => isMore ? [...prev, ...generated] : generated);
      setGenerationReport({
        sources: ["Wywiad z użytkownikiem", ...(websiteUrl ? [`Analiza strony: ${websiteUrl}`] : [])],
        count: generated.length,
        missingInfo: [...(!companyDetails ? ["Brak szczegółowego opisu parku maszynowego"] : []), ...(!needs ? ["Brak zdefiniowanych celów rozwojowych"] : [])],
        industry
      });
      setStep('results');
    } catch (err: any) {
      setError("Błąd podczas generowania modelu: " + (err.message || "Błąd sieci"));
      setStep('interview');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToCatalog = async () => {
    if (!activeTenantId || results.length === 0) return;
    setIsDeploying(true);
    try {
      const { writeBatch, doc } = await import('firebase/firestore');
      const batch = writeBatch(db);
      results.forEach(comp => {
        const newDocRef = doc(collection(db, 'tenants', activeTenantId, 'competencies'));
        batch.set(newDocRef, { ...comp, isActive: true, isAiGenerated: true, createdAt: new Date().toISOString() });
      });
      await batch.commit();
      setStep('intro');
      setResults([]);
      alert(`Sukces! Wdrożono ${results.length} kompetencji do katalogu.`);
    } catch (err) {
      alert("Błąd podczas zapisywania modelu do bazy.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-8 py-12">
            <div className="inline-flex p-6 bg-indigo-50 rounded-[2.5rem] text-indigo-600 mb-4 shadow-inner"><BrainCircuit size={64} /></div>
            <h1 className="text-5xl font-black text-slate-800 tracking-tight leading-tight">AI Architekt<br/>Modeli Kompetencyjnych</h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">Zbuduj profesjonalną, ziarnistą bazę umiejętności dla swojej branży.</p>
            <button onClick={() => setStep('interview')} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-slate-200 flex items-center gap-4 mx-auto">
              Rozpocznij Wywiad Specjalistyczny <Sparkles size={24} />
            </button>
          </motion.div>
        )}

        {step === 'interview' && (
          <motion.div key="interview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-2xl space-y-10">
            <div className="flex items-center gap-5 mb-4">
               <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200"><MessageSquare size={28} /></div>
               <div>
                 <h2 className="text-3xl font-black text-slate-800">Profil Organizacji</h2>
                 <p className="text-slate-400 font-bold text-xs uppercase tracking-tight">Krok 1: Analiza profilu i potrzeb bazy talentów</p>
               </div>
            </div>
            <div className="space-y-8">
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Globe size={12}/> Adres strony firmowej (analiza AI)</label>
                  <div className="flex gap-4">
                    <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://twojafirma.pl" className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 shadow-sm placeholder:text-slate-300" />
                    <button onClick={scrapeWebsite} disabled={!websiteUrl || isScraping} className="px-8 py-5 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-3 shadow-sm">
                      {isScraping ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      {isScraping ? 'Analiza...' : 'Pobierz profil'}
                    </button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Building2 size={12}/> Branża i Sektor</label>
                    <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="np. Budownictwo kubaturowe, Ogrodnictwo..." className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 shadow-sm" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Target size={12}/> Czego potrzebuje Twój HR?</label>
                    <input type="text" value={needs} onChange={e => setNeeds(e.target.value)} placeholder="np. Ziarnista baza dla monterów i operatorów..." className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 shadow-sm" />
                 </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Wand2 size={12}/> Kontekst operacyjny</label>
                  <textarea value={companyDetails} onChange={e => setCompanyDetails(e.target.value)} placeholder="Opisz narzędzia, maszyny i procesy..." className="w-full bg-white border border-slate-200 rounded-3xl px-6 py-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all h-40 resize-none shadow-sm placeholder:text-slate-300" />
               </div>
            </div>
            {error && <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 text-xs font-bold shadow-sm"><AlertCircle size={20} /> {error}</div>}
            <div className="flex gap-6 pt-6">
               <button onClick={() => setStep('intro')} className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-3xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">Wstecz</button>
               <button onClick={() => generateCompetencies(false)} disabled={!industry} className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-300 flex items-center justify-center gap-3 disabled:opacity-50">
                 Generuj Bazę Branżową <Sparkles size={20} />
               </button>
            </div>
          </motion.div>
        )}

        {step === 'generating' && (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center space-y-8">
            <div className="relative">
               <div className="w-32 h-32 border-8 border-slate-100 border-t-indigo-600 rounded-full animate-spin shadow-inner"></div>
               <div className="absolute inset-0 flex items-center justify-center text-indigo-600"><BrainCircuit size={48} className="animate-pulse" /></div>
            </div>
            <div>
               <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">AI Architekt pracuje...</h3>
               <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">Analizujemy setki powiązań między maszynami, uprawnieniami i procesami.</p>
            </div>
          </motion.div>
        )}

        {step === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 pb-32">
            {generationReport && (
              <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100"><Wand2 size={20} /></div>
                  <h3 className="text-xl font-black text-slate-800">Raport AI Architekta</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Źródła Wiedzy</p><ul className="text-xs font-bold text-slate-600 space-y-1 mt-2">{generationReport.sources.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statystyka</p><p className="text-sm font-black text-slate-700 mt-2">Wygenerowano <span className="text-indigo-600">{generationReport.count}</span> kompetencji dla: {generationReport.industry}</p></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Brakujące Dane</p><ul className="text-xs font-bold text-rose-500 space-y-1 mt-2">{generationReport.missingInfo.map((m, i) => <li key={i}>! {m}</li>)}</ul></div>
                </div>
              </div>
            )}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-8 border border-slate-200 rounded-[2.5rem] shadow-xl">
               <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">Katalog <span className="text-indigo-600">/</span> <span className="bg-slate-100 px-4 py-1 rounded-2xl text-2xl tabular-nums">{results.length}</span></h2>
               </div>
               <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <button onClick={() => generateCompetencies(true)} className="px-8 py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm"><Plus size={18} /> Rozbuduj Bazę (+60)</button>
                  <button onClick={saveToCatalog} disabled={isDeploying || results.length === 0} className="px-12 py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50">
                    {isDeploying ? 'Synchronizacja...' : 'Wdróż do Organizacji'} {isDeploying ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  </button>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {(showAll ? results : currentResults).map((comp, i) => (
                 <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: showAll ? 0 : i * 0.05 }} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all group flex flex-col h-full relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                       <span className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-xl tracking-widest border ${comp.category === 'TECHNICAL' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : comp.category === 'DOMAIN' ? 'bg-amber-50 text-amber-600 border-amber-100' : comp.category === 'FORMAL' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>{comp.category}</span>
                       <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-all border border-slate-100"><CheckCircle2 size={18} /></div>
                    </div>
                    <h4 className="font-black text-slate-900 mb-3 leading-tight text-base uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{comp.name.pl}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 flex-1 line-clamp-3">{comp.description.pl}</p>
                    <div className="space-y-5 pt-6 border-t border-slate-50">
                       <div className="flex items-center justify-between">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poziomy Biegłości</p>
                         <div className="flex gap-1">{[1, 2, 3, 4, 5].map(l => <div key={l} className="w-5 h-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-600 transition-all duration-300" />)}</div>
                       </div>
                    </div>
                 </motion.div>
               ))}
            </div>
            {!showAll && totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-12">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-100 text-slate-600 shadow-sm disabled:opacity-30 hover:border-indigo-600 hover:text-indigo-600 transition-all font-black text-xl">&larr;</button>
                <div className="px-10 py-4 bg-slate-900 border border-slate-900 rounded-[1.5rem] text-sm font-black text-white tabular-nums shadow-xl">{currentPage} <span className="text-slate-500 mx-2">/</span> {totalPages}</div>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-100 text-slate-600 shadow-sm disabled:opacity-30 hover:border-indigo-600 hover:text-indigo-600 transition-all font-black text-xl">&rarr;</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
