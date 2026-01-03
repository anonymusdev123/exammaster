import React, { useState, useMemo } from 'react';
import { ExamSession } from '../types';
import { ICONS } from '../constants';

interface PlanViewProps {
  sessions: ExamSession[];
  onUpdateSessions: (updated: ExamSession[]) => void;
  onMoveModule: (sessionId: string, moduleUid: string, newDate: string) => void;
  onRebalance: () => void;
  onToggleTask: (sessionId: string, moduleUid: string, taskIdx: number) => void;
}

const SESSION_COLORS = [
  { bg: 'bg-blue-600', text: 'text-blue-50', border: 'border-blue-700', light: 'bg-blue-50' },
  { bg: 'bg-purple-600', text: 'text-purple-50', border: 'border-purple-700', light: 'bg-purple-50' },
  { bg: 'bg-amber-600', text: 'text-amber-50', border: 'border-amber-700', light: 'bg-amber-50' },
  { bg: 'bg-rose-600', text: 'text-rose-50', border: 'border-rose-700', light: 'bg-rose-50' },
  { bg: 'bg-indigo-600', text: 'text-indigo-50', border: 'border-indigo-700', light: 'bg-indigo-50' },
  { bg: 'bg-orange-600', text: 'text-orange-50', border: 'border-orange-700', light: 'bg-orange-50' },
];

const PlanView: React.FC<PlanViewProps> = ({ sessions, onUpdateSessions, onMoveModule, onRebalance, onToggleTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ date: string, courseBlocks: any[] } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Per forzare aggiornamento completo

  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Aggiungi effect per refresh quando sessions cambia
  React.useEffect(() => {
    setRefreshKey(k => k + 1);
  }, [sessions]);

  const todayStr = getLocalDateStr(new Date());

  // Raggruppa i task per MATERIA (non più singoli task)
  const eventsByDate = useMemo(() => {
    const map: Record<string, { courseBlocks: Map<string, any>, exams: any[], dayOffs: string[] }> = {};
    
    sessions.forEach(session => {
      const color = SESSION_COLORS[session.colorIndex || 0];
      const examDateStr = session.examDate;

      if (!map[examDateStr]) map[examDateStr] = { courseBlocks: new Map(), exams: [], dayOffs: [] };
      map[examDateStr].exams.push({ course: session.course, color });

      if (session.isPassed) return;

      session.dayOffs?.forEach(dStr => {
        if (!map[dStr]) map[dStr] = { courseBlocks: new Map(), exams: [], dayOffs: [] };
        if (!map[dStr].dayOffs.includes(session.course)) {
          map[dStr].dayOffs.push(session.course);
        }
      });

      session.data.studyPlan.forEach((dayPlan) => {
        const dateStr = dayPlan.assignedDate;
        if (!dateStr) return;
        
        if (!map[dateStr]) map[dateStr] = { courseBlocks: new Map(), exams: [], dayOffs: [] };
        
        const courseKey = session.course;
        
        // Raggruppa tutti i moduli della stessa materia nello stesso giorno
        if (!map[dateStr].courseBlocks.has(courseKey)) {
          map[dateStr].courseBlocks.set(courseKey, {
            sessionId: session.id,
            course: session.course,
            color,
            modules: []
          });
        }
        
        const isCompleted = dayPlan.completedTasks?.every(t => t) && (dayPlan.completedTasks?.length || 0) > 0;
        const isSim = dayPlan.topics[0] === "SIMULAZIONE";
        
        // Calcola ore totali dai task - se non ci sono ore esplicite, stima 2h per task
        const totalHours = dayPlan.tasks.reduce((sum, task) => {
          const match = task.match(/(\d+(?:\.\d+)?)\s*h/i);
          return sum + (match ? parseFloat(match[1]) : 2); // Default 2h per task
        }, 0);
        
        map[dateStr].courseBlocks.get(courseKey).modules.push({
          plan: dayPlan,
          isCompleted,
          isSim,
          uniqueKey: dayPlan.uid,
          hours: totalHours
        });
      });
    });
    
    // Converti Map in Array per rendering
    const result: Record<string, { courseBlocks: any[], exams: any[], dayOffs: string[] }> = {};
    Object.keys(map).forEach(date => {
      result[date] = {
        courseBlocks: Array.from(map[date].courseBlocks.values()),
        exams: map[date].exams,
        dayOffs: map[date].dayOffs
      };
    });
    
    return result;
  }, [sessions]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay(); 
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay; i > 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i + 1), isCurrentMonth: false });
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    while (days.length < 42) {
      days.push({ date: new Date(year, month + 1, days.length - daysInMonth - startDay + 1), isCurrentMonth: false });
    }
    return days;
  }, [currentDate]);

  const handleGlobalDayOffToggle = (date: string) => {
    const isCurrentlyDayOff = sessions.some(s => s.dayOffs?.includes(date));
    const updated = sessions.map(s => {
      if (s.isPassed) return s;
      const dayOffs = s.dayOffs || [];
      return {
        ...s,
        dayOffs: isCurrentlyDayOff ? dayOffs.filter(d => d !== date) : Array.from(new Set([...dayOffs, date]))
      };
    });
    onUpdateSessions(updated);
  };

  const isSelectedDayOff = selectedDayInfo ? sessions.some(s => s.dayOffs?.includes(selectedDayInfo.date)) : false;

  const onDragStart = (e: React.DragEvent, sessionId: string, moduleUid: string) => {
    const data = JSON.stringify({ sessionId, moduleUid });
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.4';
  };

  const onDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    try {
      const { sessionId, moduleUid } = JSON.parse(rawData);
      onMoveModule(sessionId, moduleUid, date);
    } catch (err) {
      console.error("Drop Parse Error", err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-400"><ICONS.ArrowRight className="w-5 h-5 rotate-180" /></button>
          <h2 className="text-xl font-black text-slate-900 capitalize tracking-tight min-w-[150px] text-center">{currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-400"><ICONS.ArrowRight className="w-5 h-5" /></button>
        </div>

        <button 
          onClick={onRebalance}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/30"
        >
          <ICONS.Brain className="w-4 h-4" />
          Ottimizza Piano Strategico
        </button>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
            <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 grid-rows-6 h-[650px] md:h-[900px]">
          {calendarDays.map((day, idx) => {
            const dateStr = getLocalDateStr(day.date);
            const isToday = dateStr === todayStr;
            const data = eventsByDate[dateStr] || { courseBlocks: [], exams: [], dayOffs: [] };
            const isExamDay = data.exams.length > 0;
            const isDayOff = data.dayOffs.length > 0;
            
            // VISUALIZZA SOLO MAX 2 BLOCCHI (uno per materia)
            const visibleBlocks = data.courseBlocks.slice(0, 2);
            const hasMoreBlocks = data.courseBlocks.length > 2;
            
            return (
              <div 
                key={idx}
                onClick={() => day.isCurrentMonth && setSelectedDayInfo({ date: dateStr, courseBlocks: data.courseBlocks })}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, dateStr)}
                className={`border-r border-b border-slate-100 p-1 flex flex-col gap-1 transition-all relative group/cell ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/30'} ${isExamDay ? 'bg-emerald-50/30' : ''} ${isDayOff ? 'bg-red-50/40' : ''} ${day.isCurrentMonth ? 'hover:bg-blue-50/50 cursor-pointer' : ''}`}
              >
                <div className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${isExamDay ? 'bg-emerald-600 text-white shadow-lg animate-pulse' : isToday ? 'bg-blue-600 text-white shadow-md' : isDayOff ? 'bg-red-500 text-white' : 'text-slate-400'}`}>
                  {day.date.getDate()}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                  {isExamDay && data.exams.map((ex, i) => (
                    <div key={i} className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-1 rounded truncate uppercase shadow-sm border border-emerald-700">ESAME: {ex.course}</div>
                  ))}
                  {isDayOff && (
                    <div className="bg-red-100 text-red-600 text-[8px] font-black px-1.5 py-1 rounded truncate uppercase flex items-center gap-1">
                      RIPOSO
                    </div>
                  )}
                  
                  {/* MOSTRA SOLO 2 BLOCCHI MASSIMO */}
                  {!isDayOff && visibleBlocks.map((block) => {
                    const totalHours = block.modules.reduce((sum: number, m: any) => sum + m.hours, 0);
                    const hasSim = block.modules.some((m: any) => m.isSim);
                    const allCompleted = block.modules.every((m: any) => m.isCompleted);
                    
                    return (
                      <div 
                        key={block.course}
                        className={`${block.color.bg} ${block.color.text} text-[8px] font-bold px-1.5 py-1 rounded shadow-sm transition-all hover:scale-105 cursor-pointer ${allCompleted ? 'opacity-40 line-through' : ''} ${hasSim ? "ring-2 ring-white ring-offset-1 ring-offset-emerald-500" : ""}`}
                      >
                        <div className="truncate uppercase">{hasSim ? `🔥 ${block.course}` : block.course}</div>
                        <div className="text-[7px] opacity-80 mt-0.5">⏱️ {totalHours.toFixed(1)}h</div>
                      </div>
                    );
                  })}
                  
                  {/* Indicatore se ci sono più di 2 materie */}
                  {hasMoreBlocks && (
                    <div className="bg-slate-200 text-slate-600 text-[7px] font-black px-1.5 py-1 rounded text-center">
                      +{data.courseBlocks.length - 2} altre
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDayInfo && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[60] p-6 flex items-center justify-center animate-fadeIn" onClick={() => setSelectedDayInfo(null)}>
            <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl p-10 relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="absolute top-8 right-24">
                <button 
                  onClick={() => handleGlobalDayOffToggle(selectedDayInfo.date)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isSelectedDayOff ? 'bg-red-600 text-white shadow-red-500/40 animate-pulse' : 'bg-white border-2 border-red-500 text-red-500 hover:bg-red-100'}`}
                >
                  {isSelectedDayOff ? 'DAY OFF ATTIVO' : 'DAY OFF'}
                </button>
              </div>

              <button onClick={() => setSelectedDayInfo(null)} className="absolute top-8 right-8 p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"><ICONS.XMark className="w-5 h-5" /></button>
              
              <div className="mb-8">
                <h3 className="text-3xl font-black capitalize tracking-tight text-slate-900">{new Date(selectedDayInfo.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                <p className="text-slate-400 text-sm font-medium mt-2">
                  {selectedDayInfo.courseBlocks.length} {selectedDayInfo.courseBlocks.length === 1 ? 'materia' : 'materie'} da studiare
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {isSelectedDayOff ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 bg-red-50 rounded-[3rem] border-2 border-dashed border-red-200 text-center space-y-4">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                    </div>
                    <h4 className="text-xl font-black text-red-700 uppercase tracking-tighter">Oggi ricarichiamo le pile! 🌙</h4>
                    <p className="text-sm font-medium text-red-500 max-w-xs">Tutto lo studio è stato spalmato sui prossimi giorni disponibili.</p>
                  </div>
                ) : (
                  <>
                    {selectedDayInfo.courseBlocks.length > 0 ? (
                      selectedDayInfo.courseBlocks.map((block) => {
                        const totalHours = block.modules.reduce((sum: number, m: any) => sum + m.hours, 0);
                        
                        return (
                          <div key={block.course} className={`${block.color.light} p-8 rounded-[2.5rem] border-2 ${block.color.border.replace('bg-', 'border-').replace('600', '200')} shadow-sm`}>
                            <div className="flex items-center justify-between mb-6">
                              <span className={`${block.color.bg} ${block.color.text} px-4 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-md`}>
                                {block.course}
                              </span>
                              <span className="text-sm font-black text-slate-600">
                                {totalHours > 0 ? `⏱️ ${totalHours.toFixed(1)}h totali` : `${block.modules.length} moduli`}
                              </span>
                            </div>
                            
                            {/* Lista di tutti i moduli di questa materia */}
                            <div className="space-y-4">
                              {block.modules.map((module: any) => {
                                const isSim = module.isSim;
                                return (
                                  <div key={module.uniqueKey} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                      <span className="text-xs font-black text-slate-500 uppercase">
                                        {isSim ? '🔥 SIMULAZIONE' : `Modulo ${module.plan.day}`}
                                        {module.plan.isManuallyPlaced && ' • Bloccato'}
                                      </span>
                                      {module.hours > 0 && (
                                        <span className="text-xs font-bold text-slate-400">~{module.hours.toFixed(1)}h</span>
                                      )}
                                    </div>
                                    
                                    <ul className="space-y-2">
                                      {module.plan.tasks.map((task: string, idx: number) => {
                                        const isCompleted = module.plan.completedTasks?.[idx] || false;
                                        return (
                                          <li 
                                            key={idx}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('🔘 Click task:', { sessionId: block.sessionId, uid: module.plan.uid, idx, current: isCompleted });
                                              onToggleTask(block.sessionId, module.plan.uid, idx);
                                            }}
                                            className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl text-sm font-medium border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all active:scale-95"
                                          >
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-slate-300'} shrink-0 mt-0.5`}>
                                              {isCompleted && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                              )}
                                            </div>
                                            <span className={`text-slate-700 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                              {task}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Nessun impegno pianificato</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanView;