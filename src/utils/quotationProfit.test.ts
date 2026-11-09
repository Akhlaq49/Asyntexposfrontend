import { describe, expect, it } from 'vitest';
import { quotationProfit } from './quotationProfit';
import { marginPercent } from '../services/INVT/purchasePriceService';

const buy: Record<number, number> = { 1: 8684, 2: 7311 };
const priceOf = (id: number) => buy[id] ?? null;

describe('quotation profit', () => {
  it('is the products sold less their purchase prices, plus installation', () => {
    const p = quotationProfit([
      { productId: 1, productName: 'Gas Sensor', quantity: 2, unitPrice: 18684, discount: 0 },
      { productId: 2, productName: 'Piano Switch', quantity: 3, unitPrice: 17311, discount: 0 },
    ], 0, 50000, priceOf);
    expect(p.sales).toBe(2 * 18684 + 3 * 17311);
    expect(p.cost).toBe(2 * 8684 + 3 * 7311);
    expect(p.productMargin).toBe(5 * 10000);
    expect(p.installation).toBe(50000);
    expect(p.profit).toBe(100000);
    expect(p.unknownCost).toEqual([]);
  });

  it('takes line discounts and the overall discount off the sales', () => {
    const p = quotationProfit([{ productId: 1, productName: 'Gas Sensor', quantity: 2, unitPrice: 18684, discount: 684 }], 1000, 0, priceOf);
    expect(p.sales).toBe(2 * 18000 - 1000);
    expect(p.profit).toBe(35000 - 2 * 8684);
  });

  it('counts a line not in the inventory as costing nothing and names it', () => {
    const p = quotationProfit([
      { productId: 0, productName: 'Cable laying', quantity: 1, unitPrice: 5000, discount: 0 },
      { productId: 99, productName: 'Unknown product', quantity: 1, unitPrice: 100, discount: 0 },
    ], 0, 0, priceOf);
    expect(p.cost).toBe(0);
    expect(p.unknownCost).toEqual(['Cable laying', 'Unknown product']);
  });

  it('can be a loss when the purchase price is higher than the price quoted', () => {
    const p = quotationProfit([{ productId: 1, productName: 'Gas Sensor', quantity: 1, unitPrice: 8000, discount: 0 }], 0, 0, priceOf);
    expect(p.profit).toBe(8000 - 8684);
    expect(p.profitPercent).toBeLessThan(0);
  });

  it('profit % is of sales plus installation; 0 when there is nothing', () => {
    expect(quotationProfit([{ productId: 1, productName: 'x', quantity: 1, unitPrice: 18684, discount: 0 }], 0, 1316, priceOf).profitPercent).toBe(56.6);   // (10000 + 1316) / (18684 + 1316)
    expect(quotationProfit([], 0, 0, priceOf).profitPercent).toBe(0);
  });

  it('a discount larger than the products does not make sales negative', () => {
    expect(quotationProfit([{ productId: 1, productName: 'x', quantity: 1, unitPrice: 100, discount: 0 }], 500, 0, priceOf).sales).toBe(0);
  });
});

describe('purchase price margin %', () => {
  it.each([[18684, 8684, 53.5], [10000, 10000, 0], [0, 0, 0], [100, 150, -50]])('end user %s, purchase %s -> %s%%', (e, p, m) =>
    expect(marginPercent(e, p)).toBe(m));
});
