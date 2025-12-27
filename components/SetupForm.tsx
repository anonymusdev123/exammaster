
import React, { useState, useEffect } from 'react';
import { ExamType, DepthLevel } from '../types';
import { ICONS } from '../constants';

declare const pdfjsLib: any;
declare const mammoth: any;

if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface UploadedFile {
  name: string;
  content: string;
  size: string;
}

interface SetupFormProps {
  onAnalyze: (config: {
    faculty: string;
    course: string;
    examType: ExamType;
    depth: DepthLevel;
    examDate: string;
    content: string;
  }) => void;
  loading: boolean;
  error?: string | null;
  initialData?: {
    faculty: string;
    course: string;
    examType: ExamType;
    depth: DepthLevel;
    examDate: string;
  };
  onCancel?: () => void;
}

const SetupForm: React.FC<SetupFormProps> = ({ onAnalyze, loading, error, initialData, onCancel }) => {
  const [faculty, setFaculty] = useState(initialData?.faculty || '');
  const [course, setCourse] = useState(initialData?.course || '');
  const [examType, setExamType] = useState<ExamType>(initialData?.examType || ExamType.WRITTEN);
  const [depth, setDepth] = useState<DepthLevel>(initialData?.depth || DepthLevel.MEDIUM);
  const [examDate, setExamDate] = useState(initialData?.examDate || '');
  const [manualNotes, setManualNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFaculty(initialData.faculty);
      setCourse(initialData.course);
      setExamType(initialData.examType);
      setDepth(initialData.depth);
      setExamDate(initialData.examDate);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !faculty || !examDate) return;
    
    // In modalità aggiornamento, permettiamo l'invio anche se il materiale non è cambiato (solo cambio metadati)
    if (!initialData && manualNotes.length === 0 && uploadedFiles.length === 0) return;

    const combinedContent = `
      [NOTE AGGIUNTIVE STUDENTE]:
      ${manualNotes}
      
      [NUOVI DOCUMENTI ALLEGATI]:
      ${uploadedFiles.map(f => `--- INIZIO FILE: ${f.name} ---\n${f.content}\n--- FINE FILE ---`).join('\n\n')}
    `;
    
    onAnalyze({ faculty, course, examType, depth, examDate, content: combinedContent });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsExtracting(true);
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const sizeStr = (file.size / 1024 / 1024).toFixed(2) + " MB";
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
        setUploadedFiles(prev => [...prev, { name: file.name, content: text, size: sizeStr }]);
      } catch (err) { console.error(err); }
    }
    setIsExtracting(false);
  };

  const removeFile = (name: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name));
  };

  return (
    <div className="max-w-4xl mx-auto py-6 md:py-12 px-4 md:px-6 animate-fadeIn relative">
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-0 right-4 p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm z-10"
          title="Torna indietro"
        >
          <ICONS.XMark className="w-6 h-6" />
        </button>
      )}

      <div className="text-center mb-8 md:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-blue-600 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl mb-4">
          <ICONS.Brain className="w-8 h-8 md:w-10 md:h-10 text-white" />
        </div>
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 mb-2 tracking-tight">
          {initialData ? 'Modifica Esame' : 'Nuovo Esame'}
        </h2>
        {initialData && (
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black tracking-widest uppercase border border-blue-100 mb-4 animate-pulse">
            Sincronizzazione IA
          </div>
        )}
        <p className="text-slate-500 text-xs md:text-sm font-medium">
          {initialData 
            ? 'Modifica i dettagli dell\'appello o aggiungi nuovo materiale per riadattare la strategia.' 
            : "L'IA organizzerà lo studio massimizzando ogni giorno disponibile."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl border border-slate-100 p-6 md:p-12 space-y-8">
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Facoltà</label>
            <input 
              type="text" 
              value={faculty} 
              onChange={(e) => setFaculty(e.target.value)}
              readOnly={!!initialData}
              placeholder="es. Medicina, Ingegneria..."
              className={`w-full px-4 py-4 border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-blue-500 transition-all text-slate-900 shadow-sm ${initialData ? 'bg-slate-50 text-slate-400' : 'bg-white'}`} 
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Materia</label>
            <input 
              type="text" 
              value={course} 
              onChange={(e) => setCourse(e.target.value)}
              readOnly={!!initialData}
              placeholder="es. Anatomia, Analisi 1..."
              className={`w-full px-4 py-4 border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-blue-500 transition-all text-slate-900 shadow-sm ${initialData ? 'bg-slate-50 text-slate-400' : 'bg-white'}`} 
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Appello</label>
            <input 
              type="date" 
              value={examDate} 
              onChange={(e) => setExamDate(e.target.value)} 
              className="w-full px-4 py-4 border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-blue-500 transition-all text-slate-900 bg-white shadow-sm" 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo Esame</label>
            <select 
              value={examType} 
              onChange={(e) => setExamType(e.target.value as ExamType)} 
              className="w-full px-4 py-4 border-2 border-slate-200 rounded-2xl font-bold text-base appearance-none text-slate-900 bg-white outline-none focus:border-blue-500 shadow-sm"
            >
              <option value={ExamType.WRITTEN}>SCRITTO</option>
              <option value={ExamType.ORAL}>ORALE</option>
              <option value={ExamType.MIXED}>MISTO</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Obiettivo Voto</label>
            <select 
              value={depth} 
              onChange={(e) => setDepth(e.target.value as DepthLevel)} 
              className="w-full px-4 py-4 border-2 border-slate-200 rounded-2xl font-bold text-base appearance-none text-slate-900 bg-white outline-none focus:border-blue-500 shadow-sm"
            >
              <option value={DepthLevel.BASIC}>18-24</option>
              <option value={DepthLevel.MEDIUM}>24-27</option>
              <option value={DepthLevel.ADVANCED}>27-30</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {initialData ? 'Integra nuovi materiali (opzionale)' : "Materiali d'esame"}
            </label>
            <div className="flex gap-2">
              <input type="file" id="setup-upload" className="hidden" multiple onChange={handleFileUpload} />
              <label htmlFor="setup-upload" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                <ICONS.Upload className="w-4 h-4" />
                {isExtracting ? 'Analisi...' : 'Carica File'}
              </label>
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <ICONS.Clipboard className="w-5 h-5 text-blue-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{file.size}</p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(file.name)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                    <ICONS.XMark className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea 
            value={manualNotes} 
            onChange={(e) => setManualNotes(e.target.value)} 
            className="w-full px-6 py-6 border-2 border-slate-200 rounded-[2rem] h-40 outline-none focus:border-blue-500 font-medium text-base resize-none shadow-sm text-slate-900 bg-white" 
            placeholder={initialData ? "Aggiungi nuovi appunti o lascia vuoto se vuoi modificare solo le date..." : "Incolla qui i tuoi appunti o specifica le istruzioni per l'IA..."} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || isExtracting || !course || !examDate} 
          className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black text-xl hover:bg-blue-700 transition-all shadow-2xl disabled:opacity-50"
        >
          {loading ? 'Riorganizzazione IA...' : initialData ? 'Salva Modifiche e Aggiorna Piano' : 'Crea Piano di Studio Intensivo'}
        </button>
      </form>
    </div>
  );
};

export default SetupForm;
