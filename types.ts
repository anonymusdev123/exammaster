
export enum ExamType {
  WRITTEN = 'WRITTEN',
  ORAL = 'ORAL',
  MIXED = 'MIXED'
}

export enum DepthLevel {
  BASIC = 'BASIC',
  MEDIUM = 'MEDIUM',
  ADVANCED = 'ADVANCED'
}

export enum Importance {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface User {
  id: string;
  email: string;
  name: string;
  syncKey: string;
  avatar?: string;
}

export interface SummaryUnit {
  title: string;
  content: string;
  details: string;
  importance: Importance;
}

export interface Flashcard {
  question: string;
  answer: string;
  difficulty: number;
  topic?: string;
}

export interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  topic?: string;
}

export interface ExamQuestion {
  question: string;
  type: 'OPEN' | 'SHORT' | 'CONNECT';
  modelAnswer: string;
  gradingCriteria: string[];
}

export interface MockExam {
  title: string;
  instructions: string;
  questions: ExamQuestion[];
  timeMinutes: number;
}

export interface StudyPlanDay {
  uid: string;
  day: number;
  topics: string[];
  tasks: string[];
  priority: Importance;
  assignedDate?: string; 
  completedTasks?: boolean[]; 
  isManuallyPlaced?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachments?: string[];
}

export interface ExamSession {
  id: string;
  faculty: string;
  course: string;
  examType: ExamType;
  depth: DepthLevel;
  examDate: string;
  isPostponed: boolean;
  isPassed?: boolean; 
  content: string;
  pastExamsContent: string;
  data: StudyMaterialData;
  chatHistory: ChatMessage[];
  createdAt: number;
  lastUpdateDate?: string;
  colorIndex?: number;
  dayOffs?: string[]; 
}

export interface StudyMaterialData {
  summary: SummaryUnit[];
  questions: ExamQuestion[];
  flashcards: Flashcard[];
  multipleChoice?: MultipleChoiceQuestion[];
  studyPlan: StudyPlanDay[];
  mockExam?: MockExam;
  faculty: string;
  course: string;
  depth: DepthLevel;
}

export interface AppState {
  user: User | null;
  sessions: ExamSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  isAddingNew: boolean;
  error: string | null;
}
