import React, { useState } from 'react';
import { Flashcard } from '../types';
import { ICONS } from '../constants';
import { GeminiService } from '../services/geminiService';

interface QuizViewProps {
  flashcards: Flashcard[];
  onRegenerate: (topic?: string) => void;
  isLoading: boolean;
  sessionContent: string;
}

const QuizView: React.FC<QuizViewProps> = ({ flashcards, onRegenerate, isLoading, sessionContent }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [targetTopic, setTargetTopic] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setExplanation(null);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setExplanation(null);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleExplain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExplaining(true);
    const service = new GeminiService();
    try {
      const text = await service.explainConcept(currentCard.question, sessionContent);
      setExplanation(text);
    } catch (err) {
      setExplanation("Impossibile generare una spiegazione al momento.");
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Recall Master</h2>
          <p className="text-slate-500 font-medium">Interrogazione focalizzata sui concetti della materia.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Interrogami su un tema..."
            value={targetTopic}
            onChange={(e) => setTargetTopic(e.target.value)}
            className="px-6 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:border-blue-500 outline-none w-full md:w-64 font-bold bg-white text-slate-900 shadow-sm placeholder-slate-400"
          />
          <button 
            onClick={() => onRegenerate(targetTopic || undefined)}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isLoading ? '...' : 'Rigenera'}
          </button>
        </div>
      </header>

      {flashcards.length > 0 ? (
        <div className="space-y-8">
          {/* CARD CON FLIP FUNZIONANTE */}
          <div className="relative h-96">
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative w-full h-full cursor-pointer"
              style={{ perspective: '1000px' }}
            >
              <div 
                className="relative w-full h-full transition-transform duration-500"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* FRONTE */}
                <div 
                  className="absolute inset-0 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center p-10 text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">CONCETTO / DOMANDA</span>
                  <p className="text-2xl font-bold text-slate-900 leading-relaxed">{currentCard.question}</p>
                  <p className="absolute bottom-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">Clicca per la risposta</p>
                </div>
                
                {/* RETRO */}
                <div 
                  className="absolute inset-0 bg-blue-600 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center p-10 text-center text-white border-2 border-blue-500"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-6">RISPOSTA AI</span>
                  <p className="text-xl font-bold leading-relaxed">{currentCard.answer}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CONTROLLI */}
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={handlePrev} 
                className="p-4 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <ICONS.ArrowRight className="w-5 h-5 rotate-180 text-slate-600" />
              </button>
              
              <div className="px-8 py-3 bg-slate-100 text-slate-700 rounded-full font-black text-sm">
                {currentIndex + 1} / {flashcards.length}
              </div>
              
              <button 
                onClick={handleNext} 
                className="p-4 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <ICONS.ArrowRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <button 
              onClick={handleExplain}
              disabled={isExplaining}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              {isExplaining ? 'Analisi in corso...' : 'Spiega Concetto'}
            </button>
          </div>

          {/* SPIEGAZIONE */}
          {explanation && (
            <div className="bg-blue-600 text-white rounded-[2.5rem] p-10 animate-fadeIn shadow-xl border-2 border-blue-500">
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-blue-200">
                <ICONS.Brain className="w-4 h-4" />
                Spiegazione Dettagliata
              </h4>
              <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">{explanation}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <ICONS.Brain className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Nessuna flashcard disponibile</p>
        </div>
      )}
    </div>
  );
};

export default QuizView;