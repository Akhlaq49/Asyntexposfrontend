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
 * Convert an image URL to a base64 data URL. Tries multiple strategies so
 * it works whether the backend has CORS headers or not.
 */
async function urlToDataUrl(url: string): Promise<string | null> {
  // Strategy 1: fetch with credentials (works if backend has CORS for our origin)
  try {
    const resp = await fetch(url, { credentials: 'include', mode: 'cors' });
    if (resp.ok) {
      const blob = await resp.blob();
      return await blobToDataUrl(blob);
    }
  } catch { /* fall through */ }

  // Strategy 2: fetch without credentials (for public, CORS-enabled images)
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (resp.ok) {
      const blob = await resp.blob();
      return await blobToDataUrl(blob);
    }
  } catch { /* fall through */ }

  // Strategy 3: load via Image with crossOrigin and draw to canvas
  try {
    return await imageToDataUrlViaCanvas(url);
  } catch { /* give up */ }

  return null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function imageToDataUrlViaCanvas(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

/**
 * Wait until an image element has fully loaded AND decoded the new src.
 * Uses img.decode() for reliable readiness, with fallbacks.
 */
async function waitForImage(img: HTMLImageElement): Promise<void> {
  // Modern browsers: decode() resolves once image is ready to paint
  if (typeof img.decode === 'function') {
    try {
      await img.decode();
      return;
    } catch { /* fall through */ }
  }
  // Fallback: wait for load/error event with a timeout
  await new Promise<void>((res) => {
    if (img.complete && img.naturalWidth > 0) return res();
    const done = () => { img.onload = null; img.onerror = null; res(); };
    img.onload = done;
    img.onerror = done;
    setTimeout(done, 3000);
  });
}

/**
 * Pre-fetches all external images in an element as base64 data URLs so
 * html2canvas can draw them without hitting CORS restrictions.
 * Returns a restore function to put original srcs back after rendering.
 */
async function swapImagesToDataUrls(element: HTMLElement): Promise<() => void> {
  const imgs = Array.from(element.querySelectorAll('img')) as HTMLImageElement[];
  const restores: Array<() => void> = [];

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
      // Skip local /assets/ images — html2canvas handles them fine
      if (src.startsWith(window.location.origin) && src.includes('/assets/')) return;

      const dataUrl = await urlToDataUrl(src);
      if (!dataUrl) {
        console.warn('[pdfShare] Could not load image:', src);
        return;
      }

      const original = img.src;
      img.src = dataUrl;
      restores.push(() => { img.src = original; });

      try {
        await waitForImage(img);
      } catch { /* continue anyway */ }
    })
  );

  return () => restores.forEach((fn) => fn());
}

/**
 * Generates a PDF from an HTML element and returns it as a Blob.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  _filename: string,
  options?: { width?: number; orientation?: 'portrait' | 'landscape' }
): Promise<Blob> {
  const restoreImages = await swapImagesToDataUrls(element);

  // Yield once so the browser paints the swapped images before capture
  await new Promise((res) => requestAnimationFrame(() => res(null)));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: options?.width || element.scrollWidth,
    windowWidth: options?.width || element.scrollWidth,
  });

  restoreImages();

  // Use PNG (lossless) so logos and text stay sharp in PDFs
  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const orientation = options?.orientation || (imgWidth > imgHeight ? 'landscape' : 'portrait');
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [imgWidth, imgHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

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

  // Try Web Share API with files — only when NO specific phone number is given
  // (Web Share opens the OS contact picker, ignoring the customer's number)
  const canShareFiles = !normalized && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
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
