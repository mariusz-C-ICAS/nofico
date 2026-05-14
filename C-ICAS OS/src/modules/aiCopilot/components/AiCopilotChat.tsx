/**
 * AiCopilotChat.tsx
 * Pływający asystent AI (Chat Drawer).
 * AI-IMP-04
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, X, Minimize2, Maximize2, 
  Sparkles, ShieldCheck, Database, History,
  BrainCircuit, Loader2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AiCopilotService } from '../services/AiCopilotService';
import { useAuth } from '../../../shared/hooks/AuthContext';
import ReactMarkdown from 'react-markdown';

export default function AiCopilotChat() {
  const { user, activeTenantId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleChat = async () => {
    if (!isOpen && !conversationId && user && activeTenantId) {
      const id = await AiCopilotService.createConversation(user.uid, activeTenantId);
      setConversationId(id);
    }
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !activeTenantId || !conversationId) return;

    const userMessage = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await AiCopilotService.chat(
        user.uid,
        activeTenantId,
        conversationId,
        currentInput,
        messages
      );

      const aiMessage = { role: 'model', parts: [{ text: response.text }] };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'system', parts: [{ text: 'Błąd połączenia z mózgiem AI.' }] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:bg-indigo-700 transition-colors"
      >
        <Sparkles size={24} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '60px' : '600px',
              width: '400px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">AI Copilot v2.2</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-indigo-100 uppercase font-mono">SOC2 Compliant</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button 
                  onClick={toggleChat}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <>
                <div 
                  ref={scrollRef}
                  className="flex-grow overflow-y-auto p-5 space-y-4 bg-gray-50/30"
                >
                  {messages.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                        <BrainCircuit size={48} strokeWidth={1} />
                        <p className="text-xs font-mono max-w-[200px]">Zadaj pytanie o finanse, HR lub poproś o analizę SQL bazy danych.</p>
                     </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-none font-serif'
                      }`}>
                        <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                        <Loader2 size={14} className="animate-spin text-indigo-600" />
                        <span className="text-xs text-gray-500 font-mono italic">AI myśli...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Tools Area */}
                <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Dostępne Narzędzia:</span>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 text-gray-400 hover:text-indigo-600 cursor-help" title="SQL Query Engine">
                      <Database size={14} />
                    </div>
                    <div className="p-1.5 text-gray-400 hover:text-indigo-600 cursor-help" title="Financial Forecasting">
                      <MessageSquare size={14} />
                    </div>
                    <div className="p-1.5 text-gray-400 hover:text-indigo-600 cursor-help" title="Audit Log">
                      <ShieldCheck size={14} />
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <div className="relative">
                    <input 
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Zadaj pytanie Asystentowi..."
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-serif"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={loading || !input.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>Zgodne z modelem Gemini 3.1 Pro</span>
                    <button className="flex items-center gap-1 hover:text-gray-600">
                      <History size={10} />
                      Historia
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
