import api from './api';

/** Inventory > Solution Packages: data for the package calculation engine */

/** standard / premium = only that package; both = Standard straight away, Premium after the user confirms; none = no package */
export type SolutionUsage = 'standard' | 'premium' | 'both' | 'none';
export interface SolutionLine { id: number; groupId: number; name: string; inStandard: boolean; inPremium: boolean; usage: SolutionUsage; sortOrder: number }
export interface SolutionGroup { id: number; name: string; sortOrder: number; lines: SolutionLine[] }
export interface PackageSize { id: number; name: string; sortOrder: number }
export interface PackageItem {
  id: number; name: string; sortOrder: number;
  productLineId: number | null; productLineName: string | null; groupName: string | null;
  inStandard: boolean; inPremium: boolean; usage: SolutionUsage;
  productId: number | null; productName: string | null;
  /** size id -> quantity (sizes not listed = 0) */
  quantities: Record<string, number>;
}
export interface SolutionData { groups: SolutionGroup[]; sizes: PackageSize[]; items: PackageItem[] }

export interface ItemPayload { name: string; productLineId: number | null; productId: number | null; quantities: Record<number, number> }
export interface LinePayload { groupId: number; name: string; inStandard: boolean; inPremium: boolean }
export interface DesignLine { itemId: number; name: string; quantity: number; usage: SolutionUsage; productLineName: string | null; groupName: string | null }
export interface DesignResult { sizeId: number; sizeName: string; solution: 'standard' | 'premium'; items: DesignLine[]; toConfirm: DesignLine[]; leftOut: DesignLine[] }

export type MoveKind = 'groups' | 'lines' | 'sizes' | 'items';

const base = '/solution-packages';
const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const solutionPackageService = {
  getAll: () => data(api.get<SolutionData>(base)),

  addGroup: (name: string) => data(api.post<SolutionData>(`${base}/groups`, { name })),
  renameGroup: (id: number, name: string) => data(api.put<SolutionData>(`${base}/groups/${id}`, { name })),
  deleteGroup: (id: number) => data(api.delete<SolutionData>(`${base}/groups/${id}`)),

  addLine: (body: LinePayload) => data(api.post<SolutionData>(`${base}/lines`, body)),
  updateLine: (id: number, body: LinePayload) => data(api.put<SolutionData>(`${base}/lines/${id}`, body)),
  deleteLine: (id: number) => data(api.delete<SolutionData>(`${base}/lines/${id}`)),

  addSize: (name: string) => data(api.post<SolutionData>(`${base}/sizes`, { name })),
  renameSize: (id: number, name: string) => data(api.put<SolutionData>(`${base}/sizes/${id}`, { name })),
  deleteSize: (id: number) => data(api.delete<SolutionData>(`${base}/sizes/${id}`)),

  addItem: (body: ItemPayload) => data(api.post<SolutionData>(`${base}/items`, body)),
  updateItem: (id: number, body: ItemPayload) => data(api.put<SolutionData>(`${base}/items/${id}`, body)),
  deleteItem: (id: number) => data(api.delete<SolutionData>(`${base}/items/${id}`)),

  saveQuantities: (cells: { itemId: number; sizeId: number; quantity: number }[]) => data(api.put<SolutionData>(`${base}/quantities`, cells)),

  /** confirmedItemIds: null = not asked yet (Premium then lists the 'both' products in toConfirm) */
  design: (sizeId: number, solution: 'standard' | 'premium', confirmedItemIds: number[] | null) =>
    data(api.post<DesignResult>(`${base}/design`, { sizeId, solution, confirmedItemIds })),

  move: (kind: MoveKind, id: number, dir: -1 | 1) => data(api.post<SolutionData>(`${base}/move/${kind}/${id}?dir=${dir}`)),
};
