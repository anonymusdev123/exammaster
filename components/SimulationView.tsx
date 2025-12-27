
import React, { useState, useEffect, useRef } from 'react';
import { StudyMaterialData } from '../types';
import { GeminiService } from '../services/geminiService';
import { ICONS } from '../constants';

interface SimulationViewProps {
  materialData: StudyMaterialData;
  fullContent: string;
}

const SimulationView: React.FC<SimulationViewProps> = ({ materialData, fullContent }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      const service = new GeminiService();
      const chatInstance = await service.startOralSimulation(materialData, fullContent);
      setChat(chatInstance);
      
      const response = await chatInstance.sendMessage({ 
        message: `Buongiorno Professore, sono lo studente. Sono pronto per l'interrogazione su ${materialData.course}. Mi faccia pure la prima domanda partendo dagli argomenti principali degli appunti.` 
      });
      setMessages([{ role: 'model', text: response.text || 'Iniziamo la sessione di esame.' }]);
      setLoading(false);
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
      setMessages(prev => [...prev, { role: 'model', text: response.text || '...' }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: 'Il Professore ha avuto un momento di distrazione. Riprova.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white border border-blue-50 rounded-[2.5rem] overflow-hidden shadow-xl shadow-blue-100/50">
      <header className="px-8 py-6 bg-blue-50/50 border-b border-blue-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
            <ICONS.Chat className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-blue-900 tracking-tight">Ricevimento Professore</h2>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-0.5">Focus: {materialData.course}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white text-green-600 text-[10px] font-black rounded-full border border-green-100 shadow-sm uppercase tracking-widest">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
          Docente Online
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-6 bg-white">
        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 mb-4 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nota Metodologica</p>
          <p className="text-xs text-slate-500 font-medium">Il professore interroga esclusivamente sui contenuti estratti dai tuoi appunti.</p>
        </div>

        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[2rem] px-8 py-5 shadow-sm border ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none' 
                : 'bg-slate-50 text-slate-900 border-slate-100 rounded-tl-none font-medium'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-blue-100 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
              <span className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></span>
              </span>
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest italic">Analisi risposta in corso...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-slate-50 border-t border-slate-100">
        <div className="flex gap-4 bg-white p-3 rounded-2xl shadow-inner border border-slate-200 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Scrivi la tua risposta..."
            className="flex-1 px-4 py-2 bg-white text-slate-900 outline-none text-sm font-bold placeholder-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
          >
            Invia
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationView;
