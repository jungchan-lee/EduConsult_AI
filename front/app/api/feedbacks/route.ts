import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/feedbacks
 * Handle director feedback and re-rank recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, feedback } = body;

    if (!sessionId || !feedback) {
      return NextResponse.json(
        { success: false, error: 'sessionId and feedback are required' },
        { status: 400 }
      );
    }

    // TODO: 실제 구현
    // 1. 기존 session 조회
    // 2. feedback을 context에 추가
    // 3. LLM으로 재분석
    // 4. Vector DB에서 재검색 및 reranking
    // 5. 새로운 추천 결과 생성

    // Mock response - re-ranked recommendations based on feedback
    const mockAnalysisText = `
# 📋 피드백 반영 재분석

"${feedback}" 피드백을 반영하여 추천을 재정렬했습니다.

## 🔄 변경 사항
- 피드백 내용을 시스템에 반영
- 우선순위를 재조정하여 재검색 수행
- 더욱 정확한 매칭 결과 제시

## 🎓 재정렬된 Top 3 매칭 선생님
피드백을 고려하여 다음과 같이 재추천합니다.

**1순위**: 피드백 조건에 가장 잘 맞는 선생님  
**2순위**: 그 다음 최적 선생님  
**3순위**: 대안 선생님  

더 많은 조정이 필요하시면 추가 피드백을 제공해주세요!
    `;

    const mockRecommendations = {
      sessionId,
      studentId: 'STU-123',
      topMatches: [
        {
          id: 'TEACH-001-adjusted',
          name: 'Park Ji-eun',
          university: 'Seoul National University',
          department: 'Psychology',
          experience: '8 years',
          style: 'Empathetic and supportive',
          fitScore: 95, // Increased based on feedback
          matchReason: '피드백 반영하여 순위 상향',
          strengths: ['Emotional support', 'Care-focused'],
          concerns: [],
          availability: 'Flexible',
        },
      ],
      analysisText: mockAnalysisText,
      generatedAt: new Date(),
    };

    return NextResponse.json(
      {
        success: true,
        sessionId,
        analysisText: mockAnalysisText,
        topMatches: mockRecommendations.topMatches,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
