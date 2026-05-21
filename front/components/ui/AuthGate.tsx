'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Topbar } from './Topbar';
import { LoginModal } from './LoginModal';

const AUTH_STORAGE_KEY = 'educonsult-authenticated';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

type AuthContextValue = {
  loggedIn: boolean;
  openLoginModal: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthGate');
  }
  return context;
};

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(saved === 'true');
  }, []);

  const handleLogin = (username: string, password: string) => {
    const normalizedUsername = username.trim();
    const valid =
      normalizedUsername === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;

    if (!valid) {
      return false;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    setIsLoggedIn(true);
    return true;
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        loggedIn: isLoggedIn,
        openLoginModal: () => setLoginOpen(true),
        logout: handleLogout,
      }}
    >
      <Topbar loggedIn={isLoggedIn} onLoginClick={() => setLoginOpen(true)} onLogout={handleLogout} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} />
      {children}
    </AuthContext.Provider>
  );
};
