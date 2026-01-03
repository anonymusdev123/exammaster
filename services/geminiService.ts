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
    const maxChars = 30000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

    const prompt = `
RUOLO: Senior Instructional Designer Universitario + Tutor Strategico AI.
CORSO: "${course}" (${faculty}) | DATA ESAME: ${examDate} | TIPO: ${examType} | PROFONDITÀ: ${depth}

═══════════════════════════════════════════════════════════════════
⚠️ REGOLE INVIOLABILI - MASSIMA PRIORITÀ ⚠️
═══════════════════════════════════════════════════════════════════

🔴 REGOLA #1: MASSIMO 2 MATERIE AL GIORNO
- Ogni giorno può avere SOLO 2 materie diverse, MAI 3 o più
- Meglio mettere più sessioni della STESSA materia che aggiungere una terza materia

🔴 REGOLA #2: FORMATO TASK OBBLIGATORIO
OGNI task DEVE seguire ESATTAMENTE questo formato:
"[TIPO] Descrizione attività - Xh"

Dove:
- TIPO = TEORIA o PRATICA
- X = numero ore (può essere decimale: 1.5h, 2.5h, ecc.)
- Il trattino "-" e la "h" sono OBBLIGATORI

✅ ESEMPI CORRETTI:
"[TEORIA] Studio distribuzione normale - 2h"
"[PRATICA] Esercizi su media e varianza - 1.5h"
"[TEORIA] Analisi dei dati categorici - 3h"
"[PRATICA] Active recall concetti precedenti - 1h"

❌ ESEMPI SBAGLIATI (NON FARE MAI COSÌ):
"Active Recall sui moduli precedenti" ❌ (manca [PRATICA] e ore)
"Focus su lacune" ❌ (manca [PRATICA] e ore)
"Studio della teoria" ❌ (manca ore specifiche)

🔴 REGOLA #3: STRUTTURA SESSIONE
Ogni sessione di studio DEVE avere ESATTAMENTE 4 task:
- 2 task [TEORIA] con ore specificate
- 2 task [PRATICA] con ore specificate

🔴 REGOLA #4: GIORNO D'ESAME
Il ${examDate} NON deve contenere NESSUNA attività di studio.

🔴 REGOLA #5: CALCOLO ORE
- Sessioni teoria: 1.5-3h per task
- Sessioni pratica: 1-2h per task
- Totale giornaliero ideale: 4-8h

═══════════════════════════════════════════════════════════════════

📚 MATERIALI FORNITI:
${truncatedText || "Nessun materiale dettagliato - genera piano generico basato su curriculum standard di " + course}

═══════════════════════════════════════════════════════════════════

📋 ESEMPIO DI OUTPUT CORRETTO:

{
  "day": 1,
  "topics": ["Statistica Descrittiva"],
  "tasks": [
    "[TEORIA] Media, moda e mediana - 2h",
    "[TEORIA] Varianza e deviazione standard - 2.5h",
    "[PRATICA] Esercizi calcolo statistiche base - 1.5h",
    "[PRATICA] Active recall definizioni chiave - 1h"
  ],
  "priority": "HIGH"
}

IMPORTANTE: Se non hai materiali dettagliati, genera comunque un piano standard per ${course} seguendo il curriculum universitario tipico, MA rispettando SEMPRE il formato con ore specificate.
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
      
      // Post-processing: forza il formato corretto e inizializza completedTasks
      if (parsed.studyPlan) {
        parsed.studyPlan = parsed.studyPlan.map((day: any) => {
          // Forza 4 task se ce ne sono meno
          const tasks = day.tasks || [];
          
          // Aggiungi ore se mancano (fallback)
          const processedTasks = tasks.map((task: string) => {
            // Se il task non ha già il formato corretto, aggiungilo
            if (!task.includes(' - ') || !task.includes('h')) {
              // Determina se è teoria o pratica
              const isTheory = task.toLowerCase().includes('stud') || 
                              task.toLowerCase().includes('teor') || 
                              task.toLowerCase().includes('analisi') ||
                              task.toLowerCase().includes('compren');
              
              const type = isTheory ? 'TEORIA' : 'PRATICA';
              const hours = isTheory ? '2h' : '1.5h';
              
              // Se non ha già [TIPO], aggiungilo
              if (!task.startsWith('[')) {
                return `[${type}] ${task} - ${hours}`;
              } else {
                return `${task} - ${hours}`;
              }
            }
            return task;
          });
          
          // Assicurati che ci siano almeno 4 task
          while (processedTasks.length < 4) {
            const needsTheory = processedTasks.filter((t: string) => t.includes('[TEORIA]')).length < 2;
            if (needsTheory) {
              processedTasks.push(`[TEORIA] Studio approfondito - 2h`);
            } else {
              processedTasks.push(`[PRATICA] Esercizi applicativi - 1.5h`);
            }
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