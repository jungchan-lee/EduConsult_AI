'use client';

import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { StudentIntakeForm } from '@/components/student/StudentIntakeForm';
import { useAuth } from '@/components/ui/AuthGate';

export default function Home() {
  const { loggedIn } = useAuth();

  if (!loggedIn) {
    return (
      <main className="min-h-[calc(100vh-80px)] pt-8 px-8">
        <Header
          title="학생 신청 폼"
          subtitle="아래의 내용을 작성하여 AI 기반 선생님 매칭을 신청해주세요."
        />
        <div className="p-8 bg-gray-50 rounded-3xl min-h-[calc(100vh-200px)] mt-8">
          <StudentIntakeForm />
        </div>
      </main>
    );
  }

  const quickActions = [
    {
      title: 'Student Intake',
      description: 'Register a new student application',
      href: '/students',
      icon: '📝',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'AI Matching',
      description: 'View AI-generated recommendations',
      href: '/matching',
      icon: '🤖',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      title: 'Teacher Database',
      description: 'Manage teacher profiles',
      href: '/teachers',
      icon: '👨‍🏫',
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'Feedback History',
      description: 'Review previous recommendations',
      href: '/feedback',
      icon: '💬',
      color: 'bg-orange-50 border-orange-200',
    },
  ];

  const stats = [
    { label: 'Total Students', value: '24', change: '+3 this month' },
    { label: 'Teachers', value: '12', change: 'All active' },
    { label: 'Matches', value: '18', change: '100% success rate' },
  ];

  return (
    <main className="min-h-[calc(100vh-80px)] pt-8 px-8">
      <Header 
        title="Dashboard"
        subtitle="Welcome back! Here's your EduConsult AI overview."
      />
      
      <div className="p-8 bg-white rounded-3xl min-h-[calc(100vh-200px)] mt-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm font-medium mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.href}>
                  <div className={`${action.color} border-2 rounded-lg p-6 hover:shadow-md transition cursor-pointer`}>
                    <div className="text-4xl mb-3">{action.icon}</div>
                    <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Student Application: Kim Min-jun</p>
                  <p className="text-sm text-gray-600">Applied for Seoul National University</p>
                </div>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Teacher Recommendation Generated</p>
                  <p className="text-sm text-gray-600">3 matched teachers for Park Ji-woo</p>
                </div>
                <span className="text-sm text-gray-500">5 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Match Approved</p>
                  <p className="text-sm text-gray-600">Lee Ji-won matched with Teacher Park</p>
                </div>
                <span className="text-sm text-gray-500">1 day ago</span>
              </div>
            </div>
          </div>
        </div>
    </main>
  );
}
