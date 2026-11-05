import api from './api';
import { SolutionUsage } from './solutionPackageService';

/** Drawing to Solution: the drawing is read by the Drawing2Quote service (through the POS backend) */

export interface DrawingArea {
  name: string; roomType: string | null; areaSqft: number | null; dimensions: string | null;
  items: Record<string, number>; confidence: number;
}
export interface DrawingFloor { name: string; areas: DrawingArea[] }
export interface Extraction {
  fileName: string; fileType: 'dxf' | 'pdf' | 'scan' | 'image';
  project: Record<string, string>;
  floors: DrawingFloor[];
  legend: { symbol: string; description: string; type: string }[];
  totals: { areaSqft: number; items: Record<string, number>; points: number };
  /** false: an architectural layout with no electrical legend or points - the solution comes from the rooms only */
  electrical?: boolean;
  warnings: string[]; log: string[]; pointTypes: string[];
}
export interface SolutionLineResult {
  itemId: number; name: string; groupName: string | null; productLineName: string | null; usage: SolutionUsage;
  productName: string | null; quantity: number; baseline: number; source: 'drawing' | 'package' | 'choice' | 'other';
  detail: string; areas: Record<string, number>; productId: number | null;
  /** joined from the Products table by the backend: the linked product's price, x quantity (null = not linked) */
  unitPrice?: number | null; lineTotal?: number | null;
  alternatives?: { itemId: number; name: string }[]; reason?: string;
}
export interface Suggestion {
  plan: 'standard' | 'premium';
  size: { id: number; name: string; reason: string; uncertain?: boolean } | null;
  needsConfirmation: boolean;
  toConfirm: SolutionLineResult[];
  lines: SolutionLineResult[];
  leftOut: SolutionLineResult[];
  totals: { items: number; quantity: number; unlinked: number; amount?: number; unpriced?: number };
  notes: string[];
}
/** a drawing being read in the background (a printed PDF is read with OCR, about a minute per sheet) */
export interface ReadProgress { status: 'queued' | 'running' | 'done' | 'failed'; page: number; pages: number; message: string }
interface ReadJob extends ReadProgress { result?: Extraction; detail?: string }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** an error shaped like an API error, so pages show its message the same way */
const failure = (message: string) => Object.assign(new Error(message), { response: { data: { message } } });

/** the client already uses another company's automation in these areas ("Floor / Area"): one Matter gateway each */
export interface OtherBrand { company: string; areas: string[] }

/** Premium "both" products: item id -> "use" | "skip" | id of the Premium-only item to use instead */
export type Choices = Record<string, string>;

// keep the same in the backend (DrawingService.MaxMb) and Drawing2Quote (validator.py MAX_MB)
export const MAX_MB = 200;
export const MAX_BYTES = MAX_MB * 1024 * 1024;

/** how well each kind of file is read, in two lines (keep in step with SUPPORTED_MESSAGE in Drawing2Quote validator.py) */
export const SUPPORTED_LINES = [
  'Best: DXF or CAD-exported PDF (exact) · Good: CAD PDF without text (OCR, slower) · Fair: scan or clear JPG/PNG (check counts) · Low: blurry photo/screenshot (rooms & sizes estimated).',
  `Cannot read: DWG (save as DXF), locked PDF, HEIC, under 300 px, over ${MAX_MB} MB. Points need a legend; send WhatsApp images as Document.`,
];
export const SUPPORTED_MESSAGE = SUPPORTED_LINES.join(' ');

/** pictures of a drawing the service reads from the image */
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'bmp', 'tif', 'tiff', 'gif', 'webp'];

export const drawingService = {
  status: () => api.get<{ running: boolean }>('/drawings/status').then((r) => r.data.running),
  /** uploads the drawing, then checks on the reading every 2 seconds until it is done.
      stop() returning true gives up (e.g. the page was left); the reading itself carries on in the service */
  extract: async (file: File, onProgress?: (p: ReadProgress) => void, stop?: () => boolean): Promise<Extraction> => {
    const form = new FormData();
    form.append('file', file);
    const { jobId } = (await api.post<{ jobId: string }>('/drawings/extract', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 })).data;
    let errors = 0;
    for (;;) {
      await wait(2000);
      if (stop?.()) throw failure('Stopped.');
      let job: ReadJob;
      try { job = (await api.get<ReadJob>(`/drawings/extract/${jobId}`, { timeout: 30000 })).data; errors = 0; }
      catch (err: any) {
        // a short network hiccup doesn't lose the reading; a missing job or a stopped service does
        if (err?.response?.status === 404 || ++errors >= 5) throw err;
        continue;
      }
      if (job.status === 'done' && job.result) return job.result;
      if (job.status === 'failed') throw failure(job.detail || 'The drawing could not be read.');
      onProgress?.(job);
    }
  },
  suggest: (extraction: Extraction, plan: 'standard' | 'premium', choices: Choices | null, sizeId: number | null, otherBrand: OtherBrand | null = null) =>
    api.post<Suggestion>('/drawings/suggest', { extraction, plan, choices, sizeId, otherBrand }, { timeout: 120000 }).then((r) => r.data),
};

/** the file is refused before uploading when it obviously can't be read */
export const checkFile = (file: File): string | null => {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'dwg') return 'DWG files can\'t be read. In AutoCAD use Save As -> DXF and upload the DXF file.';
  if (['heic', 'heif'].includes(ext))
    return 'HEIC photos can\'t be read. On the phone choose "Most Compatible" (JPG) or send it as JPG.';
  if (!['dxf', 'pdf', ...IMAGE_EXTENSIONS].includes(ext)) return `".${ext}" files are not supported. ${SUPPORTED_MESSAGE}`;
  if (file.size > MAX_BYTES) return `The file is ${(file.size / 1024 / 1024).toFixed(1)} MB - the maximum is ${MAX_MB} MB.`;
  if (file.size === 0) return 'The file is empty.';
  return null;
};
