import * as XLSX from 'xlsx';
import { CatalogData, ImportKind } from '../../services/CATL/catalogService';

/** Excel templates of the Import tab (Inventory > Solution Packages): categorization and package items */

/** a header the company's import profile accepts: its first name for the field, in title case */
export const headerOf = (profile: any, path: string[], fallback: string) => {
  let node = profile?.headers;
  for (const k of path) node = node?.[k];
  const name = Array.isArray(node) ? node[0] : typeof node === 'string' ? node : null;
  return name ? String(name).replace(/\b\w/g, (c) => c.toUpperCase()) : fallback;
};

/**
 * The Excel template for a file kind - its headers are the ones the company's import profile reads, so the filled
 * file imports as it is. The categorization template lists the company's categories and families (re-importing
 * them changes nothing); the package-items template is empty: the Product column and one column per building size.
 */
/** the building sizes every package-items template has (the company's own sizes are added after them) */
export const STANDARD_SIZES = ['1 BHK', '2 BHK', '5 Marla', '10 Marla', '1 Kanal', '2 Kanal', '5 Kanal', '10 Kanal'];
const rank = (name: string) => {
  const i = STANDARD_SIZES.findIndex((n) => n.toLowerCase() === name.trim().toLowerCase().replace(/\s+/g, ' '));
  return i < 0 ? STANDARD_SIZES.length : i;
};

interface Template { rows: (string | number | null)[][]; widths: number[]; help: string[][]; file: string; sheet: string }

/** The template's sheets (pure: tested in importTemplates.test.ts) */
export const buildTemplate = (kind: ImportKind, cat: CatalogData | null, profileJson: string | undefined): Template => {
  let profile: any = null;
  try { profile = profileJson ? JSON.parse(profileJson) : null; } catch { profile = null; }
  let rows: (string | number | null)[][];
  let widths: number[];
  let help: string[][];
  let file: string;
  if (kind === 'categorization') {
    const tiers = cat?.tiers || [];
    const tierCode = (code: string, fb: string) => headerOf(profile, ['tiers', code], fb);
    const tierCols = tiers.length ? tiers.map((t) => ({ id: t.id, header: tierCode(t.code, `${t.name} Solution`) }))
      : [{ id: 0, header: tierCode('standard', 'Standard Solution') }, { id: -1, header: tierCode('premium', 'Premium Solution') }];
    rows = [[headerOf(profile, ['name'], 'Product Name'), ...tierCols.map((t) => t.header)]];
    for (const g of cat?.groups || []) {
      rows.push([g.name, ...tierCols.map(() => null)]);
      for (const f of g.families) rows.push([f.name, ...tierCols.map((t) => (f.tierIds.includes(t.id) ? '✓' : null))]);
    }
    widths = [40, ...tierCols.map(() => 20)];
    file = 'Categorization template.xlsx';
    help = [
      ['Category row', 'Only the name, no ticks, e.g. "Lighting Control". The rows under it are its families.'],
      ['Family row', 'The family name (a kind of product, e.g. "Smart Switches") and a tick (✓ or any text) under each solution it is used in.'],
      [],
      ['', 'A family ticked under Standard is suggested in Standard plans, under Premium in Premium plans; both = both plans.'],
      ['', 'A new company gets its categories and families created from this file. Afterwards new names wait on the Import tab to be mapped.'],
    ];
  } else {
    // always the standard building sizes, then any other size the company added
    const own = (cat?.sizes || []).map((z) => z.name);
    const key = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');
    const sizes = [...STANDARD_SIZES.filter((n) => !own.some((o) => key(o) === key(n))), ...own]
      .sort((a, b) => rank(a) - rank(b)).map((name) => ({ name }));
    rows = [[headerOf(profile, ['name'], 'Product'), ...sizes.map((z) => z.name)]];
    widths = [40, ...sizes.map(() => 14)];
    file = 'Package items template.xlsx';
    help = [
      [rows[0][0] as string, 'Required. The product name as in the inventory (Products). Its price and description are taken from the inventory.'],
      ['Size columns', `One column per building size (${sizes.map((z) => z.name).join(', ')}): how many of the product that size needs. Decimals are fine (12.5 m). Empty = none.`],
      [],
      ['', 'This file is the whole list: the drawing reader suggests only these products. A product left out is no longer suggested.'],
      ['', 'A name not found in the inventory waits on the Import tab: pick the inventory product it is, or keep it as "not in the inventory" (its price is typed on the quotation).'],
      ['', 'Keep the size column names: each one is a building size. A new company gets these sizes when it uploads the file.'],
      ['', 'The quantity is used in every plan (Standard / Premium) the product\'s family is ticked for in the categorization.'],
    ];
  }
  return { rows, widths, help, file, sheet: kind === 'categorization' ? 'Categorization' : 'Package items' };
};

/** Saves the template as an Excel file: the sheet to fill and a "How to fill" sheet */
export const downloadTemplate = (kind: ImportKind, cat: CatalogData | null, profileJson: string | undefined) => {
  const t = buildTemplate(kind, cat, profileJson);
  const sheet = XLSX.utils.aoa_to_sheet(t.rows);
  sheet['!cols'] = t.widths.map((wch) => ({ wch }));
  const helpSheet = XLSX.utils.aoa_to_sheet([['How to fill the first sheet'], [], ['Column', 'What to enter'], ...t.help]);
  helpSheet['!cols'] = [{ wch: 20 }, { wch: 110 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, t.sheet);
  XLSX.utils.book_append_sheet(book, helpSheet, 'How to fill');
  XLSX.writeFile(book, t.file);
};
