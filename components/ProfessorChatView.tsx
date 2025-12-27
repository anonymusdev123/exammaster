
import React, { useState, useEffect, useRef } from 'react';
import { StudyMaterialData } from '../types';
import { GeminiService } from '../services/geminiService';
import { ICONS } from '../constants';

interface ProfessorChatViewProps {
  materialData: StudyMaterialData;
  fullContent: string;
}

const ProfessorChatView: React.FC<ProfessorChatViewProps> = ({ materialData, fullContent }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const ai = new GeminiService();
      // Usiamo una configurazione tutor persistente
      const chatInstance = await ai.startOralSimulation(materialData, fullContent);
      setChat(chatInstance);
      setMessages([{ 
        role: 'model', 
        text: `Ciao! Sono il tuo tutor IA per il corso di ${materialData.course}. Ho analizzato tutti i tuoi materiali. Quale argomento vorresti approfondire o quale dubbio posso chiarirti?` 
      }]);
    };
    initChat();
  }, [materialData.course]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !chat) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const response = await chat.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: response.text || 'Ho avuto un problema a elaborare la risposta.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Mi scuso, c\'è stato un errore di connessione. Prova a riformulare.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white border border-blue-50 rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-500/5">
      <header className="px-10 py-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
            <ICONS.Chat className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Chiedi al Professore</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Tutor Personale H24</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30 scrollbar-hide">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[80%] rounded-[2.5rem] px-8 py-6 shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none font-medium'
            }`}>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-blue-100 rounded-2xl px-6 py-4 shadow-sm flex items-center gap-3">
               <span className="flex gap-1.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></span>
              </span>
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest italic">Il Prof sta scrivendo...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-10 bg-white border-t border-slate-100">
        <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem] border border-slate-200 focus-within:ring-4 focus-within:ring-blue-100 transition-all shadow-inner">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Qual è il tuo dubbio sugli appunti? Es. 'Spiegami meglio il capitolo 3'..."
            className="flex-1 px-6 py-4 bg-transparent text-slate-900 outline-none text-base font-bold placeholder-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-200"
          >
            <ICONS.ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessorChatView;
