
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
      console.error("DEBUG - Gemini API Error Detail:", error);
      const msg = error.message?.toLowerCase() || "";
      
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, 3000));
          return this.callWithRetry(fn, retries - 1);
        }
        throw new Error("QUOTA_EXCEEDED");
      }
      
      if (msg.includes('500') || msg.includes('overloaded')) {
        throw new Error("SERVER_OVERLOADED");
      }
      
      throw error;
    }
  }

  private getFallbackData(course: string, faculty: string, depth: DepthLevel): StudyMaterialData {
    console.warn("DEBUG - Using Fallback Data for:", course);
    const template = getTemplate(course) || {
      modules: [
        { day: 1, topics: ["Introduzione"], tasks: ["[TEORIA] Studio concetti base - 2h"], priority: Importance.HIGH },
        { day: 2, topics: ["Approfondimento"], tasks: ["[TEORIA] Analisi capitoli principali - 2h"], priority: Importance.MEDIUM }
      ]
    };

    return {
      summary: [{ title: "Panoramica Materia", content: `Studio di ${course}`, details: "L'IA non è riuscita a leggere i tuoi file. Generazione basata su curriculum standard.", importance: Importance.HIGH }],
      questions: [{ question: `Quali sono i temi principali di ${course}?`, type: 'OPEN', modelAnswer: "Consultare i testi consigliati.", gradingCriteria: ["Completezza"] }],
      flashcards: [{ question: "Concetto fondamentale", answer: "Definizione tratta dai materiali.", difficulty: 1 }],
      multipleChoice: [{
        question: `Qual è il pilastro della materia ${course}?`,
        options: ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
        correctAnswerIndex: 0,
        explanation: "L'opzione A è corretta secondo la teoria standard."
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
    const cleanText = text.trim();
    // Limite di sicurezza per evitare errori di payload troppo grandi
    const truncatedText = cleanText.length > 12000 ? cleanText.substring(0, 12000) : cleanText;
    
    const prompt = `
      RUOLO: Tutor Universitario esperto.
      MATERIA: ${course} (${faculty}).
      OBIETTIVO: Analizza i MATERIALI e crea strumenti di studio.
      
      MATERIALI:
      """
      ${truncatedText || "Usa conoscenze accademiche standard per questa materia."}
      """

      REQUISITI JSON:
      1. summary: array di oggetti (title, content, details, importance: HIGH/MEDIUM/LOW).
      2. questions: array di 5 oggetti (question, type, modelAnswer).
      3. flashcards: array di 10 oggetti (question, answer, difficulty: 1-5).
      4. multipleChoice: array di 5 oggetti (question, options, correctAnswerIndex, explanation).
      5. studyPlan: array di oggetti (day, topics, tasks, priority: HIGH/MEDIUM/LOW).
    `;

    try {
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, details: { type: Type.STRING }, importance: { type: Type.STRING } }, required: ["title", "content", "details", "importance"] } },
                questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, type: { type: Type.STRING }, modelAnswer: { type: Type.STRING } }, required: ["question", "type", "modelAnswer"] } },
                flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }, difficulty: { type: Type.NUMBER } }, required: ["question", "answer", "difficulty"] } },
                multipleChoice: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswerIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ["question", "options", "correctAnswerIndex", "explanation"] } },
                studyPlan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.INTEGER }, topics: { type: Type.ARRAY, items: { type: Type.STRING } }, tasks: { type: Type.ARRAY, items: { type: Type.STRING } }, priority: { type: Type.STRING } }, required: ["day", "topics", "tasks", "priority"] } }
              },
              required: ["summary", "questions", "flashcards", "multipleChoice", "studyPlan"]
            }
          }
        });
      });

      if (!response.text) throw new Error("EMPTY_IA_RESPONSE");
      const parsed = JSON.parse(response.text);
      
      parsed.studyPlan = (parsed.studyPlan || []).map((m: any) => ({
        ...m, uid: this.generateUid(), completedTasks: (m.tasks || []).map(() => false)
      }));

      return { ...parsed, faculty, course, depth };
    } catch (e) {
      console.error("ANALYSIS_ERROR:", e);
      return this.getFallbackData(course, faculty, depth);
    }
  }

  async generateAdditionalMCQs(content: string, course: string, topic?: string): Promise<MultipleChoiceQuestion[]> {
    try {
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Genera 5 quiz su "${course}". ${topic ? `Focus: ${topic}` : ""}\nContext: ${content.substring(0, 6000)}`,
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
            }
          }
        });
      });
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("MCQ_ERROR:", e);
      return [];
    }
  }

  async startOralSimulation(materialData: StudyMaterialData, fullContent: string) {
    const ai = this.getAI();
    return ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `Sei il Professore di ${materialData.course}. 
        Interroga lo studente sui seguenti materiali: ${fullContent.substring(0, 4000)}.
        Fai una domanda alla volta. Sii critico ma costruttivo.`,
      },
    });
  }

  async explainConcept(concept: string, context: string): Promise<string> {
    try {
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Spiega brevemente "${concept}" basandoti su: ${context.substring(0, 5000)}`,
        });
      });
      return response.text || "Spiegazione non disponibile.";
    } catch (e: any) {
      if (e.message === "QUOTA_EXCEEDED") return "Limite IA raggiunto. Attendi un minuto prima di chiedere un'altra spiegazione.";
      return "Il professore è occupato, riprova tra poco.";
    }
  }

  async generateMockExam(content: string, pastExams: string, course: string): Promise<MockExam> {
    try {
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Crea un esame simulato per ${course}. Tracce: ${pastExams.substring(0, 4000)}`,
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
