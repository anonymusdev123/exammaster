
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { ExamSession, User } from '../types';
import { StorageService } from '../services/storageService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sessions: ExamSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onAddNew: () => void;
  onShowGlobalPlan: () => void;
  onUpdateMaterials: () => void;
  onDeleteSession: (id: string) => void;
  onMarkAsPassed: (id: string) => void;
  isGlobalPlan: boolean;
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, sessions, activeSessionId, onSelectSession, onAddNew, onShowGlobalPlan, onUpdateMaterials, onDeleteSession, onMarkAsPassed, isGlobalPlan, isOpen, onClose, user, onLogout 
}) => {
  const [copyStatus, setCopyStatus] = useState<'IDLE' | 'COPIED' | 'ERROR'>('IDLE');

  const menuItems = [
    { id: 'summary', label: 'Riassunto Rapido', icon: ICONS.Book },
    { id: 'questions', label: 'Cosa Chiedono?', icon: ICONS.Clipboard },
    { id: 'chat', label: 'Chiedi al Prof', icon: ICONS.Chat },
    { id: 'recall', label: 'Flashcards', icon: ICONS.Brain },
    { id: 'mcq', label: 'Quiz Multipli', icon: ICONS.Quiz },
    { id: 'simulation', label: 'Simula Orale', icon: ICONS.Chat },
    { id: 'mock', label: 'Simula Scritto', icon: ICONS.Upload },
  ];

  const activeSess = sessions.find(s => s.id === activeSessionId);

  const handleCopySyncCode = async () => {
    try {
      setCopyStatus('IDLE');
      const code = await StorageService.generateTransferCode();
      await navigator.clipboard.writeText(code);
      setCopyStatus('COPIED');
      setTimeout(() => setCopyStatus('IDLE'), 2000);
    } catch (err) {
      setCopyStatus('ERROR');
      setTimeout(() => setCopyStatus('IDLE'), 3000);
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 h-screen flex flex-col shadow-2xl lg:shadow-none transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:sticky lg:top-0`}>
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-xl font-black text-blue-600 flex items-center gap-3 tracking-tighter italic">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md"><ICONS.Brain className="w-6 h-6" /></div>
            ExamMaster
          </h1>
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-slate-600"><ICONS.XMark className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-hide">
          <div className="space-y-4">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Studia</p>
            <button 
              onClick={() => { onShowGlobalPlan(); if(window.innerWidth < 1024) onClose(); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isGlobalPlan ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <ICONS.Calendar className="w-5 h-5" />Il Mio Calendario
            </button>
            
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Materie</p>
              {sessions.map(s => {
                const isActive = activeSessionId === s.id && !isGlobalPlan;
                return (
                  <div key={s.id} className="space-y-1">
                    <button
                      onClick={() => { onSelectSession(s.id); if(window.innerWidth < 1024) onClose(); }}
                      className={`w-full flex flex-col items-start px-4 py-3 rounded-xl text-sm transition-all border text-left min-w-0 ${isActive ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-50'} ${s.isPassed ? 'opacity-40 grayscale bg-slate-50' : ''}`}
                    >
                      <span className="font-bold truncate w-full flex items-center gap-1">
                        {s.course}
                        {s.isPassed && <span className="text-[7px] bg-emerald-500 text-white px-1 py-0.5 rounded-sm uppercase font-black shrink-0">SUPERATO</span>}
                      </span>
                      <span className="text-[9px] opacity-60 uppercase font-black truncate w-full">{s.faculty}</span>
                    </button>
                  </div>
                );
              })}
              
              <button 
                onClick={() => { onAddNew(); if(window.innerWidth < 1024) onClose(); }} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black text-blue-600 border-2 border-dashed border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-all mt-2 uppercase"
              >
                + Nuova Materia
              </button>
            </div>
          </div>

          {activeSessionId && !isGlobalPlan && (
            <div className="pt-6 border-t border-slate-100 animate-fadeIn space-y-1">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metodo di Studio</p>
              {menuItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => { setActiveTab(item.id); if(window.innerWidth < 1024) onClose(); }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <item.icon className="w-4 h-4" />{item.label}
                </button>
              ))}

              <div className="mt-8 pt-6 border-t border-slate-200 space-y-1">
                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Opzioni</p>
                
                <button 
                  onClick={() => { onUpdateMaterials(); if(window.innerWidth < 1024) onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all"
                >
                  <ICONS.Upload className="w-4 h-4" />
                  Aggiorna Materiali
                </button>
                
                {activeSess && !activeSess.isPassed && (
                  <button 
                    onClick={() => onMarkAsPassed(activeSessionId)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Segna Superato!
                  </button>
                )}

                <button 
                  onClick={() => onDeleteSession(activeSessionId)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all group"
                >
                  <ICONS.Trash className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Rimuovi Materia
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-500/20">
                  {user?.name?.[0].toUpperCase() || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-black text-slate-900 truncate tracking-tight">{user?.name || 'Utente'}</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <p className="text-[7px] text-emerald-600 font-black uppercase tracking-widest">Local Sync Active</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-500 transition-all"
                title="Esci"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
           </div>
           
           <div className="space-y-2">
             <div className="px-3 py-2 bg-white rounded-lg border border-slate-200">
                <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Account Key</p>
                <p className="text-[9px] font-mono font-bold text-slate-600 truncate">{user?.syncKey || 'N/A'}</p>
             </div>
             <button 
                onClick={handleCopySyncCode}
                className={`w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                  copyStatus === 'COPIED' ? 'bg-emerald-500 border-emerald-500 text-white' : 
                  copyStatus === 'ERROR' ? 'bg-rose-500 border-rose-500 text-white' : 
                  'bg-white border-blue-100 text-blue-600 hover:border-blue-300 shadow-sm'
                }`}
             >
                <ICONS.Clipboard className="w-3 h-3" />
                {copyStatus === 'COPIED' ? 'CODICE COPIATO!' : copyStatus === 'ERROR' ? 'ERRORE DATI TROPPO GRANDI' : 'COPIA CODICE SYNC'}
             </button>
             <p className="text-[7px] text-slate-400 text-center font-medium italic px-2 leading-tight">Usa questo codice per caricare i tuoi dati su un altro computer o dispositivo.</p>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
