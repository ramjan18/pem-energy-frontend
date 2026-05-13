import { useState, useEffect } from 'react';

export default function LiveClock() {
  const [time, setTime] = useState(new Date());

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
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: 24,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: '#fff',
        letterSpacing: '1px',
      }}>
        {formattedTime}
      </div>
      <div style={{
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        fontFamily: 'var(--font-mono)',
      }}>
        {formattedDate}
      </div>
    </div>
  );
}
