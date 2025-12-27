
import React, { useState } from 'react';
import { SummaryUnit, Importance } from '../types';
import { ICONS } from '../constants';

interface SummaryViewProps {
  summary: SummaryUnit[];
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getImportanceBadge = (imp: Importance) => {
    switch (imp) {
      case Importance.HIGH:
        return (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-full text-[9px] font-black tracking-widest uppercase shadow-lg shadow-red-500/20 border border-red-500">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Focus Alto / High Priority
          </div>
        );
      case Importance.MEDIUM:
        return (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 text-white rounded-full text-[9px] font-black tracking-widest uppercase shadow-lg shadow-amber-500/20 border border-amber-400">
            <span className="w-2 h-2 bg-white/60 rounded-full"></span>
            Focus Medio
          </div>
        );
      case Importance.LOW:
        return (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20 border border-emerald-400">
            Focus Complementare
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Riassunto Strategico</h2>
          <p className="text-slate-500 font-medium mt-1">Gerarchia dei concetti basata sulla probabilità d'esame.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Critico</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fondamentale</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {summary.map((unit, idx) => {
          const isExpanded = expandedIndex === idx;
          
          return (
            <div 
              key={idx} 
              onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              className={`bg-white border-2 rounded-[3rem] p-10 cursor-pointer transition-all duration-500 relative overflow-hidden shadow-sm group ${
                isExpanded ? 'border-blue-600 shadow-2xl shadow-blue-500/10' : 'border-slate-100 hover:border-blue-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-4 mb-4">
                    {getImportanceBadge(unit.importance)}
                    <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Concetto #{idx + 1}</span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                    {unit.title}
                  </h3>
                </div>
                <div className="flex-shrink-0">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                     <ICONS.ArrowRight className="w-6 h-6 rotate-90" />
                   </div>
                </div>
              </div>
              
              <div className="bg-slate-50/80 p-8 rounded-[2rem] border border-slate-100 mb-2">
                <p className="text-slate-700 text-lg font-semibold leading-relaxed">
                  {unit.content}
                </p>
              </div>

              <div className={`mt-8 space-y-8 transition-all duration-700 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-10 border-t border-slate-100">
                  <div className="space-y-6">
                    <h4 className="flex items-center gap-3 text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">
                      <ICONS.Clipboard className="w-5 h-5" />
                      Analisi Dettagliata
                    </h4>
                    <div className="text-base text-slate-600 font-medium leading-loose prose prose-blue">
                      {unit.details ? unit.details.split('2.')[0] : "Analisi in corso..."}
                    </div>
                  </div>
                  
                  <div className="space-y-6 bg-blue-600/5 p-10 rounded-[3rem] border border-blue-100">
                    <h4 className="flex items-center gap-3 text-[11px] font-black text-blue-700 uppercase tracking-[0.2em]">
                      <ICONS.Brain className="w-5 h-5" />
                      Suggerimenti d'Esame
                    </h4>
                    <div className="text-base text-blue-900 font-bold leading-relaxed whitespace-pre-wrap">
                      {unit.details && unit.details.includes('2.') ? unit.details.substring(unit.details.indexOf('2.')) : "Il professore sta preparando i consigli per questo modulo..."}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-6 bg-slate-900 px-10 rounded-[2rem] text-white">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fonte: Appunti Integrati</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Dati Verificati dall'IA</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default SummaryView;
