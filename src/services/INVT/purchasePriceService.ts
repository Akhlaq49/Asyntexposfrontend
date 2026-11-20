import api from '../api';

/**
 * Inventory > Sale Prices (backend: Controllers/INVT/SalePricesController.cs): each product's purchase price - the unit
 * cost of its latest received purchase - the sale price people set, and the profit between them.
 */
export interface SalePriceRow {
  productId: number; productName: string; sku: string | null; model: string | null; color: string | null;
  salePrice: number; purchasePrice: number;
  /** sale price - purchase price */
  profit: number; profitPercent: number;
  /** the purchase the purchase price comes from (null = not bought yet: the sale price is used, no profit) */
  purchasedFrom: string | null; purchasedOn: string | null;
  isSet: boolean;
  salePriceUpdatedAt: string;
}

export const getSalePrices = () => api.get<SalePriceRow[]>('/sale-prices').then((r) => r.data);
export const saveSalePrices = (changes: { productId: number; salePrice: number }[]) =>
  api.put<SalePriceRow[]>('/sale-prices', changes).then((r) => r.data);

/** The cost of a product not bought yet (a new product's cost typed on a purchase order); a received purchase replaces it */
export const savePurchasePrices = (changes: { productId: number; purchasePrice: number }[]) =>
  api.put('/purchase-prices', changes).then((r) => r.data);

/** profit as a share of the sale price (0 when there is no price) */
export const profitPercent = (salePrice: number, purchasePrice: number) =>
  salePrice > 0 ? Math.round(((salePrice - purchasePrice) / salePrice) * 1000) / 10 : 0;
