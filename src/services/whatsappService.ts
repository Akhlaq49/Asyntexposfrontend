import api from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WhatsAppConfigStatus {
  isConfigured: boolean;
  phoneNumberId: string | null;
  hasAccessToken: boolean;
  businessAccountId: string | null;
}

export interface WhatsAppConfigUpdate {
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
}

export interface WhatsAppSendResult {
  messageId?: string;
  message?: string;
  error?: string;
  success?: boolean;
  results?: Array<{
    type: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

// ── Configuration API ──────────────────────────────────────────────────────────

/** Get WhatsApp Cloud API configuration status */
export async function getWhatsAppConfig(): Promise<WhatsAppConfigStatus> {
  const response = await api.get<WhatsAppConfigStatus>('/whatsapp/config');
  return response.data;
}

/** Update WhatsApp Cloud API configuration */
export async function updateWhatsAppConfig(
  config: WhatsAppConfigUpdate
): Promise<{ message: string; status: WhatsAppConfigStatus }> {
  const response = await api.put('/whatsapp/config', config);
  return response.data;
}

// ── Send Messages ──────────────────────────────────────────────────────────────

/** Send a plain text message via WhatsApp Cloud API */
export async function sendWhatsAppText(
  to: string,
  message: string
): Promise<WhatsAppSendResult> {
  const response = await api.post<WhatsAppSendResult>('/whatsapp/send/text', {
    to,
    message,
  });
  return response.data;
}

/** Send a document (PDF) via WhatsApp Cloud API */
export async function sendWhatsAppDocument(
  to: string,
  file: Blob,
  filename: string,
  caption?: string
): Promise<WhatsAppSendResult> {
  const formData = new FormData();
  formData.append('to', to);
  formData.append('file', file, filename);
  formData.append('filename', filename);
  if (caption) formData.append('caption', caption);

  const response = await api.post<WhatsAppSendResult>(
    '/whatsapp/send/document',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
}

/** Send text + document combo via WhatsApp Cloud API */
export async function sendWhatsAppTextAndDocument(
  to: string,
  message: string,
  file: Blob,
  filename: string,
  caption?: string
): Promise<WhatsAppSendResult> {
  const formData = new FormData();
  formData.append('to', to);
  formData.append('message', message);
  formData.append('file', file, filename);
  formData.append('filename', filename);
  if (caption) formData.append('caption', caption);

  const response = await api.post<WhatsAppSendResult>(
    '/whatsapp/send/text-and-document',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
}

/** Send a template message via WhatsApp Cloud API */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  bodyParameters?: string[]
): Promise<WhatsAppSendResult> {
  const response = await api.post<WhatsAppSendResult>('/whatsapp/send/template', {
    to,
    templateName,
    languageCode,
    bodyParameters,
  });
  return response.data;
}

// ── Share PDF Upload ───────────────────────────────────────────────────────────

export interface UploadSharePdfResult {
  url: string;
  filename: string;
}

/**
 * Upload a PDF blob to the server and get back a public download URL.
 * Used for sharing PDFs via wa.me links (no WhatsApp API required).
 */
export async function uploadSharePdf(
  pdfBlob: Blob,
  filename: string
): Promise<UploadSharePdfResult> {
  const formData = new FormData();
  formData.append('file', pdfBlob, filename);

  const response = await api.post<UploadSharePdfResult>(
    '/whatsapp/upload-pdf',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
}
