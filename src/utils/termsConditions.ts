import api from '../services/api';
import { esc } from './printDocument';

/** Section headings in the terms text (a line on its own) */
const SECTION_HEADINGS = ['notes', 'terms & conditions', 'terms and conditions', 'acknowledgment', 'acknowledgement'];

/**
 * Turns the stored terms text into print HTML. One item per line:
 * "- text" = bullet, "1: Payment" = numbered heading, "Notes" / "Terms & Conditions" / "Acknowledgment" = section heading,
 * a line with "____" = signature line, a line ending in ":" = bold lead-in, anything else = paragraph.
 */
export function termsToHtml(content: string): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.join('')}</ul>`); list = []; } };
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('- ')) { list.push(`<li>${esc(line.slice(2))}</li>`); continue; }
    flush();
    const numbered = line.match(/^(\d+)\s*[:.)]\s*(.+)$/);
    if (SECTION_HEADINGS.includes(line.toLowerCase())) out.push(`<h3>${esc(line)}</h3>`);
    else if (numbered) out.push(`<h4>${esc(numbered[1])}. ${esc(numbered[2])}</h4>`);
    else if (line.includes('___')) out.push(`<p class="tc-sign">${esc(line)}</p>`);
    else if (line.endsWith(':')) out.push(`<p><strong>${esc(line)}</strong></p>`);
    else out.push(`<p>${esc(line)}</p>`);
  }
  flush();
  return out.join('');
}

/** The stored terms text ('' when none are set or they can't be loaded) */
export async function loadTermsContent(): Promise<string> {
  try {
    const { data } = await api.get<{ content: string }>('/terms-conditions');
    return data?.content?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Terms & conditions as the last page(s) of a printed document ('' when none are set or they can't be loaded).
 * Pass `customContent` (terms edited for one quotation) to print those instead of the company's standard terms.
 */
export async function loadTermsPrintHtml(customContent?: string | null): Promise<string> {
  try {
    const data = customContent && customContent.trim()
      ? { content: customContent }
      : (await api.get<{ content: string }>('/terms-conditions')).data;
    if (!data?.content?.trim()) return '';
    return `<style>
      .tc{page-break-before:always;break-before:page;font-size:11.5px;line-height:1.45;color:#222}
      .tc h2{text-align:center;font-size:18px;letter-spacing:1px;margin:0 0 10px}
      .tc h3{font-size:14px;margin:14px 0 4px;border-bottom:1px solid #999;padding-bottom:2px}
      .tc h4{font-size:12.5px;margin:10px 0 2px}
      .tc ul{margin:2px 0 4px;padding-left:20px}.tc li{margin:1px 0}
      .tc p{margin:3px 0}.tc .tc-sign{margin-top:22px;font-size:13px}
      .tc h3,.tc h4{break-after:avoid;page-break-after:avoid}.tc li{break-inside:avoid}
    </style>
    <div class="tc"><h2>TERMS &amp; CONDITIONS</h2>${termsToHtml(data.content)}</div>`;
  } catch {
    return '';
  }
}
