import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage for saved theme preference
    const saved = localStorage.getItem('theme-preference');
    return saved || 'dark';
  });

  // Update localStorage whenever theme changes
  useEffect(() => {
    localStorage.setItem('theme-preference', theme);
    // Update document attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const colors = theme === 'dark' ? {
    bg: '#030303',
    surface: '#0c0c0c',
    surface2: '#141414',
    surface3: '#1c1c1c',
    border: '#222222',
    border2: '#2a2a2a',
    text: '#f0f0f0',
    textMuted: '#666',
    textDim: '#444',
    blue: '#2563EB',
    blueDark: '#1D4ED8',
    green: '#10B981',
    greenDark: '#059669',
    purple: '#8B5CF6',
    amber: '#F59E0B',
    red: '#EF4444',
    redDark: '#DC2626',
  } : {
    bg: '#ffffff',
    surface: '#f5f5f5',
    surface2: '#e8e8e8',
    surface3: '#e0e0e0',
    border: '#d4d4d4',
    border2: '#c4c4c4',
    text: '#1a1a1a',
    textMuted: '#666666',
    textDim: '#999999',
    blue: '#2563EB',
    blueDark: '#1D4ED8',
    green: '#10B981',
    greenDark: '#059669',
    purple: '#8B5CF6',
    amber: '#F59E0B',
    red: '#EF4444',
    redDark: '#DC2626',
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
