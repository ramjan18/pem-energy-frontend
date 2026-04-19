import { useState } from 'react';
import { authAPI, tokenAPI } from '../api';
import { FormField, PasswordInput, Input, Btn, Alert } from './UI';

export default function ManagerLogin({ onBack, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await authAPI.login({ username, password });
      
      if (response.success && response.data.role === 'manager') {
        // Store token
        tokenAPI.setToken(response.data.token);
        
        // Login user
        onLogin({
          type: 'manager',
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          role: response.data.role,
          token: response.data.token,
        });
      } else if (response.success && response.data.role !== 'manager') {
        setAlert({ msg: 'Access denied. This login is for managers only.', type: 'error' });
      } else {
        setAlert({ msg: response.message || 'Login failed', type: 'error' });
      }
    } catch (error) {
      setAlert({ msg: error.message || 'Login failed. Please check your credentials.', type: 'error' });
    } finally {
      setLoading(false);
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
          <FormField label="Username">
            <Input type="text" placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} required disabled={loading} />
          </FormField>
          <FormField label="Password">
            <PasswordInput placeholder="Enter Password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
          </FormField>
          <Btn type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login as Manager'}</Btn>
        </form>
        {alert && <Alert message={alert.msg} type={alert.type} onDismiss={() => setAlert(null)} />}
      </div>
    </div>
  );
}
