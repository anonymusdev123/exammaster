
import { GoogleGenAI, Type } from "@google/genai";
import { ExamType, DepthLevel, StudyMaterialData, ExamQuestion, Flashcard, MockExam, Importance, MultipleChoiceQuestion } from "../types";
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
      console.error("Gemini API Error Detail:", error);
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
      flashcards: [{ question: "Concetto chiave 1", answer: "Definizione standard dal manuale.", difficulty: 1 }],
      multipleChoice: [{
        question: `Qual è l'argomento centrale di ${course}?`,
        options: ["Argomento A", "Argomento B", "Argomento C", "Argomento D"],
        correctAnswerIndex: 0,
        explanation: "L'argomento A è fondamentale per comprendere le basi della materia."
      }],
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
        RUOLO: Tutor Universitario esperto in "${course}".
        MATERIALI: ${truncatedText || "Usa conoscenze generali universitarie."}
        DATA ESAME: ${examDate}
        
        GENERA un oggetto JSON con:
        1. summary (ARRAY di oggetti con title, content, details, importance: HIGH/MEDIUM/LOW)
        2. questions (ARRAY di oggetti con question, type, modelAnswer)
        3. flashcards (ARRAY di oggetti con question, answer, difficulty)
        4. multipleChoice (ARRAY di 5 oggetti con question, options (array di 4 stringhe), correctAnswerIndex (numero 0-3), explanation, topic)
        5. studyPlan (ARRAY di oggetti con day, topics, tasks, priority)
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
                summary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, details: { type: Type.STRING }, importance: { type: Type.STRING } } } },
                questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, type: { type: Type.STRING }, modelAnswer: { type: Type.STRING } } } },
                flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }, difficulty: { type: Type.NUMBER } } } },
                multipleChoice: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { 
                      question: { type: Type.STRING }, 
                      options: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                      correctAnswerIndex: { type: Type.INTEGER }, 
                      explanation: { type: Type.STRING }, 
                      topic: { type: Type.STRING } 
                    },
                    required: ["question", "options", "correctAnswerIndex", "explanation"]
                  } 
                },
                studyPlan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.NUMBER }, topics: { type: Type.ARRAY, items: { type: Type.STRING } }, tasks: { type: Type.ARRAY, items: { type: Type.STRING } }, priority: { type: Type.STRING } } } }
              },
              required: ["summary", "questions", "flashcards", "multipleChoice", "studyPlan"]
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
      console.warn("IA Fallita. Uso template di emergenza.");
      return this.getFallbackData(course, faculty, depth);
    }
  }

  async generateAdditionalMCQs(content: string, course: string, topic?: string): Promise<MultipleChoiceQuestion[]> {
    try {
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Genera 5 quiz a risposta multipla impegnativi per la materia "${course}". 
          ${topic ? `ARGOMENTO SPECIFICO: "${topic}"` : "Argomenti generali basati sul contesto."}
          CONTESTO: ${content.substring(0, 8000)}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  topic: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"]
              }
            },
            temperature: 0.2
          }
        });
      });
      
      const result = JSON.parse(response.text || '[]');
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.error("MCQ Generation Error:", e);
      throw e; // Rilanciamo l'errore per gestirlo nella UI
    }
  }

  async startOralSimulation(materialData: StudyMaterialData, fullContent: string) {
    const ai = this.getAI();
    return ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `Sei il Professore di ${materialData.course}. Il tuo obiettivo è esaminare lo studente. Fai una domanda alla volta. Sii rigoroso ma costruttivo.`,
      },
    });
  }

  async explainConcept(concept: string, context: string): Promise<string> {
    try {
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Spiega il concetto "${concept}" basandoti su questo contesto: ${context.substring(0, 6000)}`,
        });
      });
      return response.text || "Spiegazione non disponibile.";
    } catch (e) {
      return "Errore nella generazione della spiegazione.";
    }
  }

  async generateMockExam(content: string, pastExams: string, course: string): Promise<MockExam> {
    try {
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Genera una simulazione d'esame per ${course} basandoti sulle tracce passate: ${pastExams.substring(0, 5000)}`,
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
      });
      return JSON.parse(response.text || '{}') as MockExam;
    } catch (e) {
      throw new Error("MOCK_FAIL");
    }
  }
}
