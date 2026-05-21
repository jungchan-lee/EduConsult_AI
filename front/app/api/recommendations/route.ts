import { NextRequest, NextResponse } from 'next/server';
import { RecommendationResult, MatchingSession, ChatMessage } from '@/types/recommendation';

/**
 * POST /api/recommendations
 * Generate AI recommendations based on student intake and director instruction
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form data
    const basicInfo = JSON.parse(formData.get('basicInfo') as string);
    const targetGoals = JSON.parse(formData.get('targetGoals') as string);
    const profile = JSON.parse(formData.get('profile') as string);
    const parentalRequests = formData.get('parentalRequests') as string;
    const directorInstruction = formData.get('directorInstruction') as string;
    const schoolLifeRecord = formData.get('schoolLifeRecord') as File | null;

    // Generate session ID
    const sessionId = 'SES-' + Date.now();
    const studentId = 'STU-' + Date.now();

    // TODO: 실제 구현
    // 1. PDF 파싱 및 텍스트 추출
    // 2. Student embedding 생성
    // 3. Vector DB에서 유사한 선생님 검색
    // 4. Instruction 기반 reranking
    // 5. LLM으로 추천 이유 생성

    // Mock recommendations
    const mockRecommendations: RecommendationResult = {
      sessionId,
      studentId,
      topMatches: [
        {
          id: 'TEACH-001',
          name: 'Park Ji-eun',
          university: 'Seoul National University',
          department: 'Psychology',
          experience: '8 years in interview coaching',
          style: 'Empathetic and supportive, strong at emotional intelligence development',
          fitScore: 92,
          matchReason:
            '학생의 불안 성향을 잘 이해하고 멘탈 케어를 중시하는 선생님입니다. 부모 커뮤니케이션도 안정적입니다.',
          strengths: ['Emotional support', 'Parent communication', 'Care-focused'],
          concerns: [],
          availability: 'Flexible, available weekends',
        },
        {
          id: 'TEACH-002',
          name: 'Kim Min-ho',
          university: 'Korea University',
          department: 'Business Administration',
          experience: '6 years, 15 admitted to top universities',
          style: 'Analytical and logical, excellent at logical feedback',
          fitScore: 88,
          matchReason:
            '분석적이고 논리적인 피드백 스타일로 학생의 표현력을 발전시킬 수 있습니다. 성향 핏이 우수합니다.',
          strengths: ['Logical feedback', 'Expression development', 'Analytical approach'],
          concerns: ['May seem directive to anxious students'],
          availability: 'Weekday evenings',
        },
        {
          id: 'TEACH-003',
          name: 'Lee Su-jin',
          university: 'Yonsei University',
          department: 'Education',
          experience: '5 years in student care and counseling',
          style: 'Dialogue-based, excellent at drawing out student thoughts',
          fitScore: 85,
          matchReason:
            '학생이 자기 표현이 약하므로 대화 유도형 스타일이 최적입니다. 안정감 있는 교사입니다.',
          strengths: ['Dialogue-based', 'Student expression development', 'Stability'],
          concerns: ['Less experience with top-tier universities'],
          availability: 'Flexible',
        },
      ],
      candidateList: [
        {
          id: 'TEACH-004',
          name: 'Choi Young-soo',
          university: 'KAIST',
          department: 'Engineering',
          experience: '7 years',
          style: 'Practical and results-oriented',
          fitScore: 78,
          matchReason: 'Backup candidate with solid track record',
          strengths: ['Results-oriented', 'STEM background'],
          concerns: ['More technical focus'],
          availability: 'Weekdays',
        },
      ],
      analysisText: `
# 🎯 AI 추천 분석 결과

학생 프로필과 대표님의 전략적 방향을 분석한 결과, 아래와 같은 추천을 드립니다.

## 📊 분석 요약
- **학생 특성**: 불안 성향, 자기 표현력 약함, 멘탈 케어 필요
- **우선순위**: 멘탈 케어 > 부모 커뮤니케이션 > 스펙
- **추천 방향**: 안정감 있고 대화 유도형의 선생님

## 🎓 Top 3 매칭 선생님
각 선생님은 다음과 같은 이유로 추천됩니다:

**1순위 (92% fit)**: Park Ji-eun - 심리학 박사, 멘탈 케어 전문  
**2순위 (88% fit)**: Kim Min-ho - 논리적 피드백 강점  
**3순위 (85% fit)**: Lee Su-jin - 대화 유도형 스타일  

## ✨ 피드백 제공 방법
아래와 같이 피드백을 주시면 재추천이 가능합니다:
- "압박형은 제외" → 이완형 선생님으로 재추천
- "서울대 경험이 중요" → 특정 대학 경험 중심으로 재추천
- "주말 가능한 선생님" → 일정 기반 필터링
      `,
      generatedAt: new Date(),
    };

    // Create initial chat messages
    const initialMessages: ChatMessage[] = [
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: mockRecommendations.analysisText,
        timestamp: new Date(),
        metadata: {
          studentId,
          recommendations: mockRecommendations.topMatches,
        },
      },
    ];

    // Create session
    const session: MatchingSession = {
      sessionId,
      studentId,
      studentName: basicInfo.fullName,
      targetUniversity: targetGoals.targetUniversity,
      targetDepartment: targetGoals.targetDepartment,
      directorInstruction,
      messages: initialMessages,
      currentRecommendation: mockRecommendations,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Save session to database

    return NextResponse.json(
      {
        success: true,
        sessionId,
        studentId,
        recommendation: mockRecommendations,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recommendations?sessionId=...
 * Retrieve recommendations for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // TODO: Fetch session from database
    // const session = await db.sessions.findById(sessionId);

    // Mock response
    const mockSession: MatchingSession = {
      sessionId,
      studentId: 'STU-123',
      studentName: 'Kim Min-jun',
      targetUniversity: 'Seoul National University',
      targetDepartment: 'Life Sciences',
      directorInstruction: '학생이 불안 성향이라 압박형 선생님은 피할 것. 멘탈 케어 중심.',
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: `# 🎯 AI 추천 분석 결과\n\n분석 완료되었습니다.`,
          timestamp: new Date(),
        },
      ],
      currentRecommendation: {
        sessionId,
        studentId: 'STU-123',
        topMatches: [],
        candidateList: [],
        analysisText: '',
        generatedAt: new Date(),
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json(mockSession, { status: 200 });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recommendations',
      },
      { status: 500 }
    );
  }
}
