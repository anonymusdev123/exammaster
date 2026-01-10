
import { GoogleGenAI, Type } from "@google/genai";
import { ExamType, DepthLevel, StudyMaterialData, ExamQuestion, Flashcard, MockExam, Importance } from "../types";
import { getTemplate } from "../components/study_templates";

export class GeminiService {
  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY_MISSING");
    return new GoogleGenAI({ apiKey });
  }

  private generateUid() {
    return Math.random().toString(36).substring(2, 10);
  }

  private async callWithRetry(fn: (ai: GoogleGenAI) => Promise<any>, retries = 1): Promise<any> {
    try {
      const ai = this.getAI();
      return await fn(ai);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const msg = error.message || "";
      if (msg.includes('429') || msg.includes('quota')) {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, 2000));
          return this.callWithRetry(fn, retries - 1);
        }
        throw new Error("QUOTA_EXCEEDED");
      }
      throw error;
    }
  }

  // Funzione per generare un piano d'emergenza dai template se l'IA fallisce
  private getFallbackData(course: string, faculty: string, depth: DepthLevel): StudyMaterialData {
    const template = getTemplate(course) || {
      modules: [
        { day: 1, topics: ["Introduzione e Basi"], tasks: ["[TEORIA] Studio concetti fondamentali - 2h", "[PRATICA] Esercizi di base - 1h"], priority: Importance.HIGH },
        { day: 2, topics: ["Approfondimento"], tasks: ["[TEORIA] Analisi dettagliata capitoli - 2h", "[PRATICA] Applicazione concetti - 1h"], priority: Importance.MEDIUM }
      ]
    };

    return {
      summary: [{ title: "Focus Strategico", content: `Analisi di ${course}`, details: "Dati generati dal sistema di emergenza.", importance: Importance.HIGH }],
      questions: [{ question: `Quali sono i pilastri di ${course}?`, type: 'OPEN', modelAnswer: "Vedi materiali del corso.", gradingCriteria: ["Completezza"] }],
      // Fix: Added difficulty to fallback flashcards to satisfy the Flashcard interface requirement.
      flashcards: [{ question: "Concetto chiave 1", answer: "Definizione standard dal manuale.", difficulty: 1 }],
      studyPlan: template.modules.map((m: any) => ({
        ...m,
        uid: this.generateUid(),
        completedTasks: m.tasks.map(() => false),
        assignedDate: null,
        isManuallyPlaced: false
      })),
      faculty,
      course,
      depth
    };
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
    
    try {
      const maxChars = 10000;
      const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
      
      const prompt = `
        RUOLO: Tutor Universitario. MATERIA: "${course}". DATA: ${examDate}.
        REGOLE: Max 2 materie/giorno. 50% Teoria, 50% Pratica.
        MATERIALI: ${truncatedText || "Usa curriculum standard."}
      `;

      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, details: { type: Type.STRING }, importance: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] } } } },
                questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, type: { type: Type.STRING }, modelAnswer: { type: Type.STRING } } } },
                // Fix: Included 'difficulty' in the Flashcard schema for the Gemini response.
                flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }, difficulty: { type: Type.NUMBER } } } },
                studyPlan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.NUMBER }, topics: { type: Type.ARRAY, items: { type: Type.STRING } }, tasks: { type: Type.ARRAY, items: { type: Type.STRING } }, priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] } } } }
              },
              required: ["summary", "questions", "flashcards", "studyPlan"]
            },
            temperature: 0.1
          }
        });
      });

      const parsed = JSON.parse(response.text || '{}');
      parsed.studyPlan = parsed.studyPlan.map((m: any) => ({
        ...m, uid: this.generateUid(), completedTasks: m.tasks.map(() => false)
      }));
      return { ...parsed, faculty, course, depth };

    } catch (e) {
      console.warn("IA Fallita o Quota superata. Uso template di emergenza.");
      return this.getFallbackData(course, faculty, depth);
    }
  }

  async startOralSimulation(materialData: StudyMaterialData, fullContent: string) {
    const ai = this.getAI();
    return ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `Sei il Professore di ${materialData.course}. Interroga lo studente.`,
      },
    });
  }

  async explainConcept(concept: string, context: string): Promise<string> {
    try {
      return await this.callWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Spiega brevemente: "${concept}" usando: ${context.substring(0, 5000)}`,
        });
        return response.text || "Dettaglio non disponibile.";
      });
    } catch (e) {
      return "Il sistema è al momento sovraccarico. Riprova tra poco per la spiegazione IA.";
    }
  }

  async generateMockExam(content: string, pastExams: string, course: string): Promise<MockExam> {
    try {
      return await this.callWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Genera simulazione d'esame per ${course}.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                instructions: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, type: { type: Type.STRING }, modelAnswer: { type: Type.STRING }, gradingCriteria: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
                timeMinutes: { type: Type.NUMBER }
              }
            }
          }
        });
        return JSON.parse(response.text || '{}') as MockExam;
      });
    } catch (e) {
      throw new Error("MOCK_FAIL");
    }
  }
}
