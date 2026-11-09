/**
 * A quotation's profit: what the customer pays for the products (after discounts, before tax) less what the company
 * pays for them (the purchase prices, Inventory > Purchase Prices), plus the installation, testing and commissioning
 * charge. Tax is not profit (it is owed to the government); shipping is passed on and left out.
 */
export interface ProfitLine {
  productId: number;
  productName: string;
  quantity: number;
  /** selling price per unit (the quotation line's price) */
  unitPrice: number;
  /** line discount per unit */
  discount: number;
}

interface QuotationProfit {
  /** products, after line and overall discounts, before tax */
  sales: number;
  /** quantity x purchase price of the products whose purchase price is known */
  cost: number;
  /** sales - cost */
  productMargin: number;
  installation: number;
  /** product margin + installation */
  profit: number;
  /** profit as a share of sales + installation */
  profitPercent: number;
  /** lines with no purchase price (not in the inventory): their cost is not counted */
  unknownCost: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quotationProfit(
  lines: ProfitLine[], overallDiscount: number, installation: number,
  purchasePriceOf: (productId: number) => number | null | undefined,
): QuotationProfit {
  const gross = lines.reduce((s, l) => s + Math.max(0, l.unitPrice - (l.discount || 0)) * l.quantity, 0);
  const sales = Math.max(0, gross - (overallDiscount || 0));
  let cost = 0;
  const unknownCost: string[] = [];
  for (const l of lines) {
    const buy = l.productId > 0 ? purchasePriceOf(l.productId) : null;
    if (buy == null) unknownCost.push(l.productName);
    else cost += buy * l.quantity;
  }
  const inst = installation || 0;
  const productMargin = sales - cost;
  const profit = productMargin + inst;
  const base = sales + inst;
  return {
    sales: round2(sales), cost: round2(cost), productMargin: round2(productMargin), installation: round2(inst),
    profit: round2(profit), profitPercent: base > 0 ? Math.round((profit / base) * 1000) / 10 : 0, unknownCost,
  };
}
