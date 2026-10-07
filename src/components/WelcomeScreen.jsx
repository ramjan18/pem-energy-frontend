export default function WelcomeScreen({ onSelectManager, onSelectRecorder, onSelectAdmin }) {
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

        <style>{`
          .welcome-actions > button:first-child {
            position: relative !important;
            min-height: 84px !important;
            padding: 16px 20px !important;
            overflow: hidden;
            background: linear-gradient(115deg, #21183d 0%, #111827 58%, #1e1b4b 100%) !important;
            border: 1px solid rgba(167,139,250,.58) !important;
            border-radius: 16px !important;
            box-shadow: 0 8px 28px rgba(124,58,237,.18), inset 0 1px 0 rgba(255,255,255,.08);
            transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease !important;
          }
          .welcome-actions > button:first-child::before {
            content: '';
            position: absolute;
            width: 140px;
            height: 140px;
            right: -42px;
            top: -82px;
            border-radius: 50%;
            background: rgba(167,139,250,.12);
            filter: blur(2px);
            pointer-events: none;
          }
          .welcome-actions > button:first-child::after {
            content: '›';
            position: relative;
            margin-left: auto;
            color: #c4b5fd;
            font-size: 25px;
            line-height: 1;
          }
          .welcome-actions > button:first-child:hover {
            transform: translateY(-3px) !important;
            border-color: rgba(196,181,253,.95) !important;
            box-shadow: 0 14px 36px rgba(124,58,237,.3), inset 0 1px 0 rgba(255,255,255,.12);
          }
          .welcome-actions > button:first-child:focus-visible {
            outline: 3px solid rgba(196,181,253,.75);
            outline-offset: 3px;
          }
          .welcome-actions > button:first-child span:first-child {
            width: 46px;
            height: 46px;
            display: grid;
            place-items: center;
            flex: 0 0 46px;
            border: 1px solid rgba(196,181,253,.25);
            border-radius: 13px;
            background: rgba(167,139,250,.16);
            color: #c4b5fd;
            font-size: 0;
          }
          .welcome-actions > button:first-child span:first-child::before {
            content: '\\1F512';
            font-size: 21px;
          }
          .welcome-actions > button:first-child span:last-child {
            position: relative;
            font-size: 17px;
            letter-spacing: -.02em;
          }
          @media (prefers-reduced-motion: reduce) {
            .welcome-actions > button:first-child { transition: none !important; }
            .welcome-actions > button:first-child:hover { transform: none !important; }
          }
        `}</style>
        <div className="welcome-actions" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={onSelectAdmin} style={{ width: '100%', padding: '16px 24px', background: '#111827', border: '2px solid #7C3AED', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)' }}><span>🔐</span><span>Admin Login</span></button>
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
