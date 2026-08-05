import { useMemo } from 'react';
import { useTheme } from 'next-themes';

export function useGraphTheme() {
  const { resolvedTheme } = useTheme();

  return useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    
    return {
      background: 'transparent',
      linkColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
      labelColor: isDark ? '#E5E7EB' : '#111827',
      nodeColors: {
        PERSON: isDark ? '#60A5FA' : '#2563EB', // Blue
        SYSTEM: isDark ? '#5EEAD4' : '#0D9488', // Teal
        ORGANIZATION: isDark ? '#F472B6' : '#DB2777', // Pink
        PROJECT: isDark ? '#FBBF24' : '#D97706', // Amber
        DEFAULT: isDark ? '#A78BFA' : '#7C3AED', // Purple
      } as Record<string, string>,
    };
  }, [resolvedTheme]);
}
