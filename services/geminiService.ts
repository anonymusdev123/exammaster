import { GoogleGenAI, Type } from "@google/genai";
import { ExamType, DepthLevel, StudyMaterialData, ExamQuestion, Flashcard, MockExam } from "../types";

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private generateUid() {
    return Math.random().toString(36).substring(2, 10);
  }

  private async callWithRetry(fn: (ai: GoogleGenAI) => Promise<any>, retries = 2): Promise<any> {
    try {
      const ai = this.getAI();
      return await fn(ai);
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted')) {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, 4000));
          return this.callWithRetry(fn, retries - 1);
        }
        throw new Error("QUOTA_EXCEEDED");
      }
      if (msg.includes("Requested entity was not found") || msg.includes("API_KEY_INVALID") || msg.includes("403")) {
        throw new Error("API_KEY_INVALID");
      }
      throw error;
    }
  }

  async analyzeMaterials(
    text: string,
    faculty: string,
    course: string,
    examType: ExamType,
    depth: DepthLevel,
    examDate: string
  ): Promise<StudyMaterialData> {
    const modelName = "gemini-3-flash-preview";
    const maxChars = 15000; // Ridotto da 30000 per velocità
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

    // Calcola giorni disponibili fino all'esame
    const today = new Date();
    const exam = new Date(examDate);
    const daysAvailable = Math.max(1, Math.floor((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const maxModules = Math.min(Math.max(6, Math.floor(daysAvailable * 0.8)), 10); // 6-10 moduli max

    const prompt = `
RUOLO: Senior Instructional Designer Universitario + Tutor Strategico AI.
CORSO: "${course}" (${faculty}) | DATA ESAME: ${examDate} | TIPO: ${examType} | PROFONDITÀ: ${depth}

═══════════════════════════════════════════════════════════════════
⚠️ REGOLE INVIOLABILI - MASSIMA PRIORITÀ ⚠️
═══════════════════════════════════════════════════════════════════

🔴 REGOLA #1: NUMERO MODULI
- Genera MASSIMO ${maxModules} moduli TOTALI per questa materia
- Ogni modulo = 1 GIORNO di studio
- Se hai 10 giorni disponibili, crea MAX 8 moduli
- Concentrati SOLO sui concetti più importanti e probabili all'esame

🔴 REGOLA #2: CARICO GIORNALIERO (MASSIMA PRIORITÀ!)
- OGNI modulo deve contenere MAX 5h di studio totale
- FORMULA RIGIDA: 2 task teoria (1.5h + 1.5h) + 2 task pratica (1h + 1h) = 5h
- Mai superare 5h per modulo
- Esempio CORRETTO: 1.5h + 1.5h + 1h + 1h = 5h ✅
- Esempio SBAGLIATO: 3h + 3h + 2h + 2h = 10h ❌

🔴 REGOLA #3: FORMATO TASK OBBLIGATORIO
OGNI task DEVE seguire ESATTAMENTE questo formato:
"[TIPO] Descrizione attività - Xh"

Dove:
- TIPO = TEORIA o PRATICA
- X = ore (1h, 1.5h, 2h, 2.5h, 3h MAX)
- Ogni singolo task: MIN 1h, MAX 3h

✅ ESEMPI CORRETTI:
"[TEORIA] Studio distribuzione normale - 2h"
"[PRATICA] Esercizi su media e varianza - 1.5h"
"[TEORIA] Analisi dei dati categorici - 2.5h"
"[PRATICA] Active recall concetti precedenti - 1h"

🔴 REGOLA #4: STRUTTURA SESSIONE
Ogni modulo DEVE avere ESATTAMENTE 4 task CON QUESTE ORE FISSE:
- Task 1 [TEORIA]: 1.5h
- Task 2 [TEORIA]: 1.5h  
- Task 3 [PRATICA]: 1h
- Task 4 [PRATICA]: 1h

TOTALE MODULO: 5h SEMPRE

🔴 REGOLA #5: PRIORITÀ
- Profondità ${depth}: 
  - BASIC: argomenti base, 6-8 moduli
  - MEDIUM: argomenti principali, 8-10 moduli  
  - ADVANCED: tutti i dettagli, 10-12 moduli

🔴 REGOLA #6: GIORNO D'ESAME
Il ${examDate} NON deve contenere NESSUNA attività di studio.

═══════════════════════════════════════════════════════════════════

📚 MATERIALI FORNITI:
${truncatedText || "Nessun materiale dettagliato - genera piano generico basato su curriculum standard di " + course}

═══════════════════════════════════════════════════════════════════

📋 ESEMPIO DI OUTPUT CORRETTO (MODULO DA 5H FISSO):

{
  "day": 1,
  "topics": ["Statistica Descrittiva"],
  "tasks": [
    "[TEORIA] Media, moda e mediana - 1.5h",
    "[TEORIA] Varianza e deviazione standard - 1.5h",
    "[PRATICA] Esercizi calcolo statistiche base - 1h",
    "[PRATICA] Active recall definizioni chiave - 1h"
  ],
  "priority": "HIGH"
}

TOTALE: 5h ✅ SEMPRE QUESTO FORMATO!

IMPORTANTE: Genera SOLO ${maxModules} moduli. Se il materiale è tanto, seleziona gli argomenti PIÙ PROBABILI all'esame.
    `;

    return this.callWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    title: { type: Type.STRING }, 
                    content: { type: Type.STRING }, 
                    details: { type: Type.STRING }, 
                    importance: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] } 
                  } 
                } 
              },
              questions: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    question: { type: Type.STRING }, 
                    type: { type: Type.STRING }, 
                    modelAnswer: { type: Type.STRING } 
                  } 
                } 
              },
              flashcards: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    question: { type: Type.STRING }, 
                    answer: { type: Type.STRING } 
                  } 
                } 
              },
              studyPlan: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    day: { type: Type.NUMBER }, 
                    topics: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                    tasks: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                    priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] } 
                  } 
                } 
              }
            },
            required: ["summary", "questions", "flashcards", "studyPlan"]
          },
          temperature: 0.1,
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      
      // Post-processing: limita moduli e forza il formato corretto
      if (parsed.studyPlan) {
        // LIMITA A MAX MODULI
        let studyPlan = parsed.studyPlan.slice(0, maxModules);
        
        studyPlan = studyPlan.map((day: any) => {
          const tasks = day.tasks || [];
          
          // Processa e FORZA il formato 1.5h+1.5h+1h+1h
          let processedTasks = [
            `[TEORIA] ${day.topics[0] || 'Studio teorico'} - parte 1 - 1.5h`,
            `[TEORIA] ${day.topics[0] || 'Studio teorico'} - parte 2 - 1.5h`,
            `[PRATICA] Esercizi su ${day.topics[0] || 'argomento'} - 1h`,
            `[PRATICA] Active recall e ripasso - 1h`
          ];
          
          // Se l'AI ha fornito task, usa i loro nomi ma con ore fisse
          if (tasks.length >= 4) {
            processedTasks = [
              tasks[0].replace(/(\d+(?:\.\d+)?)\s*h/i, '1.5h'),
              tasks[1].replace(/(\d+(?:\.\d+)?)\s*h/i, '1.5h'),
              tasks[2].replace(/(\d+(?:\.\d+)?)\s*h/i, '1h'),
              tasks[3].replace(/(\d+(?:\.\d+)?)\s*h/i, '1h')
            ].map(task => {
              // Assicura formato [TIPO]
              if (!task.startsWith('[TEORIA]') && !task.startsWith('[PRATICA]')) {
                const isTheory = task.toLowerCase().includes('teor') || task.toLowerCase().includes('stud');
                return `[${isTheory ? 'TEORIA' : 'PRATICA'}] ${task}`;
              }
              return task;
            });
          }
          
          return {
            ...day,
            tasks: processedTasks,
            uid: day.uid || this.generateUid(),
            completedTasks: processedTasks.map(() => false),
            isManuallyPlaced: false,
            assignedDate: null
          };
        });
        
        parsed.studyPlan = studyPlan;
      }

      return { ...parsed, faculty, course, depth } as StudyMaterialData;
    });
  }

  async startOralSimulation(materialData: StudyMaterialData, fullContent: string) {
    const ai = this.getAI();
    return ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `Sei il Professore di ${materialData.course}. Interroga lo studente solo su questi materiali: ${fullContent.substring(0, 20000)}. Mantieni un tono accademico ma costruttivo.`,
      },
    });
  }

  async explainConcept(concept: string, context: string): Promise<string> {
    return this.callWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Spiega in modo didattico: "${concept}". Usa come base questo contesto: ${context.substring(0, 20000)}`,
      });
      return response.text || "Dettaglio non disponibile.";
    });
  }

  async generateMockExam(content: string, pastExams: string, course: string): Promise<MockExam> {
    return this.callWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `Genera una simulazione d'esame per "${course}". Argomenti: ${content.substring(0, 15000)}. Tracce passate: ${pastExams.substring(0, 5000)}. Crea domande che riflettono lo stile delle tracce passate.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    type: { type: Type.STRING },
                    modelAnswer: { type: Type.STRING },
                    gradingCriteria: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              timeMinutes: { type: Type.NUMBER }
            }
          }
        }
      });
      return JSON.parse(response.text || '{}') as MockExam;
    });
  }
}