export default function WelcomeScreen({ onSelectManager, onSelectRecorder }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.06) 0%, transparent 70%)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 520, width: '100%', animation: 'fadeIn 0.5s ease' }}>
        {/* Logo */}
        <div style={{
          width: 88, height: 88, margin: '0 auto 28px',
          background: 'linear-gradient(135deg,#111 0%,#1a1a1a 100%)',
          border: '2px solid #2563EB', borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, boxShadow: '0 0 40px rgba(37,99,235,0.15)',
        }}>⚡</div>

        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>PEM Energy</h1>
        <p style={{ color: '#555', fontSize: 15, marginBottom: 52, fontFamily: 'var(--font-mono)' }}>
          Industrial Energy Monitoring System
        </p>

        <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Select Login Type</p>
        <p style={{ color: '#555', fontSize: 13, marginBottom: 28, fontFamily: 'var(--font-mono)' }}>Choose your role to continue</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={onSelectManager}
            style={{
              width: '100%', padding: '22px 24px',
              background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)',
              border: '2px solid #2563EB', borderRadius: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 16, color: '#fff',
              fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(37,99,235,0.35)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.25)'; }}
          >
            <span style={{ fontSize: 24 }}>🛡️</span>
            <span>Manager Login</span>
          </button>

          <button
            onClick={onSelectRecorder}
            style={{
              width: '100%', padding: '22px 24px',
              background: '#0c0c0c', border: '2px solid #1f1f1f', borderRadius: 14,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
              color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#10B981'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#1f1f1f'; }}
          >
            <span style={{ fontSize: 24 }}>👤</span>
            <span>Record Taker Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
