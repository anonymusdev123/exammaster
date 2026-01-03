
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

      REGOLE PERMANENTI PER L'ORGANIZZAZIONE DELLO STUDIO (INVIOLABILI):
      1. MASSIMO 2 MATERIE AL GIORNO - Non superare mai questo limite cross-materia.
      2. GIORNO D'ESAME = ZERO STUDIO - Nel giorno ${examDate} non deve essere programmata NESSUNA attività di studio per questa o altre materie. La mente deve essere libera per la prova.
      3. MODULO 50/50: Ogni sessione giornaliera deve avere:
         - 2 task [TEORIA]: [nome argomento] - [ore stimate]
         - 2 task [PRATICA]: Active recall/Esercizi - [ore stimate]
      4. COPERTURA: Distribuisci il carico equamente nei giorni precedenti.
      5. PRIORITÀ: Focus sui concetti a più alta probabilità d'esame basandoti sulla profondità "${depth}".

      MATERIALI DI PARTENZA: ${truncatedText}
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
              summary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, details: { type: Type.STRING }, importance: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] } } } },
              questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, type: { type: Type.STRING }, modelAnswer: { type: Type.STRING } } } },
              flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } } } },
              studyPlan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.NUMBER }, topics: { type: Type.ARRAY, items: { type: Type.STRING } }, tasks: { type: Type.ARRAY, items: { type: Type.STRING } }, priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] } } } }
            },
            required: ["summary", "questions", "flashcards", "studyPlan"]
          },
          temperature: 0.2,
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.studyPlan) {
        parsed.studyPlan = parsed.studyPlan.map((day: any) => ({
          ...day, uid: day.uid || this.generateUid(), completedTasks: day.tasks.map(() => false)
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
