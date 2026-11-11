import { describe, expect, it } from 'vitest';
import { buildPathToKeyMap, filterMenuDataByKeys, getAllMenuKeys } from './menuKeys';

describe('menu permissions', () => {
  const keys = getAllMenuKeys().map((k) => k.key);

  it('menu keys are "<Section>/<Item>" and unique', () => {
    expect(keys.every((k) => k.split('/').length === 2)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('an admin sees everything', () => {
    const all = filterMenuDataByKeys(new Set(['*'])).flatMap((s) => s.items).length;
    expect(all).toBe(keys.length);
  });

  it('a user sees only the items allowed, and sections without items disappear', () => {
    const menu = filterMenuDataByKeys(new Set(['Finance/Accounting']));
    expect(menu.map((s) => s.header)).toEqual(['Finance']);
    expect(menu[0].items.map((i) => i.title)).toEqual(['Accounting']);
  });

  it('a menu hidden for the company is hidden even for an admin', () => {
    const menu = filterMenuDataByKeys(new Set(['*']), new Set(['Finance/Accounting']));
    expect(menu.flatMap((s) => s.items).some((i) => i.title === 'Accounting')).toBe(false);
  });

  it('every page path maps back to its menu key', () => {
    const map = buildPathToKeyMap();
    expect(map['/chart-of-accounts']).toBe('Finance/Accounting');
    expect(map['/ledger-trial-balance']).toBe('Finance/Accounting');
    expect(map['/journal-vouchers']).toBe('Finance/Accounting');
  });
});
