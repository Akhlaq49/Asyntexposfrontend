import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import menuData from './data/menuData';

/** Constitution II (module codes) and III (no dead code): checked on every test run */
const MODULE_CODES = ['SYST', 'SECU', 'PRTY', 'INVT', 'CATL', 'SALE', 'PRCH', 'FINC', 'ACCT', 'RPRT', 'AGNT', 'MESG'];
const src = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dirs = (p: string) => fs.readdirSync(path.join(src, p), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const files = (p: string) => fs.readdirSync(path.join(src, p), { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);

describe('module folders', () => {
  it.each(['pages', 'services'])('%s/ has only module folders', (layer) => {
    expect(dirs(layer).filter((d) => !MODULE_CODES.includes(d))).toEqual([]);
  });

  it('pages/ has no files outside a module', () => {
    expect(files('pages')).toEqual([]);
  });

  it('services/ has only the shared HTTP client at the top', () => {
    expect(files('services')).toEqual(['api.ts']);
  });

  it('components/ has module folders plus the shared common and layout', () => {
    expect(dirs('components').filter((d) => !MODULE_CODES.includes(d) && !['common', 'layout'].includes(d))).toEqual([]);
    expect(files('components').filter((f) => !f.endsWith('.css'))).toEqual([]);
  });
});

describe('routes and menu', () => {
  const app = fs.readFileSync(path.join(src, 'App.tsx'), 'utf8');
  const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
  const menuPaths = menuData.flatMap((s) => s.items.flatMap((i) => [i.path, ...(i.children || []).map((c) => c.path)])).filter(Boolean) as string[];

  it('every menu entry opens a page', () => {
    expect(menuPaths.filter((p) => !routes.includes(p))).toEqual([]);
  });

  it('no route is declared twice', () => {
    expect(routes.filter((r, i) => routes.indexOf(r) !== i)).toEqual([]);
  });

  it('every lazily loaded page file exists', () => {
    const imports = [...app.matchAll(/import\('\.\/([^']+)'\)/g)].map((m) => m[1]);
    expect(imports.filter((f) => !fs.existsSync(path.join(src, f + '.tsx')) && !fs.existsSync(path.join(src, f + '.ts')))).toEqual([]);
  });
});
