'use client';

import { usePathname } from 'next/navigation';

interface TopbarProps {
  loggedIn: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/students': 'Student Intake',
  '/matching': 'AI Matching',
  '/teachers': 'Teacher Database',
  '/feedback': 'Feedback History',
};

export const Topbar = ({ loggedIn, onLoginClick, onLogout }: TopbarProps) => {
  const pathname = usePathname();
  const currentTitle = pageTitles[pathname] || 'EduConsult AI';

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#031532] border-b border-[#031532] z-30 shadow-md">
      <div className="h-full px-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-white text-[#031532] rounded-lg w-10 h-10 flex items-center justify-center shadow-sm">
            <span className="text-lg font-bold">E</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">EduConsult AI</h1>
            <p className="text-sm text-gray-300">{currentTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loggedIn ? (
            <>
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#031532] font-semibold">
                  R
                </span>
                <span>대표님</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-2xl bg-[#1d71ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#1558c9] transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              className="rounded-2xl bg-[#1d71ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#1558c9] transition"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
