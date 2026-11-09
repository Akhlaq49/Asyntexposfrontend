import React, { useEffect, useRef, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';

/** The company letterhead (A4, 1810 x 2560): logos at the top, green address bar at the bottom */
const LETTERHEAD_IMG = '/assets/img/letterhead-a4.jpg';
/** company stamp, bottom-left above the green address bar */
const STAMP_IMG = '/assets/img/company-stamp.png';
/** CEO stamp, to the right of the company stamp */
const CEO_STAMP_IMG = '/assets/img/ceo-stamp.png';
const DRAFT_KEY = 'letterhead-draft';

/*
 * Where things sit on the A4 page (mm), measured on the letterhead image:
 * the "Ref:" / "Date:" lines and the writing area between the header and the green footer.
 */
const LAYOUT = {
  refLeft: 21, dateLeft: 174, lineTop: 49.3, lineWidth: 27,
  bodyTop: 58, bodyBottom: 72, side: 16,
  stampLeft: 14, stampBottom: 38, stampSize: 31,
  // CEO stamp sits beside the round stamp, vertically centred on it
  ceoLeft: 49, ceoHeight: 15, ceoBottom: 46,
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const showDate = (iso: string) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Keep only harmless formatting from the editor (no scripts, event handlers or embedded frames) */
function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
    });
  });
  return doc.body.firstElementChild?.innerHTML ?? '';
}

interface Draft { refNo: string; date: string; html: string }
const loadDraft = (): Draft | null => {
  try { const d = localStorage.getItem(DRAFT_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
};
const saveDraft = (d: Draft) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ } };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ } };

/**
 * Letterhead: print the blank company letterhead, or type a letter on it and print that.
 * Long letters continue onto more pages, each with the letterhead.
 */
const Letterhead: React.FC = () => {
  const draft = useRef(loadDraft()).current;
  const [typeOn, setTypeOn] = useState<boolean | null>(draft?.html ? true : null);
  const [refNo, setRefNo] = useState(draft?.refNo ?? '');
  const [date, setDate] = useState(draft?.date ?? todayIso());
  const [isEmpty, setIsEmpty] = useState(!draft?.html);
  const editorRef = useRef<HTMLDivElement>(null);

  // put the saved draft into the editor when it appears
  useEffect(() => {
    if (typeOn && editorRef.current && draft?.html && !editorRef.current.innerHTML) editorRef.current.innerHTML = draft.html;
  }, [typeOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = () => {
    const html = editorRef.current?.innerHTML ?? '';
    const empty = !(editorRef.current?.innerText ?? '').trim();
    setIsEmpty(empty);
    if (empty && !refNo.trim()) clearDraft(); // nothing typed: nothing to keep
    else saveDraft({ refNo, date, html });
  };
  useEffect(() => { if (typeOn) persist(); }, [refNo, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const format = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, value);
    persist();
  };

  const startOver = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setRefNo(''); setDate(todayIso()); setIsEmpty(true); clearDraft();
  };

  const print = (withText: boolean) => {
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { alert('Please allow pop-ups for this site to print.'); return; }
    const origin = window.location.origin;
    const L = LAYOUT;
    const body = withText ? cleanHtml(editorRef.current?.innerHTML ?? '') : '';
    w.document.open();
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Letterhead</title><style>
      @page{size:A4;margin:0}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0}
      body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#222;font-size:12pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .bg{position:fixed;top:0;left:0;width:210mm;height:297mm;z-index:-1}
      .field{position:absolute;top:${L.lineTop - 6}mm;min-width:${L.lineWidth}mm;height:5.6mm;font-size:11pt;line-height:1;white-space:nowrap;display:flex;align-items:flex-end}
      .page{width:210mm;border-collapse:collapse}
      .page td{padding:0 ${L.side}mm}
      .page thead td{height:${L.bodyTop}mm}
      .page tfoot td{height:${L.bodyBottom}mm}
      .stamp{position:fixed;left:${L.stampLeft}mm;bottom:${L.stampBottom}mm;width:${L.stampSize}mm;height:${L.stampSize}mm;opacity:.92}
      .ceo-stamp{position:fixed;left:${L.ceoLeft}mm;bottom:${L.ceoBottom}mm;height:${L.ceoHeight}mm;width:auto;opacity:.92}
      .text p{margin:0 0 8pt}.text ul,.text ol{margin:0 0 8pt;padding-left:22pt}
      @media screen{body{width:210mm;min-height:297mm;margin:0 auto;box-shadow:0 0 8px #999;position:relative}}
    </style></head><body>
      <img class="bg" src="${origin}${LETTERHEAD_IMG}" alt="">
      <img class="stamp" src="${origin}${STAMP_IMG}" alt="">
      <img class="ceo-stamp" src="${origin}${CEO_STAMP_IMG}" alt="">
      ${withText && refNo.trim() ? `<div class="field" style="left:${L.refLeft}mm">${esc(refNo.trim())}</div>` : ''}
      ${withText && date ? `<div class="field" style="left:${L.dateLeft}mm">${esc(showDate(date))}</div>` : ''}
      <table class="page"><thead><tr><td></td></tr></thead>
        <tbody><tr><td class="text">${body}</td></tr></tbody>
        <tfoot><tr><td></td></tr></tfoot></table>
      <script>
        var imgs=[].slice.call(document.images), left=imgs.length;
        function go(){setTimeout(function(){window.print();},150);}
        imgs.forEach(function(i){ if(i.complete){ if(--left===0) go(); } else { i.onload=i.onerror=function(){ if(--left===0) go(); }; } });
        if(!imgs.length) go();
      <\/script>
    </body></html>`);
    w.document.close();
  };

  /* ---- preview page: the letterhead at real A4 size (210 x 297 mm) ---- */
  const L = LAYOUT;
  const fieldStyle = (left: number): React.CSSProperties => ({
    position: 'absolute', left: `${left}mm`, top: `${L.lineTop - 6}mm`, width: `${L.lineWidth}mm`, height: '5.6mm',
    border: 'none', background: 'rgba(255,255,255,0.6)', fontSize: '11pt', lineHeight: 1, padding: 0, outline: '1px dashed #9ab',
  });

  return (
    <>
      <PageHeader title="Letterhead" subtitle="Print the company letterhead, blank or with your own text" breadcrumbs={[{ title: 'Documents' }]} />

      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center flex-wrap gap-3">
            <span className="fw-medium">Do you want to type something on the letterhead?</span>
            <div className="btn-group" role="group">
              <button type="button" className={`btn ${typeOn === false ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTypeOn(false)}>No</button>
              <button type="button" className={`btn ${typeOn === true ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTypeOn(true)}>Yes</button>
            </div>
            {typeOn === false && (
              <button type="button" className="btn btn-success ms-auto" onClick={() => print(false)}>
                <i className="ti ti-printer me-1"></i>Print blank letterhead
              </button>
            )}
            {typeOn === true && (
              <div className="ms-auto d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={startOver}><i className="ti ti-eraser me-1"></i>Clear</button>
                <button type="button" className="btn btn-success" onClick={() => print(true)} disabled={isEmpty && !refNo.trim()}>
                  <i className="ti ti-printer me-1"></i>Print letter
                </button>
              </div>
            )}
          </div>

          {typeOn === true && (
            <div className="row g-3 mt-1">
              <div className="col-sm-4 col-md-3">
                <label className="form-label mb-1">Ref</label>
                <input className="form-control" value={refNo} maxLength={40} placeholder="e.g. OTA/2026/015" onChange={(e) => setRefNo(e.target.value)} />
              </div>
              <div className="col-sm-4 col-md-3">
                <label className="form-label mb-1">Date</label>
                <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="col-12">
                {/* formatting toolbar for the letter text */}
                <div className="d-flex flex-wrap gap-1 border rounded p-1 bg-light">
                  {[
                    { cmd: 'bold', icon: 'ti-bold', title: 'Bold' },
                    { cmd: 'italic', icon: 'ti-italic', title: 'Italic' },
                    { cmd: 'underline', icon: 'ti-underline', title: 'Underline' },
                    { cmd: 'insertUnorderedList', icon: 'ti-list', title: 'Bullet list' },
                    { cmd: 'insertOrderedList', icon: 'ti-list-numbers', title: 'Numbered list' },
                    { cmd: 'justifyLeft', icon: 'ti-align-left', title: 'Align left' },
                    { cmd: 'justifyCenter', icon: 'ti-align-center', title: 'Centre' },
                    { cmd: 'justifyRight', icon: 'ti-align-right', title: 'Align right' },
                    { cmd: 'justifyFull', icon: 'ti-align-justified', title: 'Justify' },
                  ].map((b) => (
                    <button key={b.cmd} type="button" className="btn btn-sm btn-white border" title={b.title}
                      onMouseDown={(e) => e.preventDefault()} onClick={() => format(b.cmd)}>
                      <i className={`ti ${b.icon}`}></i>
                    </button>
                  ))}
                  <select className="form-select form-select-sm" style={{ width: 130 }} defaultValue="" title="Text size"
                    onChange={(e) => { if (e.target.value) format('fontSize', e.target.value); e.target.value = ''; }}>
                    <option value="">Text size</option>
                    <option value="2">Small</option>
                    <option value="3">Normal</option>
                    <option value="4">Large</option>
                    <option value="5">Larger</option>
                    <option value="6">Heading</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {typeOn !== null && (
        <div className="card">
          <div className="card-body" style={{ overflowX: 'auto', background: '#eef0f3' }}>
            <div className="mx-auto shadow" style={{ position: 'relative', width: '210mm', minHeight: '297mm', background: `#fff url(${LETTERHEAD_IMG}) top left / 210mm 297mm no-repeat` }}>
              <img src={STAMP_IMG} alt="Company stamp" style={{ position: 'absolute', left: `${L.stampLeft}mm`, top: `${297 - L.stampBottom - L.stampSize}mm`, width: `${L.stampSize}mm`, height: `${L.stampSize}mm`, opacity: 0.92, pointerEvents: 'none' }} />
              <img src={CEO_STAMP_IMG} alt="CEO stamp" style={{ position: 'absolute', left: `${L.ceoLeft}mm`, top: `${297 - L.ceoBottom - L.ceoHeight}mm`, height: `${L.ceoHeight}mm`, width: 'auto', opacity: 0.92, pointerEvents: 'none' }} />
              {typeOn && (
                <>
                  <input aria-label="Ref" style={fieldStyle(L.refLeft)} value={refNo} maxLength={40} onChange={(e) => setRefNo(e.target.value)} />
                  <div style={{ ...fieldStyle(L.dateLeft), display: 'flex', alignItems: 'center' }}>{showDate(date)}</div>
                  <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={persist} onBlur={persist}
                    data-placeholder="Type your letter here..."
                    className="letterhead-editor"
                    style={{
                      position: 'absolute', top: `${L.bodyTop}mm`, left: `${L.side}mm`, right: `${L.side}mm`,
                      height: `${297 - L.bodyTop - L.bodyBottom}mm`, overflowY: 'auto', outline: '1px dashed #c5ccd6',
                      fontFamily: "'Segoe UI',Tahoma,Arial,sans-serif", fontSize: '12pt', lineHeight: 1.5, color: '#222', padding: 2,
                    }} />
                </>
              )}
            </div>
            {typeOn && <p className="text-center text-muted small mt-2 mb-0">Longer letters carry on to the next page when printed, each page on the letterhead.</p>}
          </div>
        </div>
      )}
      <style>{`.letterhead-editor:empty:before{content:attr(data-placeholder);color:#9aa3ad}
        .letterhead-editor p{margin:0 0 8pt}.letterhead-editor ul,.letterhead-editor ol{margin:0 0 8pt;padding-left:22pt}`}</style>
    </>
  );
};

export default Letterhead;
