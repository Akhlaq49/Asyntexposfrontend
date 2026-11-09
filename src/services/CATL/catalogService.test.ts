import { describe, expect, it } from 'vitest';
import { CatalogData, CatalogProduct, familiesOf, priceOf } from './catalogService';

const product = (over: Partial<CatalogProduct>): CatalogProduct =>
  ({ id: 1, name: 'P', familyId: null, unit: 'pcs', fallbackPrice: null, description: null, skus: [], aliases: [], ...over });

describe('priceOf', () => {
  it('is the default SKU\'s inventory price', () => {
    expect(priceOf(product({ skus: [
      { id: 1, name: 'P Black', model: null, color: 'Black', isDefault: false, price: 120 },
      { id: 2, name: 'P White', model: null, color: 'White', isDefault: true, price: 100 }] }))).toBe(100);
  });
  it('is the first SKU\'s when none is default', () => {
    expect(priceOf(product({ skus: [{ id: 1, name: 'P', model: null, color: null, isDefault: false, price: 90 }] }))).toBe(90);
  });
  it('is the entered price for a product not in the inventory', () => {
    expect(priceOf(product({ fallbackPrice: 50 }))).toBe(50);
  });
  it('is null when there is no price at all', () => {
    expect(priceOf(product({}))).toBeNull();
  });
});

describe('familiesOf', () => {
  it('lists every family with its category', () => {
    const cat = { groups: [
      { id: 1, name: 'Lighting', families: [{ id: 10, name: 'Piano', tierIds: [1, 2], aliases: [] }] },
      { id: 2, name: 'Safety', families: [{ id: 20, name: 'Gas', tierIds: [1], aliases: [] }, { id: 21, name: 'Smoke', tierIds: [], aliases: [] }] },
    ] } as unknown as CatalogData;
    expect(familiesOf(cat).map((f) => [f.name, f.groupName, f.groupId])).toEqual([['Piano', 'Lighting', 1], ['Gas', 'Safety', 2], ['Smoke', 'Safety', 2]]);
  });
});
