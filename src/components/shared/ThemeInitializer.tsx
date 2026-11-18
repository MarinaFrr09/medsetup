'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { installClientApiInterceptor } from '@/lib/client-api-fallback';

export function ThemeInitializer() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    installClientApiInterceptor();
  }, []);

  useEffect(() => {
    const applyTheme = (currentTheme: string) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');

      if (currentTheme === 'system') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq.matches) {
          root.classList.add('dark');
        } else {
          root.classList.add('light');
        }
      } else if (currentTheme === 'light') {
        root.classList.add('light');
      } else {
        root.classList.add('dark');
      }

      try {
        localStorage.setItem('theme', currentTheme);
      } catch (e) {}
    };

    applyTheme(theme || 'dark');

    // If system theme, listen to changes in system preferences
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [theme]);

  return null;
}
