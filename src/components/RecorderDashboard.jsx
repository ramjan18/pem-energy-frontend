import { useState, useEffect } from 'react';
import { meterAPI, readingAPI } from '../api';
import { TopHeader, Alert, FormField, Input, Btn } from './UI';

const SECTION_CONFIG = {
  'SMRT':   { icon: '⚡', color: '#4169E1', label: 'SMRT' },
  'SAPL':   { icon: '📊', color: '#10B981', label: 'SAPL' },
  'SMC-HT': { icon: '⚙️', color: '#8B5CF6', label: 'SMC-HT' },
};

function MeterSection({ section, user, onSaved }) {
  const cfg = SECTION_CONFIG[section];
  const [vals, setVals] = useState({ kwh: '', kvah: '', kvarh: '', md: '', pf: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [meters, setMeters] = useState([]);
  const [selectedMeter, setSelectedMeter] = useState('');
  const [selectedShift, setSelectedShift] = useState('3'); // Default to shift 3

  // Load available meters for this section
  useEffect(() => {
    const loadMeters = async () => {
      try {
        const response = await meterAPI.getAllMeters({ meterName: section, isActive: true });
        if (response.success) {
          setMeters(response.data);
          if (response.data.length > 0) {
            setSelectedMeter(response.data[0]._id);
          }
        }
      } catch (error) {
        console.error('Failed to load meters:', error);
        setAlert({ msg: 'Failed to load meters', type: 'error' });
      }
    };
    loadMeters();
  }, [section]);

  const handleSave = async () => {
    const { kwh, kvah, kvarh, md, pf } = vals;

    // Comprehensive validation
    // if (!selectedMeter) {
    //   setAlert({ msg: 'Please select a meter.', type: 'error' });
    //   return;
    // }

    if (!kwh || isNaN(parseFloat(kwh)) || parseFloat(kwh) < 0) {
      setAlert({ msg: 'Please enter a valid KWH reading (must be a positive number).', type: 'error' });
      return;
    }

    if (!kvah || isNaN(parseFloat(kvah)) || parseFloat(kvah) < 0) {
      setAlert({ msg: 'Please enter a valid KVAH reading (must be a positive number).', type: 'error' });
      return;
    }

    if (!kvarh || isNaN(parseFloat(kvarh))) {
      setAlert({ msg: 'Please enter a valid KVARH reading.', type: 'error' });
      return;
    }

    if (!md || isNaN(parseFloat(md)) || parseFloat(md) < 0) {
      setAlert({ msg: 'Please enter a valid MD reading (must be a positive number).', type: 'error' });
      return;
    }

    if (!pf || isNaN(parseFloat(pf)) || parseFloat(pf) < 0 || parseFloat(pf) > 1) {
      setAlert({ msg: 'Please enter a valid Power Factor (must be between 0 and 1).', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const readingData = {
        meterId: selectedMeter,
        readingDate: new Date().toISOString().split('T')[0],
        shift: selectedShift,
        KWH: parseFloat(kwh),
        KVAH: parseFloat(kvah),
        KVARH: parseFloat(kvarh),
        MD: parseFloat(md),
        PF: parseFloat(pf),
        notes: `Recorded by ${user.username} (${user.role})`,
      };

      const response = await readingAPI.recordReading(readingData);

      if (response.success) {
        setVals({ kwh: '', kvah: '', kvarh: '', md: '', pf: '' });
        setAlert({ msg: `${section} reading recorded successfully!`, type: 'success' });
        onSaved?.();
        setTimeout(() => setAlert(null), 4000);
      } else {
        setAlert({ msg: response.message || 'Failed to save reading', type: 'error' });
      }
    } catch (error) {
      setAlert({ msg: error.message || 'Failed to save reading', type: 'error' });
    } finally {
      setLoading(false);
    }
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

      {/* Meter Selection */}
      {meters.length > 0 && (
        <FormField label="Select Meter">
          <select
            value={selectedMeter}
            onChange={e => setSelectedMeter(e.target.value)}
            style={{
              width: '100%',
              padding: '13px 15px',
              background: '#111',
              border: '1px solid #222',
              borderRadius: 8,
              color: '#f0f0f0',
              fontSize: 15,
              fontFamily: 'var(--font-display)',
              outline: 'none',
            }}
            disabled={loading}
          >
            {meters.map(meter => (
              <option key={meter._id} value={meter._id}>
                {meter.meterNumber} - {meter.location}
              </option>
            ))}
          </select>
        </FormField>
      )}

      {/* Shift Selection */}
      <FormField label="Shift">
        <select
          value={selectedShift}
          onChange={e => setSelectedShift(e.target.value)}
          style={{
            width: '100%',
            padding: '13px 15px',
            background: '#111',
            border: '1px solid #222',
            borderRadius: 8,
            color: '#f0f0f0',
            fontSize: 15,
            fontFamily: 'var(--font-display)',
            outline: 'none',
          }}
          disabled={loading}
        >
          <option value="1">Shift 1 (6:00 AM - 2:00 PM)</option>
          <option value="2">Shift 2 (2:00 PM - 10:00 PM)</option>
          <option value="3">Shift 3 (10:00 PM - 6:00 AM)</option>
        </select>
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 18 }}>
        {[
          { key: 'kwh', label: 'KWH' },
          { key: 'kvah', label: 'KVAH' },
          { key: 'kvarh', label: 'KVARH' },
          { key: 'md', label: 'MD' },
          { key: 'pf', label: 'Power Factor' }
        ].map(field => (
          <div key={field.key} style={{ gridColumn: field.key === 'md' || field.key === 'pf' ? '1 / -1' : undefined }}>
            <FormField label={field.label}>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={vals[field.key]}
                onChange={e => setVals(v => ({ ...v, [field.key]: e.target.value }))}
                disabled={loading}
              />
            </FormField>
          </div>
        ))}
      </div>

      <Btn
        onClick={handleSave}
        disabled={loading}
        style={{ background: loading ? '#333' : cfg.color, color: '#fff', border: 'none' }}
      >
        {loading ? 'Saving...' : 'Save Record'}
      </Btn>

      {alert && <Alert message={alert.msg} type={alert.type} />}
    </div>
  );
}

export default function RecorderDashboard({ user, onLogout }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <TopHeader title="PEM Energy Manager" subtitle="Record Entry" onLogout={onLogout} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* User Info */}
        <div style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, background: '#111', border: '2px solid #10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user.username}</div>
            <span style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {user.role}
            </span>
          </div>
        </div>

        {['SAPL', 'SMRT', 'SMC-HT'].map(section => (
          <MeterSection key={`${section}-${refreshKey}`} section={section} user={user} onSaved={() => setRefreshKey(k => k + 1)} />
        ))}
      </div>
    </>
  );
}
