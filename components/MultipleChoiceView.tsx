
import React, { useState } from 'react';
import { MultipleChoiceQuestion } from '../types';
import { ICONS } from '../constants';
import { GeminiService } from '../services/geminiService';

interface MultipleChoiceViewProps {
  questions: MultipleChoiceQuestion[];
  onRegenerate: (topic?: string) => void;
  isLoading: boolean;
  course: string;
}

const MultipleChoiceView: React.FC<MultipleChoiceViewProps> = ({ questions, onRegenerate, isLoading, course }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [targetTopic, setTargetTopic] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQ = questions[currentIndex];

  const handleOptionClick = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setShowExplanation(true);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowExplanation(false);
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  const handlePrev = () => {
    setSelectedOption(null);
    setShowExplanation(false);
    setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center p-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
        <ICONS.Quiz className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Nessun quiz disponibile</p>
        <button 
          onClick={() => onRegenerate()} 
          className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs"
        >
          Genera Quiz Ora
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quiz a Scelta Multipla</h2>
          <p className="text-slate-500 font-medium">Testa la tua preparazione con feedback immediato.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Tema specifico (es. Cellula)..."
            value={targetTopic}
            onChange={(e) => setTargetTopic(e.target.value)}
            className="px-6 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:border-blue-500 outline-none w-full md:w-64 font-bold bg-white text-slate-900 shadow-sm placeholder-slate-400"
          />
          <button 
            onClick={() => onRegenerate(targetTopic || undefined)}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isLoading ? '...' : 'Genera'}
          </button>
        </div>
      </header>

      <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-block">
            Domanda {currentIndex + 1} di {questions.length}
          </span>
          {currentQ.topic && (
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{currentQ.topic}</span>
          )}
        </div>

        <h3 className="text-2xl font-black text-slate-900 leading-tight">
          {currentQ.question}
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {currentQ.options.map((option, idx) => {
            let stateClass = "bg-slate-50 border-slate-100 text-slate-700 hover:border-blue-300";
            if (selectedOption !== null) {
              if (idx === currentQ.correctAnswerIndex) {
                stateClass = "bg-emerald-500 border-emerald-600 text-white shadow-lg animate-fadeIn";
              } else if (idx === selectedOption) {
                stateClass = "bg-rose-500 border-rose-600 text-white animate-shake";
              } else {
                stateClass = "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={selectedOption !== null}
                className={`w-full p-6 rounded-2xl border-2 text-left font-bold text-base transition-all flex items-center gap-4 ${stateClass}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black border ${selectedOption !== null && idx === currentQ.correctAnswerIndex ? 'bg-white/20 border-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                {option}
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className="bg-blue-50 rounded-[2rem] p-8 border-2 border-blue-100 animate-slideUp">
             <div className="flex items-center gap-2 mb-4">
               <ICONS.Brain className="w-5 h-5 text-blue-600" />
               <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Spiegazione Didattica</h4>
             </div>
             <p className="text-slate-700 font-medium leading-relaxed">
               {currentQ.explanation}
             </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-8 border-t border-slate-100">
           <button 
             onClick={handlePrev} 
             className="p-4 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm text-slate-400"
           >
             <ICONS.ArrowRight className="w-5 h-5 rotate-180" />
           </button>
           
           <div className="h-1.5 flex-1 mx-8 bg-slate-100 rounded-full overflow-hidden">
             <div 
               className="h-full bg-blue-600 transition-all duration-500" 
               style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
             ></div>
           </div>

           <button 
             onClick={handleNext} 
             className="p-4 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm text-slate-400"
           >
             <ICONS.ArrowRight className="w-5 h-5" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default MultipleChoiceView;
