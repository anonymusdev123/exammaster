
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
      console.error("DEBUG - Gemini API Error:", error);
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
    console.warn("DEBUG - Using Fallback Data for:", course);
    const template = getTemplate(course) || {
      modules: [
        { day: 1, topics: ["Introduzione"], tasks: ["[TEORIA] Studio concetti base - 2h"], priority: Importance.HIGH },
        { day: 2, topics: ["Approfondimento"], tasks: ["[TEORIA] Analisi capitoli principali - 2h"], priority: Importance.MEDIUM }
      ]
    };

    return {
      summary: [{ title: "Panoramica Materia", content: `Studio di ${course}`, details: "Dati generati dal sistema di backup.", importance: Importance.HIGH }],
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
    
    // Pulizia e preparazione testo
    const cleanText = text.trim();
    const truncatedText = cleanText.length > 15000 ? cleanText.substring(0, 15000) : cleanText;
    
    console.log("DEBUG - Inizio analisi materiali per:", course);
    console.log("DEBUG - Lunghezza testo inviato:", truncatedText.length);

    const prompt = `
      RUOLO: Sei il miglior Tutor Universitario al mondo per la facoltà di ${faculty}.
      MATERIA: ${course}
      OBIETTIVO: Analizzare i materiali forniti e creare un piano di studio e strumenti di apprendimento.
      
      ISTRUZIONI RIGIDE:
      1. Leggi attentamente i MATERIALI qui sotto.
      2. Se i MATERIALI contengono informazioni, estrai i concetti chiave da lì.
      3. Se i MATERIALI sono poveri o assenti, usa le tue conoscenze accademiche per ${course}.
      4. Produci ESATTAMENTE lo schema JSON richiesto.
      
      MATERIALI DA ANALIZZARE:
      """
      ${truncatedText}
      """

      REQUISITI OUTPUT:
      - 'summary': Minimo 3 unità con titoli accattivanti.
      - 'questions': 5 domande tipiche d'esame (aperte o brevi).
      - 'flashcards': 10 flashcards (fronte/retro).
      - 'multipleChoice': 5 quiz a scelta multipla con spiegazione.
      - 'studyPlan': Un percorso a tappe (giorni) basato sulla complessità.
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
                summary: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { 
                      title: { type: Type.STRING }, 
                      content: { type: Type.STRING }, 
                      details: { type: Type.STRING }, 
                      importance: { type: Type.STRING } 
                    },
                    required: ["title", "content", "details", "importance"]
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
                    },
                    required: ["question", "type", "modelAnswer"]
                  } 
                },
                flashcards: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { 
                      question: { type: Type.STRING }, 
                      answer: { type: Type.STRING }, 
                      difficulty: { type: Type.NUMBER } 
                    },
                    required: ["question", "answer", "difficulty"]
                  } 
                },
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
                studyPlan: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { 
                      day: { type: Type.INTEGER }, 
                      topics: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                      tasks: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                      priority: { type: Type.STRING } 
                    },
                    required: ["day", "topics", "tasks", "priority"]
                  } 
                }
              },
              required: ["summary", "questions", "flashcards", "multipleChoice", "studyPlan"]
            },
            temperature: 0.1
          }
        });
      });

      const jsonStr = response.text;
      if (!jsonStr) throw new Error("EMPTY_RESPONSE");
      
      console.log("DEBUG - Risposta IA ricevuta con successo.");
      const parsed = JSON.parse(jsonStr);
      
      // Post-elaborazione
      parsed.studyPlan = (parsed.studyPlan || []).map((m: any) => ({
        ...m, 
        uid: this.generateUid(), 
        completedTasks: (m.tasks || []).map(() => false)
      }));

      return { ...parsed, faculty, course, depth };

    } catch (e) {
      console.error("DEBUG - Errore durante analyzeMaterials:", e);
      return this.getFallbackData(course, faculty, depth);
    }
  }

  async generateAdditionalMCQs(content: string, course: string, topic?: string): Promise<MultipleChoiceQuestion[]> {
    try {
      console.log("DEBUG - Generazione quiz extra per:", topic || "Generale");
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Genera 5 nuovi quiz a risposta multipla su "${course}". 
          ${topic ? `FOCUS SULL'ARGOMENTO: "${topic}"` : ""}
          Usa questo materiale come base: ${content.substring(0, 8000)}`,
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
      console.error("DEBUG - MCQ Generation Error:", e);
      return [];
    }
  }

  async startOralSimulation(materialData: StudyMaterialData, fullContent: string) {
    const ai = this.getAI();
    return ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `Sei il Professore di ${materialData.course}. 
        Il tuo compito è interrogare lo studente in modo rigoroso. 
        BASATI SUI MATERIALI FORNITI: ${fullContent.substring(0, 5000)}.
        Fai una domanda alla volta e valuta la risposta.`,
      },
    });
  }

  async explainConcept(concept: string, context: string): Promise<string> {
    try {
      const response = await this.callWithRetry(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Spiega il concetto "${concept}" in modo semplice ma accademico, usando questo contesto: ${context.substring(0, 6000)}`,
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
          contents: `Crea una simulazione d'esame per ${course}. Usa le tracce passate per lo stile: ${pastExams.substring(0, 5000)}`,
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
