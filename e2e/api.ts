import fs from 'node:fs';
import path from 'node:path';

/** Small API client for seeding and checking data from the tests. */
export const API = (process.env.E2E_API_URL ?? 'http://localhost:5299') + '/api';
export const STATE_DIR = path.resolve('e2e', '.auth');
export const SEED_FILE = path.join(STATE_DIR, 'seed.json');

export interface Seed {
  token: string;
  tenantId: number;
  email: string;
  password: string;
  locations: { main: number; warehouse: number; branch: number };
  products: Record<'panadol' | 'brufen' | 'vitc' | 'tee' | 'flour' | 'naan' | 'syrupBase' | 'syrup', { id: number; name: string }>;
  customer: { id: number; name: string };
  bomId: number;
  tableId: number;
  stationId: number;
  catalogueBrand: string;
}

export async function call<T = any>(method: string, url: string, body?: unknown, opts: { token?: string; headers?: Record<string, string>; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let payload: BodyInit | undefined;
  if (opts.form) payload = opts.form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(API + url, { method, headers, body: payload });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

export const seed = (): Seed => JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

/** Quantity of a product held at one location (from the API). */
export async function stockAt(productId: number, locationId: number): Promise<number> {
  const s = await call<any>('GET', `/locations/product-stock/${productId}`, undefined, { token: seed().token });
  return s.locations.filter((l: any) => l.locationId === locationId).reduce((n: number, l: any) => n + l.quantity, 0);
}
