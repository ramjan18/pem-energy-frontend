import React, { useState, useEffect, useCallback } from 'react';
import { readingAPI, meterAPI, authAPI } from '../api.js';
import { useTheme } from '../context/ThemeContext';
import Pagination from './Pagination';
import ManagerDrawer from './ManagerDrawer';
import { MdDescription, MdDeleteOutline, MdPeople, MdFileDownload, MdEdit, MdDelete, MdCalendarMonth, MdAccessTime, MdShowChart, MdTrendingUp, MdAssignment, MdClose, MdCheckCircle, MdError } from 'react-icons/md';
import { MdBolt } from "react-icons/md";
import {
  exportDateRange,
  exportMonthly,
  exportSingleDatePDF,
  exportDeletedMonthly,
  exportShiftSheets,
  exportMonthlyBill,
  exportMeterWise
} from '../exportUtils.js';
import { MdLightMode, MdNightlightRound, MdLogout } from 'react-icons/md';

// ─────────────────────────────────────────────
//  API LAYER
// ─────────────────────────────────────────────
const apiService = {
  // Load all readings
  loadReadings: async () => {
    try {
      const response = await readingAPI.getReadings();
      const apiReadings = response.data || [];

      // Transform API data to match frontend expectations
      return apiReadings.map(reading => ({
        _id: reading._id,
        id: reading._id, // for backward compatibility
        date: new Date(reading.readingDate).toISOString().split('T')[0],
        time: new Date(reading.createdAt || reading.readingDate).toLocaleTimeString(),
        section: reading.meter?.meterName || 'Unknown',
        shift: reading.shift || '3', // Use actual shift from API
        kwh: reading.KWH,
        kvah: reading.KVAH,
        kvarh_lag: reading.KVARHlag !== undefined ? reading.KVARHlag : reading.KVARH,
        kvarh_lead: reading.KVARHlead !== undefined ? reading.KVARHlead : 0,
        md: reading.MD,
        recorderName: reading.recordedBy?.username || 'Unknown',
        timestamp: new Date(reading.createdAt || reading.readingDate).getTime(),
        notes: reading.notes,
        meterId: reading.meter?._id,
        meterNumber: reading.meter?.meterNumber
      }));
    } catch (error) {
      console.error('Error loading readings:', error);
      return [];
    }
  },

  // Load all meters
  loadMeters: async () => {
    try {
      const response = await meterAPI.getAllMeters();
      console.log('Meters API response:', response);
      // Handle different response formats
      const meters = response.meters || response.data || response || [];
      console.log('Meters extracted:', meters);
      return Array.isArray(meters) ? meters : [];
    } catch (error) {
      console.error('Error loading meters:', error);
      return [];
    }
  },

  // Load all users
  loadUsers: async () => {
    try {
      const response = await authAPI.getAllUsers();
      return response.data || response.users || [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  },

  createUser: async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await authAPI.deleteUser(userId);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  toggleUserStatus: async (userId, isActive) => {
    try {
      const response = await authAPI.updateUser(userId, { isActive: !isActive });
      return response.data;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  },

  // Update reading
  updateReading: async (readingId, readingData) => {
    try {
      // Transform frontend data to API format
      const apiData = {
        KWH: readingData.kwh,
        KVAH: readingData.kvah,
        KVARHlag: readingData.kvarh_lag,
        KVARHlead: readingData.kvarh_lead,
        KVARH: readingData.kvarh_lag + readingData.kvarh_lead,
        MD: readingData.md,
        PF: readingData.pf || null,
        notes: readingData.notes || '',
        editedAt: readingData.editedAt,
        editReason: readingData.editReason
      };

      const response = await readingAPI.updateReading(readingId, apiData);
      return response.data;
    } catch (error) {
      console.error('Error updating reading:', error);
      throw error;
    }
  },

  // Delete reading
  deleteReading: async (readingId, reason) => {
    try {
      await readingAPI.deleteReading(readingId, reason);
      return true;
    } catch (error) {
      console.error('Error deleting reading:', error);
      throw error;
    }
  }
};

// ─────────────────────────────────────────────
//  EXPORT UTILITIES  (formerly exportUtils.js)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  UI PRIMITIVES
// ─────────────────────────────────────────────
const V = {
  fontDisplay: "'DM Sans', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

function TopHeader({ title, subtitle, onLogout, isMobileDrawerOpen }) {
  const isMobile = window.innerWidth <= 768;
  const { colors, theme, toggleTheme } = useTheme();
  
  const styles = {
    container: {
      background: colors.surface,
      borderBottom: `1px solid ${colors.border}`,
      padding: '0 28px', // Padding handled by height/flex
      paddingTop: 'env(safe-area-inset-top)', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: isMobileDrawerOpen ? 40 : 100,
      backdropFilter: 'blur(12px)',
      minHeight: '64px',
      height: 'auto',
    },
    leftSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 0',
    },
    textStack: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    rightSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px', // Gap between Theme Toggle and Logout
    },
    themeBtn: {
      background: colors.surface2 || '#1a1a1a',
      border: `1px solid ${colors.blue || '#2563EB'}`, // Reduced to 1px for cleaner look
      color: colors.blue || '#2563EB',
      padding: '0 14px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontFamily: V.fontDisplay,
      fontWeight: 600,
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      whiteSpace: 'nowrap',
      height: '38px', // Explicit height for alignment
    },
    logoutBtn: {
      padding: '0 16px',
      background: 'transparent',
      border: `1px solid ${colors.border}`,
      color: colors.textMuted,
      borderRadius: '8px',
      cursor: 'pointer',
      fontFamily: V.fontDisplay,
      fontSize: '13px',
      fontWeight: 600,
      transition: 'all 0.2s ease',
      height: '38px', // Matches theme button height
      display: 'flex',
      alignItems: 'center',
    }
  };

  return (
    <div style={styles.container}>
      {/* Left side: Brand/Title */}
      <div style={styles.leftSection}>
        <MdBolt style={{ fontSize: 22, color: colors.blue }} />
        <div style={styles.textStack}>
          <div style={{ 
            fontSize: 16, 
            fontWeight: 800, 
            color: colors.text, 
            fontFamily: V.fontDisplay, 
            letterSpacing: '-0.02em',
            lineHeight: 1.2 
          }}>
            {title}
          </div>
          <div style={{ 
            fontSize: 11, 
            color: colors.textMuted, 
            fontFamily: V.fontMono, 
            marginTop: 1,
            opacity: 0.8
          }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div style={styles.rightSection}>
        <button 
          onClick={toggleTheme} 
          style={styles.themeBtn}
          onMouseOver={e => { 
            e.currentTarget.style.background = colors.blue; 
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={e => { 
            e.currentTarget.style.background = colors.surface2 || '#1a1a1a'; 
            e.currentTarget.style.color = colors.blue;
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <MdNightlightRound style={{ fontSize: 18 }} /> : <MdLightMode style={{ fontSize: 18 }} />}
          {!isMobile && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {onLogout && (
          <button 
            onClick={onLogout} 
            style={styles.logoutBtn}
            onMouseOver={e => { 
              e.currentTarget.style.borderColor = colors.red; 
              e.currentTarget.style.color = colors.red; 
              e.currentTarget.style.background = `${colors.red}10`; // Subtle red tint
            }}
            onMouseOut={e => { 
              e.currentTarget.style.borderColor = colors.border; 
              e.currentTarget.style.color = colors.textMuted;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

function Alert({ message, type }) {
  const { colors } = useTheme();
  const colorMap = { error: colors.red, success: colors.green, info: colors.blue };
  const c = colorMap[type] || colorMap.info;
  return (
    <div style={{ background: `${c}11`, border: `1px solid ${c}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: c, fontSize: 13, fontFamily: V.fontDisplay }}>
      {message}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  const { colors } = useTheme();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: colors.text, fontFamily: V.fontDisplay }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, fontFamily: V.fontDisplay }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', style = {}, disabled = false }) {
  const { colors } = useTheme();
  const base = { padding: '11px 20px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: V.fontDisplay, transition: 'all 0.2s', border: 'none', opacity: disabled ? 0.5 : 1 };
  const variants = {
    primary: { background: colors.blue, color: '#fff' },
    secondary: { background: colors.surface2, color: colors.textMuted, border: `1px solid ${colors.border}` },
    danger: { background: colors.red, color: '#fff' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function FormField({ label, children }) {
  const { colors } = useTheme();
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '11px 14px', background: '#111', border: '1px solid #222', borderRadius: 8, color: '#f0f0f0', fontSize: 14, fontFamily: V.fontDisplay, outline: 'none', boxSizing: 'border-box' };

function Input({ type = 'text', value, onChange, placeholder, step }) {
  const { colors } = useTheme();
  const style = { width: '100%', padding: '11px 14px', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 14, fontFamily: V.fontDisplay, outline: 'none', boxSizing: 'border-box' };
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} style={style} />;
}

function PasswordInput({ placeholder, value, onChange }) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const style = { width: '100%', padding: '11px 14px', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 14, fontFamily: V.fontDisplay, outline: 'none', boxSizing: 'border-box', paddingRight: 44 };
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} style={style} />
      <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 14 }}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}

function Select({ value, onChange, children }) {
  const { colors } = useTheme();
  const style = { width: '100%', padding: '11px 14px', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 14, fontFamily: V.fontDisplay, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' };
  return <select value={value} onChange={onChange} style={style}>{children}</select>;
}

function SectionBadge({ section }) {
  const colors = { SAPL: '#2563EB', SMRT: '#10B981', 'SMC-HT': '#8B5CF6' };
  const c = colors[section] || '#888';
  return (
    <span style={{ background: `${c}18`, color: c, border: `1px solid ${c}30`, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 800, fontFamily: V.fontMono, letterSpacing: '0.05em' }}>
      {section}
    </span>
  );
}

const tdStyle = { padding: '11px 13px', fontSize: 13, color: '#bbb', fontFamily: V.fontMono, borderBottom: '1px solid #0f0f0f', whiteSpace: 'nowrap' };

function DataTable({ headers, children, emptyMessage }) {
  const { colors } = useTheme();
  const themeAwareTdStyle = { padding: '11px 13px', fontSize: 13, color: colors.textMuted, fontFamily: V.fontMono, borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' };

  // Clone children and inject theme-aware tdStyle
  const childrenWithTheme = React.Children.map(children, (child) => {
    if (child && child.type === 'tr') {
      return React.cloneElement(child, {},
        React.Children.map(child.props.children, (tdChild) => {
          if (tdChild && tdChild.type === 'td' && !tdChild.props.style?.color) {
            return React.cloneElement(tdChild, {
              style: { ...themeAwareTdStyle, ...tdChild.props.style }
            });
          }
          return tdChild;
        })
      );
    }
    return child;
  });

  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ background: colors.surface2 }}>
              {headers.map(h => (
                <th key={h} style={{ padding: '12px 13px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `2px solid ${colors.border}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {React.Children.count(childrenWithTheme) === 0
              ? <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 48, color: colors.textDim, fontSize: 14 }}>{emptyMessage}</td></tr>
              : childrenWithTheme}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const METERS = [
  { key: 'SAPL', label: 'SAPL', multiplier: 70, mdMultiplier: 70, color: '#2563EB', accent: '#3B82F6', glow: 'rgba(37,99,235,0.15)' },
  { key: 'SMRT', label: 'SMRT', multiplier: 80, mdMultiplier: 80, color: '#10B981', accent: '#34D399', glow: 'rgba(16,185,129,0.15)' },
  { key: 'SMC-HT', label: 'SMC HT', multiplier: 4, mdMultiplier: 80, color: '#8B5CF6', accent: '#A78BFA', glow: 'rgba(139,92,246,0.15)' },
];
const M_ORDER = ['SAPL', 'SMRT', 'SMC-HT'];
const getMeter = (sec) => METERS.find(m => m.key === sec);
const getMultiplier = (sec) => getMeter(sec)?.multiplier || 1;
const getMdMultiplier = (sec) => getMeter(sec)?.mdMultiplier || 1;
const getColor = (sec) => getMeter(sec)?.color || '#ccc';
const formatDate = (d) => { const [y, m, day] = d.split('-'); return `${day}-${m}-${y}`; };

// ─────────────────────────────────────────────
//  DASHBOARD TAB
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  RECORDS TAB
// ─────────────────────────────────────────────
function RecordsTab({ records, onRecordsChange, isMobile }) {
  const { colors } = useTheme();
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [editVals, setEditVals] = useState({});
  const [deleteReason, setDeleteReason] = useState('');
  const [alert, setAlert] = useState(null);
  const [meterFilter, setMeterFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const showAlert = (msg, type) => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 5000); };
  const openEdit = (r) => { setEditModal(r); setEditReason(''); setEditVals({ kwh: r.kwh, kvah: r.kvah, kvarh_lag: r.kvarh_lag, kvarh_lead: r.kvarh_lead, md: r.md }); };
  const openDelete = (r) => { setDeleteModal(r); setDeleteReason(''); };

  const handleEdit = async () => {
    // Validate edit reason
    if (editReason.length < 15) {
      return showAlert('Reason must be at least 15 characters.', 'error');
    }

    // Validate numeric fields
    const kwh = parseFloat(editVals.kwh);
    const kvah = parseFloat(editVals.kvah);
    const kvarh_lag = parseFloat(editVals.kvarh_lag);
    const kvarh_lead = parseFloat(editVals.kvarh_lead);
    const md = parseFloat(editVals.md);

    if (isNaN(kwh) || kwh < 0) {
      return showAlert('KWH must be a valid positive number.', 'error');
    }
    if (isNaN(kvah) || kvah < 0) {
      return showAlert('KVAH must be a valid positive number.', 'error');
    }
    if (isNaN(kvarh_lag)) {
      return showAlert('KVARH Lag must be a valid number.', 'error');
    }
    if (isNaN(kvarh_lead)) {
      return showAlert('KVARH Lead must be a valid number.', 'error');
    }
    if (isNaN(md) || md < 0) {
      return showAlert('MD must be a valid positive number.', 'error');
    }

    try {
      const updatedData = {
        kwh: kwh,
        kvah: kvah,
        kvarh_lag: kvarh_lag,
        kvarh_lead: kvarh_lead,
        md: md,
        pf: editModal.pf || null,
        notes: editModal.notes || '',
        editReason: editReason,
        editedAt: new Date().toISOString()
      };

      await apiService.updateReading(editModal._id, updatedData);
      setEditModal(null);
      onRecordsChange();
      showAlert('Record updated successfully.', 'success');
    } catch (error) {
      showAlert('Failed to update record: ' + error.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (deleteReason.length < 15) return showAlert('Reason must be at least 15 characters.', 'error');

    try {
      await apiService.deleteReading(deleteModal._id, deleteReason);
      setDeleteModal(null);
      onRecordsChange();
      showAlert('Record deleted successfully.', 'success');
    } catch (error) {
      showAlert('Failed to delete record: ' + error.message, 'error');
    }
  };

  function calcRow(r) {
    const allSec = records.filter(x => x.section === r.section && x.shift === r.shift);
    const prevDate = new Date(new Date(r.date).getTime() - 86400000).toISOString().split('T')[0];
    const prevRecs = allSec.filter(p => p.date === prevDate).sort((a, b) => b.timestamp - a.timestamp);
    const prevReading = prevRecs.length > 0 ? prevRecs[0].kwh : null;
    const dc = prevReading !== null ? ((r.kwh - prevReading) * getMultiplier(r.section)).toFixed(2) : '—';
    const recMonth = r.date.slice(0, 7);
    const monthRecs = allSec.filter(m => m.date?.startsWith(recMonth));
    const maxMD = monthRecs.length > 0 ? Math.max(...monthRecs.map(m => m.md)) : null;
    const actualMD = maxMD !== null ? Math.round(maxMD * getMdMultiplier(r.section)) : '—';
    const lag = r.kvarh_lag || 0, lead = r.kvarh_lead || 0;
    const denom = Math.sqrt(r.kwh * r.kwh + (lag + lead) * (lag + lead));
    const pf = denom > 0 ? (r.kwh / denom).toFixed(4) : '—';
    return { dc, actualMD, pf };
  }

  let filtered = [...records];
  if (meterFilter !== 'all') filtered = filtered.filter(r => r.section === meterFilter);
  if (shiftFilter !== 'all') filtered = filtered.filter(r => r.shift === shiftFilter);
  const allDates = [...new Set(filtered.map(r => r.date))].sort((a, b) => new Date(b) - new Date(a));

  // Pagination
  const totalPages = Math.ceil(allDates.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDates = allDates.slice(startIndex, endIndex);

  const filterBtnStyle = (active, activeColor) => ({
    padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 12,
    fontFamily: V.fontDisplay, background: active ? activeColor : 'transparent',
    color: active ? '#fff' : '#555', border: `1px solid ${active ? activeColor : '#222'}`, transition: 'all 0.2s', letterSpacing: '0.03em',
  });

  const tdS = { padding: '12px 14px', fontSize: 13, color: colors.textMuted, fontFamily: V.fontMono, borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap', transition: 'background 0.15s' };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 4, height: 28, background: 'linear-gradient(180deg,#2563EB,#8B5CF6)', borderRadius: 4 }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Records</h2>
        <span style={{ background: 'rgba(37,99,235,0.12)', color: '#2563EB', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: V.fontMono }}>
          {filtered.length} entries
        </span>
      </div>

      <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <p style={{ fontSize: 13, color: '#6B9EFF' }}>Click <strong>Edit</strong> or <strong>Delete</strong> to modify records. A 15-character reason is required for audit purposes.</p>
      </div>

      {alert && <Alert message={alert.msg} type={alert.type} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: isMobile ? 12 : 20, marginBottom: 20, flexWrap: 'wrap', alignItems: isMobile ? 'flex-start' : 'center', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 12, padding: isMobile ? '12px 12px' : '14px 18px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <span style={{ fontSize: 11, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4, minWidth: '50px' }}>Meter</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'SAPL', 'SMRT', 'SMC-HT'].map(m => (
              <button key={m} onClick={() => setMeterFilter(m)} style={filterBtnStyle(meterFilter === m, '#2563EB')}>{m === 'all' ? 'All' : m}</button>
            ))}
          </div>
        </div>
        {!isMobile && <div style={{ width: 1, height: 28, background: colors.border }} />}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <span style={{ fontSize: 11, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4, minWidth: '50px' }}>Shift</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', '1', '2', '3'].map(s => (
              <button key={s} onClick={() => setShiftFilter(s)} style={filterBtnStyle(shiftFilter === s, '#F59E0B')}>{s === 'all' ? 'All' : `S${s}`}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: `0 4px 24px ${colors.bg === '#ffffff' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)'}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr style={{ background: colors.surface2 }}>
                {['Time', 'KWH', 'KVAH', 'KVARH Lag', 'KVARH Lead', 'MD', 'Daily Consumption', 'Actual MD', 'PF', 'Recorder', 'Actions'].map((h, i) => {
                  const isComputed = i >= 6 && i <= 8;
                  return (
                    <th key={h} style={{ padding: '13px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: isComputed ? colors.blue : colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `2px solid ${isComputed ? `${colors.blue}30` : colors.border}`, whiteSpace: 'nowrap', background: isComputed ? `${colors.blue}08` : 'transparent' }}>
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allDates.length === 0
                ? <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: colors.textDim, fontSize: 14 }}>No records found.</td></tr>
                : paginatedDates.map(date => {
                  const dateRows = filtered.filter(r => r.date === date).sort((a, b) => {
                    const md = M_ORDER.indexOf(a.section) - M_ORDER.indexOf(b.section);
                    return md !== 0 ? md : a.shift - b.shift;
                  });
                  const isToday = date === today;
                  const isYesterday = date === yesterdayDate;
                  const sectionGroups = M_ORDER.map(sec => ({ sec, rows: dateRows.filter(r => r.section === sec) })).filter(g => g.rows.length > 0);

                  return (
                    <React.Fragment key={`date-${date}`}>
                      <tr>
                        <td colSpan={11} style={{ padding: '9px 16px', background: `linear-gradient(90deg,${colors.surface2},${colors.surface})`, borderBottom: `1px solid ${colors.border}`, borderTop: `2px solid ${colors.border}`, fontSize: 12, fontWeight: 700, color: colors.textMuted, fontFamily: V.fontDisplay, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ opacity: 0.5 }}>📆</span>
                            <span>{formatDate(date)}</span>
                            {isToday && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>TODAY</span>}
                            {isYesterday && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>YESTERDAY</span>}
                            {[...new Set(dateRows.map(r => r.shift))].sort().map(sh => (
                              <span key={sh} style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 8, letterSpacing: '0.04em', border: '1px solid rgba(245,158,11,0.25)' }}>S{sh}</span>
                            ))}
                            <span style={{ color: colors.textDim, fontSize: 11, fontWeight: 400, marginLeft: 4 }}>{dateRows.length} record{dateRows.length !== 1 ? 's' : ''}</span>
                          </span>
                        </td>
                      </tr>

                      {sectionGroups.map(({ sec, rows }) => (
                        <React.Fragment key={`${date}-${sec}`}>
                          <tr>
                            <td colSpan={11} style={{ padding: '6px 20px', background: `${colors.blue}08`, borderBottom: `1px solid ${colors.border}`, borderTop: `1px solid ${colors.border}` }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: getColor(sec), boxShadow: `0 0 6px ${getColor(sec)}`, display: 'inline-block' }} />
                                <SectionBadge section={sec} />
                                <span style={{ fontSize: 10, color: colors.textDim, fontFamily: V.fontMono }}>×{getMultiplier(sec)} consumption · ×{getMdMultiplier(sec)} MD — {rows.length} shift{rows.length !== 1 ? 's' : ''}</span>
                              </span>
                            </td>
                          </tr>
                          {rows.map(r => {
                            const { dc, actualMD, pf } = calcRow(r);
                            const color = getColor(r.section);
                            const isHovered = hoveredRow === r.id;
                            return (
                              <tr key={r.id} onMouseEnter={() => setHoveredRow(r.id)} onMouseLeave={() => setHoveredRow(null)} style={{ background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.15s' }}>
                                <td style={{ ...tdS, color: colors.textDim, fontSize: 11 }}>{r.time}</td>
                                <td style={{ ...tdS, color: colors.text }}>{r.kwh}</td>
                                <td style={{ ...tdS, color: colors.textMuted }}>{r.kvah}</td>
                                <td style={{ ...tdS, color: colors.textMuted }}>{r.kvarh_lag}</td>
                                <td style={{ ...tdS, color: colors.textMuted }}>{r.kvarh_lead}</td>
                                <td style={{ ...tdS, color: colors.textMuted }}>{r.md}</td>
                                <td style={{ ...tdS, color, fontWeight: 700, background: isHovered ? `${colors.blue}15` : `${colors.blue}08` }}>{dc}</td>
                                <td style={{ ...tdS, color: colors.blue, background: isHovered ? `${colors.blue}15` : `${colors.blue}08` }}>{actualMD}</td>
                                <td style={{ ...tdS, color: colors.amber, background: isHovered ? `${colors.blue}15` : `${colors.blue}08` }}>{pf}</td>
                                <td style={{ ...tdS, color: colors.textMuted }}>{r.recorderName}</td>
                                <td style={tdS}>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => openEdit(r)} style={{ padding: '6px 12px', border: '1px solid rgba(37,99,235,0.4)', color: '#2563EB', background: 'rgba(37,99,235,0.06)', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: V.fontDisplay, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }}><MdEdit style={{ fontSize: 14 }} /> Edit</button>
                                    <button onClick={() => openDelete(r)} style={{ padding: '6px 12px', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', background: 'rgba(239,68,68,0.06)', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: V.fontDisplay, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }}><MdDelete style={{ fontSize: 14 }} /> Delete</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={allDates.length}
      />

      <div style={{ marginTop: 14, fontSize: 11, color: colors.textDim, fontFamily: V.fontMono, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#2563EB', opacity: 0.6 }}>■</span>
        <span>Computed columns (Daily Consumption → PF)</span><span style={{ margin: '0 8px', color: colors.border }}>|</span>
        <span>Daily = (Today − Yesterday) × multiplier</span><span style={{ margin: '0 8px', color: colors.border }}>|</span>
        <span>MD = Max of current month × MD multiplier</span><span style={{ margin: '0 8px', color: colors.border }}>|</span>
        <span>SMC-HT: Consumption ×4 · MD ×80</span><span style={{ margin: '0 8px', color: colors.border }}>|</span>
        <span>PF = KWH / √(KWH² + (Lag+Lead)²)</span>
      </div>

      {editModal && (
        <Modal title="✏️ Edit Record" subtitle="Update record values and provide a reason for modification." onClose={() => setEditModal(null)}>
          <FormField label={`Reason for Edit (${editReason.length}/15 min)`}>
            <textarea value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Provide detailed reason for editing this record..." style={{ width: '100%', padding: '13px 15px', background: '#111', border: `1px solid ${editReason.length >= 15 ? '#10B981' : '#222'}`, borderRadius: 8, color: '#f0f0f0', fontSize: 14, fontFamily: V.fontDisplay, resize: 'vertical', minHeight: 90, outline: 'none', boxSizing: 'border-box' }} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            {Object.entries(editVals).map(([key, val]) => (
              <FormField key={key} label={key.replace('_', ' ').toUpperCase()}>
                <Input type="number" step="0.01" value={val} onChange={e => setEditVals(v => ({ ...v, [key]: e.target.value }))} />
              </FormField>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" onClick={() => setEditModal(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleEdit} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><MdCheckCircle /> Save Changes</Btn>
          </div>
        </Modal>
      )}

      {deleteModal && (
        <Modal title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MdDelete style={{ fontSize: 20 }} /> Delete Record</span>} subtitle="⚠️ This action cannot be undone." onClose={() => setDeleteModal(null)}>
          <FormField label={`Reason for Deletion (${deleteReason.length}/15 min)`}>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Provide detailed reason for deleting this record..." style={{ width: '100%', padding: '13px 15px', background: '#111', border: `1px solid ${deleteReason.length >= 15 ? '#10B981' : '#222'}`, borderRadius: 8, color: '#f0f0f0', fontSize: 14, fontFamily: V.fontDisplay, resize: 'vertical', minHeight: 90, outline: 'none', boxSizing: 'border-box' }} />
          </FormField>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" onClick={() => setDeleteModal(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="danger" onClick={handleDelete} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><MdDelete /> Confirm Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  PENDING TAB
// ─────────────────────────────────────────────
function PendingTab({ records, meters, onRecordsChange }) {
  const { colors } = useTheme();
  const [pendingReadings, setPendingReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [fillModal, setFillModal] = useState(null);
  const [fillValues, setFillValues] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const GROUPS_PER_PAGE = 5;

  const showAlert = (msg, type) => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 5000); };

  // Calculate pending readings on mount and when records/meters change
  useEffect(() => {
    calculatePendingReadings();
  }, [records, meters]);

  const calculatePendingReadings = () => {
    setLoading(true);
    try {
      const DAYS_TO_CHECK = 30;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day
      const pending = [];

      // Generate array of all dates in the range
      const dates = [];
      for (let i = DAYS_TO_CHECK; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dates.push(dateStr);
      }

      // Generate all expected reading slots (meter × shift × date)
      for (const dateStr of dates) {
        for (const meter of meters) {
          for (const shift of ['1', '2', '3']) {
            // Check if a reading exists for this meter-shift-date combo
            const exists = records.some(r => {
              const matches = r.section === meter.meterName && r.shift === String(shift) && r.date === dateStr;
              return matches;
            });

            if (!exists) {
              pending.push({
                id: `${meter._id}-${shift}-${dateStr}`,
                meter: meter,
                shift,
                date: dateStr,
                meterName: meter.meterName,
                meterNumber: meter.meterNumber
              });
            }
          }
        }
      }

      // Sort by date (descending) then by shift then by meter
      pending.sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        const shiftCompare = parseInt(a.shift) - parseInt(b.shift);
        if (shiftCompare !== 0) return shiftCompare;
        return a.meterName.localeCompare(b.meterName);
      });

      setPendingReadings(pending);
    } catch (error) {
      console.error('Error calculating pending readings:', error);
      showAlert('Failed to calculate pending readings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openFillModal = (pending) => {
    setFillModal(pending);
    setFillValues({
      kwh: '',
      kvah: '',
      kvarh_lag: '',
      kvarh_lead: '',
      md: '',
      notes: ''
    });
  };

  const handleFillReading = async () => {
    if (!fillModal) return;

    // Validate numeric fields
    const kwh = parseFloat(fillValues.kwh);
    const kvah = parseFloat(fillValues.kvah);
    const kvarh_lag = parseFloat(fillValues.kvarh_lag);
    const kvarh_lead = parseFloat(fillValues.kvarh_lead);
    const md = parseFloat(fillValues.md);

    if (isNaN(kwh) || kwh < 0) return showAlert('KWH must be a valid positive number.', 'error');
    if (isNaN(kvah) || kvah < 0) return showAlert('KVAH must be a valid positive number.', 'error');
    if (isNaN(kvarh_lag) || kvarh_lag < 0) return showAlert('KVARH Lag must be a valid positive number.', 'error');
    if (isNaN(kvarh_lead) || kvarh_lead < 0) return showAlert('KVARH Lead must be a valid positive number.', 'error');
    if (isNaN(md) || md < 0) return showAlert('MD must be a valid positive number.', 'error');

    try {
      const readingData = {
        meterId: fillModal.meter._id,
        readingDate: fillModal.date,
        shift: fillModal.shift,
        KWH: kwh,
        KVAH: kvah,
        KVARHlag: kvarh_lag,
        KVARHlead: kvarh_lead,
        MD: md,
        notes: fillValues.notes || ''
      };

      await readingAPI.recordReading(readingData);
      setFillModal(null);
      onRecordsChange();
      showAlert(`Reading filled for ${fillModal.meterName} - Shift ${fillModal.shift} on ${formatDate(fillModal.date)}`, 'success');
    } catch (error) {
      showAlert('Failed to create reading: ' + error.message, 'error');
    }
  };

  // Group pending readings by date and shift
  const groupedPending = React.useMemo(() => {
    const groups = {};
    pendingReadings.forEach(p => {
      const key = `${p.date}-${p.shift}`;
      if (!groups[key]) {
        groups[key] = {
          date: p.date,
          shift: p.shift,
          items: []
        };
      }
      groups[key].items.push(p);
    });

    // Convert to array and sort by date desc, then shift asc
    return Object.values(groups).sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      return parseInt(a.shift) - parseInt(b.shift);
    });
  }, [pendingReadings]);

  // Pagination for grouped pending readings
  const totalGroups = groupedPending.length;
  const totalPages = Math.ceil(totalGroups / GROUPS_PER_PAGE);
  const startIndex = (currentPage - 1) * GROUPS_PER_PAGE;
  const paginatedGroups = groupedPending.slice(startIndex, startIndex + GROUPS_PER_PAGE);

  if (loading && pendingReadings.length === 0) {
    return <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted, fontSize: 14 }}>Analyzing records...</div>;
  }

  if (pendingReadings.length === 0) {
    return (
      <div>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, color: colors.green, fontSize: 15 }}>All Readings Complete</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>No pending readings for the last 30 days</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 4, height: 28, background: 'linear-gradient(180deg,#F59E0B,#EF4444)', borderRadius: 4 }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Pending Readings</h2>
        <span style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: V.fontMono }}>
          {pendingReadings.length} missing
        </span>
      </div>

      <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <p style={{ fontSize: 13, color: '#F59E0B' }}>Missing readings from the last 30 days. Click <strong>Fill</strong> to add a reading for the selected meter and shift.</p>
      </div>

      {alert && <Alert message={alert.msg} type={alert.type} />}

      {/* Grid layout grouped by date and shift */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {paginatedGroups.map(group => {
          const today = new Date().toISOString().split('T')[0];
          const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const isToday = group.date === today;
          const isYesterday = group.date === yesterdayDate;

          return (
            <div key={`${group.date}-${group.shift}`} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
              {/* Date & Shift Header */}
              <div style={{ padding: '10px 16px', background: `linear-gradient(90deg,${colors.surface2},${colors.surface})`, borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ opacity: 0.5, fontSize: 14 }}>📆</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, fontFamily: V.fontDisplay, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatDate(group.date)}</span>
                  {isToday && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>TODAY</span>}
                  {isYesterday && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>YESTERDAY</span>}
                  <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 8, letterSpacing: '0.04em', border: '1px solid rgba(245,158,11,0.25)' }}>Shift {group.shift}</span>
                  <span style={{ color: colors.textDim, fontSize: 11, fontWeight: 400, marginLeft: 4 }}>{group.items.length} pending</span>
                </span>
              </div>

              {/* Grid of 3 cards per row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, padding: 16 }}>
                {group.items.map(p => {
                  const color = getColor(p.meterName);
                  const isHovered = hoveredCard === p.id;

                  return (
                    <div
                      key={p.id}
                      onMouseEnter={() => setHoveredCard(p.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: isHovered ? `${color}08` : colors.surface2,
                        border: `1px solid ${isHovered ? color + '40' : colors.border}`,
                        borderRadius: 10,
                        padding: 16,
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      {/* Meter indicator dot */}
                      <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />

                      {/* Meter name */}
                      <div style={{ marginBottom: 16 }}>
                        <SectionBadge section={p.meterName} />
                      </div>

                      {/* Fill button */}
                      <button
                        onClick={() => openFillModal(p)}
                        style={{
                          width: '100%',
                          padding: '8px 16px',
                          background: `${color}15`,
                          color: color,
                          border: `1px solid ${color}40`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: V.fontDisplay,
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = color;
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = `${color}15`;
                          e.currentTarget.style.color = color;
                        }}
                      >
                        📝 Fill Reading
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={GROUPS_PER_PAGE}
          totalItems={totalGroups}
        />
      )}

      {fillModal && (
        <Modal title="📝 Fill Pending Reading" subtitle={`${fillModal.meterName} • Shift ${fillModal.shift} • ${formatDate(fillModal.date)}`} onClose={() => setFillModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <FormField label="KWH">
              <Input type="number" step="0.01" value={fillValues.kwh} onChange={e => setFillValues(v => ({ ...v, kwh: e.target.value }))} placeholder="0.00" />
            </FormField>
            <FormField label="KVAH">
              <Input type="number" step="0.01" value={fillValues.kvah} onChange={e => setFillValues(v => ({ ...v, kvah: e.target.value }))} placeholder="0.00" />
            </FormField>
            <FormField label="KVARH Lag">
              <Input type="number" step="0.01" value={fillValues.kvarh_lag} onChange={e => setFillValues(v => ({ ...v, kvarh_lag: e.target.value }))} placeholder="0.00" />
            </FormField>
            <FormField label="KVARH Lead">
              <Input type="number" step="0.01" value={fillValues.kvarh_lead} onChange={e => setFillValues(v => ({ ...v, kvarh_lead: e.target.value }))} placeholder="0.00" />
            </FormField>
            <FormField label="MD">
              <Input type="number" step="0.01" value={fillValues.md} onChange={e => setFillValues(v => ({ ...v, md: e.target.value }))} placeholder="0.00" />
            </FormField>
            <FormField label="Notes (Optional)">
              <Input type="text" value={fillValues.notes} onChange={e => setFillValues(v => ({ ...v, notes: e.target.value }))} placeholder="Add notes..." />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setFillModal(null)} variant="secondary">Cancel</Btn>
            <Btn onClick={handleFillReading} variant="primary">Fill Reading</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  DELETED TAB
// ─────────────────────────────────────────────
function DeletedTab() {
  const { colors } = useTheme();
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => {
    loadDeletedRecords();
  }, []);

  const loadDeletedRecords = async () => {
    try {
      setLoading(true);
      const response = await readingAPI.getDeletedReadings();
      setDeletedRecords(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load deleted records: ' + err.message);
      setDeletedRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (recordId) => {
    try {
      await readingAPI.restoreReading(recordId);
      setDeletedRecords(deletedRecords.filter(r => r._id !== recordId));
    } catch (err) {
      setError('Failed to restore record: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted, fontSize: 14 }}>Loading deleted records...</div>;
  }

  if (error) {
    return (
      <div style={{ background: `${colors.red}11`, border: `1px solid ${colors.red}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: colors.red, fontSize: 13, fontFamily: V.fontDisplay }}>
        {error}
      </div>
    );
  }

  if (deletedRecords.length === 0) {
    return (
      <div>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, color: colors.green, fontSize: 15 }}>No Deleted Records</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>All records are intact and accessible</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DataTable
        headers={['Date', 'Section', 'Shift', 'KWH', 'Deleted By', 'Reason', 'Action']}
        emptyMessage="No deleted records found"
      >
        {deletedRecords.map(r => (
          <tr
            key={r._id}
            style={{
              background: hoveredRow === r._id ? colors.surface2 : 'transparent',
              transition: 'background 0.2s',
            }}
            onMouseEnter={() => setHoveredRow(r._id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <td style={tdStyle}>{r.readingDate ? r.readingDate.split('T')[0] : '—'}</td>
            <td style={tdStyle}><SectionBadge section={r.meter?.meterName || '—'} /></td>
            <td style={tdStyle}>{`Shift ${r.shift}`}</td>
            <td style={tdStyle}>{r.KWH.toFixed(2)}</td>
            <td style={tdStyle}>{r.deletedBy?.username || '—'}</td>
            <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.deletionReason}>{r.deletionReason || '—'}</td>
            <td style={tdStyle}>
              <button
                onClick={() => handleRestore(r._id)}
                style={{
                  padding: '6px 12px',
                  background: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  fontFamily: V.fontDisplay,
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#059669'}
                onMouseOut={e => e.currentTarget.style.background = '#10B981'}
              >
                Restore
              </button>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

// ─────────────────────────────────────────────
//  LIVE DASHBOARD TAB
// ─────────────────────────────────────────────
function LiveDashboardTab({ records }) {
  const { colors } = useTheme();
  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const [hoveredRow, setHoveredRow] = useState(null);

  const shift3 = records.filter(r => r.shift === '3');
  const allDates = [...new Set(shift3.map(r => r.date))].sort((a, b) => new Date(b) - new Date(a));

  function getStatsForMeterOnDate(sectionKey, multiplier, mdMultiplier, date) {
    const secRecs = shift3.filter(r => r.section === sectionKey);
    const dayRecs = secRecs.filter(r => r.date === date).sort((a, b) => b.timestamp - a.timestamp);
    const prevDate = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];
    const prevRecs = secRecs.filter(r => r.date === prevDate).sort((a, b) => b.timestamp - a.timestamp);
    const todayReading = dayRecs.length > 0 ? dayRecs[0].kwh : null;
    const yestReading = prevRecs.length > 0 ? prevRecs[0].kwh : null;
    const dc = (todayReading !== null && yestReading !== null) ? ((todayReading - yestReading) * multiplier).toFixed(2) : '—';
    const recMonth = date.slice(0, 7);
    const monthRecs = secRecs.filter(r => r.date?.startsWith(recMonth));
    const maxMD = monthRecs.length > 0 ? Math.max(...monthRecs.map(r => r.md)) : null;
    const actualMD = maxMD !== null ? Math.round(maxMD * mdMultiplier) : '—';
    let pf = '—';
    if (dayRecs.length > 0) {
      const { kwh, kvarh_lag, kvarh_lead } = dayRecs[0];
      const lag = kvarh_lag || 0, lead = kvarh_lead || 0;
      const denom = Math.sqrt(kwh * kwh + (lag + lead) * (lag + lead));
      pf = denom > 0 ? (kwh / denom).toFixed(4) : '—';
    }
    return {
      todayReading: todayReading !== null ? todayReading.toFixed(2) : '—',
      yestReading: yestReading !== null ? yestReading.toFixed(2) : '—',
      dc, actualMD, pf,
      time: dayRecs.length > 0 ? dayRecs[0].time : '—',
      recorder: dayRecs.length > 0 ? dayRecs[0].recorderName : '—',
      hasData: dayRecs.length > 0,
    };
  }

  const tdS = { padding: '12px 14px', fontSize: 13, color: colors.textMuted, fontFamily: V.fontMono, borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 4, height: 28, background: 'linear-gradient(180deg,#10B981,#2563EB)', borderRadius: 4 }} />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Live Dashboard</h2>
            <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: V.fontMono, marginTop: 2 }}>SHIFT 3 · {formatDate(today)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => exportShiftSheets(records)} style={{ background: `${colors.green}15`, border: `1px solid ${colors.green}30`, color: colors.green, padding: '9px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: V.fontDisplay }}>⬇️ Export Shift Sheets</button>
          <button onClick={() => exportMeterWise(records)} style={{ background: `${colors.purple}15`, border: `1px solid ${colors.purple}30`, color: colors.purple, padding: '9px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: V.fontDisplay }}>⬇️ Export Meter Sheets</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 28 }}>
        {METERS.map(({ key, label, multiplier, mdMultiplier, color, accent, glow }) => {
          const { todayReading, yestReading, dc, actualMD, pf, hasData } = getStatsForMeterOnDate(key, multiplier, mdMultiplier, today);
          return (
            <div key={key} style={{ background: colors.surface2, border: `1px solid ${hasData ? color + '33' : colors.border}`, borderRadius: 16, padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', boxShadow: hasData ? `0 0 30px ${glow}` : 'none' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${accent})` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}1a`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, fontFamily: V.fontDisplay, letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: 10, color: colors.textMuted, fontFamily: V.fontMono, marginTop: 1 }}>CONSUMPTION ×{multiplier} · MD ×{mdMultiplier}</div>
                </div>
                <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: hasData ? color : colors.border, boxShadow: hasData ? `0 0 8px ${color}` : 'none' }} />
              </div>
              {[
                { icon: MdCalendarMonth, label: 'Today Reading', value: todayReading, unit: 'kWh', color: '#94A3B8' },
                { icon: MdAccessTime, label: 'Yesterday Reading', value: yestReading, unit: 'kWh', color: '#64748B' },
                { icon: MdBolt, label: 'Daily Consumption', value: dc, unit: 'kWh', color, bold: true },
                { icon: MdTrendingUp, label: 'Actual MD', value: actualMD, unit: 'kW', color: accent },
                { icon: MdShowChart, label: 'Power Factor', value: pf, unit: 'PF', color: '#F59E0B' },
              ].map((row, i) => {
                const IconComp = row.icon;
                return (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? `1px solid ${colors.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconComp style={{ fontSize: 16, color: row.color }} />
                      <span style={{ fontSize: 11, color: colors.textMuted, fontFamily: V.fontDisplay, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: row.bold ? 16 : 14, fontWeight: row.bold ? 800 : 600, color: row.value !== '—' ? row.color : '#2a2a2a', fontFamily: V.fontMono }}>{row.value}</span>
                      {row.value !== '—' && <span style={{ fontSize: 10, color: '#333', fontFamily: V.fontMono }}>{row.unit}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Historical table */}
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Historical Records</span>
          <span style={{ background: `${colors.blue}15`, color: colors.blue, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, fontFamily: V.fontMono }}>SHIFT 3 ONLY</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: colors.surface2 }}>
                {['Time', 'Section', 'Today Reading', 'Yesterday Reading', 'Daily Consumption', 'Actual MD', 'PF', 'Recorder'].map((h, i) => {
                  const isComputed = i >= 2 && i <= 6;
                  return <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: isComputed ? colors.blue : colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `2px solid ${isComputed ? `${colors.blue}30` : colors.border}`, whiteSpace: 'nowrap', background: isComputed ? `${colors.blue}08` : 'transparent' }}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {allDates.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: colors.textDim, fontSize: 14 }}>No Shift 3 records found.</td></tr>
                : allDates.map(date => {
                  const isToday = date === today;
                  const isYesterday = date === yesterdayDate;
                  return (
                    <React.Fragment key={`live-${date}`}>
                      <tr>
                        <td colSpan={8} style={{ padding: '9px 16px', background: `linear-gradient(90deg,${colors.surface2},${colors.surface})`, borderBottom: `1px solid ${colors.border}`, borderTop: `2px solid ${colors.border}` }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ opacity: 0.5, fontSize: 12 }}>📆</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, fontFamily: V.fontDisplay, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatDate(date)}</span>
                            {isToday && <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>TODAY</span>}
                            {isYesterday && <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>YESTERDAY</span>}
                            <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 8, letterSpacing: '0.04em', border: '1px solid rgba(245,158,11,0.25)' }}>S3</span>
                          </span>
                        </td>
                      </tr>
                      {METERS.map(({ key, multiplier, mdMultiplier, color, glow }) => {
                        const { todayReading, yestReading, dc, actualMD, pf, time, recorder, hasData } = getStatsForMeterOnDate(key, multiplier, mdMultiplier, date);
                        const rowId = `${date}-${key}`;
                        const isHovered = hoveredRow === rowId;
                        return (
                          <tr key={rowId} onMouseEnter={() => setHoveredRow(rowId)} onMouseLeave={() => setHoveredRow(null)} style={{ background: isHovered ? glow : 'transparent', transition: 'background 0.15s' }}>
                            <td style={{ ...tdS, color: colors.textDim, fontSize: 11 }}>{time}</td>
                            <td style={tdS}><SectionBadge section={key} /></td>
                            <td style={{ ...tdS, color: colors.blue }}>{todayReading}</td>
                            <td style={{ ...tdS, color: colors.textMuted }}>{yestReading}</td>
                            <td style={{ ...tdS, color: hasData ? color : colors.textDim, fontWeight: 700, fontSize: 14 }}>{dc}</td>
                            <td style={{ ...tdS, color: colors.blue }}>{actualMD}</td>
                            <td style={{ ...tdS, color: colors.amber }}>{pf}</td>
                            <td style={{ ...tdS, color: colors.textMuted }}>{recorder}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  USERS TAB
// ─────────────────────────────────────────────
function UsersTab() {
  const { colors } = useTheme();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('recorder');
  const [department, setDepartment] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(null);
  const [toggleError, setToggleError] = useState('');

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const data = await apiService.loadUsers();
      setUsers(data);
    } catch (error) {
      setUsersError('Unable to load users: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('recorder');
    setDepartment('');
    setSubmitError('');
    setSubmitSuccess('');
  };

  const handleCreateUser = async () => {
    setSubmitError('');
    setSubmitSuccess('');

    if (!username.trim() || !email.trim() || !password) {
      setSubmitError('Username, email, and password are required.');
      return;
    }

    try {
      await apiService.createUser({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        department: department.trim() || undefined,
      });
      setSubmitSuccess('User created successfully.');
      resetForm();
      loadUsers();
      setModalOpen(false);
    } catch (error) {
      setSubmitError(error.message || 'Failed to create user.');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiService.deleteUser(deleteConfirm._id || deleteConfirm.id);
      loadUsers();
      setDeleteConfirm(null);
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    setTogglingStatus(userId);
    setToggleError('');
    try {
      await apiService.toggleUserStatus(userId, currentStatus);
      loadUsers();
      setTogglingStatus(null);
    } catch (error) {
      setToggleError(error.message || 'Failed to update user status.');
      setTogglingStatus(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>User Management</div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Create and review manager or recorder accounts</div>
        </div>
        <Btn variant="primary" onClick={() => { resetForm(); setModalOpen(true); }} style={{ minWidth: 160 }}>+ Create New User</Btn>
      </div>

      {usersError && <Alert message={usersError} type="error" />}
      {deleteError && <Alert message={deleteError} type="error" />}
      {toggleError && <Alert message={toggleError} type="error" />}

      {loadingUsers ? (
        <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Loading users...</div>
      ) : (
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {/* Table Header with Stats */}
          <div style={{ background: colors.surface2, padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Users</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, marginTop: 2 }}>{users.length}</div>
              </div>
              <div style={{ width: '1px', background: colors.border }} />
              <div>
                <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Active</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.green, marginTop: 2 }}>{users.filter(u => u.isActive !== false).length}</div>
              </div>
              <div style={{ width: '1px', background: colors.border }} />
              <div>
                <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Inactive</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.red, marginTop: 2 }}>{users.filter(u => u.isActive === false).length}</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.surface, borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>👤 User</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>📧 Email</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Role</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: colors.textDim, fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px 20px', color: colors.textMuted, fontSize: 14 }}>No users found.</td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr
                      key={u._id || u.id || u.username}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        background: 'transparent',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = colors.surface2; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 16px', fontSize: 13, color: colors.text, fontFamily: V.fontMono, whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700 }}>{u.username || '—'}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>ID: {(u._id || u.id || '—').toString().slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: colors.textMuted }}>
                        {u.email || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13 }}>
                        <span style={{
                          background: u.role === 'manager' ? colors.blue + '20' : colors.green + '20',
                          color: u.role === 'manager' ? colors.blue : colors.green,
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: V.fontMono,
                          textTransform: 'capitalize',
                          display: 'inline-block',
                          border: `1px solid ${u.role === 'manager' ? colors.blue + '40' : colors.green + '40'}`
                        }}>
                          {u.role === 'manager' ? '🛡️ Manager' : '📝 Recorder'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13 }}>
                        <span style={{
                          color: u.isActive === false ? colors.red : colors.green,
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          {u.isActive === false ? <>⚫ <span>Inactive</span></> : <>🟢 <span>Active</span></>}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleToggleStatus(u._id || u.id, u.isActive)}
                            disabled={togglingStatus === (u._id || u.id) || u.role === 'manager'}
                            style={{
                              background: u.isActive === false ? colors.green + '15' : colors.amber + '15',
                              color: u.isActive === false ? colors.green : colors.amber,
                              border: `1px solid ${u.isActive === false ? colors.green + '40' : colors.amber + '40'}`,
                              padding: '6px 11px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: (togglingStatus === (u._id || u.id) || u.role === 'manager') ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              opacity: (togglingStatus === (u._id || u.id) || u.role === 'manager') ? 0.5 : 1,
                              whiteSpace: 'nowrap'
                            }}
                            onMouseOver={e => {
                              if (togglingStatus !== (u._id || u.id) && u.role !== 'manager') {
                                e.currentTarget.style.background = u.isActive === false ? colors.green + '25' : colors.amber + '25';
                                e.currentTarget.style.borderColor = u.isActive === false ? colors.green + '60' : colors.amber + '60';
                              }
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = u.isActive === false ? colors.green + '15' : colors.amber + '15';
                              e.currentTarget.style.borderColor = u.isActive === false ? colors.green + '40' : colors.amber + '40';
                            }}
                            title={u.role === 'manager' ? 'Manager accounts cannot be inactivated' : ''}
                          >
                            {togglingStatus === (u._id || u.id) ? '...' : u.role === 'manager' ? '🔐' : u.isActive === false ? '🔓' : '🔒'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(u)}
                            style={{
                              background: colors.red + '15',
                              color: colors.red,
                              border: `1px solid ${colors.red}40`,
                              padding: '6px 11px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = colors.red + '25';
                              e.currentTarget.style.borderColor = colors.red + '60';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = colors.red + '15';
                              e.currentTarget.style.borderColor = colors.red + '40';
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal title="Create New User" subtitle="Add a recorder or manager account" onClose={() => setModalOpen(false)}>
          {submitError && <Alert message={submitError} type="error" />}
          {submitSuccess && <Alert message={submitSuccess} type="success" />}

          <FormField label="Username">
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. arif.kazi" />
          </FormField>
          <FormField label="Email Address">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. user@example.com" />
          </FormField>
          <FormField label="Password">
            <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a secure password" />
          </FormField>
          <FormField label="Role">
            <Select value={role} onChange={e => setRole(e.target.value)}>
              <option value="recorder">Recorder</option>
              <option value="manager">Manager</option>
            </Select>
          </FormField>
          {/* <FormField label="Department (optional)">
            <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. SAPL" />
          </FormField> */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setModalOpen(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleCreateUser} style={{ flex: 1 }}>Create User</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  EXPORT TAB
// ─────────────────────────────────────────────
// ─── Bill generation (API-based authorization) ───────────────
function MonthlyBillModal({ records, onClose }) {
  // Single step — bill config (authorization handled by API)
  const [meter, setMeter] = useState('SAPL');
  const [month, setMonth] = useState('');
  const [price, setPrice] = useState('');
  const [exportError, setExportError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!month) return setExportError('Please select a month.');
    if (!price || isNaN(parseFloat(price))) return setExportError('Please enter a valid rate per unit.');

    setExportError('');
    setLoading(true);

    try {
      // Use API to get filtered records for the month
      const filteredRecords = records.filter(r =>
        r.section === meter && r.date.startsWith(month)
      );

      if (filteredRecords.length === 0) {
        setExportError('No records found for the selected month and meter.');
        return;
      }

      exportMonthlyBill(filteredRecords, meter, month, parseFloat(price));
      onClose();
    } catch (error) {
      setExportError('Failed to generate bill: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="💰 Monthly Bill PDF"
      subtitle="Generate authorized monthly bill for selected meter and period"
      onClose={onClose}
    >
      <FormField label="Meter">
        <Select value={meter} onChange={e => setMeter(e.target.value)}>
          <option value="SAPL">SAPL (×70)</option>
          <option value="SMRT">SMRT (×80)</option>
          <option value="SMC-HT">SMC-HT (×4)</option>
        </Select>
      </FormField>

      <FormField label="Billing Month">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
      </FormField>

      <FormField label="Rate per Unit (Rs / kWh)">
        <Input type="number" step="0.01" placeholder="e.g. 8.50" value={price} onChange={e => setPrice(e.target.value)} />
      </FormField>

      {exportError && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#EF4444', fontSize: 13 }}>
          {exportError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn
          onClick={handleExport}
          disabled={loading}
          style={{ flex: 1, background: loading ? '#666' : 'linear-gradient(135deg,#F59E0B,#D97706)', border: 'none' }}
        >
          {loading ? '⏳ Generating...' : '📄 Generate Bill PDF'}
        </Btn>
      </div>
    </Modal>
  );
}

function ExportTab({ records }) {
  const [modal, setModal] = useState(null);
  const [exportShift, setExportShift] = useState('1');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [month, setMonth] = useState('');
  const [singleDate, setSingleDate] = useState('');
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    loadDeletedRecords();
  }, []);

  const loadDeletedRecords = async () => {
    try {
      setLoadingDeleted(true);
      const response = await readingAPI.getDeletedReadings();
      setDeletedRecords(response.data || []);
    } catch (err) {
      console.error('Failed to load deleted records:', err);
      setDeletedRecords([]);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const doExport = () => {
    try {
      setExportError('');
      if (modal === 'dateRange') exportDateRange(records, exportShift, fromDate, toDate);
      else if (modal === 'monthly') exportMonthly(records, exportShift, month);
      else if (modal === 'singleDate') exportSingleDatePDF(records, singleDate);
      else if (modal === 'deletedMonthly') {
        if (deletedRecords.length === 0) {
          setExportError('No deleted records available to export.');
          return;
        }
        // Transform API data to match export format
        const transformed = deletedRecords.map(r => ({
          date: r.readingDate ? r.readingDate.split('T')[0] : '',
          section: r.meter?.meterName || 'Unknown',
          shift: r.shift || '3',
          kwh: r.KWH,
          kvah: r.KVAH,
          kvarh_lag: r.KVARHlag !== undefined ? r.KVARHlag : r.KVARH || 0,
          kvarh_lead: r.KVARHlead !== undefined ? r.KVARHlead : 0,
          md: r.MD,
          recorderName: r.recordedBy?.username || 'Unknown',
          deletionReason: r.deletionReason,
          deletionDate: r.deletedAt || new Date().toISOString()
        }));
        exportDeletedMonthly(transformed, month);
      }
      setModal(null);
    } catch (error) {
      setExportError('Export failed: ' + error.message);
    }
  };

  const exportCards = [
    { id: 'dateRange', icon: MdCalendarMonth, color: '#2563EB', title: 'Date Range Export', desc: 'Export records by date range (Excel)' },
    { id: 'monthly', icon: MdShowChart, color: '#10B981', title: 'Monthly Export', desc: 'Export monthly records (Excel)' },
    { id: 'singleDate', icon: MdDescription, color: '#8B5CF6', title: 'Single Date Export', desc: 'Export single date report (PDF)' },
    { id: 'deletedMonthly', icon: MdDeleteOutline, color: '#EF4444', title: 'Deleted Records Export', desc: 'Export deleted entries (Monthly)' },
    { id: 'monthlyBill', icon: MdAssignment, color: '#F59E0B', title: 'Monthly Bill PDF', desc: 'Password-protected · Authorized by Arif Kazi' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
        {exportCards.map(c => {
          const IconComponent = c.icon;
          return (
            <div
              key={c.id}
              onClick={() => setModal(c.id)}
              style={{
                background: '#0a0a0a',
                border: '1px solid #1f1f1f',
                borderRadius: 14,
                padding: 24,
                cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = c.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#1f1f1f';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {c.id === 'monthlyBill' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    fontSize: 11,
                    background: 'rgba(245,158,11,0.12)',
                    color: '#F59E0B',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontWeight: 700,
                    fontFamily: V.fontDisplay,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  🔐 AUTH
                </div>
              )}
              <div style={{ fontSize: 34, marginBottom: 12, color: c.color }}>
                <IconComponent />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: c.color }}>
                {c.title}
              </h3>
              <p style={{ fontSize: 13, color: '#555' }}>{c.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly Bill — special two-step modal */}
      {modal === 'monthlyBill' && (
        <MonthlyBillModal records={records} onClose={() => setModal(null)} />
      )}

      {/* All other export modals */}
      {modal && modal !== 'monthlyBill' && (
        <Modal
          title={
            (() => {
              const card = exportCards.find((c) => c.id === modal);
              const IconComp = card?.icon;
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconComp style={{ fontSize: 20 }} />
                  {card?.title}
                </span>
              );
            })()
          }
          subtitle="Configure your export settings"
          onClose={() => setModal(null)}
        >
          {modal === 'dateRange' && (
            <>
              <FormField label="Shift"><Select value={exportShift} onChange={e => setExportShift(e.target.value)}><option value="1">Shift 1</option><option value="2">Shift 2</option><option value="3">Shift 3</option></Select></FormField>
              <FormField label="From Date"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></FormField>
              <FormField label="To Date"><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></FormField>
            </>
          )}
          {modal === 'monthly' && (
            <>
              <FormField label="Shift"><Select value={exportShift} onChange={e => setExportShift(e.target.value)}><option value="1">Shift 1</option><option value="2">Shift 2</option><option value="3">Shift 3</option></Select></FormField>
              <FormField label="Month"><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></FormField>
            </>
          )}
          {modal === 'singleDate' && (
            <FormField label="Date"><Input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} /></FormField>
          )}
          {modal === 'deletedMonthly' && (
            <FormField label="Month"><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></FormField>
          )}
          {exportError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#EF4444', fontSize: 13 }}>
              {exportError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn variant="secondary" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={doExport} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><MdFileDownload /> Export</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  MANAGER DASHBOARD  (default export)
// ─────────────────────────────────────────────
const TABS = [
  { id: 'live', label: 'Live Dashboard', icon: MdShowChart },
  { id: 'records', label: 'Records', icon: MdDescription },
  { id: 'pending', label: 'Pending', icon: MdAccessTime },
  { id: 'deleted', label: 'Deleted', icon: MdDeleteOutline },
  { id: 'users', label: 'Users', icon: MdPeople },
  { id: 'export', label: 'Export', icon: MdFileDownload },
];

export default function ManagerDashboard({ user, onLogout }) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('live');
  const [records, setRecords] = useState([]);
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Detect window resize to toggle mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.loadReadings();
      setRecords(data);
    } catch (err) {
      setError('Failed to load records: ' + err.message);
      console.error('Error loading records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMeters = useCallback(async () => {
    try {
      const data = await apiService.loadMeters();
      console.log('Loaded meters in component:', data, 'count:', data?.length || 0);
      setMeters(data || []);
    } catch (err) {
      console.error('Error loading meters:', err);
      setMeters([]);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    loadMeters();
  }, [loadRecords, loadMeters]);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, fontFamily: V.fontDisplay, display: 'flex', position: 'relative', flexDirection: isMobile ? 'column' : 'row' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${colors.bg}; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${colors.surface}; }
        ::-webkit-scrollbar-thumb { background: ${colors.border2}; border-radius: 3px; }
        @media (max-width: 768px) {
          body { font-size: 14px; }
        }
        @media (max-width: 480px) {
          body { font-size: 12px; }
        }
      `}</style>

      {/* Drawer/Sidebar */}
      <ManagerDrawer
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          if (tabId === 'records' || tabId === 'live' || tabId === 'dashboard') loadRecords();
        }}
        onLogout={onLogout}
        username={user?.username}
        onDrawerStateChange={setMobileDrawerOpen}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', marginLeft: isMobile ? 0 : '280px', marginTop: isMobile ? '10px' : 0, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <TopHeader title="PEM Energy Manager" subtitle={`Manager Dashboard${user ? ` · ${user.username}` : ''}`} onLogout={onLogout} isMobileDrawerOpen={mobileDrawerOpen} />

        <div style={{ flex: 1, maxWidth: '100%', padding: isMobile ? (window.innerWidth <= 480 ? '12px' : '16px') : '24px 28px', overflowY: 'auto', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          {/* Tab content */}
          <div key={activeTab} style={{ animation: 'fadeIn 0.25s ease' }}>
            {error && (
              <div style={{ background: colors.surface, border: `1px solid ${colors.red}`, borderRadius: 12, padding: 18, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', '@media (max-width: 640px)': { flexDirection: 'column', alignItems: 'flex-start' } }}>
                <span style={{ fontSize: 22 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: colors.red, fontSize: 15 }}>Error Loading Data</div>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>{error}</div>
                </div>
                <button onClick={loadRecords} style={{ marginLeft: 'auto', padding: '8px 16px', background: colors.red, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, '@media (max-width: 640px)': { marginLeft: 0, width: '100%' } }}>Retry</button>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
                <div style={{ fontSize: 18, marginBottom: 10 }}>Loading data...</div>
                <div style={{ fontSize: 14 }}>Please wait while we fetch the latest records</div>
              </div>
            ) : (
              <>
                {activeTab === 'records' && <RecordsTab records={records} onRecordsChange={loadRecords} isMobile={isMobile} />}
                {activeTab === 'pending' && <PendingTab records={records} meters={meters} onRecordsChange={loadRecords} />}
                {activeTab === 'deleted' && <DeletedTab />}
                {activeTab === 'live' && <LiveDashboardTab records={records} />}
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'export' && <ExportTab records={records} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
