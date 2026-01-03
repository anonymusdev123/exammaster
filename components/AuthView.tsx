
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
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSyncStatus('Verifica credenziali...');
    
    // Simulazione latenza di rete e autenticazione cloud
    setTimeout(async () => {
      setSyncStatus('Sincronizzazione dati cloud...');
      
      const userEmail = email.toLowerCase();
      
      // Tentativo di recupero dati dal cloud (Cross-device simulation)
      const cloudSessions = await StorageService.pullFromCloud(userEmail);
      
      const mockUser: User = {
        id: crypto.randomUUID(),
        email: userEmail,
        name: isLogin ? (userEmail.split('@')[0]) : name,
        syncKey: Math.random().toString(36).substring(2, 15).toUpperCase(),
      };
      
      // Salvataggio sessione utente locale
      localStorage.setItem('em_user', JSON.stringify(mockUser));
      
      setSyncStatus('Dati pronti!');
      setTimeout(() => {
        onAuthSuccess(mockUser, cloudSessions);
        setLoading(false);
      }, 500);
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

        <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-blue-500/10 p-10 md:p-16 border border-slate-100">
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

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{isLogin ? 'Accesso in corso...' : 'Creazione Account...'}</span>
                  </div>
                  <span className="text-[8px] opacity-60 font-black uppercase tracking-widest">{syncStatus}</span>
                </div>
              ) : isLogin ? 'Entra nel PKM' : 'Inizia a Studiare'}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
            {isLogin ? 'I tuoi materiali sono sincronizzati in tempo reale' : 'Il tuo piano sarà disponibile su tutti i dispositivi'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
