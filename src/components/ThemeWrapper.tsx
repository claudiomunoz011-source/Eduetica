'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';

interface ThemeWrapperProps {
  children: React.ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { theme } = useUserStore();

  useEffect(() => {
    // Rehydrate Zustand persisted store on client
    useUserStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'kid') {
      html.setAttribute('data-theme', 'kid');
    } else if (theme === 'teen') {
      html.setAttribute('data-theme', 'teen');
    } else {
      html.setAttribute('data-theme', 'default');
    }
  }, [theme]);

  return <>{children}</>;
}
