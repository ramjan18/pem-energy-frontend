import { useState, useEffect } from 'react';
import { meterAPI, readingAPI } from '../api';
import { TopHeader, Alert, FormField, Input, Btn } from './UI';
import {  MdShowChart, MdSettingsInputComponent } from 'react-icons/md';
import { MdBolt } from "react-icons/md";
const SECTION_CONFIG = {
  'SMRT': { icon: MdBolt, color: '#4169E1', label: 'SMRT' },
  'SAPL': { icon: MdShowChart, color: '#10B981', label: 'SAPL' },
  'SMC-HT': { icon: MdSettingsInputComponent, color: '#8B5CF6', label: 'SMC-HT' },
};

function MeterSection({ section, user, selectedShift, onSaved }) {
  const cfg = SECTION_CONFIG[section];
  const [vals, setVals] = useState({ kwh: '', kvah: '', kvarhLag: '', kvarhLead: '', md: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [meters, setMeters] = useState([]);
  const [selectedMeter, setSelectedMeter] = useState('');
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!selectedMeter || !selectedShift) {
      setLocked(false);
      return;
    }

    const checkLocked = async () => {
      try {
        const response = await readingAPI.getReadings({ meterId: selectedMeter, shift: selectedShift, limit: 1 });
        const existing = (response.data || []).some(r => {
          const createdAt = new Date(r.createdAt || r.readingDate).getTime();
          return createdAt >= Date.now() - 18 * 60 * 60 * 1000;
        });
        setLocked(existing);
      } catch (error) {
        console.error('Failed to check meter lock:', error);
        setLocked(false);
      }
    };

    checkLocked();
  }, [selectedMeter, selectedShift]);

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
    const { kwh, kvah, kvarhLag, kvarhLead, md } = vals;

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

    if (!kvarhLag || isNaN(parseFloat(kvarhLag)) || parseFloat(kvarhLag) < 0) {
      setAlert({ msg: 'Please enter a valid KVARH Lag reading.', type: 'error' });
      return;
    }

    if (!kvarhLead || isNaN(parseFloat(kvarhLead)) || parseFloat(kvarhLead) < 0) {
      setAlert({ msg: 'Please enter a valid KVARH Lead reading.', type: 'error' });
      return;
    }

    if (!md || isNaN(parseFloat(md)) || parseFloat(md) < 0) {
      setAlert({ msg: 'Please enter a valid MD reading (must be a positive number).', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const totalKVARH = parseFloat(kvarhLag) + parseFloat(kvarhLead);
      const readingData = {
        meterId: selectedMeter,
        readingDate: new Date().toISOString().split('T')[0],
        shift: selectedShift,
        KWH: parseFloat(kwh),
        KVAH: parseFloat(kvah),
        KVARHlag: parseFloat(kvarhLag),
        KVARHlead: parseFloat(kvarhLead),
        KVARH: totalKVARH,
        MD: parseFloat(md),
        notes: `Recorded by ${user.username} (${user.role})`,
      };

      const response = await readingAPI.recordReading(readingData);

      if (response.success) {
        setVals({ kwh: '', kvah: '', kvarhLag: '', kvarhLead: '', md: '' });
        setLocked(true);
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

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{ background: '#0a0a0a', border: `1px solid #1f1f1f`, borderRadius: 14, padding: isMobile ? '16px' : '24px', marginBottom: 18, borderLeft: `3px solid ${cfg.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ width: isMobile ? 40 : 46, height: isMobile ? 40 : 46, background: '#111', border: `2px solid ${cfg.color}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 20 : 22, color: cfg.color }}>
          <cfg.icon />
        </div>
        <div>
          <h3 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800 }}>{cfg.label}</h3>
          <p style={{ fontSize: isMobile ? 11 : 12, color: '#555', fontFamily: 'var(--font-mono)' }}>Energy Meter Readings</p>
        </div>
      </div>

      {/* Meter Selection */}
      {/* {meters.length > 0 && (
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
      )} */}

      {/* Shift Selection */}
      {/* <FormField label="Shift">
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
      </FormField> */}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 18, opacity: locked ? 0.7 : 1 }}>
        {[
          { key: 'kwh', label: 'KWH' },
          { key: 'kvah', label: 'KVAH' },
          { key: 'kvarhLag', label: 'KVARH Lag' },
          { key: 'kvarhLead', label: 'KVARH Lead' },
          { key: 'md', label: 'MD' }
        ].map(field => (
          <div key={field.key} style={{ gridColumn: field.key === 'md' && !isMobile ? '1 / -1' : undefined }}>
            <FormField label={field.label}>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={vals[field.key]}
                onChange={e => setVals(v => ({ ...v, [field.key]: e.target.value }))}
                disabled={loading || locked}
              />
            </FormField>
          </div>
        ))}
      </div>

      <Btn
        onClick={handleSave}
        disabled={loading || locked}
        style={{ background: loading || locked ? '#333' : cfg.color, color: '#fff', border: 'none' }}
      >
        {locked ? 'Locked — already recorded' : loading ? 'Saving...' : 'Save Record'}
      </Btn>

      {locked && (
        <div style={{ marginTop: 12, color: '#93c5fd', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          This meter already has a reading for the selected shift within the last 18 hours.
        </div>
      )}

      {alert && <Alert message={alert.msg} type={alert.type} />}
    </div>
  );
}

export default function RecorderDashboard({ user, onLogout }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedShift, setSelectedShift] = useState('3');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Detect window resize to toggle mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#030303', color: '#f0f0f0', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <TopHeader title="PEM Energy Manager" subtitle="Record Entry" onLogout={onLogout} isMobileDrawerOpen={false} />
      <div style={{ maxWidth: 900, margin: isMobile ? '0' : '0 auto', padding: isMobile ? (window.innerWidth <= 480 ? '12px' : '16px') : '24px 20px', flex: 1, width: '100%', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {/* User Info */}
        <div style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 16, padding: isMobile ? '14px 16px' : '18px 22px', marginBottom: 22, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: isMobile ? 14 : 18, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, background: '#111', border: '2px solid #10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#f8fafc' }}>{user.username}</div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                  {user.role}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                  Select shift once for all three meters
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: isMobile ? 10 : 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Selected Shift</span>
            <select
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
              style={{
                width: '100%',
                padding: isMobile ? '10px 12px' : '14px 16px',
                background: '#111',
                border: '1px solid #222',
                borderRadius: 12,
                color: '#f0f0f0',
                fontSize: isMobile ? 13 : 15,
                fontFamily: 'var(--font-display)',
                outline: 'none',
              }}
              disabled={loading}
            >
              <option value="1">Shift 1 (6:00 AM - 2:00 PM)</option>
              <option value="2">Shift 2 (2:00 PM - 10:00 PM)</option>
              <option value="3">Shift 3 (10:00 PM - 6:00 AM)</option>
            </select>
          </div>
        </div>

        {['SAPL', 'SMRT', 'SMC-HT'].map(section => (
          <MeterSection key={`${section}-${refreshKey}`} section={section} user={user} selectedShift={selectedShift} onSaved={() => setRefreshKey(k => k + 1)} />
        ))}
      </div>
      </div>
   
  );
}
