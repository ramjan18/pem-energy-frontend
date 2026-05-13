import { useState, useEffect } from 'react';
import { meterAPI, readingAPI } from '../api';
import { TopHeader, Alert, FormField, Input, Btn } from './UI';
import {  MdShowChart, MdSettingsInputComponent } from 'react-icons/md';
import { MdBolt } from "react-icons/md";
import { MdWbSunny, MdWbTwilight, MdNightlight } from 'react-icons/md';
import { MdChevronLeft, MdChevronRight, MdHistory, MdShare } from 'react-icons/md';
import LiveClock from './LiveClock';
const SECTION_CONFIG = {
  'SMRT': { icon: MdBolt, color: '#4169E1', label: 'SMRT' },
  'SAPL': { icon: MdShowChart, color: '#10B981', label: 'SAPL' },
  'SMC-HT': { icon: MdSettingsInputComponent, color: '#8B5CF6', label: 'SMC-HT' },
};

function MeterSection({ section, user, selectedShift, onSaved, selectedDate }) {
  const cfg = SECTION_CONFIG[section];
  const [vals, setVals] = useState({ kwh: '', kvah: '', kvarhLag: '', kvarhLead: '', md: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [meters, setMeters] = useState([]);
  const [selectedMeter, setSelectedMeter] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockedReading, setLockedReading] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historicalReadings, setHistoricalReadings] = useState([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
  const [viewingReading, setViewingReading] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  // Generate formatted message for sharing
  const generateShareMessage = (reading) => {
    return `${section} Reading:
KWH: ${reading.kwh.toFixed(2)}
KVAH: ${reading.kvah.toFixed(2)}
KVARH LAG: ${reading.kvarhLag.toFixed(2)}
KVARH LEAD: ${reading.kvarhLead.toFixed(2)}
MD: ${reading.md.toFixed(2)}`;
  };

  // Handle share to WhatsApp
  const handleShareToWhatsApp = (reading) => {
    const message = generateShareMessage(reading);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    if (!selectedMeter || !selectedShift) {
      setLocked(false);
      return;
    }

    const checkLocked = async () => {
      try {
        const response = await readingAPI.getReadings({ meterId: selectedMeter, shift: selectedShift, limit: 10 });
        const today = new Date().toISOString().split('T')[0];
        const existing = response.data?.find(r => {
          const createdAt = new Date(r.createdAt || r.readingDate).getTime();
          const readDate = (r.readingDate || '').split('T')[0];
          return createdAt >= Date.now() - 18 * 60 * 60 * 1000 && readDate === today;
        });
        setLocked(!!existing);
        if (existing) {
          setLockedReading({
            kwh: existing.KWH,
            kvah: existing.KVAH,
            kvarhLag: existing.KVARHlag,
            kvarhLead: existing.KVARHlead,
            md: existing.MD,
            time: new Date(existing.createdAt || existing.readingDate).toLocaleTimeString(),
            date: (existing.readingDate || '').split('T')[0]
          });
        }
        setHistoricalReadings(response.data || []);
      } catch (error) {
        console.error('Failed to check meter lock:', error);
        setLocked(false);
      }
    };

    checkLocked();
  }, [selectedMeter, selectedShift]);

  // Load readings for selected date
  useEffect(() => {
    if (!selectedMeter || !selectedShift || !selectedDate) return;

    const loadReadingForDate = async () => {
      try {
        const response = await readingAPI.getReadings({ meterId: selectedMeter, shift: selectedShift, limit: 100 });
        const readingForDate = response.data?.find(r => {
          const readDate = (r.readingDate || '').split('T')[0];
          return readDate === selectedDate;
        });

        if (readingForDate) {
          setViewingReading({
            kwh: readingForDate.KWH,
            kvah: readingForDate.KVAH,
            kvarhLag: readingForDate.KVARHlag,
            kvarhLead: readingForDate.KVARHlead,
            md: readingForDate.MD,
            time: new Date(readingForDate.createdAt || readingForDate.readingDate).toLocaleTimeString(),
            date: (readingForDate.readingDate || '').split('T')[0]
          });
        } else {
          setViewingReading(null);
        }
      } catch (error) {
        console.error('Failed to load reading for date:', error);
      }
    };

    loadReadingForDate();
  }, [selectedMeter, selectedShift, selectedDate]);

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
      setAlert({ msg: 'Please enter a valid KVARH Lag reading (must be a positive number).', type: 'error' });
      return;
    }

    if (!kvarhLead || isNaN(parseFloat(kvarhLead)) || parseFloat(kvarhLead) < 0) {
      setAlert({ msg: 'Please enter a valid KVARH Lead reading (must be a positive number).', type: 'error' });
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
        setLockedReading({
          kwh: parseFloat(kwh),
          kvah: parseFloat(kvah),
          kvarhLag: parseFloat(kvarhLag),
          kvarhLead: parseFloat(kvarhLead),
          md: parseFloat(md),
          time: new Date().toLocaleTimeString(),
          date: new Date().toISOString().split('T')[0]
        });
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 18, opacity: (locked && selectedDate === today) ? 0.7 : 1 }}>
        {[
          { key: 'kwh', label: 'KWH' },
          { key: 'kvah', label: 'KVAH' },
          { key: 'kvarhLag', label: 'KVARH Lag' },
          { key: 'kvarhLead', label: 'KVARH Lead' },
          { key: 'md', label: 'MD' }
        ].map(field => (
          <div key={field.key} style={{ gridColumn: field.key === 'md' && !isMobile ? '1 / -1' : undefined }}>
            <FormField label={field.label}>
              {selectedDate && selectedDate !== today && viewingReading ? (
                <div style={{
                  width: '100%',
                  padding: '13px 15px',
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: 8,
                  color: '#f0f0f0',
                  fontSize: 15,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: cfg.color,
                }}>
                  {viewingReading[field.key]?.toFixed(2) || 'N/A'}
                </div>
              ) : (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={vals[field.key]}
                  onChange={e => {
                    let value = e.target.value;
                    // Allow only numbers (0-9) and decimal point (.)
                    // Block special characters: - + / * @ # $ % & ! and all others
                    const sanitized = value.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = sanitized.split('.');
                    const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
                    
                    if (finalValue === '' || parseFloat(finalValue) >= 0 || finalValue === '.') {
                      setVals(v => ({ ...v, [field.key]: finalValue }));
                    }
                  }}
                  disabled={loading || (locked && selectedDate === today)}
                />
              )}
            </FormField>
          </div>
        ))}
      </div>

      <Btn
        onClick={handleSave}
        disabled={loading || locked || (selectedDate && selectedDate !== today)}
        style={{ background: (loading || locked || (selectedDate && selectedDate !== today)) ? '#333' : cfg.color, color: '#fff', border: 'none', display: (selectedDate && selectedDate !== today) ? 'none' : 'block' }}
      >
        {locked && selectedDate === today ? 'Locked — already recorded' : loading ? 'Saving...' : 'Save Record'}
      </Btn>

      {selectedDate && selectedDate !== today && viewingReading && (
        <button 
          onClick={() => handleShareToWhatsApp(viewingReading)}
          style={{ marginTop: 12, width: '100%', padding: '12px 14px', background: '#25D366', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#1eaa54';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(37, 211, 102, 0.4)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#25D366';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <MdShare style={{ fontSize: 18 }} />
          Share to WhatsApp
        </button>
      )}

      {locked && lockedReading && (
        <div style={{ marginTop: 16, background: `${cfg.color}10`, border: `1px solid ${cfg.color}40`, borderRadius: 12, padding: '16px', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: cfg.color, fontWeight: 700, fontSize: 13 }}>
            ✓ Reading Saved at {lockedReading.time}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { key: 'kwh', label: 'KWH', value: lockedReading.kwh },
              { key: 'kvah', label: 'KVAH', value: lockedReading.kvah },
              { key: 'kvarhLag', label: 'KVARH Lag', value: lockedReading.kvarhLag },
              { key: 'kvarhLead', label: 'KVARH Lead', value: lockedReading.kvarhLead },
              { key: 'md', label: 'MD', value: lockedReading.md }
            ].map(field => (
              <div key={field.key} style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>{field.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono)' }}>{field.value.toFixed(2)}</div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            style={{ marginTop: 12, width: '100%', padding: '10px 14px', background: `${cfg.color}20`, border: `1px solid ${cfg.color}`, borderRadius: 8, color: cfg.color, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
            onMouseOver={e => {
              e.currentTarget.style.background = `${cfg.color}30`;
              e.currentTarget.style.boxShadow = `0 0 12px ${cfg.color}40`;
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = `${cfg.color}20`;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <MdHistory style={{ fontSize: 16 }} />
            {showHistory ? 'Hide' : 'Show'} Previous Readings
          </button>

          <button 
            onClick={() => handleShareToWhatsApp(lockedReading)}
            style={{ marginTop: 12, width: '100%', padding: '10px 14px', background: '#25D366', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#1eaa54';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(37, 211, 102, 0.4)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#25D366';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <MdShare style={{ fontSize: 16 }} />
            Share to WhatsApp
          </button>
        </div>
      )}

      {locked && showHistory && historicalReadings.length > 0 && (
        <div style={{ marginTop: 16, background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#ddd', display: 'flex', alignItems: 'center', gap: 8 }}>
            📅 Previous Readings - {section}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {[...new Set(historicalReadings.map(r => (r.readingDate || '').split('T')[0]))].sort().reverse().map((date, idx) => {
              const reading = historicalReadings.find(r => (r.readingDate || '').split('T')[0] === date);
              const isToday = date === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedHistoryDate(selectedHistoryDate === date ? null : date)}
                  style={{
                    background: selectedHistoryDate === date ? `${cfg.color}20` : '#0a0a0a',
                    border: `1px solid ${selectedHistoryDate === date ? cfg.color : '#1f1f1f'}`,
                    borderRadius: 8,
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = cfg.color;
                    e.currentTarget.style.background = `${cfg.color}15`;
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = selectedHistoryDate === date ? cfg.color : '#1f1f1f';
                    e.currentTarget.style.background = selectedHistoryDate === date ? `${cfg.color}20` : '#0a0a0a';
                  }}
                >
                  <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                    {isToday ? 'Today' : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>
                    {reading?.KWH?.toFixed(1) || '—'} kWh
                  </div>
                </div>
              );
            })}
          </div>
          {selectedHistoryDate && (
            <div style={{ marginTop: 12, background: '#0a0a0a', border: `1px solid ${cfg.color}40`, borderRadius: 8, padding: '12px' }}>
              <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-mono)', marginBottom: 8, textTransform: 'uppercase' }}>Reading for {selectedHistoryDate}</div>
              {(() => {
                const reading = historicalReadings.find(r => (r.readingDate || '').split('T')[0] === selectedHistoryDate);
                return reading ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div><span style={{ color: '#666', fontSize: 11 }}>KWH:</span> <span style={{ fontWeight: 700, color: cfg.color }}>{reading.KWH?.toFixed(2)}</span></div>
                      <div><span style={{ color: '#666', fontSize: 11 }}>KVAH:</span> <span style={{ fontWeight: 700, color: cfg.color }}>{reading.KVAH?.toFixed(2)}</span></div>
                      <div><span style={{ color: '#666', fontSize: 11 }}>KVARH Lag:</span> <span style={{ fontWeight: 700, color: cfg.color }}>{reading.KVARHlag?.toFixed(2)}</span></div>
                      <div><span style={{ color: '#666', fontSize: 11 }}>KVARH Lead:</span> <span style={{ fontWeight: 700, color: cfg.color }}>{reading.KVARHlead?.toFixed(2)}</span></div>
                      <div><span style={{ color: '#666', fontSize: 11 }}>MD:</span> <span style={{ fontWeight: 700, color: cfg.color }}>{reading.MD?.toFixed(2)}</span></div>
                      <div><span style={{ color: '#666', fontSize: 11 }}>Time:</span> <span style={{ fontWeight: 700, color: cfg.color, fontSize: 12 }}>{new Date(reading.createdAt || reading.readingDate).toLocaleTimeString()}</span></div>
                    </div>
                    <button 
                      onClick={() => handleShareToWhatsApp({
                        kwh: reading.KWH,
                        kvah: reading.KVAH,
                        kvarhLag: reading.KVARHlag,
                        kvarhLead: reading.KVARHlead,
                        md: reading.MD
                      })}
                      style={{ marginTop: 10, width: '100%', padding: '8px 12px', background: '#25D366', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = '#1eaa54';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(37, 211, 102, 0.4)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = '#25D366';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <MdShare style={{ fontSize: 14 }} />
                      Share to WhatsApp
                    </button>
                  </>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

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
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Detect window resize to toggle mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ minHeight: '100vh', background: '#030303', color: '#f0f0f0', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <TopHeader title="PEM Energy Manager" subtitle="Record Entry" onLogout={onLogout} isMobileDrawerOpen={false} />
      <div style={{ maxWidth: 900, margin: isMobile ? '0' : '0 auto', padding: isMobile ? (window.innerWidth <= 480 ? '12px' : '16px') : '24px 20px', flex: 1, width: '100%', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <LiveClock />

        {/* Date Navigation Calendar */}
        <div style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 16, padding: isMobile ? '14px 16px' : '18px 22px', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>📅 Select Date</div>
            {selectedDate && selectedDate !== today && (
              <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                Viewing: {new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>
          
          <input
            type="date"
            value={selectedDate || today}
            onChange={e => {
              const newDate = e.target.value;
              if (newDate === today) {
                setSelectedDate(null);
              } else if (newDate < today) {
                setSelectedDate(newDate);
              }
            }}
            max={today}
            style={{
              padding: '12px 16px',
              background: '#111',
              border: '1px solid #222',
              borderRadius: 8,
              color: '#f0f0f0',
              fontSize: 16,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              outline: 'none',
              width: isMobile ? '100%' : '300px',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = '#10B981';
              e.currentTarget.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.2)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = '#222';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
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
                  {/* Select shift once for all three meters */}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: isMobile ? 10 : 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>📍 Active Shift</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { value: '1', label: 'Shift 1', time: '6:00 AM - 2:00 PM', icon: MdWbSunny, color: '#F59E0B' },
                { value: '2', label: 'Shift 2', time: '2:00 PM - 10:00 PM', icon: MdWbTwilight, color: '#F97316' },
                { value: '3', label: 'Shift 3', time: '10:00 PM - 6:00 AM', icon: MdNightlight, color: '#6366F1' },
              ].map(shift => {
                const Icon = shift.icon;
                const isSelected = selectedShift === shift.value;
                return (
                  <button
                    key={shift.value}
                    onClick={() => setSelectedShift(shift.value)}
                    disabled={loading}
                    style={{
                      padding: '14px 12px',
                      background: isSelected ? `linear-gradient(135deg, ${shift.color}20, ${shift.color}10)` : '#111',
                      border: `2px solid ${isSelected ? shift.color : '#222'}`,
                      borderRadius: 12,
                      color: isSelected ? shift.color : '#94a3b8',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-display)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      opacity: loading ? 0.5 : 1,
                      boxShadow: isSelected ? `0 0 12px ${shift.color}40` : 'none',
                    }}
                    onMouseOver={e => {
                      if (!loading) {
                        e.currentTarget.style.borderColor = shift.color;
                        e.currentTarget.style.background = `linear-gradient(135deg, ${shift.color}25, ${shift.color}15)`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseOut={e => {
                      if (!loading) {
                        e.currentTarget.style.borderColor = isSelected ? shift.color : '#222';
                        e.currentTarget.style.background = isSelected ? `linear-gradient(135deg, ${shift.color}20, ${shift.color}10)` : '#111';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <Icon style={{ fontSize: 20 }} />
                    <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700 }}>{shift.label}</div>
                    <div style={{ fontSize: isMobile ? 9 : 10, opacity: 0.7 }}>{shift.time}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {['SAPL', 'SMRT', 'SMC-HT'].map(section => (
          <MeterSection key={`${section}-${refreshKey}`} section={section} user={user} selectedShift={selectedShift} onSaved={() => setRefreshKey(k => k + 1)} selectedDate={selectedDate} />
        ))}
      </div>
      </div>
   
  );
}
