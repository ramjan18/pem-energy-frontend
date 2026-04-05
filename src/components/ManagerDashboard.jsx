// ============================================================
//  PEM ENERGY MANAGER — Merged Single-File Component
//  Combines: exportUtils.js + ManagerDashboard.jsx
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─────────────────────────────────────────────
//  STORAGE LAYER
// ─────────────────────────────────────────────
const KEYS = {
  RECORDS:    'pem_records',
  DELETED:    'pem_deleted',
  ALLOWANCES: 'pem_allowances',
};

const MANAGER_PWD = 'manager123'; // ← change as needed

const storage = {
  get: (key, fallback = null) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

// ─────────────────────────────────────────────
//  EXPORT UTILITIES  (formerly exportUtils.js)
// ─────────────────────────────────────────────
function exportDateRange(records, shift, fromDate, toDate) {
  const filtered = records.filter(r =>
    r.shift === shift && r.date >= fromDate && r.date <= toDate
  );
  const wb   = XLSX.utils.book_new();
  const data = [['Date','Time','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
  filtered.forEach(r =>
    data.push([r.date, r.time, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName])
  );
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `Shift ${shift}`);
  XLSX.writeFile(wb, `DateRange_Shift${shift}_${fromDate}_to_${toDate}.xlsx`);
}

function exportMonthly(records, shift, month) {
  const filtered = records.filter(r => r.shift === shift && r.date.startsWith(month));
  const wb   = XLSX.utils.book_new();
  const data = [['Date','Time','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
  filtered.forEach(r =>
    data.push([r.date, r.time, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName])
  );
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `Shift ${shift} - ${month}`);
  XLSX.writeFile(wb, `Monthly_Shift${shift}_${month}.xlsx`);
}

function exportSingleDatePDF(records, date) {
  const filtered = records.filter(r => r.date === date);
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('PEM Energy Manager', 14, 22);
  doc.setFontSize(12);
  doc.text(`Energy Records - ${date}`, 14, 32);
  doc.autoTable({
    startY: 40,
    head: [['Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Recorder']],
    body: filtered.map(r => [r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName]),
    styles: { fontSize: 9 },
  });
  doc.save(`Records_${date}.pdf`);
}

function exportDeletedMonthly(deletedRecords, month) {
  const filtered = deletedRecords.filter(r => r.date.startsWith(month));
  const wb   = XLSX.utils.book_new();
  const data = [['Date','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Recorder','Deletion Reason','Deleted At']];
  filtered.forEach(r =>
    data.push([r.date, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName, r.deletionReason, new Date(r.deletionDate).toLocaleString()])
  );
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `Deleted-${month}`);
  XLSX.writeFile(wb, `Deleted_Records_${month}.xlsx`);
}

function exportShiftSheets(records) {
  const wb = XLSX.utils.book_new();
  for (let shift = 1; shift <= 3; shift++) {
    const shiftRecords = records.filter(r => r.shift === shift.toString());
    const data = [['Date','Time','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
    shiftRecords.forEach(r =>
      data.push([r.date, r.time, r.section, r.shift, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName])
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), `Shift ${shift}`);
  }
  XLSX.writeFile(wb, `Live_Dashboard_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportMonthlyBill(records, meter, month, pricePerUnit) {
  const MULTIPLIERS = { SAPL: 70, SMRT: 80, 'SMC-HT': 4 };
  const multiplier  = MULTIPLIERS[meter] || 1;

  const meterRecs = records
    .filter(r => r.section === meter && r.date.startsWith(month) && r.shift === '3')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const allMeterRecs = records
    .filter(r => r.section === meter && r.shift === '3')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (meterRecs.length === 0) {
    alert(`No Shift 3 records found for ${meter} in ${month}.`);
    return;
  }

  const firstDate = meterRecs[0].date;
  const lastDate  = meterRecs[meterRecs.length - 1].date;

  const prevMonthRecs  = allMeterRecs.filter(r => r.date < firstDate);
  const initialReading = prevMonthRecs.length > 0
    ? prevMonthRecs[prevMonthRecs.length - 1].kwh
    : meterRecs[0].kwh;
  const lastReading = meterRecs[meterRecs.length - 1].kwh;

  const dailyRows = meterRecs.map((rec, i) => {
    const prevKwh    = i === 0 ? initialReading : meterRecs[i - 1].kwh;
    const consumption = ((rec.kwh - prevKwh) * multiplier).toFixed(2);
    const [y, m, d]  = rec.date.split('-');
    return { date: `${d}-${m}-${y}`, reading: rec.kwh.toFixed(2), prevReading: prevKwh.toFixed(2), consumption: parseFloat(consumption) };
  });

  const totalConsumption = dailyRows.reduce((s, r) => s + r.consumption, 0).toFixed(2);
  const totalCost        = (parseFloat(totalConsumption) * pricePerUnit).toFixed(2);
  const numDays          = meterRecs.length;

  const [my, mm] = month.split('-');
  const monthName = new Date(parseInt(my), parseInt(mm) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const fmt = (dateStr) => { const [y, m, d] = dateStr.split('-'); return `${d}-${m}-${y}`; };

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw  = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pw, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text('PEM ENERGY MANAGEMENT', pw / 2, 16, { align: 'center' });
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Monthly Energy Consumption Bill', pw / 2, 25, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pw / 2, 33, { align: 'center' });

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 42, pw, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`${meter} — ${monthName}`, pw / 2, 49, { align: 'center' });

  let y = 60;
  doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pw - 28, 54, 3, 3, 'FD');

  const col1 = 20, col2 = pw / 2 + 4, lY = y + 10;
  const lbl = (txt, cx, cy) => { doc.setTextColor(71, 85, 105); doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(txt, cx, cy); };
  const val = (txt, cx, cy, sz = 13) => { doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42); doc.setFontSize(sz); doc.text(txt, cx, cy); };

  lbl('METER', col1, lY);              lbl('BILLING MONTH', col2, lY);
  val(meter, col1, lY + 7);            val(monthName, col2, lY + 7);
  lbl('DATE RANGE', col1, lY + 18);    lbl('METER MULTIPLIER', col2, lY + 18);
  val(`${fmt(firstDate)}  to  ${fmt(lastDate)}`, col1, lY + 25, 11);
  val(`x${multiplier}`, col2, lY + 25, 11);
  lbl('DAYS RECORDED', col1, lY + 36); lbl('RATE PER UNIT (KWh)', col2, lY + 36);
  val(`${numDays} days`, col1, lY + 43, 11);
  val(`Rs. ${parseFloat(pricePerUnit).toFixed(2)} / kWh`, col2, lY + 43, 11);

  y = 122;
  const boxW = (pw - 42) / 3;
  [
    { label: 'INITIAL READING (kWh)', value: parseFloat(initialReading).toFixed(2),       color: [59, 130, 246] },
    { label: 'FINAL READING (kWh)',   value: parseFloat(lastReading).toFixed(2),           color: [16, 185, 129] },
    { label: 'GROSS DIFF (Raw kWh)',  value: (lastReading - initialReading).toFixed(2),    color: [139, 92, 246] },
  ].forEach((box, i) => {
    const bx = 14 + i * (boxW + 7);
    doc.setFillColor(...box.color);
    doc.roundedRect(bx, y, boxW, 22, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text(box.label, bx + boxW / 2, y + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.text(box.value, bx + boxW / 2, y + 17, { align: 'center' });
  });

  y = 153;
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Daily Consumption Details', 14, y);
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.5);
  doc.line(14, y + 2, 80, y + 2);

  doc.autoTable({
    startY: y + 6,
    head: [['Date', 'Prev. Reading (kWh)', 'Current Reading (kWh)', `Daily Consumption (x${multiplier} kWh)`]],
    body: dailyRows.map(r => [r.date, r.prevReading, r.reading, r.consumption.toFixed(2)]),
    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { halign: 'right',  cellWidth: 45 },
      2: { halign: 'right',  cellWidth: 45 },
      3: { halign: 'right',  cellWidth: 55, textColor: [37, 99, 235], fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    foot: [[
      { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: [255, 255, 255] } },
      { content: '', styles: { fillColor: [15, 23, 42] } },
      { content: '', styles: { fillColor: [15, 23, 42] } },
      { content: totalConsumption + ' kWh', styles: { fontStyle: 'bold', fillColor: [37, 99, 235], textColor: [255, 255, 255], halign: 'right' } },
    ]],
    showFoot: 'lastPage',
  });

  const sY = doc.lastAutoTable.finalY + 10;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, sY, pw - 28, 46, 3, 3, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY BILL SUMMARY', pw / 2, sY + 10, { align: 'center' });

  const sc1 = 30, sc2 = pw / 2, sc3 = pw - 30;
  const sr1  = sY + 20, sr2 = sY + 36;
  doc.setTextColor(100, 116, 139); doc.setFontSize(8);
  doc.text('TOTAL CONSUMPTION', sc1, sr1, { align: 'center' });
  doc.text('RATE PER UNIT',      sc2, sr1, { align: 'center' });
  doc.text('TOTAL BILL AMOUNT',  sc3, sr1, { align: 'center' });

  doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(`${totalConsumption} kWh`, sc1, sr2, { align: 'center' });
  doc.setTextColor(148, 163, 184); doc.setFontSize(12);
  doc.text(`Rs. ${parseFloat(pricePerUnit).toFixed(2)}`, sc2, sr2, { align: 'center' });
  doc.setTextColor(52, 211, 153); doc.setFontSize(16);
  doc.text(`Rs. ${parseFloat(totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sc3, sr2, { align: 'center' });

  doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.4);
  doc.line(pw / 2 - 20, sY + 14, pw / 2 - 20, sY + 42);
  doc.line(pw / 2 + 30, sY + 14, pw / 2 + 30, sY + 42);

  const fY = sY + 56;
  doc.setTextColor(148, 163, 184); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('PEM Energy Management System  •  Authorized by: Kazi Sir  •  Confidential', pw / 2, fY, { align: 'center' });
  doc.text(`System-generated bill for ${meter} meter — ${monthName}`, pw / 2, fY + 6, { align: 'center' });

  doc.save(`MonthlyBill_${meter}_${month}.pdf`);
}

function exportMeterWise(records) {
  const wb = XLSX.utils.book_new();
  ['SMRT', 'SAPL', 'SMC-HT'].forEach(meter => {
    const meterRecords = records.filter(r => r.section === meter);
    const data = [['Date','Time','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
    meterRecords.forEach(r =>
      data.push([r.date, r.time, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName])
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), meter);
  });
  const allData = [['Date','Time','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
  records.forEach(r =>
    allData.push([r.date, r.time, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName])
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allData), 'All Records');
  XLSX.writeFile(wb, `Meter_Wise_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ─────────────────────────────────────────────
//  UI PRIMITIVES
// ─────────────────────────────────────────────
const V = {
  fontDisplay: "'DM Sans', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

function TopHeader({ title, subtitle, onLogout }) {
  return (
    <div style={{ background: '#050505', borderBottom: '1px solid #111', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', fontFamily: V.fontDisplay, letterSpacing: '-0.02em' }}>⚡ {title}</div>
        <div style={{ fontSize: 11, color: '#444', fontFamily: V.fontMono, marginTop: 2 }}>{subtitle}</div>
      </div>
      {onLogout && (
        <button onClick={onLogout} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: 8, cursor: 'pointer', fontFamily: V.fontDisplay, fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.color = '#555'; }}>
          Logout
        </button>
      )}
    </div>
  );
}

function Alert({ message, type }) {
  const colors = { error: '#EF4444', success: '#10B981', info: '#2563EB' };
  const c = colors[type] || colors.info;
  return (
    <div style={{ background: `${c}11`, border: `1px solid ${c}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: c, fontSize: 13, fontFamily: V.fontDisplay }}>
      {message}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#f0f0f0', fontFamily: V.fontDisplay }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: '#555', marginTop: 4, fontFamily: V.fontDisplay }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#444', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', style = {} }) {
  const base = { padding: '11px 20px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: V.fontDisplay, transition: 'all 0.2s', border: 'none' };
  const variants = {
    primary:   { background: '#2563EB', color: '#fff' },
    secondary: { background: '#111', color: '#888', border: '1px solid #222' },
    danger:    { background: '#EF4444', color: '#fff' },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#444', fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '11px 14px', background: '#111', border: '1px solid #222', borderRadius: 8, color: '#f0f0f0', fontSize: 14, fontFamily: V.fontDisplay, outline: 'none', boxSizing: 'border-box' };

function Input({ type = 'text', value, onChange, placeholder, step }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} style={inputStyle} />;
}

function PasswordInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} style={{ ...inputStyle, paddingRight: 44 }} />
      <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}

function Select({ value, onChange, children }) {
  return <select value={value} onChange={onChange} style={{ ...inputStyle, cursor: 'pointer' }}>{children}</select>;
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
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ background: '#080808' }}>
              {headers.map(h => (
                <th key={h} style={{ padding: '12px 13px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#2a2a2a', fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #111', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {React.Children.count(children) === 0
              ? <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 48, color: '#333', fontSize: 14 }}>{emptyMessage}</td></tr>
              : children}
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
  { key: 'SAPL',   label: 'SAPL',   multiplier: 70, mdMultiplier: 70, color: '#2563EB', accent: '#3B82F6', glow: 'rgba(37,99,235,0.15)' },
  { key: 'SMRT',   label: 'SMRT',   multiplier: 80, mdMultiplier: 80, color: '#10B981', accent: '#34D399', glow: 'rgba(16,185,129,0.15)' },
  { key: 'SMC-HT', label: 'SMC HT', multiplier: 4,  mdMultiplier: 80, color: '#8B5CF6', accent: '#A78BFA', glow: 'rgba(139,92,246,0.15)' },
];
const M_ORDER = ['SAPL', 'SMRT', 'SMC-HT'];
const getMeter       = (sec) => METERS.find(m => m.key === sec);
const getMultiplier  = (sec) => getMeter(sec)?.multiplier  || 1;
const getMdMultiplier= (sec) => getMeter(sec)?.mdMultiplier|| 1;
const getColor       = (sec) => getMeter(sec)?.color       || '#ccc';
const formatDate     = (d)   => { const [y, m, day] = d.split('-'); return `${day}-${m}-${y}`; };

// ─────────────────────────────────────────────
//  RECORDS TAB
// ─────────────────────────────────────────────
function RecordsTab({ records, onRecordsChange }) {
  const [editModal,    setEditModal]    = useState(null);
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [editPwd,      setEditPwd]      = useState('');
  const [editReason,   setEditReason]   = useState('');
  const [editVals,     setEditVals]     = useState({});
  const [deletePwd,    setDeletePwd]    = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [alert,        setAlert]        = useState(null);
  const [meterFilter,  setMeterFilter]  = useState('all');
  const [shiftFilter,  setShiftFilter]  = useState('all');
  const [hoveredRow,   setHoveredRow]   = useState(null);

  const today         = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const showAlert  = (msg, type) => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 5000); };
  const openEdit   = (r) => { setEditModal(r); setEditPwd(''); setEditReason(''); setEditVals({ kwh: r.kwh, kvah: r.kvah, kvarh_lag: r.kvarh_lag, kvarh_lead: r.kvarh_lead, md: r.md }); };
  const openDelete = (r) => { setDeleteModal(r); setDeletePwd(''); setDeleteReason(''); };

  const handleEdit = () => {
    if (editPwd !== MANAGER_PWD)     return showAlert('Invalid manager password.', 'error');
    if (editReason.length < 15)      return showAlert('Reason must be at least 15 characters.', 'error');
    const recs = storage.get(KEYS.RECORDS, []);
    const idx  = recs.findIndex(r => r.id === editModal.id);
    recs[idx]  = { ...recs[idx], ...editVals, kwh: parseFloat(editVals.kwh), kvah: parseFloat(editVals.kvah), kvarh_lag: parseFloat(editVals.kvarh_lag), kvarh_lead: parseFloat(editVals.kvarh_lead), md: parseFloat(editVals.md), editedAt: new Date().toISOString(), editReason };
    storage.set(KEYS.RECORDS, recs);
    setEditModal(null); onRecordsChange(); showAlert('Record updated successfully.', 'success');
  };

  const handleDelete = () => {
    if (deletePwd !== MANAGER_PWD)   return showAlert('Invalid manager password.', 'error');
    if (deleteReason.length < 15)    return showAlert('Reason must be at least 15 characters.', 'error');
    const recs = storage.get(KEYS.RECORDS, []);
    const idx  = recs.findIndex(r => r.id === deleteModal.id);
    const [deleted] = recs.splice(idx, 1);
    storage.set(KEYS.RECORDS, recs);
    const deletedRecs = storage.get(KEYS.DELETED, []);
    deletedRecs.push({ ...deleted, deletionReason: deleteReason, deletionDate: new Date().toISOString() });
    storage.set(KEYS.DELETED, deletedRecs);
    const allowances = storage.get(KEYS.ALLOWANCES, []);
    allowances.push({ recorderName: deleted.recorderName, shift: deleted.shift, section: deleted.section });
    storage.set(KEYS.ALLOWANCES, allowances);
    setDeleteModal(null); onRecordsChange(); showAlert('Record deleted. Recorder can now re-enter this section.', 'success');
  };

  function calcRow(r) {
    const allSec    = records.filter(x => x.section === r.section && x.shift === r.shift);
    const prevDate  = new Date(new Date(r.date).getTime() - 86400000).toISOString().split('T')[0];
    const prevRecs  = allSec.filter(p => p.date === prevDate).sort((a, b) => b.timestamp - a.timestamp);
    const prevReading = prevRecs.length > 0 ? prevRecs[0].kwh : null;
    const dc        = prevReading !== null ? ((r.kwh - prevReading) * getMultiplier(r.section)).toFixed(2) : '—';
    const recMonth  = r.date.slice(0, 7);
    const monthRecs = allSec.filter(m => m.date?.startsWith(recMonth));
    const maxMD     = monthRecs.length > 0 ? Math.max(...monthRecs.map(m => m.md)) : null;
    const actualMD  = maxMD !== null ? Math.round(maxMD * getMdMultiplier(r.section)) : '—';
    const lag = r.kvarh_lag || 0, lead = r.kvarh_lead || 0;
    const denom = Math.sqrt(r.kwh * r.kwh + (lag + lead) * (lag + lead));
    const pf    = denom > 0 ? (r.kwh / denom).toFixed(4) : '—';
    return { dc, actualMD, pf };
  }

  let filtered = [...records];
  if (meterFilter !== 'all') filtered = filtered.filter(r => r.section === meterFilter);
  if (shiftFilter !== 'all') filtered = filtered.filter(r => r.shift === shiftFilter);
  const allDates = [...new Set(filtered.map(r => r.date))].sort((a, b) => new Date(b) - new Date(a));

  const filterBtnStyle = (active, activeColor) => ({
    padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 12,
    fontFamily: V.fontDisplay, background: active ? activeColor : 'transparent',
    color: active ? '#fff' : '#555', border: `1px solid ${active ? activeColor : '#222'}`, transition: 'all 0.2s', letterSpacing: '0.03em',
  });

  const tdS = { padding: '12px 14px', fontSize: 13, color: '#bbb', fontFamily: V.fontMono, borderBottom: '1px solid #0f0f0f', whiteSpace: 'nowrap', transition: 'background 0.15s' };

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
        <p style={{ fontSize: 13, color: '#6B9EFF' }}>Click <strong>Edit</strong> or <strong>Delete</strong> to modify records. Manager password and a 15-character reason are required.</p>
      </div>

      {alert && <Alert message={alert.msg} type={alert.type} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#444', fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Meter</span>
          {['all', 'SAPL', 'SMRT', 'SMC-HT'].map(m => (
            <button key={m} onClick={() => setMeterFilter(m)} style={filterBtnStyle(meterFilter === m, '#2563EB')}>{m === 'all' ? 'All Meters' : m}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: '#1a1a1a' }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#444', fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Shift</span>
          {['all', '1', '2', '3'].map(s => (
            <button key={s} onClick={() => setShiftFilter(s)} style={filterBtnStyle(shiftFilter === s, '#F59E0B')}>{s === 'all' ? 'All Shifts' : `Shift ${s}`}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr style={{ background: '#080808' }}>
                {['Time','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Daily Consumption','Actual MD','PF','Recorder','Actions'].map((h, i) => {
                  const isComputed = i >= 6 && i <= 8;
                  return (
                    <th key={h} style={{ padding: '13px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: isComputed ? '#2563EB' : '#3a3a3a', fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `2px solid ${isComputed ? 'rgba(37,99,235,0.3)' : '#111'}`, whiteSpace: 'nowrap', background: isComputed ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allDates.length === 0
                ? <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: '#333', fontSize: 14 }}>No records found.</td></tr>
                : allDates.map(date => {
                  const dateRows = filtered.filter(r => r.date === date).sort((a, b) => {
                    const md = M_ORDER.indexOf(a.section) - M_ORDER.indexOf(b.section);
                    return md !== 0 ? md : a.shift - b.shift;
                  });
                  const isToday     = date === today;
                  const isYesterday = date === yesterdayDate;
                  const sectionGroups = M_ORDER.map(sec => ({ sec, rows: dateRows.filter(r => r.section === sec) })).filter(g => g.rows.length > 0);

                  return (
                    <React.Fragment key={`date-${date}`}>
                      <tr>
                        <td colSpan={11} style={{ padding: '9px 16px', background: 'linear-gradient(90deg,#111,#0a0a0a)', borderBottom: '1px solid #1a1a1a', borderTop: '2px solid #1a1a1a', fontSize: 12, fontWeight: 700, color: '#666', fontFamily: V.fontDisplay, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ opacity: 0.5 }}>📆</span>
                            <span>{formatDate(date)}</span>
                            {isToday    && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>TODAY</span>}
                            {isYesterday&& <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>YESTERDAY</span>}
                            {[...new Set(dateRows.map(r => r.shift))].sort().map(sh => (
                              <span key={sh} style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 8, letterSpacing: '0.04em', border: '1px solid rgba(245,158,11,0.25)' }}>S{sh}</span>
                            ))}
                            <span style={{ color: '#333', fontSize: 11, fontWeight: 400, marginLeft: 4 }}>{dateRows.length} record{dateRows.length !== 1 ? 's' : ''}</span>
                          </span>
                        </td>
                      </tr>

                      {sectionGroups.map(({ sec, rows }) => (
                        <React.Fragment key={`${date}-${sec}`}>
                          <tr>
                            <td colSpan={11} style={{ padding: '6px 20px', background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid #0f0f0f', borderTop: '1px solid #0f0f0f' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: getColor(sec), boxShadow: `0 0 6px ${getColor(sec)}`, display: 'inline-block' }} />
                                <SectionBadge section={sec} />
                                <span style={{ fontSize: 10, color: '#333', fontFamily: V.fontMono }}>×{getMultiplier(sec)} consumption · ×{getMdMultiplier(sec)} MD — {rows.length} shift{rows.length !== 1 ? 's' : ''}</span>
                              </span>
                            </td>
                          </tr>
                          {rows.map(r => {
                            const { dc, actualMD, pf } = calcRow(r);
                            const color    = getColor(r.section);
                            const isHovered= hoveredRow === r.id;
                            return (
                              <tr key={r.id} onMouseEnter={() => setHoveredRow(r.id)} onMouseLeave={() => setHoveredRow(null)} style={{ background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.15s' }}>
                                <td style={{ ...tdS, color: '#555', fontSize: 11 }}>{r.time}</td>
                                <td style={{ ...tdS, color: '#e0e0e0' }}>{r.kwh}</td>
                                <td style={{ ...tdS, color: '#aaa' }}>{r.kvah}</td>
                                <td style={{ ...tdS, color: '#aaa' }}>{r.kvarh_lag}</td>
                                <td style={{ ...tdS, color: '#aaa' }}>{r.kvarh_lead}</td>
                                <td style={{ ...tdS, color: '#aaa' }}>{r.md}</td>
                                <td style={{ ...tdS, color, fontWeight: 700, background: isHovered ? 'rgba(37,99,235,0.06)' : 'rgba(37,99,235,0.03)' }}>{dc}</td>
                                <td style={{ ...tdS, color: '#3B82F6', background: isHovered ? 'rgba(37,99,235,0.06)' : 'rgba(37,99,235,0.03)' }}>{actualMD}</td>
                                <td style={{ ...tdS, color: '#F59E0B', background: isHovered ? 'rgba(37,99,235,0.06)' : 'rgba(37,99,235,0.03)' }}>{pf}</td>
                                <td style={{ ...tdS, color: '#777' }}>{r.recorderName}</td>
                                <td style={tdS}>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => openEdit(r)} style={{ padding: '5px 12px', border: '1px solid rgba(37,99,235,0.4)', color: '#2563EB', background: 'rgba(37,99,235,0.06)', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: V.fontDisplay, transition: 'all 0.15s' }}>✏️ Edit</button>
                                    <button onClick={() => openDelete(r)} style={{ padding: '5px 12px', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', background: 'rgba(239,68,68,0.06)', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: V.fontDisplay, transition: 'all 0.15s' }}>🗑️ Delete</button>
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

      <div style={{ marginTop: 14, fontSize: 11, color: '#2a2a2a', fontFamily: V.fontMono, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#2563EB', opacity: 0.6 }}>■</span>
        <span>Computed columns (Daily Consumption → PF)</span><span style={{ margin: '0 8px', color: '#1a1a1a' }}>|</span>
        <span>Daily = (Today − Yesterday) × multiplier</span><span style={{ margin: '0 8px', color: '#1a1a1a' }}>|</span>
        <span>MD = Max of current month × MD multiplier</span><span style={{ margin: '0 8px', color: '#1a1a1a' }}>|</span>
        <span>SMC-HT: Consumption ×4 · MD ×80</span><span style={{ margin: '0 8px', color: '#1a1a1a' }}>|</span>
        <span>PF = KWH / √(KWH² + (Lag+Lead)²)</span>
      </div>

      {editModal && (
        <Modal title="✏️ Edit Record" subtitle="Update record values and provide a reason for modification." onClose={() => setEditModal(null)}>
          <FormField label="Manager Password"><PasswordInput placeholder="Enter manager password" value={editPwd} onChange={e => setEditPwd(e.target.value)} /></FormField>
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
            <Btn onClick={handleEdit} style={{ flex: 1 }}>💾 Save Changes</Btn>
          </div>
        </Modal>
      )}

      {deleteModal && (
        <Modal title="🗑️ Delete Record" subtitle="⚠️ This action cannot be undone." onClose={() => setDeleteModal(null)}>
          <FormField label="Manager Password"><PasswordInput placeholder="Enter manager password" value={deletePwd} onChange={e => setDeletePwd(e.target.value)} /></FormField>
          <FormField label={`Reason for Deletion (${deleteReason.length}/15 min)`}>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Provide detailed reason for deleting this record..." style={{ width: '100%', padding: '13px 15px', background: '#111', border: `1px solid ${deleteReason.length >= 15 ? '#10B981' : '#222'}`, borderRadius: 8, color: '#f0f0f0', fontSize: 14, fontFamily: V.fontDisplay, resize: 'vertical', minHeight: 90, outline: 'none', boxSizing: 'border-box' }} />
          </FormField>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" onClick={() => setDeleteModal(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="danger" onClick={handleDelete} style={{ flex: 1 }}>🗑️ Confirm Delete</Btn>
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
  const deleted = storage.get(KEYS.DELETED, []).sort((a, b) => new Date(b.deletionDate) - new Date(a.deletionDate));
  return (
    <div>
      <div style={{ background: '#0a0a0a', border: '1px solid #EF4444', borderRadius: 12, padding: 18, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 22 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 15 }}>Deleted Records</div>
          <div style={{ fontSize: 12, color: '#666' }}>View-only archive of deleted entries with deletion reasons</div>
        </div>
      </div>
      <DataTable headers={['Date','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Recorder','Reason','Deleted At']} emptyMessage="No deleted records.">
        {deleted.map(r => (
          <tr key={r.id + r.deletionDate}>
            <td style={tdStyle}>{r.date}</td>
            <td style={tdStyle}><SectionBadge section={r.section} /></td>
            <td style={{ ...tdStyle, fontFamily: V.fontMono, fontSize: 12 }}>Shift {r.shift}</td>
            <td style={{ ...tdStyle, fontFamily: V.fontMono }}>{r.kwh}</td>
            <td style={{ ...tdStyle, fontFamily: V.fontMono }}>{r.kvah}</td>
            <td style={{ ...tdStyle, fontFamily: V.fontMono }}>{r.kvarh_lag}</td>
            <td style={{ ...tdStyle, fontFamily: V.fontMono }}>{r.kvarh_lead}</td>
            <td style={{ ...tdStyle, fontFamily: V.fontMono }}>{r.md}</td>
            <td style={tdStyle}>{r.recorderName}</td>
            <td style={{ ...tdStyle, color: '#EF4444', fontSize: 12 }}>{r.deletionReason}</td>
            <td style={{ ...tdStyle, fontFamily: V.fontMono, fontSize: 11, color: '#666' }}>{new Date(r.deletionDate).toLocaleString()}</td>
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
  const today         = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const [hoveredRow, setHoveredRow] = useState(null);

  const shift3   = records.filter(r => r.shift === '3');
  const allDates = [...new Set(shift3.map(r => r.date))].sort((a, b) => new Date(b) - new Date(a));

  function getStatsForMeterOnDate(sectionKey, multiplier, mdMultiplier, date) {
    const secRecs    = shift3.filter(r => r.section === sectionKey);
    const dayRecs    = secRecs.filter(r => r.date === date).sort((a, b) => b.timestamp - a.timestamp);
    const prevDate   = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];
    const prevRecs   = secRecs.filter(r => r.date === prevDate).sort((a, b) => b.timestamp - a.timestamp);
    const todayReading = dayRecs.length > 0 ? dayRecs[0].kwh : null;
    const yestReading  = prevRecs.length > 0 ? prevRecs[0].kwh : null;
    const dc = (todayReading !== null && yestReading !== null) ? ((todayReading - yestReading) * multiplier).toFixed(2) : '—';
    const recMonth  = date.slice(0, 7);
    const monthRecs = secRecs.filter(r => r.date?.startsWith(recMonth));
    const maxMD     = monthRecs.length > 0 ? Math.max(...monthRecs.map(r => r.md)) : null;
    const actualMD  = maxMD !== null ? Math.round(maxMD * mdMultiplier) : '—';
    let pf = '—';
    if (dayRecs.length > 0) {
      const { kwh, kvarh_lag, kvarh_lead } = dayRecs[0];
      const lag = kvarh_lag || 0, lead = kvarh_lead || 0;
      const denom = Math.sqrt(kwh * kwh + (lag + lead) * (lag + lead));
      pf = denom > 0 ? (kwh / denom).toFixed(4) : '—';
    }
    return {
      todayReading: todayReading !== null ? todayReading.toFixed(2) : '—',
      yestReading:  yestReading  !== null ? yestReading.toFixed(2)  : '—',
      dc, actualMD, pf,
      time:     dayRecs.length > 0 ? dayRecs[0].time         : '—',
      recorder: dayRecs.length > 0 ? dayRecs[0].recorderName : '—',
      hasData:  dayRecs.length > 0,
    };
  }

  const tdS = { padding: '12px 14px', fontSize: 13, color: '#bbb', fontFamily: V.fontMono, borderBottom: '1px solid #0d0d0d', whiteSpace: 'nowrap' };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 4, height: 28, background: 'linear-gradient(180deg,#10B981,#2563EB)', borderRadius: 4 }} />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Live Dashboard</h2>
            <div style={{ fontSize: 11, color: '#444', fontFamily: V.fontMono, marginTop: 2 }}>SHIFT 3 · {formatDate(today)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => exportShiftSheets(records)} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', padding: '9px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: V.fontDisplay }}>⬇️ Export Shift Sheets</button>
          <button onClick={() => exportMeterWise(records)} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#8B5CF6', padding: '9px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: V.fontDisplay }}>⬇️ Export Meter Sheets</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 28 }}>
        {METERS.map(({ key, label, multiplier, mdMultiplier, color, accent, glow }) => {
          const { todayReading, yestReading, dc, actualMD, pf, hasData } = getStatsForMeterOnDate(key, multiplier, mdMultiplier, today);
          return (
            <div key={key} style={{ background: '#080808', border: `1px solid ${hasData ? color + '33' : '#1a1a1a'}`, borderRadius: 16, padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', boxShadow: hasData ? `0 0 30px ${glow}` : 'none' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${accent})` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}1a`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: V.fontDisplay, letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#444', fontFamily: V.fontMono, marginTop: 1 }}>CONSUMPTION ×{multiplier} · MD ×{mdMultiplier}</div>
                </div>
                <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: hasData ? color : '#222', boxShadow: hasData ? `0 0 8px ${color}` : 'none' }} />
              </div>
              {[
                { icon: '📅', label: 'Today Reading',     value: todayReading, unit: 'kWh', color: '#94A3B8' },
                { icon: '🕐', label: 'Yesterday Reading', value: yestReading,  unit: 'kWh', color: '#64748B' },
                { icon: '⚡', label: 'Daily Consumption', value: dc,           unit: 'kWh', color, bold: true },
                { icon: '📈', label: 'Actual MD',          value: actualMD,    unit: 'kW',  color: accent },
                { icon: '📊', label: 'Power Factor',       value: pf,          unit: 'PF',  color: '#F59E0B' },
              ].map((row, i) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid #111' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>{row.icon}</span>
                    <span style={{ fontSize: 11, color: '#444', fontFamily: V.fontDisplay, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: row.bold ? 16 : 14, fontWeight: row.bold ? 800 : 600, color: row.value !== '—' ? row.color : '#2a2a2a', fontFamily: V.fontMono }}>{row.value}</span>
                    {row.value !== '—' && <span style={{ fontSize: 10, color: '#333', fontFamily: V.fontMono }}>{row.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Historical table */}
      <div style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#444', fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Historical Records</span>
          <span style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, fontFamily: V.fontMono }}>SHIFT 3 ONLY</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#060606' }}>
                {['Time','Section','Today Reading','Yesterday Reading','Daily Consumption','Actual MD','PF','Recorder'].map((h, i) => {
                  const isComputed = i >= 2 && i <= 6;
                  return <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: isComputed ? '#2563EB' : '#2a2a2a', fontFamily: V.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `2px solid ${isComputed ? 'rgba(37,99,235,0.25)' : '#0f0f0f'}`, whiteSpace: 'nowrap', background: isComputed ? 'rgba(37,99,235,0.03)' : 'transparent' }}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {allDates.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#2a2a2a', fontSize: 14 }}>No Shift 3 records found.</td></tr>
                : allDates.map(date => {
                  const isToday     = date === today;
                  const isYesterday = date === yesterdayDate;
                  return (
                    <React.Fragment key={`live-${date}`}>
                      <tr>
                        <td colSpan={8} style={{ padding: '9px 16px', background: 'linear-gradient(90deg,#0d0d0d,#080808)', borderBottom: '1px solid #111', borderTop: '2px solid #111' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ opacity: 0.5, fontSize: 12 }}>📆</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#555', fontFamily: V.fontDisplay, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatDate(date)}</span>
                            {isToday     && <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>TODAY</span>}
                            {isYesterday && <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>YESTERDAY</span>}
                            <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 8, letterSpacing: '0.04em', border: '1px solid rgba(245,158,11,0.25)' }}>S3</span>
                          </span>
                        </td>
                      </tr>
                      {METERS.map(({ key, multiplier, mdMultiplier, color, glow }) => {
                        const { todayReading, yestReading, dc, actualMD, pf, time, recorder, hasData } = getStatsForMeterOnDate(key, multiplier, mdMultiplier, date);
                        const rowId    = `${date}-${key}`;
                        const isHovered= hoveredRow === rowId;
                        return (
                          <tr key={rowId} onMouseEnter={() => setHoveredRow(rowId)} onMouseLeave={() => setHoveredRow(null)} style={{ background: isHovered ? glow : 'transparent', transition: 'background 0.15s' }}>
                            <td style={{ ...tdS, color: '#444', fontSize: 11 }}>{time}</td>
                            <td style={tdS}><SectionBadge section={key} /></td>
                            <td style={{ ...tdS, color: '#94A3B8' }}>{todayReading}</td>
                            <td style={{ ...tdS, color: '#64748B' }}>{yestReading}</td>
                            <td style={{ ...tdS, color: hasData ? color : '#2a2a2a', fontWeight: 700, fontSize: 14 }}>{dc}</td>
                            <td style={{ ...tdS, color: '#3B82F6' }}>{actualMD}</td>
                            <td style={{ ...tdS, color: '#F59E0B' }}>{pf}</td>
                            <td style={{ ...tdS, color: '#555' }}>{recorder}</td>
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
//  EXPORT TAB
// ─────────────────────────────────────────────
// ─── Bill password gate constants ───────────────
const BILL_AUTH_PWD  = 'PEM1234';
const BILL_AUTH_USER = 'Arif Kazi';

// Sub-component: two-step Monthly Bill modal
function MonthlyBillModal({ records, onClose }) {
  // Step 1 — auth
  const [authUser,    setAuthUser]    = useState(BILL_AUTH_USER);
  const [authPwd,     setAuthPwd]     = useState('');
  const [authError,   setAuthError]   = useState('');
  const [authPassed,  setAuthPassed]  = useState(false);

  // Step 2 — bill config
  const [meter, setMeter] = useState('SAPL');
  const [month, setMonth] = useState('');
  const [price, setPrice] = useState('');
  const [exportError, setExportError] = useState('');

  const handleAuth = () => {
    if (authPwd !== BILL_AUTH_PWD) {
      setAuthError('❌ Incorrect password. Access denied.');
      return;
    }
    setAuthError('');
    setAuthPassed(true);
  };

  const handleExport = () => {
    if (!month) return setExportError('Please select a month.');
    if (!price || isNaN(parseFloat(price))) return setExportError('Please enter a valid rate per unit.');
    setExportError('');
    exportMonthlyBill(records, meter, month, parseFloat(price));
    onClose();
  };

  return (
    <Modal
      title="💰 Monthly Bill PDF"
      subtitle={authPassed ? `Authorized as ${BILL_AUTH_USER} · Configure bill details below` : 'Authorization required to generate monthly bill'}
      onClose={onClose}
    >
      {!authPassed ? (
        /* ── STEP 1: Auth Gate ── */
        <>
          {/* Lock icon header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 26, marginBottom: 12 }}>🔐</div>
            <div style={{ fontSize: 13, color: '#555', fontFamily: V.fontDisplay }}>Enter your credentials to unlock bill generation</div>
          </div>

          {/* Authorizer dropdown */}
          <FormField label="Authorizer">
            <Select value={authUser} onChange={e => setAuthUser(e.target.value)}>
              <option value="Arif Kazi">Arif Kazi</option>
            </Select>
          </FormField>

          {/* Password */}
          <FormField label="Authorization Password">
            <PasswordInput
              placeholder="Enter your password"
              value={authPwd}
              onChange={e => { setAuthPwd(e.target.value); setAuthError(''); }}
            />
          </FormField>

          {authError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#EF4444', fontSize: 13, fontFamily: V.fontDisplay }}>
              {authError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
            <Btn
              onClick={handleAuth}
              style={{ flex: 1, background: 'linear-gradient(135deg,#F59E0B,#D97706)', border: 'none' }}
            >
              🔓 Verify & Continue
            </Btn>
          </div>
        </>
      ) : (
        /* ── STEP 2: Bill Config (unlocked) ── */
        <>
          {/* Success badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 13, color: '#10B981', fontFamily: V.fontDisplay, fontWeight: 600 }}>
              Access granted · Authorized by <strong>{BILL_AUTH_USER}</strong>
            </span>
          </div>

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
              style={{ flex: 1, background: 'linear-gradient(135deg,#F59E0B,#D97706)', border: 'none' }}
            >
              📄 Generate Bill PDF
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

function ExportTab({ records }) {
  const [modal,       setModal]       = useState(null);
  const [exportShift, setExportShift] = useState('1');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [month,       setMonth]       = useState('');
  const [singleDate,  setSingleDate]  = useState('');

  const doExport = () => {
    const deleted = storage.get(KEYS.DELETED, []);
    if (modal === 'dateRange')           exportDateRange(records, exportShift, fromDate, toDate);
    else if (modal === 'monthly')        exportMonthly(records, exportShift, month);
    else if (modal === 'singleDate')     exportSingleDatePDF(records, singleDate);
    else if (modal === 'deletedMonthly') exportDeletedMonthly(deleted, month);
    setModal(null);
  };

  const exportCards = [
    { id: 'dateRange',      icon: '📅', color: '#2563EB', title: 'Date Range Export',     desc: 'Export records by date range (Excel)' },
    { id: 'monthly',        icon: '📊', color: '#10B981', title: 'Monthly Export',         desc: 'Export monthly records (Excel)' },
    { id: 'singleDate',     icon: '📄', color: '#8B5CF6', title: 'Single Date Export',     desc: 'Export single date report (PDF)' },
    { id: 'deletedMonthly', icon: '🗑️', color: '#EF4444', title: 'Deleted Records Export', desc: 'Export deleted entries (Monthly)' },
    { id: 'monthlyBill',    icon: '💰', color: '#F59E0B', title: 'Monthly Bill PDF',        desc: 'Password-protected · Authorized by Arif Kazi' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
        {exportCards.map(c => (
          <div key={c.id} onClick={() => setModal(c.id)}
            style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 14, padding: 24, cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s', position: 'relative', overflow: 'hidden' }}
            onMouseOver={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.transform = 'none'; }}>
            {c.id === 'monthlyBill' && (
              <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '2px 7px', fontWeight: 700, fontFamily: V.fontMono }}>🔐 AUTH</div>
            )}
            <div style={{ fontSize: 34, marginBottom: 12 }}>{c.icon}</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: c.color }}>{c.title}</h3>
            <p style={{ fontSize: 13, color: '#555' }}>{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Monthly Bill — special two-step modal */}
      {modal === 'monthlyBill' && (
        <MonthlyBillModal records={records} onClose={() => setModal(null)} />
      )}

      {/* All other export modals */}
      {modal && modal !== 'monthlyBill' && (
        <Modal title={`${exportCards.find(c => c.id === modal)?.icon} ${exportCards.find(c => c.id === modal)?.title}`} subtitle="Configure your export settings" onClose={() => setModal(null)}>
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
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn variant="secondary" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={doExport} style={{ flex: 1 }}>📥 Export</Btn>
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
  { id: 'records', label: '📋 Records' },
  { id: 'deleted', label: '🗑️ Deleted' },
  { id: 'live',    label: '📊 Live Dashboard' },
  { id: 'export',  label: '📥 Export' },
];

export default function ManagerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('records');
  const [records,   setRecords]   = useState([]);

  const loadRecords = useCallback(() => {
    setRecords(storage.get(KEYS.RECORDS, []));
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#f0f0f0', fontFamily: V.fontDisplay }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060606; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
      `}</style>

      <TopHeader title="PEM Energy Manager" subtitle={`Manager Dashboard${user ? ` · ${user}` : ''}`} onLogout={onLogout} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: '#0a0a0a', padding: 6, borderRadius: 12, flexWrap: 'wrap', border: '1px solid #111' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id === 'records' || t.id === 'live') loadRecords(); }}
              style={{ flex: 1, padding: '11px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: V.fontDisplay, transition: 'all 0.2s', minWidth: 120, background: activeTab === t.id ? '#111' : 'transparent', color: activeTab === t.id ? '#f0f0f0' : '#555', borderBottom: activeTab === t.id ? '2px solid #2563EB' : '2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div key={activeTab} style={{ animation: 'fadeIn 0.25s ease' }}>
          {activeTab === 'records' && <RecordsTab records={records} onRecordsChange={loadRecords} />}
          {activeTab === 'deleted' && <DeletedTab />}
          {activeTab === 'live'    && <LiveDashboardTab records={records} />}
          {activeTab === 'export'  && <ExportTab records={records} />}
        </div>
      </div>
    </div>
  );
}