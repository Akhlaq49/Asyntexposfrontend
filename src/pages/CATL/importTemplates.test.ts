import { describe, expect, it } from 'vitest';
import { buildTemplate, headerOf, STANDARD_SIZES } from './importTemplates';
import { CatalogData } from '../../services/CATL/catalogService';

const cat = (over: Partial<CatalogData> = {}): CatalogData => ({
  tiers: [{ id: 1, name: 'Standard', code: 'standard' }, { id: 2, name: 'Premium', code: 'premium' }],
  sizes: [], groups: [], products: [], packageLines: [], ruleItems: [], unmatched: [], ...over,
});

describe('headerOf', () => {
  it('uses the profile\'s first name in title case', () => {
    expect(headerOf({ headers: { name: ['product name', 'name'] } }, ['name'], 'X')).toBe('Product Name');
  });
  it('falls back without a profile or field', () => {
    expect(headerOf(null, ['name'], 'Product')).toBe('Product');
    expect(headerOf({ headers: {} }, ['tiers', 'standard'], 'Standard Solution')).toBe('Standard Solution');
  });
});

describe('package items template', () => {
  it('is empty: Product and the 8 standard sizes, no price columns', () => {
    const t = buildTemplate('packages', cat(), undefined);
    expect(t.rows).toEqual([['Product', ...STANDARD_SIZES]]);
    expect(t.file).toBe('Package items template.xlsx');
    expect(t.rows[0].some((h) => /price/i.test(String(h)))).toBe(false);
  });

  it('adds the company\'s own sizes after the standard ones (no duplicate, any case)', () => {
    const t = buildTemplate('packages', cat({ sizes: [{ id: 1, name: '1 kanal' }, { id: 2, name: '20 Marla' }] }), undefined);
    expect(t.rows[0]).toEqual(['Product', '1 BHK', '2 BHK', '5 Marla', '10 Marla', '1 kanal', '2 Kanal', '5 Kanal', '10 Kanal', '20 Marla']);
  });

  it('takes the product header from the company\'s import profile', () => {
    const t = buildTemplate('packages', cat(), JSON.stringify({ headers: { name: ['item'] } }));
    expect(t.rows[0][0]).toBe('Item');
  });

  it('ignores a broken profile', () => {
    expect(buildTemplate('packages', cat(), '{not json').rows[0][0]).toBe('Product');
  });
});

describe('categorization template', () => {
  it('has one tick column per plan and lists the categories with their families\' ticks', () => {
    const t = buildTemplate('categorization', cat({ groups: [
      { id: 1, name: 'Lighting', families: [{ id: 10, name: 'Piano', tierIds: [1, 2], aliases: [] }, { id: 11, name: 'Panels', tierIds: [2], aliases: [] }] },
    ] }), undefined);
    expect(t.rows).toEqual([
      ['Product Name', 'Standard Solution', 'Premium Solution'],
      ['Lighting', null, null],
      ['Piano', '✓', '✓'],
      ['Panels', null, '✓'],
    ]);
    expect(t.sheet).toBe('Categorization');
  });

  it('a company without plans yet still gets Standard and Premium columns', () => {
    expect(buildTemplate('categorization', cat({ tiers: [] }), undefined).rows[0]).toEqual(['Product Name', 'Standard Solution', 'Premium Solution']);
  });

  it('every template explains its columns', () => {
    for (const kind of ['categorization', 'packages'] as const) expect(buildTemplate(kind, cat(), undefined).help.length).toBeGreaterThan(2);
  });
});
