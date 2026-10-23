import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import i18n from '../i18n';
import { urlToDataUrl } from './pdfWhatsappShare';
import { REPORT_LOGOS, REPORT_FOOTER } from '../components/common/LetterheadLogos';

// Helper to get a translated string, falling back to the provided default
const pt = (key: string, fallback: string, options?: Record<string, any>): string => {
  const val = i18n.t(key, options);
  return val && val !== key ? val : fallback;
};

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
  sheetName = 'Report',
  summaryRows?: { label: string; value: string | number }[]
) {
  const data: (string | number | undefined | null)[][] = [];

  // Optional key-value summary at the top (used by some reports)
  if (summaryRows && summaryRows.length > 0) {
    data.push(['Metric', 'Value']);
    data.push(...summaryRows.map(r => [r.label, r.value]));
    data.push([]);
  }

  data.push(columns, ...rows);
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
// Corner logos shown at the top-left (One Touch) / top-right (Smartinn) of every report PDF
const CORNER_LOGOS = REPORT_LOGOS;
type LoadedImage = { data: string; width: number; height: number };
const imageCache: Record<string, Promise<LoadedImage | null>> = {};

/** Loads a local image for jsPDF; `png` keeps transparency (footer badge / icons) */
function loadImage(src: string, png = false): Promise<LoadedImage | null> {
  if (!imageCache[src]) {
    imageCache[src] = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve({ data: png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92), width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => resolve(null); // a missing logo must never block the export
      img.src = src;
    });
  }
  return imageCache[src];
}

/** Load any image (png/webp/jpeg, local or backend) and re-encode it as JPEG on white for jsPDF. */
async function toPdfJpeg(url: string): Promise<LoadedImage | null> {
  try {
    // Cache-buster: the same photo is usually already cached from an on-screen <img> (loaded without CORS),
    // and reusing that cached copy makes the cross-origin fetch fail.
    const fresh = url.startsWith('data:') ? url : `${url}${url.includes('?') ? '&' : '?'}pdf=1`;
    const dataUrl = await urlToDataUrl(fresh);
    if (!dataUrl) return null;
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height });
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
}

export interface PdfImageColumn {
  /** index of the column that shows the image (its cell text is ignored) */
  index: number;
  /** image URL for each row, in the same order as `rows` ('' = no image) */
  urls: string[];
}

export async function exportToPDF(
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  title: string,
  summaryRows?: { label: string; value: string | number }[],
  imageColumn?: PdfImageColumn
) {
  const doc = new jsPDF({ orientation: columns.length > 7 ? 'landscape' : 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const pageHeight = doc.internal.pageSize.getHeight();

  // Letterhead on every page: One Touch top-left (34mm tall), smaller Smartinn banner top-right (38mm wide),
  // centred on the One Touch logo like the printed letterhead
  const [leftLogo, rightLogo, fBadge, fPin, fWhatsapp] = await Promise.all([
    loadImage(CORNER_LOGOS.left), loadImage(CORNER_LOGOS.right),
    loadImage(REPORT_FOOTER.badge, true), loadImage(REPORT_FOOTER.pinIcon, true), loadImage(REPORT_FOOTER.whatsappIcon, true),
  ]);
  const logoHeight = 34;
  const rightLogoWidth = 38;
  const drawLetterhead = () => {
    if (leftLogo) doc.addImage(leftLogo.data, 'JPEG', 14, 8, logoHeight * (leftLogo.width / leftLogo.height), logoHeight);
    if (rightLogo) {
      const h = rightLogoWidth * (rightLogo.height / rightLogo.width);
      doc.addImage(rightLogo.data, 'JPEG', pageWidth - 14 - rightLogoWidth, 8 + (logoHeight - h) / 2, rightLogoWidth, h);
    }
  };

  // Green address band at the bottom of every page, with the round One Touch badge overlapping it
  const bandH = 13;
  const bandY = pageHeight - 24;
  const drawFooter = () => {
    doc.setFillColor(REPORT_FOOTER.color);
    doc.rect(0, bandY, pageWidth, bandH, 'F');
    const badge = 24, mid = bandY + bandH / 2;
    if (fBadge) doc.addImage(fBadge.data, 'PNG', 16, mid - badge / 2, badge, badge);
    if (fPin) doc.addImage(fPin.data, 'PNG', 46, mid - 3.5, 7, 7);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(REPORT_FOOTER.addressLines, 55, mid - 1.2, { lineHeightFactor: 1.15 });
    doc.setFontSize(14);
    const phoneX = pageWidth - 16;
    doc.text(REPORT_FOOTER.whatsapp, phoneX, mid + 1.8, { align: 'right' });
    if (fWhatsapp) doc.addImage(fWhatsapp.data, 'PNG', phoneX - doc.getTextWidth(REPORT_FOOTER.whatsapp) - 8, mid - 3, 6, 6);
    doc.setTextColor(0, 0, 0);
  };
  drawLetterhead();

  // Row images (each distinct URL is loaded once)
  const rowImages: (LoadedImage | null)[] = [];
  if (imageColumn) {
    const unique = [...new Set(imageColumn.urls.filter(Boolean))];
    const loaded = await Promise.all(unique.map(toPdfJpeg));
    const byUrl = new Map(unique.map((u, i) => [u, loaded[i]]));
    imageColumn.urls.forEach((u, i) => { rowImages[i] = u ? byUrl.get(u) ?? null : null; });
  }
  const thumb = 12; // mm

  // Title (centred between the logos)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  // shrink long titles so they stay between the two logos
  const leftW = leftLogo ? logoHeight * (leftLogo.width / leftLogo.height) : 0;
  const rightW = rightLogo ? rightLogoWidth : 0;
  const titleRoom = pageWidth - 28 - leftW - rightW - 8;
  let titleSize = 16;
  while (titleSize > 10 && doc.getTextWidth(title) > titleRoom) { titleSize -= 1; doc.setFontSize(titleSize); }
  doc.text(title, pageWidth / 2, 23, { align: 'center' });

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${pt('pdf.generated', 'Generated')}: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 31, { align: 'center' });

  let startY = 50;

  // Summary section
  if (summaryRows && summaryRows.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(pt('pdf.summary', 'Summary'), 14, startY);
    startY += 6;

    autoTable(doc, {
      startY,
      head: [[pt('pdf.metric', 'Metric'), pt('pdf.value', 'Value')]],
      body: summaryRows.map(r => [r.label, String(r.value)]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 14, top: 48, bottom: 36 },
      didDrawPage: (data: any) => { if (data.pageNumber > 1) drawLetterhead(); },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Main table
  autoTable(doc, {
    startY,
    head: [columns],
    body: rows.map(r => r.map((cell, c) => (imageColumn && c === imageColumn.index ? '' : String(cell)))),
    theme: 'striped',
    ...(imageColumn ? {
      columnStyles: { [imageColumn.index]: { cellWidth: thumb + 4, minCellHeight: thumb + 4 } },
      didDrawCell: (data: any) => {
        if (data.section !== 'body' || data.column.index !== imageColumn.index) return;
        const img = rowImages[data.row.index];
        if (!img) return;
        const scale = Math.min(thumb / img.width, thumb / img.height);
        const w = img.width * scale, h = img.height * scale;
        doc.addImage(img.data, 'JPEG', data.cell.x + (data.cell.width - w) / 2, data.cell.y + (data.cell.height - h) / 2, w, h);
      },
    } : {}),
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 14, right: 14, top: 48, bottom: 36 }, // continuation pages start below the letterhead, end above the footer band
    didDrawPage: (data: any) => {
      if (data.pageNumber > 1) drawLetterhead();
    },
  });

  // Footer page numbers, added once the total page count is known
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    drawFooter();
    doc.setFontSize(8);
    doc.text(
      pt('pdf.page_of', `Page ${page} of ${pageCount}`, { current: page, total: pageCount }),
      pageWidth / 2,
      bandY - 4,
      { align: 'center' }
    );
  }

  doc.save(`${filename}.pdf`);
}
