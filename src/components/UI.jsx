import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { MdLightMode, MdNightlightRound, MdLogout, MdVisibility, MdVisibilityOff } from 'react-icons/md';

/* ---- HEADER ---- */
export function TopHeader({ title, subtitle, onLogout, isMobileDrawerOpen }) {
  const isMobile = window.innerWidth <= 768;
  const headerZIndex = isMobileDrawerOpen ? 40 : 100; // Behind drawer when open
  const { theme, toggleTheme, colors } = useTheme();
  
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `max(14px, env(safe-area-inset-top)) ${isMobile ? '16px' : '28px'} 14px`,
      background: colors.surface || '#0a0a0a',
      borderBottom: `1px solid ${colors.border || '#1a1a1a'}`,
      position: 'sticky',
      top: 0,
      zIndex: headerZIndex,
      width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, flex: 1, minWidth: 0 }}>
        <div style={{
          width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, background: colors.surface2 || '#111', border: `2px solid ${colors.blue || '#2563EB'}`,
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isMobile ? 18 : 20, flexShrink: 0,
        }}>📊</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.text || '#fff' }}>{title}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: colors.textMuted || '#666', fontFamily: 'var(--font-mono)' }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, flexShrink: 0 }}>
        {/* Theme Toggle */}
        {/* <button onClick={toggleTheme} style={{
          background: colors.surface2 || '#1a1a1a', border: `2px solid ${colors.blue || '#2563EB'}`, color: colors.blue || '#2563EB',
          padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
          fontFamily: 'var(--font-display)', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap', height: 'auto', minHeight: '40px',
        }}
          onMouseOver={e => { e.currentTarget.style.background = colors.surface || '#0a0a0a'; }}
          onMouseOut={e => { e.currentTarget.style.background = colors.surface2 || '#1a1a1a'; }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <MdNightlightRound style={{ fontSize: 18 }} /> : <MdLightMode style={{ fontSize: 18 }} />}
          {!isMobile && <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>}
        </button> */}
        {/* Logout Button */}
        {onLogout && (
          <button onClick={onLogout} style={{
            background: 'transparent', border: `1px solid ${colors.red || '#EF4444'}`, color: colors.red || '#EF4444',
            padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: isMobile ? 11 : 12,
            fontFamily: 'var(--font-display)', fontWeight: 600, transition: 'all 0.2s', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}
            onMouseOver={e => { e.currentTarget.style.background = `${colors.red || '#EF4444'}22`; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <MdLogout style={{ fontSize: 14 }} />
            {!isMobile && <span>Logout</span>}
          </button>
        )}
      </div>
    </header>
  );
}

/* ---- ALERT ---- */
export function Alert({ message, type, onDismiss }) {
  if (!message) return null;
  const colors = {
    success: { bg: 'rgba(16,185,129,0.08)', border: '#10B981', color: '#10B981' },
    error: { bg: 'rgba(239,68,68,0.08)', border: '#EF4444', color: '#EF4444' },
    info: { bg: 'rgba(37,99,235,0.08)', border: '#2563EB', color: '#2563EB' },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      padding: '12px 16px', borderRadius: 8, fontSize: 14,
      marginTop: 12, animation: 'fadeIn 0.3s ease',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: c.color, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>}
    </div>
  );
}

/* ---- FORM INPUT ---- */
export function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', marginBottom: 7, color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputStyle = {
  width: '100%', padding: '13px 15px', background: '#111', border: '1px solid #222',
  borderRadius: 8, color: '#f0f0f0', fontSize: 15, fontFamily: 'var(--font-display)',
  outline: 'none', transition: 'border-color 0.2s',
};

export function Input({ onFocus, onBlur, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      style={{ ...inputStyle, borderColor: focused ? '#2563EB' : '#222', background: focused ? '#0a0a0a' : '#111', ...style }}
      onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }}
      {...props}
    />
  );
}

export function Select({ children, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      style={{ ...inputStyle, borderColor: focused ? '#2563EB' : '#222', background: focused ? '#0a0a0a' : '#111', cursor: 'pointer', ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    >
      {children}
    </select>
  );
}

export function PasswordInput({ id, placeholder, value, onChange, style }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();
  
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ ...inputStyle, borderColor: focused ? '#2563EB' : '#222', background: focused ? '#0a0a0a' : '#111', paddingRight: 48, ...style }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: focused ? '#2563EB' : '#666',
          cursor: 'pointer',
          fontSize: 20,
          padding: '6px 8px',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          opacity: focused ? 1 : 0.7,
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)';
          e.currentTarget.style.color = '#2563EB';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = focused ? '#2563EB' : '#666';
        }}
        title={show ? 'Hide password' : 'Show password'}
      >
        {show ? <MdVisibilityOff style={{ fontSize: 20 }} /> : <MdVisibility style={{ fontSize: 20 }} />}
      </button>
    </div>
  );
}

/* ---- BUTTON ---- */
export function Btn({ children, variant = 'primary', color, disabled, style, ...props }) {
  const variants = {
    primary: { background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', border: 'none' },
    green: { background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none' },
    secondary: { background: '#111', color: '#f0f0f0', border: '1px solid #222' },
    danger: { background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: '#888', border: '1px solid #222' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      disabled={disabled}
      style={{
        ...v, padding: '14px 20px', borderRadius: 8, fontSize: 15,
        fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, width: '100%',
        fontFamily: 'var(--font-display)', transition: 'transform 0.15s, box-shadow 0.15s',
        ...style,
      }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---- MODAL ---- */
export function Modal({ title, subtitle, children, onClose }) {
  const isMobile = window.innerWidth <= 768;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      animation: 'fadeIn 0.2s ease',
      padding: isMobile ? '16px' : '0',
    }}>
      <div style={{
        background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 16,
        padding: isMobile ? '20px' : '30px', maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {subtitle && <p style={{ fontSize: 13, color: '#666', marginBottom: 22 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

/* ---- SECTION BADGE ---- */
export function SectionBadge({ section }) {
  const colors = {
    'SMRT': { bg: 'rgba(65,105,225,0.12)', color: '#4169E1' },
    'SAPL': { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    'SMC-HT': { bg: 'rgba(139,92,246,0.12)', color: '#8B5CF6' },
  };
  const c = colors[section] || { bg: 'rgba(255,255,255,0.1)', color: '#fff' };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 6,
      fontSize: 12, fontWeight: 700, background: c.bg, color: c.color,
      fontFamily: 'var(--font-mono)',
    }}>
      {section}
    </span>
  );
}

/* ---- TABLE ---- */
export function DataTable({ headers, children, emptyMessage }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 12, overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                background: '#0f0f0f', color: '#555', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.6px', padding: '12px 14px',
                textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {!children || (Array.isArray(children) && children.length === 0) ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#444', fontSize: 14 }}>{emptyMessage}</div>
      ) : null}
    </div>
  );
}

export const tdStyle = { padding: '15px 14px', borderTop: '1px solid #141414', fontSize: 14, fontFamily: 'var(--font-display)' };
