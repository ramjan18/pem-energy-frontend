import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

export function exportDeletedMonthly(deletedRecords, month) {
  const filtered = deletedRecords.filter(r => r.date.startsWith(month));
  const wb = XLSX.utils.book_new();
  const data = [['Date','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Recorder','Deletion Reason','Deleted At']];
  filtered.forEach(r => data.push([r.date, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName, r.deletionReason, new Date(r.deletionDate).toLocaleString()]));
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `Deleted-${month}`);
  XLSX.writeFile(wb, `Deleted_Records_${month}.xlsx`);
}

export function exportShiftSheets(records) {
  const wb = XLSX.utils.book_new();
  for (let shift = 1; shift <= 3; shift++) {
    const shiftRecords = records.filter(r => r.shift === shift.toString());
    const data = [['Date','Time','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
    shiftRecords.forEach(r => data.push([r.date, r.time, r.section, r.shift, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName]));
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `Shift ${shift}`);
  }
  XLSX.writeFile(wb, `Live_Dashboard_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export function exportMonthlyBill(records, meter, month, pricePerUnit) {
  const MULTIPLIERS = { 'SAPL': 70, 'SMRT': 80, 'SMC-HT': 4 };
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

export function exportMeterWise(records) {
  const wb = XLSX.utils.book_new();
  ['SMRT', 'SAPL', 'SMC-HT'].forEach(meter => {
    const meterRecords = records.filter(r => r.section === meter);
    const data = [['Date','Time','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
    meterRecords.forEach(r => data.push([r.date, r.time, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName]));
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, meter);
  });
  const allData = [['Date','Time','Section','Shift','KWH','KVAH','KVARH Lag','KVARH Lead','MD','Record Taker']];
  records.forEach(r => allData.push([r.date, r.time, r.section, `Shift ${r.shift}`, r.kwh, r.kvah, r.kvarh_lag, r.kvarh_lead, r.md, r.recorderName]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allData), 'All Records');
  XLSX.writeFile(wb, `Meter_Wise_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
}