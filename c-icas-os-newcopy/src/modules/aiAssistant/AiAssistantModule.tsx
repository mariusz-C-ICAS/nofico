/**
 * Data: 2026-05-10 13:22
 * Utworzył: Agent AI
 * Zmiany: Inicjalizacja Modułu Asystenta AI dla Pracowników i HR.
 * Opis: Moduł czatu, wspierający analizę procedur, estymację kosztów i czasu zadań.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';

// W przypadku gdyby SDK GenAI zostało tu użyte, musimy zdefiniować:
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function AiAssistantModule() {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Witaj! Jestem asystentem FieldTime AI. Jak mogę Ci pomóc z projektami, wyliczeniem budżetu lub przypisaniem zadań?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    // Dodaj wiadomość użytkownika
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Przygotowanie historii
      const history = messages.map(m => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n');
      const prompt = `Jesteś asystentem wbudowanym w system FieldTime Work OS (moduł dla firm inżynieryjnych, prac w terenie).
      Znasz zasady RODO, zasady zarządzania Kanban i logowania czasu. 
      Użytkownik to: ${userData?.role || 'Pracownik'}.
      
      Historia rozmowy:
      ${history}
      
      [USER]: ${userMsg.text}
      Twoja odpowiedź:`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || 'Wystąpił problem z odpowiedzią.'
      };
      
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error('Błąd AI:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Napotkałem problem w komunikacji z silnikiem AI. Spróbuj ponownie później.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-120px)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Nagłówek */}
      <div className="bg-slate-900 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Asystent FieldTime AI</h2>
          <p className="text-sm text-slate-300">Wsparcie w terenie i planowaniu ({userData?.role})</p>
        </div>
      </div>

      {/* Czat */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-slate-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600 shadow-sm'}`}>
              {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-sm' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm'
            }`}>
              {/* Proste formatowanie dla MVP (zastępowanie nowej linii na <br/>) */}
              {msg.text.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < msg.text.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-4 max-w-[85%] self-start">
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-orange-100 text-orange-600 shadow-sm">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3 relative">
          <input
            type="text"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 transition-colors"
            placeholder="Zadaj pytanie asystentowi..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
