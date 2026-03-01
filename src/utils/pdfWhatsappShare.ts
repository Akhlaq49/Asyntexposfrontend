import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  sendWhatsAppTextAndDocument,
  sendWhatsAppText,
  sendWhatsAppDocument,
  getWhatsAppConfig,
  uploadSharePdf,
} from '../services/whatsappService';

/**
 * Normalize a phone number to international format for WhatsApp.
 * Handles Pakistani numbers (0300… → 92300…) and strips non-digits.
 */
export function normalizePhone(phone: string): string {
  // Strip everything except digits and leading +
  let digits = phone.replace(/[^0-9]/g, '');

  // Pakistani local format: starts with 0 (e.g. 03001234567)
  if (digits.startsWith('0') && digits.length >= 10) {
    digits = '92' + digits.substring(1);
  }

  // If only 10 digits, assume Pakistan
  if (digits.length === 10) {
    digits = '92' + digits;
  }

  return digits;
}

/**
 * Check if WhatsApp Cloud API is configured and available.
 */
export async function isWhatsAppCloudConfigured(): Promise<boolean> {
  try {
    const config = await getWhatsAppConfig();
    return config.isConfigured;
  } catch {
    return false;
  }
}

/**
 * Generates a PDF from an HTML element and returns it as a Blob.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  _filename: string,
  options?: { width?: number; orientation?: 'portrait' | 'landscape' }
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: options?.width || element.scrollWidth,
    windowWidth: options?.width || element.scrollWidth,
  });

  // Use JPEG at 70% quality to keep PDF size small
  const imgData = canvas.toDataURL('image/jpeg', 0.7);
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const orientation = options?.orientation || (imgWidth > imgHeight ? 'landscape' : 'portrait');
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [imgWidth, imgHeight],
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

  return pdf.output('blob');
}

/**
 * Downloads a PDF generated from an HTML element.
 */
export async function downloadPdf(
  element: HTMLElement,
  filename: string,
  options?: { width?: number; orientation?: 'portrait' | 'landscape' }
): Promise<void> {
  const blob = await generatePdfFromElement(element, filename, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Shares a PDF via WhatsApp.
 * 
 * Tries Web Share API first (works on mobile + modern desktop browsers).
 * Falls back to auto-downloading the PDF + copying message to clipboard + opening WhatsApp Web.
 */
export async function shareViaWhatsApp(
  element: HTMLElement,
  filename: string,
  message: string,
  phoneNumber?: string,
  options?: { width?: number; orientation?: 'portrait' | 'landscape' }
): Promise<void> {
  const blob = await generatePdfFromElement(element, filename, options);
  const pdfFilename = `${filename}.pdf`;
  const file = new File([blob], pdfFilename, { type: 'application/pdf' });
  const normalized = phoneNumber ? normalizePhone(phoneNumber) : '';

  // Try Web Share API with files (mobile + Chrome 93+ / Edge with file sharing support)
  const canShareFiles = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  if (canShareFiles) {
    try {
      await navigator.share({
        title: filename,
        text: message,
        files: [file],
      });
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.log('Web Share API failed, using upload fallback:', err?.message);
    }
  }

  // Primary fallback: upload PDF to server → get public URL → send via wa.me with link in message
  let messageWithLink = message;
  try {
    const uploaded = await uploadSharePdf(blob, pdfFilename);
    messageWithLink = `${message}\n\n📎 Download Plan PDF:\n${uploaded.url}`;
  } catch (uploadErr) {
    console.warn('PDF upload failed, falling back to local download:', uploadErr);
    // If upload fails: download locally
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = pdfFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Open wa.me with message (includes PDF link if upload succeeded)
  const whatsappUrl = normalized
    ? `https://wa.me/${normalized}?text=${encodeURIComponent(messageWithLink)}`
    : `https://wa.me/?text=${encodeURIComponent(messageWithLink)}`;
  window.open(whatsappUrl, '_blank');
}

/**
 * Sends a PDF via WhatsApp Cloud API (Meta Business Platform).
 * Generates the PDF from the HTML element, uploads it to the backend,
 * and sends it as a WhatsApp document message along with a text message.
 *
 * Returns { success, messageId?, error? }
 */
export async function sendViaWhatsAppCloudApi(
  element: HTMLElement,
  filename: string,
  message: string,
  phoneNumber: string,
  options?: { width?: number; orientation?: 'portrait' | 'landscape' }
): Promise<{ success: boolean; error?: string }> {
  try {
    const blob = await generatePdfFromElement(element, filename, options);
    const normalizedPhone = normalizePhone(phoneNumber);
    const result = await sendWhatsAppTextAndDocument(
      normalizedPhone,
      message,
      blob,
      `${filename}.pdf`,
      filename
    );
    if (result.success) {
      return { success: true };
    }
    // Check individual results
    const errors = result.results
      ?.filter((r) => !r.success)
      .map((r) => r.error)
      .filter(Boolean);
    return { success: false, error: errors?.join('; ') || result.error || 'Failed to send.' };
  } catch (err: any) {
    return { success: false, error: err?.response?.data?.error || err?.message || 'Unknown error' };
  }
}

/**
 * Send only a text message via WhatsApp Cloud API.
 */
export async function sendTextViaWhatsAppCloudApi(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sendWhatsAppText(phoneNumber, message);
    return { success: true, error: undefined };
  } catch (err: any) {
    return { success: false, error: err?.response?.data?.error || err?.message || 'Unknown error' };
  }
}

/**
 * Send only a document via WhatsApp Cloud API.
 */
export async function sendDocViaWhatsAppCloudApi(
  element: HTMLElement,
  filename: string,
  phoneNumber: string,
  caption?: string,
  options?: { width?: number; orientation?: 'portrait' | 'landscape' }
): Promise<{ success: boolean; error?: string }> {
  try {
    const blob = await generatePdfFromElement(element, filename, options);
    const normalizedPhone = normalizePhone(phoneNumber);
    await sendWhatsAppDocument(normalizedPhone, blob, `${filename}.pdf`, caption);
    return { success: true, error: undefined };
  } catch (err: any) {
    return { success: false, error: err?.response?.data?.error || err?.message || 'Unknown error' };
  }
}
