import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export tabular data to an Excel (.xlsx) file.
 * @param columns - Array of column header strings
 * @param rows - 2D array of cell values
 * @param filename - Output filename (without extension)
 * @param sheetName - Optional worksheet name
 */
export function exportToExcel(
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  sheetName = 'Report'
) {
  const data = [columns, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-size columns
  const colWidths = columns.map((col, i) => {
    const maxLen = Math.max(
      col.length,
      ...rows.map(r => String(r[i] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export tabular data to a PDF file.
 * @param columns - Array of column header strings
 * @param rows - 2D array of cell values
 * @param filename - Output filename (without extension)
 * @param title - Report title shown at the top
 * @param summaryRows - Optional key-value summary rows to show before the table
 */
export function exportToPDF(
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  title: string,
  summaryRows?: { label: string; value: string | number }[]
) {
  const doc = new jsPDF({ orientation: columns.length > 7 ? 'landscape' : 'portrait' });

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);

  let startY = 34;

  // Summary section
  if (summaryRows && summaryRows.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, startY);
    startY += 6;

    autoTable(doc, {
      startY,
      head: [['Metric', 'Value']],
      body: summaryRows.map(r => [r.label, String(r.value)]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 14 },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Main table
  autoTable(doc, {
    startY,
    head: [columns],
    body: rows.map(r => r.map(cell => String(cell))),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => {
      // Footer with page number
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  doc.save(`${filename}.pdf`);
}
