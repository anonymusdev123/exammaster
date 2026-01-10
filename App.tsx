
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, ExamSession, Importance, StudyPlanDay, User, StudyMaterialData, ChatMessage } from './types';
import { GeminiService } from './services/geminiService';
import { StorageService } from './services/storageService';
import Sidebar from './components/Sidebar';
import SetupForm from './components/SetupForm';
import SummaryView from './components/SummaryView';
import QuizView from './components/QuizView';
import SimulationView from './components/SimulationView';
import ProfessorChatView from './components/ProfessorChatView';
import PlanView from './components/PlanView';
import MockExamView from './components/MockExamView';
import AuthView from './components/AuthView';
import { ICONS } from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    sessions: [],
    activeSessionId: null,
    isLoading: true,
    isAddingNew: false,
    error: null,
  });

  const [loadingStep, setLoadingStep] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [isGlobalPlan, setIsGlobalPlan] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');

  const getLocalDateStr = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateStr(), []);

  const rebalanceAllSessions = useCallback((allSessions: ExamSession[]): ExamSession[] => {
    if (!allSessions || allSessions.length === 0) return [];
    
    const sortedSessions = [...allSessions].sort((a, b) => 
      new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
    );

    const allExamDates = new Set(sortedSessions.filter(s => !s.isPassed).map(s => s.examDate));
    const daySubjectOccupancy: Record<string, Set<string>> = {};

    sortedSessions.forEach(s => {
      s.data.studyPlan.forEach(m => {
        if (m.assignedDate && (m.isManuallyPlaced || m.assignedDate < todayStr || m.completedTasks?.some(v => v))) {
          if (!daySubjectOccupancy[m.assignedDate]) daySubjectOccupancy[m.assignedDate] = new Set();
          daySubjectOccupancy[m.assignedDate].add(s.id);
        }
      });
    });

    return sortedSessions.map(session => {
      if (session.isPassed) return session;
      const examDateObj = new Date(session.examDate);
      
      const lockedModules = session.data.studyPlan.filter(m => 
        m.isManuallyPlaced || (m.assignedDate && m.assignedDate < todayStr) || (m.completedTasks?.some(v => v))
      );
      
      const floatingModules = session.data.studyPlan.filter(m => 
        !lockedModules.find(l => l.uid === m.uid) && m.topics[0] !== "SIMULAZIONE"
      ).sort((a, b) => a.day - b.day);

      const availableDates: string[] = [];
      let cursor = new Date(todayStr);
      let safetyCount = 0;
      
      while (cursor < examDateObj && safetyCount < 180) {
        const dStr = getLocalDateStr(cursor);
        const isAnyExamDay = allExamDates.has(dStr);
        const subjectsToday = daySubjectOccupancy[dStr] || new Set();
        const isDayOff = session.dayOffs?.includes(dStr);
        
        const hasSlot = !isAnyExamDay && !isDayOff && (subjectsToday.size < 2 || subjectsToday.has(session.id));
        
        if (hasSlot) {
          availableDates.push(dStr);
        }
        cursor.setDate(cursor.getDate() + 1);
        safetyCount++;
      }

      const finalPlan: StudyPlanDay[] = [...lockedModules];
      
      if (floatingModules.length > 0 && availableDates.length > 0) {
        floatingModules.forEach((m, idx) => {
          const dateIdx = Math.min(Math.floor((idx * availableDates.length) / floatingModules.length), availableDates.length - 1);
          const chosenDate = availableDates[dateIdx];
          finalPlan.push({ ...m, assignedDate: chosenDate, isManuallyPlaced: false });
          
          if (!daySubjectOccupancy[chosenDate]) daySubjectOccupancy[chosenDate] = new Set();
          daySubjectOccupancy[chosenDate].add(session.id);
        });
      }

      const dayBeforeExam = new Date(session.examDate);
      dayBeforeExam.setDate(dayBeforeExam.getDate() - 1);
      const dbStr = getLocalDateStr(dayBeforeExam);
      
      if (!finalPlan.find(p => p.topics[0] === "SIMULAZIONE") && !allExamDates.has(dbStr) && dbStr >= todayStr) {
        finalPlan.push({
          uid: `auto-sim-${session.id}`, day: 9999, topics: ["SIMULAZIONE"],
          tasks: ["[PRATICA] Simulazione d'Esame integrale - 3h", "[PRATICA] Analisi finale - 2h"], 
          priority: Importance.HIGH, assignedDate: dbStr, completedTasks: [false, false]
        });
      }
      
      return { ...session, data: { ...session.data, studyPlan: finalPlan } };
    });
  }, [todayStr]);

  useEffect(() => {
    const init = async () => {
      try {
        const savedUserStr = localStorage.getItem('em_user');
        if (!savedUserStr) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const user = JSON.parse(savedUserStr);
        setLoadingStep('Recupero Account Cloud...');
        
        // Proviamo a caricare prima da IndexedDB locale
        let initialSessions = await StorageService.loadSessions();
        
        // Se locale è vuoto, proviamo un pull aggressivo dal "cloud"
        if (initialSessions.length === 0) {
          setLoadingStep('Sincronizzazione dati tra dispositivi...');
          const cloudRes = await StorageService.pullFromCloud(user.email);
          if (cloudRes) initialSessions = cloudRes;
        }
        
        setState(prev => ({
          ...prev, 
          user,
          sessions: rebalanceAllSessions(initialSessions),
          activeSessionId: initialSessions.length > 0 ? initialSessions[0].id : null,
          isAddingNew: false, // Non forziamo più l'aggiunta automatica
          isLoading: false
        }));
      } catch (err) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    init();
  }, [rebalanceAllSessions]);

  useEffect(() => {
    if (state.isLoading || !state.user) return;
    const handler = setTimeout(async () => {
      await StorageService.saveSessions(state.sessions);
      await StorageService.pushToCloud(state.user!.email, state.sessions);
    }, 1500);
    return () => clearTimeout(handler);
  }, [state.sessions, state.isLoading, state.user]);

  const handleAuthSuccess = (user: User, cloudSessions: ExamSession[] | null) => {
    const finalSessions = rebalanceAllSessions(cloudSessions || []);
    setState(prev => ({ 
      ...prev, 
      user, 
      sessions: finalSessions,
      activeSessionId: finalSessions.length > 0 ? finalSessions[0].id : null,
      isAddingNew: false, 
      isLoading: false 
    }));
    setActiveTab('summary');
  };

  const handleLogout = () => {
    localStorage.removeItem('em_user');
    setState({
      user: null, sessions: [], activeSessionId: null, isLoading: false, isAddingNew: false, error: null,
    });
  };

  const handleManualSync = async () => {
    if (!syncCodeInput.trim()) return;
    try {
      setLoadingStep('Sincronizzazione Codice...');
      const imported = await StorageService.importFromTransferCode(syncCodeInput.trim());
      const balanced = rebalanceAllSessions(imported);
      setState(prev => ({
        ...prev,
        sessions: balanced,
        activeSessionId: balanced.length > 0 ? balanced[0].id : null,
        isLoading: false
      }));
      setShowSyncModal(false);
      setSyncCodeInput('');
      setLoadingStep('');
    } catch (err) {
      alert("Codice non valido o corrotto.");
      setLoadingStep('');
    }
  };

  const handleAnalyze = async (config: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setLoadingStep('Ottimizzazione Studio...');
    
    try {
      const service = new GeminiService();
      let newData: StudyMaterialData;
      
      if (isUpdatingSession && state.activeSessionId) {
        const activeSess = state.sessions.find(s => s.id === state.activeSessionId)!;
        const baseContent = activeSess.content.substring(0, 10000);
        const newContent = config.content && config.content.trim().length > 20 ? `${baseContent}\n\n[UPDATE]\n${config.content}` : activeSess.content;
        
        setLoadingStep('Aggiornamento Piano...');
        newData = await service.analyzeMaterials(newContent, config.faculty, config.course, config.examType, config.depth, config.examDate);
        
        const updatedSessions = state.sessions.map(s => s.id === state.activeSessionId ? {
          ...s, examDate: config.examDate, examType: config.examType, depth: config.depth,
          content: newContent, data: newData, lastUpdateDate: getLocalDateStr()
        } : s);
        
        setState(prev => ({ ...prev, sessions: rebalanceAllSessions(updatedSessions), isLoading: false }));
        setIsUpdatingSession(false);
      } else {
        setLoadingStep('Analisi Materiali IA...');
        newData = await service.analyzeMaterials(config.content, config.faculty, config.course, config.examType, config.depth, config.examDate);
        
        const newSess: ExamSession = {
          id: crypto.randomUUID(), faculty: config.faculty, course: config.course, examType: config.examType,
          depth: config.depth, examDate: config.examDate, isPostponed: false, isPassed: false,
          content: config.content, pastExamsContent: '', data: newData, createdAt: Date.now(),
          colorIndex: state.sessions.length % 6, dayOffs: [], chatHistory: []
        };
        
        setState(prev => ({
          ...prev, sessions: rebalanceAllSessions([...prev.sessions, newSess]),
          activeSessionId: newSess.id, isLoading: false, isAddingNew: false
        }));
      }
      setActiveTab('summary');
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: "Errore. Riprova con meno testo o attendi un istante." }));
    }
    setLoadingStep('');
  };

  const handleUpdateChat = (sessionId: string, newHistory: ChatMessage[]) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, chatHistory: newHistory } : s)
    }));
  };

  const activeSess = state.sessions.find(s => s.id === state.activeSessionId);

  if (!state.user && !state.isLoading) return <AuthView onAuthSuccess={handleAuthSuccess} />;

  return (
    <div className="min-h-screen flex bg-slate-50/20 font-inter text-slate-900">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} sessions={state.sessions} activeSessionId={state.activeSessionId}
        onSelectSession={(id) => { setIsGlobalPlan(false); setIsUpdatingSession(false); setActiveTab('summary'); setState(p => ({ ...p, activeSessionId: id, isAddingNew: false })); }}
        onAddNew={() => { setIsGlobalPlan(false); setIsUpdatingSession(false); setState(p => ({ ...p, isAddingNew: true, activeSessionId: null })); }}
        onShowGlobalPlan={() => { setIsGlobalPlan(true); setIsUpdatingSession(false); setState(p => ({ ...p, isAddingNew: false, activeSessionId: null })); }}
        onUpdateMaterials={() => { setIsUpdatingSession(true); setIsGlobalPlan(false); setState(p => ({ ...p, isAddingNew: false })); }}
        onDeleteSession={(id) => {
          const filtered = state.sessions.filter(s => s.id !== id);
          setState(prev => ({ ...prev, sessions: rebalanceAllSessions(filtered), activeSessionId: filtered[0]?.id || null, isAddingNew: filtered.length === 0 }));
        }} 
        onMarkAsPassed={(id) => setState(prev => ({ ...prev, sessions: prev.sessions.map(s => s.id === id ? { ...s, isPassed: true } : s) }))}
        isGlobalPlan={isGlobalPlan} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}
        user={state.user} onLogout={handleLogout}
      />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {state.isLoading ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center p-12 bg-white rounded-[4rem] shadow-2xl border border-blue-50 w-full max-w-xl animate-fadeIn">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-[6px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <ICONS.Brain className="absolute inset-0 m-auto w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter mb-2">{loadingStep || 'Caricamento Cloud...'}</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Sincronizzando i tuoi dati tra i dispositivi</p>
              </div>
            </div>
        ) : state.isAddingNew || isUpdatingSession ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <SetupForm 
                onAnalyze={handleAnalyze} loading={state.isLoading} error={state.error} 
                canCancel={state.sessions.length > 0}
                initialData={isUpdatingSession && activeSess ? {
                  faculty: activeSess.faculty, course: activeSess.course,
                  examDate: activeSess.examDate, examType: activeSess.examType, depth: activeSess.depth
                } : undefined}
                onCancel={() => { 
                  setIsUpdatingSession(false); 
                  setState(p => ({ ...p, isAddingNew: false, activeSessionId: p.activeSessionId || (p.sessions.length > 0 ? p.sessions[0].id : null) })); 
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 py-6 px-12 flex items-center justify-between sticky top-0 z-40 shrink-0">
              <div className="flex items-center gap-6 overflow-hidden">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-white rounded-2xl shadow-sm text-blue-600"><ICONS.Menu className="w-6 h-6" /></button>
                <div className="truncate">
                  <h1 className="text-lg font-black text-slate-900 truncate tracking-tight">
                    {isGlobalPlan ? 'Il Mio Calendario' : (activeSess?.course || 'Dashboard Studente')}
                  </h1>
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="p-6 md:p-12 max-w-7xl mx-auto w-full pb-20">
                {isGlobalPlan ? (
                  <PlanView 
                    sessions={state.sessions} 
                    onUpdateSessions={(u) => setState(p => ({ ...p, sessions: rebalanceAllSessions(u) }))} 
                    onMoveModule={(sid, muid, nd) => {
                      const updated = state.sessions.map(s => {
                        if (s.id !== sid) return s;
                        const plan = s.data.studyPlan.map(m => m.uid === muid ? { ...m, assignedDate: nd, isManuallyPlaced: true } : m);
                        return { ...s, data: { ...s.data, studyPlan: plan } };
                      });
                      setState(prev => ({ ...prev, sessions: rebalanceAllSessions(updated) }));
                    }} 
                    onRebalance={() => setState(p => ({...p, sessions: rebalanceAllSessions(p.sessions)}))}
                    onToggleTask={(sid, muid, tidx) => {
                      setState(prev => {
                        const updated = prev.sessions.map(s => {
                          if (s.id !== sid) return s;
                          const plan = s.data.studyPlan.map(m => {
                            if (m.uid !== muid) return m;
                            const newCompleted = [...(m.completedTasks || [])];
                            newCompleted[tidx] = !newCompleted[tidx];
                            return { ...m, completedTasks: newCompleted };
                          });
                          return { ...s, data: { ...s.data, studyPlan: plan } };
                        });
                        return { ...prev, sessions: updated };
                      });
                    }}
                  />
                ) : activeSess ? (
                  <div className="space-y-8">
                    {activeSess.isPassed && <div className="bg-emerald-600 p-10 rounded-[3rem] text-white shadow-2xl animate-slideDown"><h3 className="text-3xl font-black uppercase tracking-tighter text-center">Esame Superato! 🎉</h3></div>}
                    {(() => {
                      switch (activeTab) {
                        case 'summary': return <SummaryView summary={activeSess.data.summary} />;
                        case 'recall': return <QuizView flashcards={activeSess.data.flashcards} onRegenerate={() => {}} isLoading={false} sessionContent={activeSess.content} />;
                        case 'simulation': return <SimulationView materialData={activeSess.data} fullContent={activeSess.content} />;
                        case 'chat': return <ProfessorChatView session={activeSess} onUpdateChat={(h) => handleUpdateChat(activeSess.id, h)} />;
                        case 'mock': return <MockExamView session={activeSess} onUpdateSession={(u) => setState(p => ({ ...p, sessions: p.sessions.map(s => s.id === u.id ? u : s) }))} />;
                        case 'questions': return (
                          <div className="space-y-12">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Domande Probabili</h2>
                            <div className="grid grid-cols-1 gap-8">
                              {activeSess.data.questions.map((q, idx) => (
                                <div key={idx} className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
                                  <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-block mb-4">{q.type}</span>
                                  <h3 className="text-2xl font-black text-slate-900 mb-6">{q.question}</h3>
                                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-lg font-medium text-slate-700">{q.modelAnswer}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                        default: return null;
                      }
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-20 flex flex-col items-center gap-12 max-w-2xl mx-auto animate-fadeIn">
                     <div className="relative">
                       <div className="w-40 h-40 bg-blue-600/10 rounded-[4rem] flex items-center justify-center text-blue-600">
                         <ICONS.Brain className="w-20 h-20" />
                       </div>
                       <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white">
                         <ICONS.Plus className="w-6 h-6" />
                       </div>
                     </div>
                     <div className="space-y-4">
                       <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Benvenuto in ExamMaster!</h2>
                       <p className="text-slate-500 text-lg font-medium leading-relaxed">
                         Il tuo spazio di studio è pronto. Se avevi già dei dati sul telefono o su un altro computer, sincronizzali ora, altrimenti crea il tuo primo piano.
                       </p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                       <button 
                        onClick={() => setState(p => ({...p, isAddingNew: true}))} 
                        className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-slate-100 rounded-[3rem] hover:border-blue-600 hover:shadow-2xl transition-all group"
                       >
                         <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                           <ICONS.Plus className="w-8 h-8" />
                         </div>
                         <div className="text-center">
                           <p className="font-black uppercase tracking-widest text-[10px] text-blue-600 mb-1">Inizia da zero</p>
                           <p className="font-bold text-slate-900">Nuova Materia</p>
                         </div>
                       </button>

                       <button 
                        onClick={() => setShowSyncModal(true)} 
                        className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-slate-100 rounded-[3rem] hover:border-emerald-500 hover:shadow-2xl transition-all group"
                       >
                         <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                           <ICONS.Clipboard className="w-8 h-8" />
                         </div>
                         <div className="text-center">
                           <p className="font-black uppercase tracking-widest text-[10px] text-emerald-600 mb-1">Recupera dati</p>
                           <p className="font-bold text-slate-900">Usa Codice Sync</p>
                         </div>
                       </button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {showSyncModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
              <button onClick={() => setShowSyncModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><ICONS.XMark className="w-6 h-6" /></button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                  <ICONS.Clipboard className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sincronizzazione Dispositivi</h3>
                <p className="text-slate-500 text-sm font-medium mt-2">Incolla il codice generato sull'altro dispositivo per caricare istantaneamente tutto il tuo studio.</p>
              </div>
              <textarea 
                value={syncCodeInput}
                onChange={(e) => setSyncCodeInput(e.target.value)}
                placeholder="Incolla il codice Base64 qui..."
                className="w-full h-40 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-mono outline-none focus:border-emerald-500 transition-all resize-none mb-6"
              />
              <button 
                onClick={handleManualSync}
                disabled={!syncCodeInput.trim()}
                className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                Importa Sessioni
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
