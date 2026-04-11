import { describe, it, expect } from 'vitest';
import menuData from '../../data/menuData';

describe('menuData', () => {
  it('should contain Manufacturing section', () => {
    const manufacturingSection = menuData.find(
      section => section.header === 'Manufacturing'
    );
    expect(manufacturingSection).toBeTruthy();
  });

  it('should have Bill of Materials menu item', () => {
    const allItems = menuData.flatMap(section => section.items || []);
    const bom = allItems.find(item => item.title === 'Bill of Materials');
    expect(bom).toBeTruthy();
    expect(bom?.path).toBe('/bill-of-materials');
  });

  it('should have Manufacturing Orders menu item', () => {
    const allItems = menuData.flatMap(section => section.items || []);
    const orders = allItems.find(item => item.title === 'Manufacturing Orders');
    expect(orders).toBeTruthy();
    expect(orders?.path).toBe('/manufacturing-orders');
  });

  it('should have Supplier Ledger menu item', () => {
    const allItems = menuData.flatMap(section => section.items || []);
    const ledger = allItems.find(item => item.title === 'Supplier Ledger');
    expect(ledger).toBeTruthy();
    expect(ledger?.path).toBe('/supplier-ledger');
  });

  it('should have all core sections', () => {
    const headers = menuData.map(section => section.header);
    expect(headers).toContain('Main');
    expect(headers).toContain('Inventory');
    expect(headers).toContain('Sales');
    expect(headers).toContain('Purchases');
    expect(headers).toContain('Manufacturing');
  });

  it('all menu items should have paths or children', () => {
    const allItems = menuData.flatMap(section => section.items || []);
    for (const item of allItems) {
      const hasPath = !!item.path;
      const hasChildren = !!(item as any).children;
      expect(hasPath || hasChildren, `${item.title} should have a path or children`).toBe(true);
    }
  });

  it('all menu items should have icons', () => {
    const allItems = menuData.flatMap(section => section.items || []);
    for (const item of allItems) {
      expect(item.icon, `${item.title} should have an icon`).toBeTruthy();
    }
  });
});
