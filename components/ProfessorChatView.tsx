
import React, { useState, useEffect, useRef } from 'react';
import { ExamSession, ChatMessage } from '../types';
import { GeminiService } from '../services/geminiService';
import { ICONS } from '../constants';

declare const pdfjsLib: any;
declare const mammoth: any;

interface ProfessorChatViewProps {
  session: ExamSession;
  onUpdateChat: (newHistory: ChatMessage[]) => void;
}

const ProfessorChatView: React.FC<ProfessorChatViewProps> = ({ session, onUpdateChat }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(session.chatHistory || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [attachments, setAttachments] = useState<{name: string, content: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const ai = new GeminiService();
        const chatInstance = await ai.startOralSimulation(session.data, session.content);
        setChat(chatInstance);
        
        if (!session.chatHistory || session.chatHistory.length === 0) {
          const initialMsg: ChatMessage = { 
            role: 'model', 
            text: `Buongiorno! Sono il Professore di ${session.course}. Sono qui per aiutarti a chiarire ogni dubbio. Come procede lo studio?`,
            timestamp: Date.now()
          };
          setMessages([initialMsg]);
          onUpdateChat([initialMsg]);
        }
      } catch (err) {
        console.error("Init Chat Error:", err);
      }
    };
    initChat();
  }, [session.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsExtracting(true);
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let text = "";
        if (ext === 'pdf') {
          const ab = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const tc = await page.getTextContent();
            text += tc.items.map((it: any) => it.str).join(" ") + " ";
          }
        } else if (ext === 'docx') {
          const ab = await file.arrayBuffer();
          const res = await mammoth.extractRawText({ arrayBuffer: ab });
          text = res.value;
        } else {
          text = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = (ev) => resolve(ev.target?.result as string);
            r.readAsText(file);
          });
        }
        setAttachments(prev => [...prev, { name: file.name, content: text }]);
      } catch (err) { console.error("Errore file chat:", err); }
    }
    setIsExtracting(false);
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || loading || !chat) return;

    const userText = input.trim();
    const currentAttachments = [...attachments];
    
    let fullPrompt = userText;
    if (currentAttachments.length > 0) {
      fullPrompt = `[DOMANDA]: ${userText || "Analizza questi documenti."}\n\n[ALLEGATI]:\n` + 
        currentAttachments.map(a => `FILE: ${a.name}\nCONTENT: ${a.content.substring(0, 3000)}`).join("\n\n");
    }

    const userMsg: ChatMessage = { 
      role: 'user', 
      text: userText || `Allegati: ${currentAttachments.map(a => a.name).join(", ")}`, 
      timestamp: Date.now(),
      attachments: currentAttachments.map(a => a.name)
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setAttachments([]);
    setLoading(true);

    try {
      const response = await chat.sendMessage({ message: fullPrompt });
      const modelMsg: ChatMessage = { 
        role: 'model', 
        text: response.text || 'Non riesco a rispondere ora.', 
        timestamp: Date.now() 
      };
      const finalHistory = [...newHistory, modelMsg];
      setMessages(finalHistory);
      onUpdateChat(finalHistory);
    } catch (err: any) {
      const isQuota = err.message === "QUOTA_EXCEEDED";
      const errorMsg: ChatMessage = { 
        role: 'model', 
        text: isQuota ? '⚠️ Limite di messaggi IA raggiunto. Attendi 60 secondi prima di riprovare.' : 'Spiacente, il server è sovraccarico. Riprova tra un istante.', 
        timestamp: Date.now() 
      };
      setMessages([...newHistory, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white border border-blue-50 rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-500/5 animate-fadeIn">
      <header className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
            <ICONS.Chat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Chiedi al Prof</h2>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Focus: {session.course}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          Docente Disponibile
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 bg-slate-50/20 scrollbar-hide">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[85%] rounded-[2rem] px-6 py-4 shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none font-medium'
            }`}>
              {m.attachments && m.attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {m.attachments.map((name, i) => (
                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${m.role === 'user' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                      <ICONS.Clipboard className="w-3 h-3" />
                      {name}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              <div className={`text-[8px] mt-2 font-black uppercase tracking-widest opacity-40 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-blue-100 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </span>
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest italic">Analisi in corso...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex gap-3 p-2 bg-slate-50 rounded-[2rem] border border-slate-200 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-50 transition-all border border-slate-200 shadow-sm shrink-0"
          >
            <ICONS.Plus className="w-5 h-5" />
          </button>
          
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Fai una domanda sui tuoi appunti..."
            className="flex-1 px-4 py-2 bg-transparent text-slate-900 outline-none text-sm font-bold placeholder-slate-400"
          />
          
          <button 
            type="button"
            onClick={handleSend}
            disabled={loading || (!input.trim() && attachments.length === 0)}
            className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shrink-0"
          >
            <ICONS.ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessorChatView;
