'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { MatchingSession, ChatMessage } from '@/types/recommendation';

// react-markdown을 클라이언트 사이드에서만 동적으로 로드하여 SSR/번들링 에러 방지
const ReactMarkdown = dynamic(() => import('react-markdown').then((mod) => typeof mod.default === 'function' ? mod.default : (mod as any).default), { 
  ssr: false,
  loading: () => <p className="text-sm animate-pulse text-gray-400">메시지 렌더링 중...</p>
});

interface Student {
  id: number;
  name: string;
  high_school: string;
  phone: string;
  created_at: string;
  interview_json: string; // JSON string from DB
  grade: string;
}

interface TeacherFilters {
  gender: string;
  location: string;
  offline_course: string;
  university: string;
  subject: string;
  min_experience: string;
  keyword: string;
  avail_day: string;
}

// MatchingSession 타입을 확장하여 UI용 추가 필드 정의
type ExtendedSession = MatchingSession & { highSchool?: string; grade?: string; fullStudentData?: any };

export default function MatchingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSession, setSelectedSession] = useState<ExtendedSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 선생님 데이터를 AI API 규격에 맞춰 변환하는 헬퍼 함수
  const transformTeacherForAI = useCallback((teacher: any) => {
    // 스케줄 그룹화 (day별로 slot들을 묶음)
    const scheduleMap = new Map<string, any[]>();
    teacher.schedules?.forEach((sch: any) => {
      if (!scheduleMap.has(sch.day)) scheduleMap.set(sch.day, []);
      scheduleMap.get(sch.day)?.push({ 
        from: sch.from?.slice(0, 5) || sch.from_time?.slice(0, 5), 
        to: sch.to?.slice(0, 5) || sch.to_time?.slice(0, 5) 
      });
    });

    return {
      id: Number(teacher.id),
      name: teacher.name,
      birth: teacher.birth || "2000-01-01",
      gender: teacher.gender ?? 0,
      education: {
        university: teacher.university,
        major: teacher.major,
        level: teacher.level || "graduate"
      },
      subject: teacher.subjects || [],
      location: teacher.location,
      offline_course: teacher.offline_course,
      style: teacher.style,
      start_tutoring: teacher.start_tutoring,
      student_history: teacher.student_history || [],
      availability: {
        date_range: { 
          from: teacher.avail_date_from, 
          to: teacher.avail_date_to 
        },
        weekly_schedule: Array.from(scheduleMap.entries()).map(([day, slots]) => ({ day, slots }))
      },
      description: teacher.description
    };
  }, []);

  const calculateExperience = (startDate: string) => {
    if (!startDate) return '정보 없음';
    const years = new Date().getFullYear() - new Date(startDate).getFullYear();
    return years <= 0 ? '신입' : `${years}년차`;
  };

  // 모달 제어 상태
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // 필터 상태
  const [filters, setFilters] = useState<TeacherFilters>({
    gender: '',
    location: '',
    offline_course: '',
    university: '',
    subject: '',
    min_experience: '',
    keyword: '',
    avail_day: '',
  });

  // 1. 서버에서 학생 목록 가져오기
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // 서버의 엔드포인트인 /students/list로 수정
        const response = await fetch('http://localhost:3001/students/list');
        if (response.ok) {
          const data = await response.json();
          setStudents(data);
        }
      } catch (error) {
        console.error('Failed to fetch students:', error);
      }
    };

    fetchStudents();
  }, []);

  // 채팅 메시지 추가 시 하단 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSession?.messages, isChatLoading]);

  // 학생 선택 시 모달 오픈
  const handleOpenFilterModal = (student: Student) => {
    setActiveStudent(student);
    setShowFilterModal(true);
  };

  const studentDetails = useMemo(() => {
    if (!activeStudent) return { targetUniv: '정보 없음', targetDept: '' };
    // 면접 정보 파싱
    let targetUniv = '정보 없음';
    let targetDept = '';
    if (activeStudent.interview_json && activeStudent.interview_json !== 'undefined') {
      try {
        const data = JSON.parse(activeStudent.interview_json);
        if (Array.isArray(data) && data.length > 0) {
          targetUniv = data[0].school || '정보 없음';
          targetDept = data[0].major || '';
        }
      } catch (e) { console.error(e); }
    }
    return { targetUniv, targetDept };
  }, [activeStudent]);

  // 필터 입력 후 실제 매칭 시작
  const handleStartMatching = () => {
    if (!activeStudent) return;
    
    setIsLoading(true);

    const startMatchingFetch = async () => {
      try {
        // 1. 로컬 RDB에서 필터링된 선생님 조회
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== '') queryParams.append(key, value);
        });
        
        // 1-1. 필터링된 선생님 조회
        const teacherRes = await fetch(`http://localhost:3001/teachers/search/filter?${queryParams.toString()}`);
        if (!teacherRes.ok) throw new Error('선생님 데이터 조회 실패');
        const matchedTeachers = await teacherRes.json();

        // 1-2. 학생 상세 정보 조회 (Payload 보강용)
        console.log(`Fetching student detail for ID: ${activeStudent.id}`);
        // 서버 API 경로가 app.get("/students/:id") 이므로 호출 경로는 다음과 같습니다.
        const studentRes = await fetch(`http://localhost:3001/students/${activeStudent.id}`);
        
        let fullStudentData;
        if (studentRes.ok) {
          const data = await studentRes.json();
          // DB에서 JSON 컬럼이 문자열로 넘어올 경우를 대비해 객체로 파싱
          fullStudentData = {
            ...data,
            survey_json: typeof data.survey_json === 'string' ? JSON.parse(data.survey_json) : data.survey_json,
            interview_json: typeof data.interview_json === 'string' ? JSON.parse(data.interview_json) : data.interview_json,
          };
        } else {
          // 에러 응답이 JSON이 아닐 경우를 대비해 텍스트로 먼저 확인
          const errorText = await studentRes.text().catch(() => 'No response body');
          console.error('Student Detail Fetch Failed:', studentRes.status, errorText);
          
          // 상세 조회가 실패하더라도 매칭을 중단하지 않도록 activeStudent 데이터를 기본값으로 사용
          fullStudentData = { ...activeStudent, _error: '상세 데이터 로드 실패 (404/500)' };
        }

        // 3. 세션 데이터 설정 및 화면 전환 (AI API 호출 생략)
        setSelectedSession({
          sessionId: 'SES-' + Date.now(),
          studentId: String(activeStudent.id),
          studentName: activeStudent.name,
          targetUniversity: studentDetails.targetUniv,
          targetDepartment: studentDetails.targetDept,
          highSchool: activeStudent.high_school,
          grade: activeStudent.grade,
          fullStudentData: fullStudentData, // 세션에 전체 데이터 저장
          directorInstruction: '',
          messages: [
            {
              id: 'msg-1',
              role: 'assistant',
              content: `# 🎯 매칭 세션이 시작되었습니다.\n\n**${activeStudent.name}** 학생을 위한 최적의 선생님을 찾기 위해 분석을 준비 중입니다.\n\n원하시는 선생님의 스타일이나 추가적인 요청사항이 있다면 아래 채팅창에 입력해 주세요. 입력을 마치시면 AI가 분석을 시작합니다.`,
              timestamp: new Date(),
            }
          ],
          currentRecommendation: {
            sessionId: 'SES-' + Date.now(),
            studentId: String(activeStudent.id),
            topMatches: matchedTeachers,
            candidateList: [],
            analysisText: "",
            generatedAt: new Date(),
          },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        setShowFilterModal(false);
      } catch (error) {
        console.error('Matching Error:', error);
        alert(`에러 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      } finally {
        setIsLoading(false);
      }
    };

    startMatchingFetch();
  };

  // 채팅 메시지 전송 핸들러
  const handleSendMessage = async () => {
    const currentMsg = messageInput;
    if (!selectedSession || !currentMsg.trim()) return;

    // AI API에 전송할 데이터 구조 정의
    const aiPayload = {
      student_id: Number(selectedSession.studentId),
      consultant_data: selectedSession.currentRecommendation?.topMatches.map(transformTeacherForAI) || [],
      message: currentMsg,
      payload: selectedSession.fullStudentData // 세션에 저장된 전체 데이터 사용
    };

    // [추가] JSON 파일로 저장 (브라우저 다운로드 실행)
    const blob = new Blob([JSON.stringify(aiPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai_matching_request_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: currentMsg,
      timestamp: new Date(),
    };

    setSelectedSession(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : null);
    setMessageInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('https://beverlee-lazulitic-lustfully.ngrok-free.dev/educonsult/api/v1/match/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload)
      });

      const data = await response.json();
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.answer || data.message || data.response,
        timestamp: new Date(),
        metadata: {
          recommendations: data.matched_instructors
        }
      };

      setSelectedSession(prev => prev ? { ...prev, messages: [...prev.messages, aiMsg] } : null);
    } catch (e) {
      console.error(e);
      alert('AI 응답 생성 실패');
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-6 px-8">
      <Header 
        title={selectedSession ? "AI Matching Analysis" : "AI Matching"}
        subtitle={selectedSession ? `Matching session for ${selectedSession.studentName}` : "매칭을 진행할 학생을 선택하세요."}
        breadcrumbs={[
          { label: '메인 대시보드', href: '/' },
          { label: 'AI 매칭', href: '/matching' }
        ]}
      />

      <div className="p-8 bg-gray-50 rounded-3xl min-h-[calc(100vh-10rem)] mt-4">
        {!selectedSession ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <div 
                key={student.id} 
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleOpenFilterModal(student)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-100 text-blue-600 rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    New Application
                  </div>
                  <span className="text-xs text-gray-400">
                    {student.created_at ? new Date(student.created_at).toLocaleDateString() : '날짜 미상'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {student.name}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {student.high_school}
                </p>
                <Button className="w-full bg-gray-900 text-white hover:bg-gray-800">
                  매칭 시작하기
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-6 h-[calc(100vh-18rem)]">
            {/* Chat Area */}
            <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50">
                {selectedSession.messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                      msg.role === 'assistant' 
                        ? 'bg-white text-gray-800 border border-gray-100' 
                        : 'bg-blue-600 text-white'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown 
                          className="text-sm leading-relaxed"
                          components={{
                            h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-md font-bold mb-2 mt-4" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-1 mt-3" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="text-sm font-bold mb-1 mt-2" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                            hr: ({ node, ...props }) => <hr className="my-4 border-gray-200" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                      )}
                    </div>

                    {/* 선생님 추천 카드 리스트 */}
                    {msg.metadata?.recommendations && (
                      <div className="mt-3 w-full max-w-[90%] grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.metadata.recommendations.map((instructor: any) => (
                          <div 
                            key={`${msg.id}-${instructor.id}`}
                            onClick={() => setSelectedTeacher(instructor)}
                            className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex gap-1.5">
                                <div className="bg-green-50 text-green-600 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  AI 추천
                                </div>
                                {instructor.offline_course && (
                                  <div className="bg-blue-50 text-blue-500 rounded-md px-2 py-0.5 text-[10px] font-bold">
                                    대면가능
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-50 text-gray-400 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                                {instructor.name[0]}
                              </div>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-0.5 group-hover:text-blue-600 transition-colors">
                              {instructor.name} 선생님
                            </h3>
                            <p className="text-[11px] text-gray-500 mb-1 font-medium line-clamp-1">
                              {instructor.education?.university || instructor.university} · {instructor.education?.major || instructor.major}
                            </p>
                            <p className="text-[10px] text-blue-600 font-bold mb-3">{calculateExperience(instructor.start_tutoring)}</p>

                            <div className="space-y-2 mb-4">
                              <p className="text-[10px] text-gray-600 line-clamp-2"><strong>지도 스타일:</strong> {instructor.style}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(Array.isArray(instructor.subject || instructor.subjects)) 
                                  ? (instructor.subject || instructor.subjects).slice(0, 3).map((sub: string, i: number) => (
                                      <span key={i} className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded">#{sub}</span>
                                    )) 
                                  : <span className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded">#{instructor.subject || instructor.subjects}</span>}
                              </div>
                            </div>

                            <Button className="w-full h-8 text-[11px] bg-gray-900 text-white hover:bg-gray-800">
                              자세히보기
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-4 rounded-2xl bg-white text-gray-800 border border-gray-100 shadow-sm flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-gray-400 ml-1 font-medium">AI가 분석 중입니다...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input 
                  type="text" 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="AI에게 추가 요청사항을 입력하세요 (예: 서울대 출신 선생님 위주로..)" 
                  className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition"
                  disabled={isChatLoading}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isChatLoading || !messageInput.trim()}
                  className="bg-blue-600 text-white px-6"
                >
                  {isChatLoading ? '...' : '전송'}
                </Button>
              </div>
            </div>

            {/* Session Info Sidebar */}
            <div className="w-80 space-y-6 overflow-y-auto pr-2">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Student Info</h4>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-bold">
                    {selectedSession.fullStudentData?.gender === 0 ? '남학생' : '여학생'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{selectedSession.studentName}</p>
                    <p className="text-xs text-gray-600 font-medium">
                      {selectedSession.highSchool} ({selectedSession.fullStudentData?.school_type || '구분 없음'})
                    </p>
                    <p className="text-xs text-blue-600 font-bold mt-1">내신 등급: {selectedSession.grade}등급</p>
                    
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">지망 목표</p>
                      <p className="text-xs font-semibold text-gray-800">{selectedSession.targetUniversity}</p>
                      <p className="text-xs text-gray-600">{selectedSession.targetDepartment}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">연락처 정보</p>
                    <p className="text-xs text-gray-700 flex items-center gap-1.5">
                      <span className="text-gray-400">📞</span> {selectedSession.fullStudentData?.phone || '번호 없음'}
                    </p>
                    <p className="text-xs text-gray-500">
                      우선 연락: <span className="font-semibold text-gray-700">{selectedSession.fullStudentData?.contact_preference === 'parent' ? '학부모님' : '학생'}</span>
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                    <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-bold rounded-full uppercase">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {selectedSession.fullStudentData?.self_intro_text && (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Self Intro Text</h4>
                  <div className="max-h-32 overflow-y-auto">
                    <p className="text-xs text-gray-600 leading-relaxed italic">
                      "{selectedSession.fullStudentData.self_intro_text}"
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full text-xs py-2">
                    ✓ Approve Match
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs py-2">
                    📋 View Full Report
                  </Button>
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs py-2 border-red-100 text-red-500 hover:bg-red-50"
                      onClick={() => setSelectedSession(null)}
                    >
                      ← Back to Student List
                    </Button>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                      다른 학생을 선택하려면 리스트로 돌아가세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 매칭 조건 설정 모달 (NEW) */}
      {showFilterModal && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">매칭 조건 설정 및 확인</h2>
              <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 왼쪽: 학생 상세 정보 */}
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-2xl">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">선택된 학생 정보</h4>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-blue-900">{activeStudent.name}</p>
                    <p className="text-sm text-blue-700">{activeStudent.high_school} · {activeStudent.grade}등급</p>
                    <div className="mt-4 pt-4 border-t border-blue-100">
                      <p className="text-xs font-bold text-blue-400 mb-1">지망 대학/학과</p>
                      <p className="text-sm font-medium text-blue-800">{studentDetails.targetUniv} {studentDetails.targetDept}</p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  위 학생의 성적과 지망 대학을 고려하여 AI가 선생님을 추천합니다. 
                  오른쪽 필터를 통해 특정 조건의 선생님을 우선적으로 검색할 수 있습니다.
                </div>
              </div>

              {/* 오른쪽: 필터 입력 영역 */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">선생님 필터링 (선택 사항)</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">선생님 성별</label>
                    <select 
                      className="w-full border rounded-lg p-2 text-sm"
                      value={filters.gender}
                      onChange={(e) => setFilters({...filters, gender: e.target.value})}
                    >
                      <option value="">무관</option>
                      <option value="0">남성</option>
                      <option value="1">여성</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">수업 방식</label>
                    <select 
                      className="w-full border rounded-lg p-2 text-sm"
                      value={filters.offline_course}
                      onChange={(e) => setFilters({...filters, offline_course: e.target.value})}
                    >
                      <option value="">무관</option>
                      <option value="true">대면 가능</option>
                      <option value="false">비대면 전용</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">희망 지역</label>
                    <input type="text" placeholder="예: 강남구" className="w-full border rounded-lg p-2 text-sm" value={filters.location} onChange={(e)=>setFilters({...filters, location: e.target.value})}/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">희망 출신교</label>
                    <input type="text" placeholder="예: 서울대" className="w-full border rounded-lg p-2 text-sm" value={filters.university} onChange={(e)=>setFilters({...filters, university: e.target.value})}/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">강조 과목</label>
                    <input type="text" placeholder="예: 의학계열" className="w-full border rounded-lg p-2 text-sm" value={filters.subject} onChange={(e)=>setFilters({...filters, subject: e.target.value})}/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">최소 경력(년)</label>
                    <input type="number" placeholder="0" className="w-full border rounded-lg p-2 text-sm" value={filters.min_experience} onChange={(e)=>setFilters({...filters, min_experience: e.target.value})}/>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">검색 키워드</label>
                  <input type="text" placeholder="예: MMI, 압박면접 전문" className="w-full border rounded-lg p-2 text-sm" value={filters.keyword} onChange={(e)=>setFilters({...filters, keyword: e.target.value})}/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">수업 가능 요일</label>
                  <select className="w-full border rounded-lg p-2 text-sm" value={filters.avail_day} onChange={(e)=>setFilters({...filters, avail_day: e.target.value})}>
                    <option value="">무관</option>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <Button onClick={() => setShowFilterModal(false)} variant="outline" className="flex-1">취소</Button>
              <Button onClick={handleStartMatching} className="flex-1 bg-blue-600 text-white">매칭 시작 (AI 분석 요청)</Button>
            </div>
          </div>
        </div>
      )}

      {/* 👤 선생님 상세 프로필 모달 (AI 추천 결과용) */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">선생님 상세 프로필</h2>
              <button onClick={() => setSelectedTeacher(null)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="flex items-center gap-6 mb-8">
                <div className="bg-blue-100 text-blue-600 rounded-2xl w-24 h-24 flex items-center justify-center text-4xl font-bold shadow-sm">{selectedTeacher.name[0]}</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTeacher.name} 선생님</h3>
                  <div className="text-lg text-gray-600">
                    {selectedTeacher.education?.university || selectedTeacher.university} {selectedTeacher.education?.major || selectedTeacher.major} 
                    <span className="text-sm ml-2 text-gray-400">
                      ({(selectedTeacher.education?.level || selectedTeacher.level) === 'graduate' 
                        ? '대학원' 
                        : `${selectedTeacher.education?.level || selectedTeacher.level}학년`})
                    </span>
                  </div>
                  <p className="text-green-600 font-bold mt-1">경력: {calculateExperience(selectedTeacher.start_tutoring)}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">지도 스타일</h4>
                    <p className="text-gray-700 leading-relaxed font-medium">{selectedTeacher.style}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">활동 정보</h4>
                    <p className="text-sm text-gray-700"><strong>지역:</strong> {selectedTeacher.location}</p>
                    <p className="text-sm text-gray-700"><strong>방식:</strong> {selectedTeacher.offline_course ? '대면/비대면 가능' : '비대면 전용'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">수업 가능 과목</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(selectedTeacher.subject || selectedTeacher.subjects) ? (
                      (selectedTeacher.subject || selectedTeacher.subjects).map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg border border-blue-100">{s}</span>
                      ))
                    ) : (
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg border border-blue-100">{selectedTeacher.subject || selectedTeacher.subjects}</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">주간 가능 스케줄</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedTeacher.availability?.weekly_schedule ? (
                      selectedTeacher.availability.weekly_schedule.map((sch: any, i: number) => (
                        <div key={i} className="text-[11px] p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="font-bold text-gray-600 mb-1">{sch.day}</p>
                          {sch.slots.map((slot: any, si: number) => (
                            <p key={si} className="text-gray-500">{slot.from} ~ {slot.to}</p>
                          ))}
                        </div>
                      ))
                    ) : (
                      selectedTeacher.schedules?.map((sch: any, i: number) => (
                        <div key={i} className="text-[11px] p-2 bg-gray-50 rounded-lg border border-gray-100 text-center font-medium">
                          {sch.day}: {sch.from?.slice(0,5)} ~ {sch.to?.slice(0,5)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">상세 소개</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium text-sm">{selectedTeacher.description || "등록된 소개글이 없습니다."}</p>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <Button onClick={() => setSelectedTeacher(null)} variant="outline" className="flex-1">닫기</Button>
                <Button className="flex-1 bg-blue-600 text-white hover:bg-blue-700">이 선생님으로 매칭 확정</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-medium text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      )}
    </main>
  );
}