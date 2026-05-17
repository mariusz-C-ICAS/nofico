/**
 * Data: 2026-05-10
 * Utworzył: Agent AI
 * Opis: Specjalistyczny kreator konfiguracji firmy sterowany przez AI. Dla Administratorów.
 */
import React, { useState } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BrainCircuit, Globe, ArrowRight, Loader2, Wand2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;
function getAi() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY nie jest skonfigurowany');
  if (!_ai) _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
}

interface CustomModule {
  key: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  color: string;
  isActive: boolean;
}

export default function ArchitectAIWizard({ onComplete }: { onComplete: () => void }) {
  const [website, setWebsite] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ suggestedModules: CustomModule[], advice: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const analyzeProfile = async () => {
    if (!website && !profileDesc) return;
    setAnalyzing(true);
    
    try {
      const prompt = `Jesteś Architektem Systemowym C-ICAS.OS. Poniżej znajdują się dane firmy klienta B2B. Twoim zadaniem jest zdecydować, w jakiej branży działają i zwolnić dedykowane, odizolowane moduły z zestawu. System używa react-router na Dashboardzie.
      
      Informacje podane przez administratora:
      Strona/WWW: ${website}
      Opis ręczny: ${profileDesc}

      WYTYCZNE:
      Zwróć odpowiedź WYŁĄCZNIE W FORMACIE JSON (nic więcej), bym mógł to przeparsować u mnie w komponencie.
      
      Struktura JSON:
      {
        "advice": "Twój krótki, ekspercki komentarz do administratora po analizie (np. 'Widzę, że Twoja firma zajmuje się instalacjami fotowoltaicznymi. Proponuję moduły logowania czasu, magazynu części oraz check-list BHP')",
        "suggestedModules": [
          {
            "key": "time", // ten zostaw zawsze w każdej firmie by default
            "name": "Rejestracja Czasu",
            "description": "Logowanie czasu pracy, geofencing.",
            "icon": "Clock",
            "path": "/time",
            "color": "bg-blue-100 text-blue-600",
            "isActive": true
          },
          // DODAJ WŁASNE moduły pasujące do opisanej branży poniżej (wymień nazwy ikon z Lucide, np. Zap, Shield, Truck, Droplets).
          // Wymyśl ścieżki "path" z prefixem np. /custom/solar, /custom/fleet, /cleaning itp.
        ]
      }
      `;

      const response = await getAi().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      let textResponse = response.text || "{}";
      textResponse = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
      
      const parsed = JSON.parse(textResponse);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      alert('Wystąpił błąd podczas analizy. Spróbuj opisać firmę dokładniej w polu Opis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyModules = async () => {
    if (!result?.suggestedModules) return;
    setSaving(true);
    try {
      for (const m of result.suggestedModules) {
        // Zapis w Firebase, co od razu zaktualizuje Dashboard dla wszystkich z tej licencji
        await setDoc(doc(db, 'systemModules', m.key), {
          ...m,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      onComplete();
    } catch (e) {
      console.error(e);
      alert('Błąd aktywacji modułów wg ustaleń AI.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-8 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-10 opacity-10">
        <BrainCircuit size={180} />
      </div>
      
      <div className="relative z-10 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Wand2 className="text-amber-400" size={28} />
          <h2 className="text-3xl font-extrabold tracking-tight">Systemowy Architekt AI</h2>
        </div>
        <p className="text-slate-300 text-lg mb-8 leading-relaxed">
          Każda firma jest inna. Opowiedz krótko czym się zajmujecie, a sztuczna inteligencja przeanalizuje wymagania, rozdzieli role i zrekonfiguruje Twój Dashboard włączając moduły dedykowane dla Twojej branży. Zbudujmy dla Ciebie idealny Work OS.
        </p>

        {!result ? (
          <div className="space-y-6 bg-black/30 p-6 rounded-xl backdrop-blur-sm border border-white/10">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-slate-300">
                <Globe size={16} /> Podaj adres strony internetowej (Jeśli posiadasz)
              </label>
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://twojafirma.pl"
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 text-slate-300 block">
                Lub opisz w kilku słowach branżę (np. "Jesteśmy firmą instalującą klimatyzacje")
              </label>
              <textarea
                value={profileDesc}
                onChange={e => setProfileDesc(e.target.value)}
                rows={3}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            <button 
              onClick={analyzeProfile}
              disabled={analyzing || (!website && !profileDesc)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="animate-spin" /> : 'Analizuj Mój Biznes'}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-800/50 p-6 rounded-xl border border-indigo-500/30">
              <h3 className="font-semibold text-amber-400 mb-2">Werdykt AI:</h3>
              <p className="text-slate-200 leading-relaxed italic">"{result.advice}"</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-widest mb-4">Wybrane Moduły dla Ciebie:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.suggestedModules.map((m, i) => (
                  <div key={i} className="flex gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700 items-center">
                    <div className="w-10 h-10 rounded bg-slate-900 flex items-center justify-center shrink-0">
                      {/* Dla podglądu pokazujemy standardową ikonkę, zmapujemy w Dashboardzie z stringa do Componentu */}
                      <span className="text-slate-400 text-xs">Icon</span>
                    </div>
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-slate-400 truncate w-32">{m.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setResult(null)}
                className="px-6 py-3 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors font-medium border border-slate-700"
              >
                Odrzuć i opisz ponownie
              </button>
              <button 
                onClick={applyModules}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" /> : <><ArrowRight /> Aplikuj Topologię Systemu</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
