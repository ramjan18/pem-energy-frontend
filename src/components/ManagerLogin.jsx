import { useState } from 'react';
import { MANAGER_ID, MANAGER_PWD } from '../storage';
import { FormField, PasswordInput, Input, Btn, Alert } from './UI';

export default function ManagerLogin({ onBack, onLogin }) {
  const [id, setId] = useState('');
  const [pwd, setPwd] = useState('');
  const [alert, setAlert] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (id === MANAGER_ID && pwd === MANAGER_PWD) {
      onLogin({ type: 'manager', id });
    } else {
      setAlert({ msg: 'Invalid credentials. Check Manager ID and password.', type: 'error' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.05) 0%, transparent 70%)' }}>
      <div style={{ maxWidth: 480, width: '100%', animation: 'fadeIn 0.3s ease' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#f0f0f0', fontSize: 15, cursor: 'pointer', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          ← Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 54, height: 54, background: '#111', border: '2px solid #2563EB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🛡️</div>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Manager Login</h2>
            <p style={{ color: '#555', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Access administrative functions</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <FormField label="Manager ID">
            <Input type="text" placeholder="Enter Manager ID" value={id} onChange={e => setId(e.target.value)} required />
          </FormField>
          <FormField label="Password">
            <PasswordInput placeholder="Enter Password" value={pwd} onChange={e => setPwd(e.target.value)} />
          </FormField>
          <Btn type="submit">Login as Manager</Btn>
        </form>
        {alert && <Alert message={alert.msg} type={alert.type} onDismiss={() => setAlert(null)} />}
      </div>
    </div>
  );
}
