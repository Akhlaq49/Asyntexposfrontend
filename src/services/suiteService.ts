import api from './api';

/** Calls for branches, stock ledger, credit accounts, catalogue, channels, variants, manufacturing and restaurant. */

// ── Locations and stock ──
export type LocationType = 'HeadOffice' | 'Branch' | 'Warehouse' | 'Factory' | 'Kitchen';
export interface Location {
  id: number; code: string; name: string; type: LocationType; parentId?: number | null;
  address?: string | null; phone?: string | null; drugLicenceNo?: string | null;
  isDefault: boolean; sellsOnline: boolean; isActive: boolean;
}
export interface MyLocation { location: Location; homeLocationId: number | null; restricted: boolean }
export interface ProductStock {
  productId: number; productName: string; total: number; noBatch: number;
  locations: { locationId: number | null; location: string; quantity: number; sellable: number;
    batches: { id: number; batchNo: string; variantId?: number | null; expiryDate: string | null; quantity: number; purchasePrice: number }[] }[];
}
export interface StockMatrix {
  locations: { id: number; code: string; name: string; type: string }[];
  rows: { id: number; productName: string; genericName?: string; sku?: string; category?: string; total: number; noBatch: number; costValue: number; perLocation: Record<string, number>; lowAt: number[] }[];
}
export interface LocationSummaryRow {
  id: number; code: string; name: string; type: string; isDefault: boolean; stockUnits: number; stockValue: number;
  expiredValue: number; nearExpiryValue: number; bills: number; sales: number; due: number; incomingTransfers: number; requestsToFulfil: number;
}
export interface Movement {
  id: number; productId: number; productName: string; variantId?: number | null; locationId?: number | null; location?: string | null;
  batchId?: number | null; batchNo?: string | null; quantity: number; unitCost: number; movementType: string;
  sourceType?: string | null; sourceId?: number | null; reference?: string | null; createdBy?: string | null; createdAt: string;
}
export interface TransferItem {
  id: number; productId: number; productName: string; sku: string; quantity: number; variantId?: number | null;
  batchId?: number | null; batchNo?: string | null; expiryDate?: string | null; receivedQty?: number | null; unitCost: number;
}
export interface Transfer {
  id: number; warehouseFrom: string; warehouseTo: string; referenceNumber: string; notes?: string | null; noOfProducts: number;
  quantityTransferred: number; date: string; fromLocationId?: number | null; toLocationId?: number | null; status: string;
  dispatchedBy?: string | null; dispatchedAt?: string | null; receivedBy?: string | null; receivedAt?: string | null;
  stockRequestId?: number | null; items: TransferItem[];
}
export interface StockRequest {
  id: number; reference: string; status: string; source: string; notes?: string | null; requestedBy?: string | null; approvedBy?: string | null;
  transferId?: number | null; fromLocationId: number; fromLocation?: string; toLocationId: number; toLocation?: string; createdAt: string;
  items: { id: number; productId: number; productName?: string; variantId?: number | null; requestedQty: number; approvedQty?: number | null }[];
}

// ── Credit ──
export interface CustomerBalance {
  id: number; fullName: string; phone?: string; customerType?: string; creditLimit?: number | null; creditDays?: number | null;
  creditBlocked: boolean; balance: number; advance: number; oldestDueDays?: number | null; overLimit: boolean; overdue: boolean;
}
export interface CustomerAccount {
  id: number; fullName: string; phone?: string; customerType?: string | null; priceLevelId?: number | null; priceLevel?: string | null;
  creditLimit?: number | null; creditDays?: number | null; openingBalance: number; ntn?: string | null; strn?: string | null;
  creditBlocked: boolean; balance: number; overdueBills: number; overdueAmount: number; available?: number | null;
}
export interface Statement {
  customer: { id: number; fullName: string; phone?: string; address?: string; customerType?: string; creditLimit?: number; creditDays?: number; ntn?: string; strn?: string };
  from: string | null; to: string | null; openingBalance: number; closingBalance: number; currentBalance: number;
  overdueBills: number; overdueAmount: number; totalDebit: number; totalCredit: number;
  rows: { date: string; type: string; reference: string; narration: string; debit: number; credit: number; balance: number }[];
}
export interface PriceLevel { id: number; name: string; isDefault: boolean; prices: number; customers: number }
export interface ProductPrice { id?: number; productId: number; variantId?: number | null; priceLevelId: number; saleUnit: string; minQty: number; price: number }
export interface PriceQuote { priceLevelId: number | null; priceLevel?: string; prices: { productId: number; variantId?: number | null; saleUnit: string; minQty: number; price: number }[] }

// ── Catalogue ──
export interface MedicineMaster {
  id: number; brandName: string; genericName: string; strength?: string; dosageForm?: string; packSize?: string;
  unitsPerStrip?: number; stripsPerBox?: number; manufacturer?: string; registrationNo?: string; therapeuticClass?: string;
  schedule?: string; barcode?: string; maxRetailPrice?: number; priceUpdatedOn?: string;
}
export interface Interaction { severity: string; note?: string; genericA: string; genericB: string; productsA: string[]; productsB: string[] }
export interface Translation { productId: number; lang: string; name: string; usageNote?: string | null }

// ── Channels ──
export interface ChannelConnection {
  id: number; channel: string; shopDomain: string; accessToken: string; webhookSecret: string; locationId: number;
  externalLocationId?: string | null; syncProducts: boolean; syncStock: boolean; syncPrices: boolean; importOrders: boolean;
  status: string; lastError?: string | null; lastSyncAt?: string | null; webhookUrl: string;
}

// ── Variants ──
export interface VariantAttr { id: number; name: string; values: { id: number; value: string; code?: string }[] }
export interface Variant { id: number; sku: string; barcode?: string | null; option1?: string | null; option2?: string | null; option3?: string | null; price?: number | null; costPrice?: number | null; isActive: boolean; stock: number }
export interface VariantMatrix { rows: string[]; columns: string[]; cells: { variantId: number; row: string; column: string; sku: string; value: number }[] }

const g = async <T>(url: string, params?: object) => (await api.get<T>(url, { params })).data;
const p = async <T>(url: string, body?: unknown) => (await api.post<T>(url, body ?? {})).data;
const u = async <T>(url: string, body?: unknown) => (await api.put<T>(url, body)).data;
const d = async (url: string) => { await api.delete(url); };

const suite = {
  // locations
  locations: (includeInactive = false) => g<Location[]>('/locations', { includeInactive }),
  myLocation: () => g<MyLocation>('/locations/mine'),
  saveLocation: (id: number | null, body: Partial<Location>) => (id ? u<Location>(`/locations/${id}`, body) : p<Location>('/locations', body)),
  deleteLocation: (id: number) => d(`/locations/${id}`),
  productStock: (productId: number) => g<ProductStock>(`/locations/product-stock/${productId}`),
  stockMatrix: (params: { search?: string; category?: string; lowOnly?: boolean; take?: number }) => g<StockMatrix>('/locations/stock-matrix', params),
  summary: (from?: string, to?: string) => g<{ from: string; to: string; rows: LocationSummaryRow[]; salesWithoutLocation: { bills: number; total: number } | null }>('/locations/summary', { from, to }),
  levels: (id: number) => g<{ productId: number; productName: string; minQty: number; maxQty: number }[]>(`/locations/${id}/levels`),
  saveLevels: (id: number, rows: { productId: number; minQty: number; maxQty: number }[]) => u(`/locations/${id}/levels`, rows),
  movements: (params: { productId?: number; locationId?: number; type?: string; from?: string; to?: string; reference?: string; take?: number }) => g<Movement[]>('/stock-movements', params),
  reconcile: () => g<{ products: number; mismatched: number; rows: { id: number; productName: string; total: number; inBatches: number }[] }>('/stock-movements/reconcile'),

  // transfers and requests
  transfers: () => g<Transfer[]>('/stock-transfers'),
  transfer: (id: number) => g<Transfer>(`/stock-transfers/${id}`),
  createTransfer: (body: { fromLocationId: number; toLocationId: number; mode: 'draft' | 'dispatch'; notes?: string; items: { productId: number; quantity: number; variantId?: number | null; batchId?: number | null }[] }) =>
    p<{ id: number; referenceNumber: string; status: string }>('/stock-transfers', body),
  dispatchTransfer: (id: number) => p(`/stock-transfers/${id}/dispatch`),
  receiveTransfer: (id: number, lines: { itemId: number; receivedQty: number }[], notes?: string) => p<{ shortBy: number }>(`/stock-transfers/${id}/receive`, { lines, notes }),
  cancelTransfer: (id: number) => p(`/stock-transfers/${id}/cancel`),
  deleteTransfer: (id: number) => d(`/stock-transfers/${id}`),
  requests: (status?: string, locationId?: number) => g<StockRequest[]>('/stock-requests', { status, locationId }),
  createRequest: (body: { fromLocationId?: number; toLocationId?: number; notes?: string; submit?: boolean; items: { productId: number; requestedQty: number }[] }) => p('/stock-requests', body),
  submitRequest: (id: number) => p(`/stock-requests/${id}/submit`),
  approveRequest: (id: number, lines: { itemId: number; approvedQty: number }[], dispatch = true) => p<{ transferId: number; referenceNumber: string }>(`/stock-requests/${id}/approve`, { dispatch, lines }),
  rejectRequest: (id: number, reason?: string) => p(`/stock-requests/${id}/reject`, { reason }),
  deleteRequest: (id: number) => d(`/stock-requests/${id}`),
  generateReorder: () => p<{ created: number; references: string[] }>('/stock-requests/generate-reorder'),

  // credit
  balances: (search?: string, dueOnly = false) => g<{ totalReceivable: number; rows: CustomerBalance[] }>('/customer-accounts', { search, dueOnly }),
  account: (id: number) => g<CustomerAccount>(`/customer-accounts/${id}`),
  saveAccount: (id: number, body: Partial<CustomerAccount>) => u(`/customer-accounts/${id}`, body),
  statement: (id: number, from?: string, to?: string) => g<Statement>(`/customer-accounts/${id}/statement`, { from, to }),
  openBills: (id: number) => g<{ id: number; reference: string; saleDate: string; grandTotal: number; paid: number; due: number; days: number }[]>(`/customer-accounts/${id}/open-bills`),
  creditCheck: (id: number, amount: number) => g<{ balance: number; limit?: number | null; overdueBills: number; overdueAmount: number; blocked: boolean; ok: boolean; problems: string[] }>(`/customer-accounts/${id}/credit-check`, { amount }),
  addAdjustment: (body: { customerId: number; entryType: string; debit: number; credit: number; narration?: string; entryDate?: string }) => p('/customer-accounts/adjustments', body),
  receipts: (customerId?: number, from?: string, to?: string) => g<{ id: number; reference: string; customerId: number; customerName: string; amount: number; paymentMethod: string; chequeNo?: string; notes?: string; receivedBy?: string; receiptDate: string; salesReturnId?: number | null; allocated: number }[]>('/customer-receipts', { customerId, from, to }),
  receipt: (id: number) => g<{ receipt: { reference: string; amount: number; paymentMethod: string; receiptDate: string; notes?: string; chequeNo?: string }; customer: { id: number; fullName: string; phone?: string }; bills: { id: number; reference: string; amount: number; due: number }[]; balance: number }>(`/customer-receipts/${id}`),
  receive: (body: { customerId: number; amount: number; paymentMethod: string; chequeNo?: string; chequeDate?: string; notes?: string; receiptDate?: string }) =>
    p<{ id: number; reference: string; amount: number; allocated: number; advance: number; balance: number }>('/customer-receipts', body),
  deleteReceipt: (id: number) => d(`/customer-receipts/${id}`),
  priceLevels: () => g<PriceLevel[]>('/price-levels'),
  savePriceLevel: (id: number | null, body: { name: string; isDefault: boolean }) => (id ? u(`/price-levels/${id}`, body) : p('/price-levels', body)),
  deletePriceLevel: (id: number) => d(`/price-levels/${id}`),
  productPrices: (productId: number) => g<ProductPrice[]>(`/price-levels/prices/${productId}`),
  saveProductPrices: (productId: number, rows: ProductPrice[]) => u(`/price-levels/prices/${productId}`, rows),
  quote: (customerId?: number | null, productIds?: number[]) => g<PriceQuote>('/price-levels/quote', { customerId, productIds: productIds?.join(',') }),

  // catalogue and languages
  searchCatalogue: (q: string, barcode?: string) => g<{ medicine: MedicineMaster; productId: number | null }[]>('/medicine-master/search', { q, barcode }),
  catalogueStats: () => g<{ medicines: number; interactions: number; lastPriceUpdate?: string; linkedProducts: number }>('/medicine-master/stats'),
  importMedicine: (id: number, body?: { price?: number; category?: string; rackLocation?: string }) => p<{ productId: number; created: boolean }>(`/medicine-master/${id}/import`, body),
  priceChanges: () => g<{ productId: number; productName: string; currentPrice: number; newPrice: number; boxPrice: number; priceUpdatedOn?: string }[]>('/medicine-master/price-changes'),
  applyPriceChanges: (ids: number[]) => p<{ changed: number }>('/medicine-master/price-changes/apply', ids),
  interactions: (productIds: number[]) => p<Interaction[]>('/medicine-master/interactions', productIds),
  translations: (lang: string, productIds?: number[]) => g<Translation[]>('/product-translations', { lang, productIds: productIds?.join(',') }),
  productTranslations: (productId: number) => g<{ lang: string; name: string; usageNote?: string; description?: string }[]>(`/product-translations/${productId}`),
  saveTranslations: (productId: number, rows: { lang: string; name: string; usageNote?: string }[]) => u(`/product-translations/${productId}`, rows),
  preferences: () => g<{ language: string; tenantLanguage: string; locationId?: number | null; restrictToLocation: boolean }>('/me/preferences'),
  setLanguage: (language: string) => u('/me/language', { language }),

  // channels
  channels: () => g<{ connection: ChannelConnection; linkedProducts: number; pending: number; failed: number }[]>('/channels'),
  saveChannel: (id: number | null, body: Partial<ChannelConnection>) => (id ? u<ChannelConnection>(`/channels/${id}`, body) : p<ChannelConnection>('/channels', body)),
  deleteChannel: (id: number) => d(`/channels/${id}`),
  testChannel: (id: number) => p<{ shop: string; domain: string; locations: { id: string; name: string }[] }>(`/channels/${id}/test`),
  syncProducts: (id: number, productIds?: number[]) => p<{ queued: number }>(`/channels/${id}/sync-products`, productIds ?? []),
  syncStock: (id: number) => p<{ queued: number }>(`/channels/${id}/sync-stock`),
  processNow: () => p<{ sent: number }>('/channels/process-now'),
  retryFailed: (id: number) => p<{ requeued: number; reimported: number }>(`/channels/${id}/retry-failed`),
  channelLog: (id: number) => g<{ outbox: { id: number; kind: string; entityId: number; product?: string; status: string; attempts: number; lastError?: string; createdAt: string; sentAt?: string }[]; orders: { id: number; externalOrderId: string; externalNumber?: string; saleId?: number; status: string; error?: string; importedAt: string }[] }>(`/channels/${id}/log`),

  // variants
  variantAttributes: () => g<VariantAttr[]>('/variants/attributes'),
  productVariants: (productId: number, locationId?: number) => g<{ product: { id: number; productName: string; articleNo?: string; season?: string; hasVariants: boolean; price: number; sku?: string }; options: { variantAttributeId: number; name: string; position: number }[]; variants: Variant[] }>(`/variants/products/${productId}`, { locationId }),
  generateVariants: (productId: number, body: { articleNo?: string; season?: string; options: { attributeId: number; values: string[] }[] }) => p<{ created: number; total: number }>(`/variants/products/${productId}/generate`, body),
  updateVariant: (id: number, body: Partial<Variant>) => u(`/variants/${id}`, body),
  deleteVariant: (id: number) => d(`/variants/${id}`),
  lookupVariant: (code: string) => g<{ variant: { id: number; sku: string; option1?: string; option2?: string; option3?: string; price: number }; product: { id: number; productName: string; price: number; taxType?: string; tax?: string; category?: string }; label: string }>('/variants/lookup', { code }),
  variantMatrix: (productId: number, params: { locationId?: number; measure?: 'stock' | 'sales'; from?: string; to?: string }) => g<VariantMatrix>(`/variants/products/${productId}/matrix`, params),
  variantReport: (from?: string, to?: string, locationId?: number) => g<{ from: string; to: string; byFirst: { value: string; units: number; sales: number; margin: number }[]; bySecond: { value: string; units: number; sales: number; margin: number }[] }>('/variants/report', { from, to, locationId }),

  // manufacturing
  workCentres: () => g<{ id: number; name: string; locationId?: number; costPerHour: number }[]>('/manufacturing/work-centres'),
  saveWorkCentre: (id: number | null, body: { name: string; costPerHour: number; locationId?: number | null }) => (id ? u(`/manufacturing/work-centres/${id}`, body) : p('/manufacturing/work-centres', body)),
  deleteWorkCentre: (id: number) => d(`/manufacturing/work-centres/${id}`),
  boms: () => g<any[]>('/manufacturing/bom'),
  bom: (id: number) => g<any>(`/manufacturing/bom/${id}`),
  saveBom: (id: number | null, body: unknown) => (id ? u<{ id: number }>(`/manufacturing/bom/${id}`, body) : p<{ id: number }>('/manufacturing/bom', body)),
  deleteBom: (id: number) => d(`/manufacturing/bom/${id}`),
  orders: (status?: string) => g<any[]>('/manufacturing/orders', { status }),
  order: (id: number) => g<any>(`/manufacturing/orders/${id}`),
  createOrder: (body: { bomId: number; quantity: number; locationId?: number; outputLocationId?: number; outputBatchNo?: string; outputExpiryDate?: string; notes?: string }) => p<{ id: number; reference: string }>('/manufacturing/orders', body),
  startOrder: (id: number) => p(`/manufacturing/orders/${id}/start`),
  stepOrder: (id: number, opId: number, step: 'start' | 'finish') => p(`/manufacturing/orders/${id}/operations/${opId}/${step}`),
  requestMaterials: (id: number, fromLocationId?: number) => p<any>(`/manufacturing/orders/${id}/request-materials${fromLocationId ? `?fromLocationId=${fromLocationId}` : ''}`),
  completeOrder: (id: number, body: { actualOutputQty?: number; scrapQty: number; outputBatchNo?: string; outputExpiryDate?: string; items: { itemId: number; consumedQty?: number; wastageQty: number }[] }) =>
    p<{ totalCost: number; unitCost: number; outputBatchNo: string }>(`/manufacturing/orders/${id}/complete`, body),
  cancelOrder: (id: number) => p(`/manufacturing/orders/${id}/cancel`),
  deleteOrder: (id: number) => d(`/manufacturing/orders/${id}`),
  yieldReport: (from?: string, to?: string) => g<{ from: string; to: string; rows: any[] }>('/manufacturing/reports/yield', { from, to }),

  // restaurant
  menu: () => g<{ id: number; productName: string; category?: string; price: number; kitchenStationId?: number | null; plateCost: number; foodCostPct?: number | null;
    modifierGroups: { id: number; name: string; minSelect: number; maxSelect: number; modifiers: { id: number; name: string; price: number }[] }[] }[]>('/restaurant/menu'),
  recipe: (productId: number) => g<any>(`/restaurant/recipes/${productId}`),
  saveRecipe: (productId: number, body: { yieldQty: number; notes?: string; kitchenStationId?: number | null; items: { ingredientId: number; quantity: number; unit: string; wastagePct: number }[] }) => u<{ plateCost: number }>(`/restaurant/recipes/${productId}`, body),
  deleteRecipe: (productId: number) => d(`/restaurant/recipes/${productId}`),
  setDishModifiers: (productId: number, groupIds: number[]) => u(`/restaurant/recipes/${productId}/modifier-groups`, groupIds),
  modifierGroups: () => g<{ id: number; name: string; minSelect: number; maxSelect: number; modifiers: { id: number; name: string; price: number; ingredientId?: number | null; ingredientQty?: number | null }[] }[]>('/restaurant/modifier-groups'),
  saveModifierGroup: (id: number | null, body: unknown) => (id ? u(`/restaurant/modifier-groups/${id}`, body) : p('/restaurant/modifier-groups', body)),
  deleteModifierGroup: (id: number) => d(`/restaurant/modifier-groups/${id}`),
  tables: (locationId?: number) => g<{ id: number; name: string; seats: number; status: string; locationId: number; due: number; openBills: { id: number; reference: string; grandTotal: number; due: number; covers?: number }[]; currentBill?: { id: number; reference: string; grandTotal: number; due: number; covers?: number } }[]>('/restaurant/tables', { locationId }),
  saveTable: (id: number | null, body: { name: string; seats: number; locationId?: number; status?: string }) => (id ? u(`/restaurant/tables/${id}`, body) : p('/restaurant/tables', body)),
  deleteTable: (id: number) => d(`/restaurant/tables/${id}`),
  freeTable: (id: number) => p(`/restaurant/tables/${id}/free`),
  stations: (locationId?: number) => g<{ id: number; name: string; locationId: number; printerName?: string }[]>('/restaurant/stations', { locationId }),
  saveStation: (id: number | null, body: { name: string; locationId?: number; printerName?: string }) => (id ? u(`/restaurant/stations/${id}`, body) : p('/restaurant/stations', body)),
  deleteStation: (id: number) => d(`/restaurant/stations/${id}`),
  kitchen: (stationId?: number, includeServed = false) => g<{ id: number; ticketNo: string; status: string; stationId: number; station?: string; createdAt: string; minutes: number; bill?: string; orderType?: string; table?: string; customer?: string; items: { itemName: string; quantity: number; notes?: string }[] }[]>('/restaurant/kitchen', { stationId, includeServed }),
  ticketStatus: (id: number, status: string) => p(`/restaurant/kitchen/${id}/status`, { status }),
  foodCost: () => g<{ id: number; productName: string; category?: string; price: number; plateCost: number; margin: number; foodCostPct: number }[]>('/restaurant/food-cost'),
};

export default suite;

export const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'Branch', label: 'Branch / shop' },
  { value: 'Warehouse', label: 'Warehouse' },
  { value: 'HeadOffice', label: 'Head office' },
  { value: 'Factory', label: 'Factory / production' },
  { value: 'Kitchen', label: 'Kitchen' },
];

export const today = () => new Date().toISOString().slice(0, 10);
