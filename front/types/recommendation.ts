// Recommendation 관련 타입 정의

export interface TeacherMatch {
  id: string;
  name: string;
  university: string;
  department: string;
  experience: string;
  style: string;
  fitScore: number;
  matchReason: string;
  strengths: string[];
  concerns: string[];
  availability: string;
}

export interface RecommendationResult {
  sessionId: string;
  studentId: string;
  topMatches: TeacherMatch[]; // Top 3
  candidateList: TeacherMatch[]; // Backup candidates
  analysisText: string; // AI 분석 텍스트
  generatedAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant'; // user = director, assistant = AI
  content: string;
  timestamp: Date;
  metadata?: {
    studentId?: string;
    recommendations?: TeacherMatch[];
  };
}

export interface MatchingSession {
  sessionId: string;
  studentId: string;
  studentName: string;
  targetUniversity: string;
  targetDepartment: string;
  directorInstruction: string;
  messages: ChatMessage[];
  currentRecommendation: RecommendationResult | null;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
