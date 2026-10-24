import { printDocument, esc } from './printDocument';
import type { PdfImageColumn } from './exportUtils';

/** Money / number cells are right-aligned */
const NUMERIC = /^-?\s*(Rs\s*)?-?[\d,]+(\.\d+)?%?$/;

/**
 * Prints a report table on the letterhead. Takes the same arguments as exportToPDF,
 * so every report prints exactly what its PDF contains.
 */
export function printReport(
  columns: string[],
  rows: (string | number)[][],
  _filename: string,
  title: string,
  summaryRows?: { label: string; value: string | number }[],
  imageColumn?: PdfImageColumn,
) {
  const head = columns.map((c) => `<th>${esc(c)}</th>`).join('');
  const body = rows.length === 0
    ? `<tr><td colspan="${columns.length}" class="c" style="color:#777">No data</td></tr>`
    : rows.map((r, ri) => `<tr>${r.map((cell, ci) => {
        if (imageColumn && ci === imageColumn.index) {
          const url = imageColumn.urls[ri];
          return `<td class="c">${url ? `<img src="${esc(url)}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:4px">` : ''}</td>`;
        }
        const text = String(cell ?? '');
        return `<td${NUMERIC.test(text.trim()) ? ' class="r"' : ''}>${esc(text)}</td>`;
      }).join('')}</tr>`).join('');
  const summary = summaryRows && summaryRows.length
    ? `<table class="info" style="margin-bottom:14px;width:auto"><tbody>${summaryRows.map((s) => `<tr><th style="width:auto;padding-right:24px">${esc(s.label)}</th><td>${esc(String(s.value))}</td></tr>`).join('')}</tbody></table>`
    : '';
  const landscape = columns.length > 7 ? '<style>@page{size:A4 landscape}</style>' : '';
  const printed = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  printDocument(title, title.toUpperCase(), `${rows.length} row(s) - printed ${printed}`, `${landscape}${summary}
    <table style="font-size:12px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
}
