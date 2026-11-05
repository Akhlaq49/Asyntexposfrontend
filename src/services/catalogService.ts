import api from './api';

/** Inventory > Solution Packages: the company's product catalogue (backend CatalogController) */
export interface CatalogTier { id: number; name: string; code: string }
export interface CatalogSize { id: number; name: string }
export interface CatalogAlias { id: number; alias: string; source: string }
export interface CatalogFamily { id: number; name: string; tierIds: number[]; aliases: CatalogAlias[] }
export interface CatalogGroup { id: number; name: string; families: CatalogFamily[] }
export interface CatalogSku { id: number; name: string; model: string | null; color: string | null; isDefault: boolean; price: number | null }
export interface CatalogProduct {
  id: number; name: string; familyId: number | null; unit: string; fallbackPrice: number | null; description: string | null;
  skus: CatalogSku[]; aliases: CatalogAlias[];
}
export interface CatalogPackageLine { sizeId: number; tierId: number; productId: number; quantity: number }
export interface CatalogPriceList { id: number; name: string; isActive: boolean; sourceFile: string | null; importedAt: string; items: number }
export interface CatalogRuleItem { ruleName: string; gang: string; rank: number; productId: number }
export interface CatalogUnmatched { id: number; kind: ImportKind; name: string; rowJson: string; createdAt: string }
export interface CatalogData {
  tiers: CatalogTier[]; sizes: CatalogSize[]; groups: CatalogGroup[]; products: CatalogProduct[];
  packageLines: CatalogPackageLine[]; priceLists: CatalogPriceList[]; ruleItems: CatalogRuleItem[]; unmatched: CatalogUnmatched[];
}
export interface DrawingRule { name: string; rule: string; gangs: string[]; points: string[]; roomTypes: string[] }
export type ImportKind = 'pricelist' | 'categorization' | 'packages';
export type ImportReport = Record<string, unknown>;
export interface ProductBody { name: string; familyId: number | null; unit: string; fallbackPrice: number | null; description?: string | null }

const base = '/catalog';
const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const catalogService = {
  get: () => data(api.get<CatalogData>(base)),
  saveLines: (cells: { sizeId: number; tierId: number; productId: number; quantity: number | null }[]) => data(api.put<CatalogData>(`${base}/package-lines`, cells)),
  addProduct: (body: ProductBody) => data(api.post<CatalogData>(`${base}/products`, body)),
  updateProduct: (id: number, body: ProductBody) => data(api.put<CatalogData>(`${base}/products/${id}`, body)),
  deleteProduct: (id: number) => data(api.delete<CatalogData>(`${base}/products/${id}`)),
  setDefaultSku: (id: number, skuId: number) => data(api.put<CatalogData>(`${base}/products/${id}/default-sku/${skuId}`)),
  addAlias: (alias: string, target: { productId?: number; familyId?: number }) => data(api.post<CatalogData>(`${base}/aliases`, { alias, ...target })),
  deleteAlias: (id: number) => data(api.delete<CatalogData>(`${base}/aliases/${id}`)),
  activatePriceList: (id: number) => data(api.post<CatalogData>(`${base}/price-lists/${id}/activate`)),
  rules: () => data(api.get<{ rules: DrawingRule[] }>(`${base}/rules`)),
  saveRule: (ruleName: string, gang: string, productIds: number[]) => data(api.put<CatalogData>(`${base}/rules`, { ruleName, gang, productIds })),
  profiles: () => data(api.get<Record<ImportKind, unknown>>(`${base}/import/profiles`)),
  saveProfile: (kind: ImportKind, profile: unknown) => data(api.put<unknown>(`${base}/import/profiles/${kind}`, profile)),
  resetProfile: (kind: ImportKind) => data(api.delete<unknown>(`${base}/import/profiles/${kind}`)),
  importFile: (kind: ImportKind, fileName: string, rows: (string | null)[][], activate?: boolean) =>
    data(api.post<ImportReport>(`${base}/import/${kind}`, { fileName, rows, activate }, { timeout: 300000 })),
  map: (id: number, body: { catalogProductId?: number | null; familyId?: number | null; create?: boolean; groupId?: number | null; newFamilyId?: number | null }) =>
    data(api.post<CatalogData>(`${base}/unmatched/${id}/map`, { create: false, ...body })),
  dismiss: (id: number) => data(api.delete<CatalogData>(`${base}/unmatched/${id}`)),
};

/** the families' tiers, by family id */
export const familiesOf = (c: CatalogData) => c.groups.flatMap((g) => g.families.map((f) => ({ ...f, groupName: g.name, groupId: g.id })));

/** price of a product for a package: its default SKU's price (active price list), else its packages-file price */
export const priceOf = (p: CatalogProduct): number | null => {
  const sku = p.skus.find((s) => s.isDefault) || p.skus[0];
  return sku ? sku.price : p.fallbackPrice;
};
