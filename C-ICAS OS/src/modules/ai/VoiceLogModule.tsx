import React, { useState, useRef } from 'react';
import { Mic, MicOff, BrainCircuit, Play, Square, Save, Trash2, Camera, Wand2, Sparkles, MessageSquare } from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';

export default function VoiceLogModule() {
  const { userData } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setTranscript("Właśnie skończyliśmy kłaść instalację nawadniającą u klienta Kowalskiego. Zużyliśmy 20 metrów rury PE i 4 zraszacze rotacyjne. Sprzęt sprawny, wracamy do bazy.");
    setAiAnalysis({
      project: "Nawadnianie Ogród",
      client: "Jan Kowalski",
      materials: ["Rura PE 20m", "Zraszacz rotacyjny x4"],
      status: "Zakończono etap",
      action: "Update inventory & Time sheet"
    });
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 font-sans">
      <div className="bg-gradient-to-br from-fuchsia-900 via-purple-900 to-indigo-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden text-center">
         <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/20 rounded-full animate-ping"></div>
         </div>
         
         <div className="relative z-10">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-8 border border-white/20">
               <BrainCircuit size={40} className="text-fuchsia-400" />
            </div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Voice-to-Data AI</h2>
            <p className="text-fuchsia-200/60 text-sm font-medium mb-10 max-w-lg mx-auto leading-relaxed">
               Nie trać czasu na klikanie. Powiedz co zrobiłeś, a AI Resident zaktualizuje logi NoFiCO, Czas Pracy i Magazyn.
            </p>

            <div className="flex flex-col items-center gap-6">
               <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_50px_rgba(232,121,249,0.3)] border-8 ${isRecording ? 'bg-red-500 border-red-200 scale-110 animate-pulse' : 'bg-white border-white/20 hover:scale-105'}`}
               >
                  {isRecording ? <Square size={40} className="text-white fill-white" /> : <Mic size={48} className="text-fuchsia-600 fill-fuchsia-600" />}
               </button>
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-300">
                  {isRecording ? 'System Słucha (AI Listening)' : 'Naciśnij Moduł aby mówić'}
               </span>
            </div>
         </div>
      </div>

      {transcript && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-8 duration-700">
           {/* Transcript */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <MessageSquare size={14} /> Surowa Transkrypcja
              </h3>
              <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{transcript}"</p>
           </div>

           {/* AI Resident Analysis */}
           <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative group">
              <div className="absolute top-0 right-0 p-6">
                 <Sparkles size={24} className="text-fuchsia-400 animate-pulse" />
              </div>
              <h3 className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-6">AI Execution Plan</h3>
              
              {aiAnalysis ? (
                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Projekt</span>
                      <span className="text-[10px] font-black text-fuchsia-300 uppercase">{aiAnalysis.project}</span>
                   </div>
                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Materiały</span>
                      <div className="flex flex-col items-end gap-1">
                         {aiAnalysis.materials.map((m: string) => <span key={m} className="text-[10px] font-black text-white">{m}</span>)}
                      </div>
                   </div>
                   <button className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-fuchsia-500/20 mt-4 flex items-center justify-center gap-2">
                      <Wand2 size={16} /> Zatwierdź & Wykonaj Operację
                   </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                   <MicOff size={32} />
                   <p className="text-[9px] font-black uppercase mt-4">Oczekiwanie na dane...</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Vision Log Extension */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
               <Camera size={24} />
            </div>
            <div>
               <h4 className="text-sm font-black text-slate-900 uppercase italic">Rozpoznawanie Wizualne (Vision AI)</h4>
               <p className="text-[10px] text-slate-500 font-medium">Prześlij zdjęcie paragonu, faktury lub placu budowy do analizy.</p>
            </div>
         </div>
         <button className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-fuchsia-600 transition-all">Skanuj AI</button>
      </div>
    </div>
  );
}
