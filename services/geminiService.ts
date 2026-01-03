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
RUOLO: Senior Instructional Designer Universitario + Tutor Strategico.
CORSO: "${course}" (${faculty}). DATA ESAME: ${examDate}.

**SISTEMA DI PIANIFICAZIONE STUDIO - REGOLE INVIOLABILI**

REGOLA #1 (MASSIMA PRIORITÀ):
- Ogni giorno può contenere MASSIMO 2 MATERIE DIVERSE
- NON 3, NON 4, NON 5 - SOLO 2 MATERIE
- Se un giorno ha già 2 materie, NON aggiungerne altre
- È PREFERIBILE mettere più sessioni della STESSA materia nello stesso giorno

REGOLA #2 (GIORNO D'ESAME):
- Nel giorno ${examDate} NON deve essere programmata NESSUNA attività di studio
- La mente deve essere libera e riposata

REGOLA #3 (STRUTTURA TASK):
Ogni sessione di studio deve contenere ESATTAMENTE 4 task:
- 2 task [TEORIA]: [nome argomento] - Xh (specifica ore)
- 2 task [PRATICA]: [esercizi/active recall] - Xh (specifica ore)

REGOLA #4 (STIMA ORE OBBLIGATORIA):
- OGNI task DEVE avere una stima ore esplicita nel formato "- Xh" o "- X.Xh"
- Esempi corretti:
  * "[TEORIA] Introduzione alla statistica - 2h"
  * "[PRATICA] Esercizi sulla media - 1.5h"
  * "[TEORIA] Distribuzione normale - 3h"
- NON scrivere task senza ore: è OBBLIGATORIO

ESEMPIO DI GIORNO CORRETTO:
{
  "day": 1,
  "topics": ["Statistica Descrittiva"],
  "tasks": [
    "[TEORIA] Media, moda, mediana - 2h",
    "[TEORIA] Varianza e deviazione standard - 1.5h",
    "[PRATICA] Esercizi su media e varianza - 2h",
    "[PRATICA] Active recall sui concetti base - 1h"
  ],
  "priority": "HIGH"
}

PROCESSO DI PIANIFICAZIONE:
1. Analizza il materiale e dividi in moduli logici
2. Per ogni modulo, crea 4 task (2 teoria + 2 pratica) con ore specificate
3. Verifica che ogni giorno abbia MAX 2 materie diverse
4. Focus sui concetti a più alta probabilità d'esame (Profondità: ${depth})

MATERIALI DI PARTENZA:
${truncatedText}
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
          temperature: 0.2,
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      
      // Inizializza completedTasks per ogni modulo
      if (parsed.studyPlan) {
        parsed.studyPlan = parsed.studyPlan.map((day: any) => ({
          ...day, 
          uid: day.uid || this.generateUid(), 
          completedTasks: day.tasks.map(() => false),
          isManuallyPlaced: false,
          assignedDate: null
        }));
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