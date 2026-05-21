// Student 데이터 타입 정의

// 1. 인적사항
export interface StudentBasicInfo {
  name: string;
  grade: string; // 내신 등급
  gender: string;
  phone: string;
  schoolType: string; // 고3, 2학년 N수, N수 등
  parentPhone: string;
  highSchool: string;
  address: string;
  contactPerson: 'student' | 'parent'; // 등록 상담 연락 받으실 분
}

// 2. 면접 전형이 있는 학교
export interface InterviewSchool {
  school: string;
  major: string; // 학과(계열)
  examType: string; // 전형
  firstAnnouncementDate: string;
  interviewDate: string;
  interviewFormat: string; // 면접 형태
}

// 3. 사전 설문
export interface PreSurvey {
  personalityReadiness: string; // 인성 영역에서 말할 내용 준비 여부
  recordDifficulty: string; // 생기부에서 가장 어려운 부분
  majorKnowledge: 'sufficient' | 'adequate' | 'lacking' | 'insufficient' | 'none';
  speechConcerns: string[]; // 스피치 고민 부분
  careerAlignment: 'aligned' | 'misaligned'; // 생기부와 지원계열 연관성
  careerAlignmentReason?: string; // 불일치인 경우 설명
  priorPresentationPrep: string; // 제시문 기반 면접 준비 경험
  readingComprehension: 'sufficient' | 'adequate' | 'lacking' | 'insufficient' | 'none';
  backgroundKnowledge: 'sufficient' | 'adequate' | 'lacking' | 'insufficient' | 'none';
  answerProcess: 'know' | 'unknown';
  expressionAbility: 'sufficient' | 'adequate' | 'lacking' | 'insufficient' | 'none';
  additionalConcerns: string; // 기타 걱정되는 부분, 바라는 점
}

export interface StudentIntakeFormData {
  basicInfo: StudentBasicInfo;
  interviewSchools: InterviewSchool[];
  preSurvey: PreSurvey;
  bioFileUrl?: string; // 생기부 PDF URL
}

export interface StudentSubmission extends StudentIntakeFormData {
  id: string;
  createdAt: Date;
  status: 'draft' | 'submitted' | 'processing' | 'completed';
  embedding?: number[]; // AI embedding
}
