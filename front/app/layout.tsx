import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/ui/Sidebar';
import { AuthGate } from '@/components/ui/AuthGate';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EduConsult AI',
  description: 'AI teacher matching platform for admissions consulting.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900 pt-20">
        <AuthGate>
          <div className="flex">
            <Sidebar />
            <main className="flex-1 ml-72">{children}</main>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
