import { useState } from 'react';
import { SHIFT_PASSWORDS } from '../storage';
import { FormField, PasswordInput, Input, Select, Btn, Alert } from './UI';

export default function RecorderLogin({ onBack, onLogin }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [shift, setShift] = useState('');
  const [stage, setStage] = useState('form'); // form | otp | password
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [shiftPwd, setShiftPwd] = useState('');
  const [alert, setAlert] = useState(null);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const sendOTP = () => {
    if (!name || name.length < 4) return showAlert('Name must be at least 4 characters.', 'error');
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) return showAlert('Enter a valid 10-digit mobile number.', 'error');
    if (!shift) return showAlert('Please select your shift.', 'error');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    setStage('otp');
    showAlert('OTP sent to your mobile.', 'info');
  };

  const verifyOTP = () => {
    if (otpInput.length !== 6) return showAlert('Enter 6-digit OTP.', 'error');
    if (otpInput === generatedOTP) {
      setStage('password');
      showAlert('OTP verified successfully!', 'success');
    } else {
      showAlert('Invalid OTP. Please try again.', 'error');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (SHIFT_PASSWORDS[shift] === shiftPwd) {
      onLogin({ type: 'recorder', name, mobile, shift });
    } else {
      showAlert('Invalid shift password.', 'error');
    }
  };

  const maskedMobile = mobile ? mobile.substr(0, 2) + '******' + mobile.substr(8) : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.04) 0%, transparent 70%)' }}>
      <div style={{ maxWidth: 480, width: '100%', animation: 'fadeIn 0.3s ease' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#f0f0f0', fontSize: 15, cursor: 'pointer', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          ← Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 54, height: 54, background: '#111', border: '2px solid #10B981', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>👤</div>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Record Taker Login</h2>
            <p style={{ color: '#555', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Enter energy meter readings</p>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <FormField label="Your Name (Min 4 Characters)">
            <Input type="text" placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} minLength={4} required disabled={stage !== 'form'} />
          </FormField>
          <FormField label="Mobile Number">
            <Input type="tel" placeholder="Enter 10-digit mobile number" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} pattern="[0-9]{10}" required disabled={stage !== 'form'} />
          </FormField>
          <FormField label="Select Shift">
            <Select value={shift} onChange={e => setShift(e.target.value)} required disabled={stage !== 'form'}>
              <option value="">Select your shift</option>
              <option value="1">Shift 1 (Morning)</option>
              <option value="2">Shift 2 (Afternoon)</option>
              <option value="3">Shift 3 (Night)</option>
            </Select>
          </FormField>

          {stage === 'form' && (
            <Btn type="button" variant="green" onClick={sendOTP}>Send OTP</Btn>
          )}

          {stage === 'otp' && (
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid #2563EB', borderRadius: 10, padding: 18, marginBottom: 18 }}>
              <p style={{ fontSize: 13, color: '#2563EB', marginBottom: 6 }}>OTP sent to: <strong style={{ color: '#fff' }}>{maskedMobile}</strong></p>
              <p style={{ fontSize: 13, color: '#2563EB', marginBottom: 12 }}>Your OTP is: <strong style={{ fontSize: 22, color: '#fff', fontFamily: 'var(--font-mono)' }}>{generatedOTP}</strong></p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 20, letterSpacing: 4 }}
                />
                <button
                  type="button"
                  onClick={verifyOTP}
                  style={{ padding: '12px 22px', background: '#2563EB', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)' }}
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          {stage === 'password' && (
            <>
              <FormField label="Shift Password">
                <PasswordInput placeholder="Enter shift password" value={shiftPwd} onChange={e => setShiftPwd(e.target.value)} />
              </FormField>
              <Btn type="submit" variant="green">Login as Record Taker</Btn>
            </>
          )}
        </form>

        {alert && <Alert message={alert.msg} type={alert.type} onDismiss={() => setAlert(null)} />}
      </div>
    </div>
  );
}
