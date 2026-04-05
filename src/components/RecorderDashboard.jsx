import { useState, useEffect, useCallback } from 'react';
import { storage, KEYS, COOLDOWN_MS, SECTIONS } from '../storage';
import { TopHeader, Alert, FormField, Input, Btn } from './UI';

const SECTION_CONFIG = {
  'SMRT':   { icon: '⚡', color: '#4169E1', label: 'SMRT' },
  'SAPL':   { icon: '📊', color: '#10B981', label: 'SAPL' },
  'SMC-HT': { icon: '⚙️', color: '#8B5CF6', label: 'SMC-HT' },
};

function MeterSection({ section, user, onSaved }) {
  const cfg = SECTION_CONFIG[section];
  const [vals, setVals] = useState({ kwh: '', kvah: '', kvarh_lag: '', kvarh_lead: '', md: '' });
  const [disabled, setDisabled] = useState(false);
  const [alert, setAlert] = useState(null);

  const checkCooldown = useCallback(() => {
    const records = storage.get(KEYS.RECORDS, []);
    const allowances = storage.get(KEYS.ALLOWANCES, []);
    const now = Date.now();

    const hasAllowance = allowances.some(a =>
      a.recorderName === user.name && a.shift === user.shift && a.section === section
    );
    const lastRecord = records
      .filter(r => r.recorderName === user.name && r.shift === user.shift && r.section === section)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    const withinCooldown = lastRecord && lastRecord.timestamp > now - COOLDOWN_MS;
    setDisabled(!hasAllowance && !!withinCooldown);
  }, [section, user]);

  useEffect(() => { checkCooldown(); }, [checkCooldown]);

  const handleSave = () => {
    const { kwh, kvah, kvarh_lag, kvarh_lead, md } = vals;
    if (!kwh || !kvah || !kvarh_lag || !kvarh_lead || !md) {
      setAlert({ msg: 'Please fill all fields.', type: 'error' });
      return;
    }
    const now = Date.now();
    const record = {
      id: now,
      section,
      kwh: parseFloat(kwh),
      kvah: parseFloat(kvah),
      kvarh_lag: parseFloat(kvarh_lag),
      kvarh_lead: parseFloat(kvarh_lead),
      md: parseFloat(md),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      timestamp: now,
      recorderName: user.name,
      mobile: user.mobile,
      shift: user.shift,
    };

    const records = storage.get(KEYS.RECORDS, []);
    records.push(record);
    storage.set(KEYS.RECORDS, records);

    // Clear allowance
    let allowances = storage.get(KEYS.ALLOWANCES, []);
    allowances = allowances.filter(a => !(a.recorderName === user.name && a.shift === user.shift && a.section === section));
    storage.set(KEYS.ALLOWANCES, allowances);

    setVals({ kwh: '', kvah: '', kvarh_lag: '', kvarh_lead: '', md: '' });
    setAlert({ msg: `${section} record saved successfully!`, type: 'success' });
    checkCooldown();
    onSaved?.();
    setTimeout(() => setAlert(null), 4000);
  };

  return (
    <div style={{ background: '#0a0a0a', border: `1px solid #1f1f1f`, borderRadius: 14, padding: 24, marginBottom: 18, borderLeft: `3px solid ${cfg.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 46, height: 46, background: '#111', border: `2px solid ${cfg.color}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {cfg.icon}
        </div>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>{cfg.label}</h3>
          <p style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-mono)' }}>Energy Meter Readings</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 18 }}>
        {['kwh', 'kvah', 'kvarh_lag', 'kvarh_lead', 'md'].map(field => (
          <div key={field} style={{ gridColumn: field === 'md' ? '1 / -1' : undefined }}>
            <FormField label={field.replace('_', ' ').toUpperCase()}>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={vals[field]}
                onChange={e => setVals(v => ({ ...v, [field]: e.target.value }))}
                disabled={disabled}
              />
            </FormField>
          </div>
        ))}
      </div>

      <Btn
        onClick={handleSave}
        disabled={disabled}
        style={{ background: disabled ? '#333' : cfg.color, color: '#fff', border: 'none' }}
      >
        {disabled ? '⏳ Cooldown Active (18h)' : 'Save Record'}
      </Btn>

      {alert && <Alert message={alert.msg} type={alert.type} />}
    </div>
  );
}

export default function RecorderDashboard({ user, onLogout }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const allCooldown = SECTIONS.every(section => {
    const records = storage.get(KEYS.RECORDS, []);
    const allowances = storage.get(KEYS.ALLOWANCES, []);
    const hasAllowance = allowances.some(a => a.recorderName === user.name && a.shift === user.shift && a.section === section);
    const lastRecord = records.filter(r => r.recorderName === user.name && r.shift === user.shift && r.section === section).sort((a, b) => b.timestamp - a.timestamp)[0];
    return !hasAllowance && lastRecord && lastRecord.timestamp > Date.now() - COOLDOWN_MS;
  });

  return (
    <>
      <TopHeader title="PEM Energy Manager" subtitle="Record Entry" onLogout={onLogout} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* User Info */}
        <div style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, background: '#111', border: '2px solid #10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user.name}</div>
            <span style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              Shift {user.shift}
            </span>
          </div>
        </div>

        {allCooldown && (
          <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid #FFAA00', borderRadius: 10, padding: '14px 18px', marginBottom: 22, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <p style={{ color: '#FFAA00', fontSize: 14 }}>You have submitted records for all sections within the last 18 hours. Please wait or check with manager if a deletion allows re-recording.</p>
          </div>
        )}

        {SECTIONS.map(section => (
          <MeterSection key={`${section}-${refreshKey}`} section={section} user={user} onSaved={() => setRefreshKey(k => k + 1)} />
        ))}
      </div>
    </>
  );
}
