
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { User, ExamSession } from '../types';
import { StorageService } from '../services/storageService';

interface AuthViewProps {
  onAuthSuccess: (user: User, cloudSessions: ExamSession[] | null) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [syncCode, setSyncCode] = useState('');
  const [showSyncInput, setShowSyncInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSyncStatus('Verifica credenziali...');
    
    setTimeout(async () => {
      try {
        let finalSessions: ExamSession[] | null = null;
        
        // Se l'utente ha inserito un codice di sincronizzazione, importiamo quello prioritariamente
        if (syncCode.trim()) {
          setSyncStatus('Importazione dati da altro dispositivo...');
          finalSessions = await StorageService.importFromTransferCode(syncCode.trim());
        } else {
          setSyncStatus('Sincronizzazione dati cloud...');
          finalSessions = await StorageService.pullFromCloud(email.toLowerCase());
        }
        
        const mockUser: User = {
          id: crypto.randomUUID(),
          email: email.toLowerCase(),
          name: isLogin ? (email.split('@')[0]) : name,
          syncKey: Math.random().toString(36).substring(2, 15).toUpperCase(),
        };
        
        localStorage.setItem('em_user', JSON.stringify(mockUser));
        
        setSyncStatus('Dati pronti!');
        setTimeout(() => {
          onAuthSuccess(mockUser, finalSessions);
          setLoading(false);
        }, 500);
      } catch (err: any) {
        setError(err.message || "Errore durante l'accesso");
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 md:p-12 font-inter">
      <div className="w-full max-w-xl animate-fadeIn">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[2.5rem] shadow-2xl mb-6 transform hover:rotate-12 transition-transform">
            <ICONS.Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">ExamMaster <span className="text-blue-600">Cloud</span></h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Accedi ai tuoi studi ovunque</p>
        </div>

        <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-blue-500/10 p-10 md:p-16 border border-slate-100 relative overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center animate-shake">
              {error}
            </div>
          )}

          <div className="flex bg-slate-100 p-2 rounded-2xl mb-10">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Accedi
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Nome Completo</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-900 transition-all"
                  placeholder="Mario Rossi"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Email Universitaria</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-900 transition-all"
                placeholder="nome.cognome@studenti.it"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-900 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="pt-2">
              <button 
                type="button" 
                onClick={() => setShowSyncInput(!showSyncInput)}
                className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                {showSyncInput ? '- Nascondi opzioni sync' : '+ Importa dati da altro dispositivo'}
              </button>
              
              {showSyncInput && (
                <div className="mt-4 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 animate-slideDown">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-2">Incolla qui il Codice di Trasferimento</label>
                  <textarea 
                    value={syncCode}
                    onChange={(e) => setSyncCode(e.target.value)}
                    placeholder="Incolla il codice generato sull'altro dispositivo..."
                    className="w-full h-24 p-4 bg-white border border-blue-100 rounded-xl text-[10px] font-mono outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Caricamento...</span>
                  </div>
                  <span className="text-[8px] opacity-60 font-black uppercase tracking-widest">{syncStatus}</span>
                </div>
              ) : isLogin ? 'Entra nel PKM' : 'Inizia a Studiare'}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
            I tuoi materiali saranno sincronizzati localmente
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
