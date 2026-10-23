import React from 'react';

/** Letterhead logos shown at the top-left / top-right corners of every printable document. */
export const LETTERHEAD_LOGOS = {
  left: '/assets/img/receipt-left.jpeg',
  right: '/assets/img/receipt-right.jpeg',
};

/** Logos on reports and printed lists: One Touch top-left, Smartinn top-right */
export const REPORT_LOGOS = {
  left: '/assets/img/report-logo-onetouch.jpeg',
  right: '/assets/img/report-logo-smartinn.jpeg',
};

/** Green footer band on reports: badge | address | WhatsApp number */
export const REPORT_FOOTER = {
  badge: '/assets/img/report-footer-badge.png',
  pinIcon: '/assets/img/report-footer-pin.png',
  whatsappIcon: '/assets/img/report-footer-whatsapp.png',
  addressLines: ['Plaza # 24, Sector A, Phase 6', 'DHA Lahore Cant.'],
  whatsapp: '03027475646',
  color: '#669d22',
};

interface LetterheadLogosProps {
  /** Logo height in px (width follows each image's proportions) */
  height?: number;
  /** Optional content centred between the two logos (title, company name, ...) */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Inline styles only, so the header survives print popups (document.write) and
 * html2canvas PDF captures, which don't load the app's stylesheets.
 */
const LetterheadLogos: React.FC<LetterheadLogosProps> = ({ height = 100, children, style }) => {
  const img: React.CSSProperties = { height, width: Math.round(height * 1.45), objectFit: 'contain', display: 'block' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', ...style }}>
      <img src={LETTERHEAD_LOGOS.left} alt="" style={img} />
      <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>{children}</div>
      <img src={LETTERHEAD_LOGOS.right} alt="" style={img} />
    </div>
  );
};

export default LetterheadLogos;
