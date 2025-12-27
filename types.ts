
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
  uid: string; // ID univoco per il drag & drop
  day: number;
  topics: string[];
  tasks: string[];
  priority: Importance;
  assignedDate?: string; 
  completedTasks?: boolean[]; 
  isManuallyPlaced?: boolean; // Flag per bloccare la posizione durante il rebalance
}

export interface ExamSession {
  id: string;
  faculty: string;
  course: string;
  examType: ExamType;
  depth: DepthLevel;
  examDate: string; // ISO Date YYYY-MM-DD
  isPostponed: boolean;
  isPassed?: boolean; 
  content: string;
  pastExamsContent: string;
  data: StudyMaterialData;
  createdAt: number;
  lastUpdateDate?: string;
  colorIndex?: number;
  dayOffs?: string[]; 
}

export interface StudyMaterialData {
  summary: SummaryUnit[];
  questions: ExamQuestion[];
  flashcards: Flashcard[];
  studyPlan: StudyPlanDay[];
  mockExam?: MockExam;
  faculty: string;
  course: string;
  depth: DepthLevel;
}

export interface AppState {
  sessions: ExamSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  isAddingNew: boolean;
  error: string | null;
}
