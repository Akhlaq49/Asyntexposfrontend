import { REPORT_LOGOS, REPORT_FOOTER } from '../components/common/LetterheadLogos';

/** Escape text for safe use inside generated print HTML */
export const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const printMoney = (n: number) =>
  `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Open the print window straight away (inside the click) when the content still has to be loaded */
export function openPrintWindow(): Window | null {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (w) w.document.write('<p style="font-family:sans-serif;padding:24px">Preparing document...</p>');
  return w;
}

/**
 * Writes a document on the company letterhead into a print window and prints it:
 * left logo | heading + subheading | right logo, then the given body HTML.
 * `bodyHtml` must already be escaped (use `esc` for any user data).
 * Pass `target` (from openPrintWindow) when the window was opened before the data loaded.
 */
export function printDocument(title: string, heading: string, subheading: string, bodyHtml: string, target?: Window | null) {
  const w = target ?? window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('Please allow pop-ups for this site to print.');
    return;
  }
  const origin = window.location.origin;
  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#222;margin:24px;font-size:13px}
    .lh{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:16px}
    .lh img{height:120px;width:174px;object-fit:contain}
    .lh img.r-logo{height:auto;width:140px}
    .page{width:100%;border:none}.page>tbody>tr>td,.page>tfoot>tr>td{border:none;padding:0}
    .ft-space{height:110px}
    .ft{position:fixed;left:0;right:0;bottom:20px;height:50px;background:${REPORT_FOOTER.color};color:#fff;display:flex;align-items:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .ft .badge{width:88px;height:88px;margin-left:56px;flex:none}
    .ft .addr{display:flex;align-items:center;gap:8px;margin-left:24px;font-size:15px;line-height:1.2}
    .ft .addr img,.ft .wa img{width:22px;height:22px}
    .ft .wa{margin-left:auto;margin-right:56px;display:flex;align-items:center;gap:8px;font-size:20px}
    .lh .t{text-align:center}.lh .t h1{font-size:24px;letter-spacing:1px;margin:0}.lh .t div{font-size:15px;margin-top:4px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;vertical-align:top}
    th{background:#f2f2f2;text-align:left}.r{text-align:right}.c{text-align:center}
    .info td,.info th{border:none;padding:3px 0}.info th{background:none;width:120px;color:#555}
    .total th,.total td{font-size:17px}
    .sign{display:flex;justify-content:space-between;margin-top:60px}
    .sign div{border-top:1px solid #333;width:220px;text-align:center;padding-top:4px}
    @media print{body{margin:10mm}}
  </style></head><body>
    <div class="lh">
      <img src="${origin}${REPORT_LOGOS.left}" alt="">
      <div class="t"><h1>${esc(heading)}</h1>${subheading ? `<div>${esc(subheading)}</div>` : ''}</div>
      <img class="r-logo" src="${origin}${REPORT_LOGOS.right}" alt="">
    </div>
    <table class="page"><tbody><tr><td>${bodyHtml}</td></tr></tbody><tfoot><tr><td><div class="ft-space"></div></td></tr></tfoot></table>
    <div class="ft">
      <img class="badge" src="${origin}${REPORT_FOOTER.badge}" alt="">
      <div class="addr"><img src="${origin}${REPORT_FOOTER.pinIcon}" alt=""><div>${REPORT_FOOTER.addressLines.map(esc).join('<br>')}</div></div>
      <div class="wa"><img src="${origin}${REPORT_FOOTER.whatsappIcon}" alt="">${esc(REPORT_FOOTER.whatsapp)}</div>
    </div>
    <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}
