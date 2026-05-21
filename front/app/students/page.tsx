'use client';

import { Header } from '@/components/ui/Header';
import { StudentIntakeForm } from '@/components/student/StudentIntakeForm';

export default function StudentsPage() {
  return (
    <main className="min-h-screen pt-6 px-8">
      <Header 
        title="학생 신청 폼"
        subtitle="아래의 내용을 작성하여 AI 기반 선생님 매칭을 신청해주세요."
        breadcrumbs={[
          { label: '메인 대시보드', href: '/' },
          { label: '학생 신청' }
        ]}
      />
      
      <div className="p-8 bg-gray-50 rounded-3xl min-h-[calc(100vh-6rem)]">
        <StudentIntakeForm />
      </div>
    </main>
  );
}
