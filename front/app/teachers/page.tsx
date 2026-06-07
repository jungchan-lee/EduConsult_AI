'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';

interface Teacher {
  id: number;
  name: string;
  university: string;
  major: string;
  level: string;
  style: string;
  subjects: string[] | null;
  location: string;
  offline_course: boolean;
  start_tutoring: string;
  description: string;
  schedules: { day: string; from: string; to: string }[] | null;
  avail_date_from: string;
  avail_date_to: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await fetch('https://d2b0-122-32-117-5.ngrok-free.app/teachers', {
          headers: {
            'ngrok-skip-browser-warning': '69420', // 아무 값이나 넣어도 경고창을 패스해 줍니다.
          },
        });
        if (response.ok) {
          const data = await response.json();
          setTeachers(data);
        }
      } catch (error) {
        console.error('Failed to fetch teachers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  const calculateExperience = (startDate: string) => {
    const years = new Date().getFullYear() - new Date(startDate).getFullYear();
    return years <= 0 ? '신입' : `${years}년차`;
  };

  return (
    <main className="min-h-screen pt-6 px-8 relative">
      <Header 
        title="선생님 데이터베이스"
        subtitle="등록된 선생님들의 프로필을 관리하고 상세 정보를 확인하세요."
        breadcrumbs={[
          { label: '메인 대시보드', href: '/' },
          { label: '선생님 목록' }
        ]}
      />

      <div className="p-8 bg-gray-50 rounded-3xl min-h-[calc(100vh-10rem)] mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <div className="bg-green-100 text-green-600 rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      Active
                    </div>
                    {teacher.offline_course && (
                      <div className="bg-blue-100 text-blue-600 rounded-lg px-3 py-1 text-xs font-bold tracking-wider">
                        대면가능
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-100 text-gray-400 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">
                    {teacher.name[0]}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                  {teacher.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  {teacher.university} · {teacher.major}
                </p>
                <p className="text-xs text-green-600 font-bold mb-4">{calculateExperience(teacher.start_tutoring)}</p>

                <div className="space-y-2 mb-6">
                  <p className="text-xs text-gray-600 line-clamp-2"><strong>지도 스타일:</strong> {teacher.style}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {teacher.subjects?.slice(0, 3).map((sub, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">#{sub}</span>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => setSelectedTeacher(teacher)} 
                  className="w-full bg-gray-900 text-white hover:bg-gray-800"
                >
                  자세히보기
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal Overlay */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
              <h2 className="text-xl font-bold text-gray-900">선생님 상세 프로필</h2>
              <button onClick={() => setSelectedTeacher(null)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="flex items-center gap-6 mb-8">
                <div className="bg-green-100 text-green-600 rounded-2xl w-24 h-24 flex items-center justify-center text-4xl font-bold shadow-sm">{selectedTeacher.name[0]}</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTeacher.name} 선생님</h3>
                  <p className="text-lg text-gray-600">{selectedTeacher.university} {selectedTeacher.major} ({selectedTeacher.level === 'graduate' ? '대학원' : `${selectedTeacher.level}학년`})</p>
                  <p className="text-green-600 font-bold mt-1">경력: {calculateExperience(selectedTeacher.start_tutoring)}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">지도 스타일</h4><p className="text-gray-700 leading-relaxed font-medium">{selectedTeacher.style}</p></div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">활동 정보</h4>
                    <p className="text-sm text-gray-700"><strong>지역:</strong> {selectedTeacher.location}</p>
                    <p className="text-sm text-gray-700"><strong>방식:</strong> {selectedTeacher.offline_course ? '대면/비대면 가능' : '비대면 전용'}</p>
                  </div>
                </div>
                <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">수업 가능 과목</h4><div className="flex flex-wrap gap-2">{selectedTeacher.subjects?.map((s, i) => (<span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-sm font-bold rounded-lg border border-green-100">{s}</span>))}</div></div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">주간 가능 스케줄</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedTeacher.schedules?.map((sch, i) => (<div key={i} className="text-xs p-2 bg-gray-100 rounded-lg text-center font-medium">{sch.day}: {sch.from.slice(0,5)} ~ {sch.to.slice(0,5)}</div>))}
                  </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100"><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">상세 소개 및 이력</h4><p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">{selectedTeacher.description}</p></div>
              </div>

              <div className="mt-10 flex gap-4">
                <Button onClick={() => setSelectedTeacher(null)} variant="outline" className="flex-1">닫기</Button>
                <Button variant="primary" className="flex-1 bg-green-600 hover:bg-green-700 border-none">매칭 시 우선 고려</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}