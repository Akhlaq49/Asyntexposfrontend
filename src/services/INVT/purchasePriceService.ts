import api from '../api';

/** Inventory > Purchase Prices: what the company pays for each product (backend: Controllers/INVT/PurchasePricesController.cs) */
export interface PurchasePriceRow {
  productId: number; productName: string; sku: string | null; model: string | null; color: string | null;
  endUserPrice: number; purchasePrice: number; margin: number; updatedAt: string; updatedBy: string | null;
}

export const getPurchasePrices = () => api.get<PurchasePriceRow[]>('/purchase-prices').then((r) => r.data);
export const savePurchasePrices = (changes: { productId: number; purchasePrice: number }[]) =>
  api.put<PurchasePriceRow[]>('/purchase-prices', changes).then((r) => r.data);

/** margin as a share of the end user price (0 when there is no price) */
export const marginPercent = (endUserPrice: number, purchasePrice: number) =>
  endUserPrice > 0 ? Math.round(((endUserPrice - purchasePrice) / endUserPrice) * 1000) / 10 : 0;
