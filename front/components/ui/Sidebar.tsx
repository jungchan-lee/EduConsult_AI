'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthGate';

const navigationItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 13h8V3H3v10z" />
        <path d="M13 21h8V11h-8v10z" />
        <path d="M3 21h8v-6H3v6z" />
        <path d="M13 11h8V3h-8v8z" />
      </svg>
    ),
    authOnly: true,
  },
  {
    href: '/students',
    label: 'Student Intake',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4z" />
        <path d="M4 20v-1c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v1" />
        <path d="M16 7h5" />
        <path d="M16 11h5" />
      </svg>
    ),
  },
  {
    href: '/matching',
    label: 'AI Matching',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <path d="M16.24 7.76l-8.48 8.48" />
        <path d="M7.76 7.76l8.48 8.48" />
      </svg>
    ),
    authOnly: true,
  },
  {
    href: '/teachers',
    label: 'Teacher Database',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4z" />
        <path d="M4 20v-1c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v1" />
        <path d="M18 8h2" />
        <path d="M18 12h2" />
      </svg>
    ),
    authOnly: true,
  },
  {
    href: '/feedback',
    label: 'Feedback History',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
      </svg>
    ),
    authOnly: true,
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { loggedIn } = useAuth();

  const visibleItems = navigationItems.filter((item) => !item.authOnly || loggedIn);

  return (
    <aside className="w-72 bg-white text-gray-700 h-[calc(100vh-80px)] fixed left-0 top-20 overflow-y-auto border-r border-gray-200 z-20">
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-[#031532] text-white rounded-xl w-10 h-10 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {loggedIn ? 'Academy Director' : '학생 신청'}
            </p>
            <p className="text-xs text-gray-500">
              {loggedIn ? 'Administrative Access' : '로그인 없이 학생 신청 가능'}
            </p>
          </div>
        </div>
      </div>

      <nav className="px-4 py-6">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition border-r-4 ${
                    isActive
                      ? 'bg-gray-200 text-gray-900 border-r-[#031532]'
                      : 'text-gray-600 hover:bg-gray-100 border-r-transparent'
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isActive ? 'text-[#031532]' : 'text-gray-500'
                  }`}>
                    {item.icon}
                  </span>
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
