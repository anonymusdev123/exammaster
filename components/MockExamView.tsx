
import React, { useState } from 'react';
import { MockExam, Importance } from '../types';
import { GeminiService } from '../services/geminiService';
import { ICONS } from '../constants';

declare const pdfjsLib: any;
declare const mammoth: any;

interface MockExamViewProps {
  session: any;
  onUpdateSession: (updatedData: any) => void;
}

const MockExamView: React.FC<MockExamViewProps> = ({ session, onUpdateSession }) => {
  const [loading, setLoading] = useState(false);
  const [pastExamText, setPastExamText] = useState(session.pastExamsContent || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showEditor, setShowEditor] = useState(!session.data.mockExam);
  const [mockExplanations, setMockExplanations] = useState<Record<number, { text: string, loading: boolean }>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<number, boolean>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsExtracting(true);
    let newText = "";
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase();
        try {
            if (ext === 'pdf') {
                const ab = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const text = await page.getTextContent();
                    newText += text.items.map((it: any) => it.str).join(" ") + " ";
                }
            } else if (ext === 'docx') {
                const ab = await file.arrayBuffer();
                const res = await mammoth.extractRawText({ arrayBuffer: ab });
                newText += res.value;
            } else {
                newText += await new Promise((res) => {
                    const r = new FileReader();
                    r.onload = (ev) => res(ev.target?.result as string);
                    r.readAsText(file);
                });
            }
            newText = `\n[TRACCIA ESAME PASSATA: ${file.name}]\n${newText}\n`;
        } catch (err) { 
            console.error("Errore durante l'estrazione del file:", err); 
        }
    }
    setPastExamText(prev => prev + newText);
    setIsExtracting(false);
  };

  const handleExplain = async (idx: number, question: string) => {
    setMockExplanations(prev => ({ ...prev, [idx]: { text: '', loading: true } }));
    const service = new GeminiService();
    try {
      const text = await service.explainConcept(question, session.content);
      setMockExplanations(prev => ({ ...prev, [idx]: { text, loading: false } }));
    } catch (err) {
      setMockExplanations(prev => ({ ...prev, [idx]: { text: "Errore spiegazione.", loading: false } }));
    }
  };

  const generateMock = async () => {
    setLoading(true);
    const service = new GeminiService();
    try {
      const mock = await service.generateMockExam(session.content, pastExamText, session.course);
      onUpdateSession({ ...session, pastExamsContent: pastExamText, data: { ...session.data, mockExam: mock } });
      setShowEditor(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Simulazione d'Esame</h2>
          <p className="text-slate-500 font-medium">L'IA emula il tuo docente basandosi sulle tracce storiche della materia.</p>
        </div>
        <button 
          onClick={() => setShowEditor(!showEditor)}
          className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <ICONS.Clipboard className="w-4 h-4" />
          {showEditor ? 'Nascondi Configurazione' : 'Database Tracce Storiche'}
        </button>
      </header>

      {showEditor && (
        <div className="bg-white rounded-[3rem] border-2 border-blue-50 p-10 space-y-8 shadow-xl shadow-blue-500/5 animate-slideUp">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tracce Passate (Testo o Documenti)</label>
            <div className="flex gap-3">
              <input type="file" id="mock-upload" className="hidden" multiple onChange={handleFileUpload} />
              <label htmlFor="mock-upload" className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-all border border-blue-100 flex items-center gap-2">
                <ICONS.Upload className="w-4 h-4" />
                {isExtracting ? 'Lettura File...' : 'Carica Tracce (PDF/DOCX)'}
              </label>
            </div>
          </div>
          
          <textarea 
            value={pastExamText}
            onChange={(e) => setPastExamText(e.target.value)}
            placeholder="Incolla qui le tracce degli anni passati o carica i file sopra per permettere all'IA di emulare perfettamente lo stile del tuo professore..."
            className="w-full h-64 bg-slate-50/50 border-2 border-slate-100 rounded-[2rem] p-8 text-sm font-medium focus:border-blue-400 focus:bg-white outline-none transition-all resize-none shadow-inner text-slate-900"
          />
          
          <button 
            onClick={generateMock} 
            disabled={loading || !pastExamText || isExtracting} 
            className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-30 transition-all transform hover:-translate-y-1 active:scale-95"
          >
            {loading ? 'Preparazione Simulazione...' : 'Genera Simulazione'}
          </button>
        </div>
      )}

      {session.data.mockExam && !showEditor && (
        <div className="space-y-8 animate-fadeIn">
           <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden border-4 border-slate-800">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <ICONS.Brain className="w-48 h-48" />
             </div>
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-6">
                 <div className="px-4 py-1.5 bg-red-600 text-white rounded-full text-[9px] font-black tracking-widest uppercase border border-red-500 shadow-lg shadow-red-500/20">
                   Sessione Ufficiale
                 </div>
               </div>
               <h3 className="text-4xl font-black mb-6 uppercase tracking-tighter leading-none">{session.data.mockExam.title}</h3>
               <div className="flex flex-wrap gap-6 items-center">
                 <div className="flex items-center gap-2 text-blue-400 font-black text-sm">
                   <ICONS.Calendar className="w-5 h-5" />
                   <span>TEMPO: {session.data.mockExam.timeMinutes} MINUTI</span>
                 </div>
                 <div className="h-4 w-px bg-slate-700 hidden md:block"></div>
                 <div className="text-slate-400 text-xs font-bold">Materia: {session.course}</div>
               </div>
               <div className="mt-10 p-8 bg-white/5 rounded-[2rem] border border-white/10">
                 <p className="text-sm opacity-80 leading-relaxed italic">{session.data.mockExam.instructions}</p>
               </div>
             </div>
           </div>

           <div className="grid grid-cols-1 gap-8">
             {session.data.mockExam.questions.map((q: any, idx: number) => (
               <div key={idx} className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 space-y-6 shadow-sm hover:border-blue-200 transition-all group relative overflow-hidden">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <span className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-lg shadow-blue-500/20">
                       {idx + 1}
                     </span>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.type || 'DOMANDA'}</span>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => handleExplain(idx, q.question)} 
                        className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Spiegazione Didattica"
                      >
                        <ICONS.Brain className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setRevealedSolutions(prev => ({ ...prev, [idx]: !prev[idx] }))} 
                        className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                        title="Rivela Soluzione"
                      >
                        <ICONS.ArrowRight className="w-5 h-5 rotate-90" />
                      </button>
                   </div>
                 </div>
                 
                 <h4 className="text-2xl font-bold text-slate-900 leading-tight whitespace-pre-wrap pr-10">{q.question}</h4>
                 
                 {mockExplanations[idx] && (
                    <div className={`p-8 rounded-[2rem] animate-fadeIn border-2 ${mockExplanations[idx].loading ? 'bg-blue-50 border-blue-100 text-blue-400' : 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/20'}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <ICONS.Brain className={`w-5 h-5 ${mockExplanations[idx].loading ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{mockExplanations[idx].loading ? 'Analisi in corso...' : 'Insight IA'}</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {mockExplanations[idx].loading ? 'L\'IA sta ricollegando i concetti agli appunti...' : mockExplanations[idx].text}
                      </p>
                    </div>
                 )}

                 {revealedSolutions[idx] && (
                    <div className="mt-8 p-10 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-6 animate-slideDown shadow-inner">
                       <div className="flex items-center gap-2 text-slate-400">
                         <ICONS.Clipboard className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Risposta Modello</span>
                       </div>
                       <p className="text-base text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap">{q.modelAnswer}</p>
                    </div>
                 )}
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default MockExamView;
