import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';

export function calculateBaselinePF(current, baseline) {
  if (!current || !baseline) return null;
  const deltaKWH = Number(current.kwh) - Number(baseline.kwh);
  const deltaLag = Number(current.kvarh_lag || 0) - Number(baseline.kvarh_lag || 0);
  const deltaLead = Number(current.kvarh_lead || 0) - Number(baseline.kvarh_lead || 0);
  const denominator = Math.sqrt(deltaKWH ** 2 + (deltaLag + deltaLead) ** 2);
  if (!Number.isFinite(denominator) || deltaKWH <= 0 || denominator === 0) return null;
  return Math.round((deltaKWH / denominator) * 10000) / 10000;
}

export function exportDateRange(records, shift, fromDate, toDate) {
  const filtered = records.filter(r => {
    return r.shift === shift && r.date >= fromDate && r.date <= toDate;
  });
  const wb = XLSX.utils.book_new();
  const data = [['Date','Time','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
  filtered.forEach(r => data.push([r.date, r.time, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName]));
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `Shift ${shift}`);
  XLSX.writeFile(wb, `DateRange_Shift${shift}_${fromDate}_to_${toDate}.xlsx`);
}

export function exportMonthly(records, shift, month) {
  const filtered = records.filter(r => r.shift === shift && r.date.startsWith(month));
  const wb = XLSX.utils.book_new();
  const data = [['Date','Time','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
  filtered.forEach(r => data.push([r.date, r.time, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName]));
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `Shift ${shift} - ${month}`);
  XLSX.writeFile(wb, `Monthly_Shift${shift}_${month}.xlsx`);
}

export function exportSingleDatePDF(records, date) {
  const meterGroups = [
    { name: 'SAPL', aliases: ['SAPL', 'SCIPL'], consumptionMF: 70, mdMF: 70 },
    { name: 'SMRT', aliases: ['SMRT'], consumptionMF: 10, mdMF: 10 },
    { name: 'SMC-HT', aliases: ['SMC-HT', 'SMC'], consumptionMF: 4, mdMF: 4 },
  ];
  const selectedDateRecords = records.filter(reading => reading.date === date);
  if (!selectedDateRecords.length) throw new Error(`No readings found for ${date}.`);

  const getGroup = (section) => meterGroups.find(group => group.aliases.includes(section));
  const dateShiftReadings = new Map();
  for (const reading of selectedDateRecords) {
    const group = getGroup(reading.section);
    if (!group) continue;
    const key = `${group.name}|${reading.shift}`;
    const existing = dateShiftReadings.get(key);
    if (!existing || Number(reading.timestamp || 0) > Number(existing.timestamp || 0)) dateShiftReadings.set(key, reading);
  }

  const recordsByMeter = new Map(meterGroups.map(group => [
    group.name,
    records.filter(reading => getGroup(reading.section)?.name === group.name)
  ]));
  const previousReadingFor = (group, current) => {
    const currentShift = Number(current.shift);
    return (recordsByMeter.get(group.name) || [])
      .filter(reading => reading.date < current.date || (
        reading.date === current.date && (
          Number(reading.shift) < currentShift ||
          (Number(reading.shift) === currentShift && Number(reading.timestamp || 0) < Number(current.timestamp || 0))
        )
      ))
      .sort((a, b) => a.date.localeCompare(b.date) || Number(a.shift) - Number(b.shift) || Number(a.timestamp || 0) - Number(b.timestamp || 0))
      .at(-1);
  };
  const readingMF = (reading, group) => Number.isFinite(Number(reading.multiplier)) && reading.multiplier !== null && reading.multiplier !== ''
    ? Number(reading.multiplier)
    : group.consumptionMF;
  const shiftConsumptionFor = (group, reading) => {
    if (!reading) return null;
    const previous = previousReadingFor(group, reading);
    if (!previous) return null;
    const difference = Number(reading.kwh) - Number(previous.kwh);
    return Number.isFinite(difference) && difference >= 0 ? difference * readingMF(reading, group) : null;
  };
  const fmt = (value, digits = 2) => value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toFixed(digits);
  const dateObj = new Date(`${date}T00:00:00`);
  const dateLabel = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dayLabel = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
  const recorderNames = [...new Set(selectedDateRecords.map(reading => reading.recorderName).filter(Boolean))];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  doc.setFillColor(12, 20, 36);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, 8, 11, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PEM', margin + 5.5, 15.2, { align: 'center' });
  doc.setFontSize(17);
  doc.text('SINGLE DATE SHIFT REPORT', margin + 17, 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(185, 199, 219);
  doc.setFontSize(9);
  doc.text('PEM ENERGY MANAGEMENT SYSTEM', margin + 17, 21);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, 21, { align: 'right' });

  doc.setFillColor(243, 247, 252);
  doc.setDrawColor(220, 228, 240);
  doc.roundedRect(margin, 40, pageWidth - margin * 2, 17, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('DATE', margin + 5, 46);
  doc.text('DAY', margin + 68, 46);
  doc.text('RECORDER', margin + 121, 46);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(dateLabel, margin + 5, 52);
  doc.text(dayLabel, margin + 68, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const recorderLabel = recorderNames.length ? recorderNames.join(', ') : '—';
  doc.text(doc.splitTextToSize(recorderLabel, 62).slice(0, 1), margin + 121, 52);

  let cursorY = 64;
  const shiftRows = [];
  const formatReading = (value) => value === null || value === undefined || value === '' ? '—' : fmt(value);
  for (let shift = 1; shift <= 3; shift++) {
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(margin, cursorY, 5, 6, 1, 1, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`SHIFT ${shift}`, margin + 9, cursorY + 4.7);
    const body = meterGroups.map(group => {
      const reading = dateShiftReadings.get(`${group.name}|${shift}`);
      const consumption = shiftConsumptionFor(group, reading);
      if (consumption !== null) shiftRows.push({ group: group.name, shift, consumption });
      return [
        group.name,
        formatReading(reading?.kwh),
        formatReading(reading?.kvah),
        formatReading(reading?.kvarh_lag),
        formatReading(reading?.kvarh_lead),
        formatReading(reading?.md),
        fmt(consumption),
      ];
    });
    doc.autoTable({
      startY: cursorY + 7,
      margin: { left: margin, right: margin },
      head: [['METER', 'KWH', 'KVAH', 'KVARH LAG', 'KVARH LEAD', 'MD', `SHIFT ${shift} CONSUMPTION`]],
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.2, cellPadding: 2, textColor: [30, 41, 59], lineColor: [222, 229, 238], lineWidth: 0.15, halign: 'right' },
      headStyles: { fillColor: [235, 241, 250], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 27 }, 1: { cellWidth: 23 }, 2: { cellWidth: 23 }, 3: { cellWidth: 26 }, 4: { cellWidth: 27 }, 5: { cellWidth: 17 }, 6: { cellWidth: 39, fontStyle: 'bold', textColor: [29, 78, 216] } },
      didParseCell: data => {
        if (data.section === 'body' && data.cell.raw === '—') data.cell.styles.textColor = [148, 163, 184];
      },
    });
    cursorY = doc.lastAutoTable.finalY + 5;
  }

  if (cursorY > 218) {
    doc.addPage();
    cursorY = 18;
  }
  const shiftConsumptionByMeter = new Map(meterGroups.map(group => [
    group.name,
    shiftRows.filter(row => row.group === group.name).reduce((sum, row) => sum + row.consumption, 0)
  ]));
  const summaryRows = meterGroups.map(group => {
    const dayReadings = [...dateShiftReadings.entries()]
      .filter(([key]) => key.startsWith(`${group.name}|`))
      .map(([, reading]) => reading);
    const maxMD = dayReadings.length ? Math.max(...dayReadings.map(reading => Number(reading.md) || 0)) * group.mdMF : null;
    const pfCurrent = dateShiftReadings.get(`${group.name}|3`);
    const baselineDate = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), 0)).toISOString().slice(0, 10);
    const baseline = (recordsByMeter.get(group.name) || []).find(reading => reading.date === baselineDate && String(reading.shift) === '3');
    const pf = calculateBaselinePF(pfCurrent, baseline);
    return [group.name, fmt(shiftConsumptionByMeter.get(group.name)), pf === null ? '—' : pf.toFixed(4), fmt(maxMD)];
  });
  const totalConsumption = [...shiftConsumptionByMeter.values()].reduce((sum, value) => sum + value, 0);
  doc.setFillColor(12, 20, 36);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 8, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("TODAY'S CONSUMPTION · PF · ACTUAL MD", margin + 4, cursorY + 5.4);
  doc.autoTable({
    startY: cursorY + 9,
    margin: { left: margin, right: margin },
    head: [['METER', "TODAY'S CONSUMPTION", 'TODAY\'S PF', "TODAY'S ACTUAL MD" ]],
    body: summaryRows,
    foot: [['TOTAL', fmt(totalConsumption), '—', '—']],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.4, textColor: [30, 41, 59], lineColor: [222, 229, 238], lineWidth: 0.15 },
    headStyles: { fillColor: [235, 241, 250], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 7 },
    footStyles: { fillColor: [239, 246, 255], textColor: [29, 78, 216], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' }, 1: { cellWidth: 51, halign: 'right' }, 2: { cellWidth: 36, halign: 'right' }, 3: { cellWidth: 53, halign: 'right' } },
  });
  doc.setTextColor(120, 135, 154);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('PF uses the same monthly baseline calculation as the PF Calculation Sheet. Shift consumption uses the current reading MF.', margin, doc.lastAutoTable.finalY + 6);
  doc.save(`Single_Date_Report_${date}.pdf`);
}

export function exportDeletedMonthly(deletedRecords, month) {
  const filtered = deletedRecords.filter(r => r.date.startsWith(month));
  const wb = XLSX.utils.book_new();
  const data = [['Date','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Recorder','Deletion Reason','Deleted At']];
  filtered.forEach(r => data.push([r.date, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName, r.deletionReason, new Date(r.deletionDate).toLocaleString()]));
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `Deleted-${month}`);
  XLSX.writeFile(wb, `Deleted_Records_${month}.xlsx`);
}

export function exportMonthlyBill(records, meter, month, pricePerUnit) {
  const MULTIPLIERS = { 'SAPL': 70, 'SMRT': 10, 'SMC-HT': 4 };
  const multiplier = MULTIPLIERS[meter] || 1;

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

  const dailyRows = [];
  for (let i = 0; i < meterRecs.length; i++) {
    const rec     = meterRecs[i];
    const prevKwh = i === 0 ? initialReading : meterRecs[i - 1].kwh;
    const consumption = ((rec.kwh - prevKwh) * multiplier).toFixed(2);
    const [y, m, d]   = rec.date.split('-');
    dailyRows.push({
      date:        `${d}-${m}-${y}`,
      reading:     rec.kwh.toFixed(2),
      prevReading: prevKwh.toFixed(2),
      consumption: parseFloat(consumption),
    });
  }

  const totalConsumption = dailyRows.reduce((s, r) => s + r.consumption, 0).toFixed(2);
  const totalCost        = (parseFloat(totalConsumption) * pricePerUnit).toFixed(2);
  const numDays          = meterRecs.length;

  const [my, mm] = month.split('-');
  const monthName = new Date(parseInt(my), parseInt(mm) - 1, 1)
    .toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const fmt = (dateStr) => { const [y, m, d] = dateStr.split('-'); return `${d}-${m}-${y}`; };

  // ── Build PDF ──
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw  = doc.internal.pageSize.getWidth();

  // Dark header bar
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

  // Blue title strip
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 42, pw, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`${meter} — ${monthName}`, pw / 2, 49, { align: 'center' });

  // Info card box
  let y = 60;
  doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pw - 28, 54, 3, 3, 'FD');

  const col1 = 20, col2 = pw / 2 + 4, lY = y + 10;

  const lbl = (txt, cx, cy) => {
    doc.setTextColor(71, 85, 105); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(txt, cx, cy);
  };
  const val = (txt, cx, cy, sz = 13) => {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42); doc.setFontSize(sz);
    doc.text(txt, cx, cy);
  };

  lbl('METER', col1, lY);              lbl('BILLING MONTH', col2, lY);
  val(meter, col1, lY + 7);            val(monthName, col2, lY + 7);
  lbl('DATE RANGE', col1, lY + 18);    lbl('METER MULTIPLIER', col2, lY + 18);
  val(`${fmt(firstDate)}  to  ${fmt(lastDate)}`, col1, lY + 25, 11);
  val(`x${multiplier}`, col2, lY + 25, 11);
  lbl('DAYS RECORDED', col1, lY + 36); lbl('RATE PER UNIT (KWh)', col2, lY + 36);
  val(`${numDays} days`, col1, lY + 43, 11);
  val(`Rs. ${parseFloat(pricePerUnit).toFixed(2)} / kWh`, col2, lY + 43, 11);

  // 3 coloured reading boxes
  y = 122;
  const boxW = (pw - 42) / 3;
  [
    { label: 'INITIAL READING (kWh)', value: parseFloat(initialReading).toFixed(2), color: [59, 130, 246] },
    { label: 'FINAL READING (kWh)',   value: parseFloat(lastReading).toFixed(2),    color: [16, 185, 129] },
    { label: 'GROSS DIFF (Raw kWh)',  value: (lastReading - initialReading).toFixed(2), color: [139, 92, 246] },
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

  // Daily consumption table
  y = 153;
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Daily Consumption Details', 14, y);
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.5);
  doc.line(14, y + 2, 80, y + 2);

  doc.autoTable({
    startY: y + 6,
    head: [['Date', 'Prev. Reading (kWh)', 'Current Reading (kWh)', `Daily Consumption (x${multiplier} kWh)`]],
    body: dailyRows.map(r => [r.date, r.prevReading, r.reading, r.consumption.toFixed(2)]),
    styles:             { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    headStyles:         { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
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
      { content: '',       styles: { fillColor: [15, 23, 42] } },
      { content: '',       styles: { fillColor: [15, 23, 42] } },
      { content: totalConsumption + ' kWh', styles: { fontStyle: 'bold', fillColor: [37, 99, 235], textColor: [255, 255, 255], halign: 'right' } },
    ]],
    showFoot: 'lastPage',
  });

  // Summary bill box
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
  doc.text(
    `Rs. ${parseFloat(totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    sc3, sr2, { align: 'center' }
  );

  doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.4);
  doc.line(pw / 2 - 20, sY + 14, pw / 2 - 20, sY + 42);
  doc.line(pw / 2 + 30, sY + 14, pw / 2 + 30, sY + 42);

  // Footer
  const fY = sY + 56;
  doc.setTextColor(148, 163, 184); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('PEM Energy Management System  •  Authorized by: Kazi Sir  •  Confidential', pw / 2, fY, { align: 'center' });
  doc.text(`System-generated bill for ${meter} meter — ${monthName}`, pw / 2, fY + 6, { align: 'center' });

  doc.save(`MonthlyBill_${meter}_${month}.pdf`);
}

export async function exportMeterWise(records = [], filePrefix = 'Meter_Wise_Export', year = null) {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties = { fullCalcOnLoad: true, forceFullCalc: true };
  const sourceRecords = Array.isArray(records) ? records : [];
  const sheetDefinitions = [
    { name: 'SCIPL', sections: ['SAPL', 'SCIPL'], start: `${year - 1}-12-31`, end: `${year}-12-31`, pMultiplier: 70, qMultiplier: 70, firstPMultiplier: 80, firstQMultiplier: 80 },
    { name: 'SMRT', sections: ['SMRT'], start: `${year - 1}-12-31`, end: `${year}-12-30`, pMultiplier: 10, qMultiplier: 10 },
    { name: 'SMC', sections: ['SMC-HT', 'SMC'], start: `${year - 1}-12-31`, end: `${year}-12-31`, pMultiplier: 4, qMultiplier: 80 }
  ];
  const border = { left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };
  const headers = ['Date', 'Day/Night Shift', 'KWH', 'KVAH', 'KVARH lag', 'KVARH Lead', 'MD', 'Baseline Date', 'KWH', 'KVARH lag', 'KVARH Lead', 'Cons.', 'Kvarh Lag', 'Kvarh Lead', 'Power Factor', 'KWH cons.', 'Actual MD'];

  sheetDefinitions.forEach(definition => {
    const readingsByDate = new Map(
      sourceRecords
        .filter(record => definition.sections.includes(record.section) && String(record.shift) === '3')
        .map(record => [record.date, record])
    );
    const worksheet = workbook.addWorksheet(definition.name);
    worksheet.columns = [14, 18, 14, 14, 16, 16, 12, 14, 14, 16, 16, 14, 14, 14, 16, 16, 14].map(width => ({ width }));
    worksheet.addRows([[], [], []]);
    worksheet.addRow(['PF Calculation sheet']);
    worksheet.mergeCells('A4:Q4');
    worksheet.getRow(4).height = 34.2;
    worksheet.getCell('A4').font = { name: 'Calibri', size: 26, bold: true };
    worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 18;
    headerRow.font = { name: 'Calibri', size: 12, bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    headerRow.eachCell(cell => { cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'thin' }, bottom: { style: 'medium' } }; });

    const start = new Date(`${definition.start}T00:00:00Z`);
    const end = new Date(`${definition.end}T00:00:00Z`);
    const dates = [];
    for (let date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) dates.push(date.toISOString().slice(0, 10));
    const rowByDate = new Map(dates.map((date, index) => [date, index + 6]));

    dates.forEach((date, index) => {
      const rowNumber = index + 6;
      const reading = readingsByDate.get(date);
      const [readingYear, readingMonth] = date.split('-').map(Number);
      const previousMonthEnd = new Date(Date.UTC(readingYear, readingMonth - 1, 0)).toISOString().slice(0, 10);
      // January's December baseline is outside an annual sheet, so retain the first row as its usable reference.
      const baselineRow = rowByDate.get(previousMonthEnd) ?? 6;
      const row = worksheet.addRow([
        new Date(`${date}T00:00:00Z`), String(reading?.shift ?? ''), reading?.kwh ?? '', reading?.kvah ?? '', reading?.kvarh_lag ?? '', reading?.kvarh_lead ?? '', reading?.md ?? '',
        { formula: `DATE(YEAR(A${rowNumber}),MONTH(A${rowNumber}),1)-1` }, { formula: `$C$${baselineRow}` }, { formula: `$E$${baselineRow}` }, { formula: `$F$${baselineRow}` },
        { formula: `C${rowNumber}-I${rowNumber}` }, { formula: `E${rowNumber}-J${rowNumber}` }, { formula: `F${rowNumber}-K${rowNumber}` },
        { formula: `L${rowNumber}/SQRT(L${rowNumber}^2+(M${rowNumber}+N${rowNumber})^2)` },
        { formula: `(C${rowNumber}-C${rowNumber - 1})*${rowNumber === 6 && definition.firstPMultiplier ? definition.firstPMultiplier : definition.pMultiplier}` },
        { formula: `G${rowNumber}*${rowNumber === 6 && definition.firstQMultiplier ? definition.firstQMultiplier : definition.qMultiplier}` }
      ]);
      row.eachCell({ includeEmpty: true }, cell => { cell.border = border; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
      worksheet.getCell(`A${rowNumber}`).numFmt = 'mm-dd-yy';
      worksheet.getCell(`H${rowNumber}`).numFmt = 'mm-dd-yy';
      worksheet.getCell(`O${rowNumber}`).numFmt = '0.0000';
      worksheet.getCell(`P${rowNumber}`).numFmt = '0.00';
      worksheet.getCell(`Q${rowNumber}`).numFmt = '0.00';
    });
    worksheet.autoFilter = `A5:Q${worksheet.rowCount}`;
    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 5, topLeftCell: 'C6', zoomScale: 81 }];
  });

  const documentation = workbook.addWorksheet('Documentation');
  documentation.columns = [{ width: 12 }, { width: 22 }, { width: 54 }, { width: 58 }];
  documentation.addRow(['Column', 'Header', 'Description', 'Excel formula']);
  documentation.getRow(1).font = { bold: true };
  documentation.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
  const descriptions = [
    ['A', 'Date', 'Reading date.', 'Raw meter-reading date'], ['B', 'Day/Night Shift', 'Shift recorded for the reading.', 'Raw meter-reading shift'], ['C', 'KWH', 'Raw active-energy meter reading.', 'Raw meter reading'], ['D', 'KVAH', 'Raw apparent-energy meter reading.', 'Raw meter reading'], ['E', 'KVARH lag', 'Raw lagging reactive-energy meter reading.', 'Raw meter reading'], ['F', 'KVARH Lead', 'Raw leading reactive-energy meter reading.', 'Raw meter reading'], ['G', 'MD', 'Raw maximum-demand meter reading.', 'Raw meter reading'], ['H', 'Baseline Date', 'Always the final calendar date of the previous month.', '=DATE(YEAR(A6),MONTH(A6),1)-1'], ['I', 'KWH', 'KWH reading from the final date of the previous month.', '=$C$<previous-month final row>'], ['J', 'KVARH lag', 'Lag reading from the final date of the previous month.', '=$E$<previous-month final row>'], ['K', 'KVARH Lead', 'Lead reading from the final date of the previous month.', '=$F$<previous-month final row>'], ['L', 'Cons.', 'KWH consumption since the monthly baseline.', '=C6-I6'], ['M', 'Kvarh Lag', 'Lagging reactive-energy difference from the baseline.', '=E6-J6'], ['N', 'Kvarh Lead', 'Leading reactive-energy difference from the baseline.', '=F6-K6'], ['O', 'Power Factor', 'Power factor as a decimal, not a percentage.', '=L6/SQRT(L6^2+(M6+N6)^2)'], ['P', 'KWH cons.', 'Consumption since the previous row, scaled for the meter.', 'SCIPL P6: =(C6-C5)*80; SCIPL P7 onward: =(C7-C6)*70; SMRT: =(C6-C5)*10; SMC: =(C6-C5)*4'], ['Q', 'Actual MD', 'Maximum demand scaled for the meter.', 'SCIPL Q6: =G6*80; SCIPL Q7 onward: =G7*70; SMRT: =G6*10; SMC: =G6*80']
  ];
  descriptions.forEach(entry => documentation.addRow(entry));
  documentation.eachRow(row => row.eachCell(cell => { cell.alignment = { vertical: 'top', wrapText: true }; cell.border = border; }));

  // Write the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filePrefix}_${new Date().toISOString().slice(0,10)}.xlsx`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

export function exportPFCalculationSheet(records = [], year) {
  const selectedYear = Number(year);
  if (!Number.isInteger(selectedYear) || selectedYear < 2020) {
    throw new Error('A valid year from 2020 is required.');
  }

  return exportMeterWise(records, `PF ${selectedYear} (Autosaved)`, selectedYear);
}
