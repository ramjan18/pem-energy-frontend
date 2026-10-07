import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function LiveClock() {
  const [time, setTime] = useState(new Date());
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div style={{
      textAlign: 'center',
      padding: '12px 16px',
      background: isDark
        ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
        : 'linear-gradient(135deg, rgba(15,23,42,0.045) 0%, rgba(15,23,42,0.015) 100%)',
      borderRadius: 8,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}`,
      marginBottom: 24,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: isDark ? '#fff' : '#111827',
        letterSpacing: '1px',
      }}>
        {formattedTime}
      </div>
      <div style={{
        fontSize: 12,
        color: isDark ? '#9CA3AF' : '#4B5563',
        marginTop: 4,
        fontFamily: 'var(--font-mono)',
      }}>
        {formattedDate}
      </div>
    </div>
  );
}
