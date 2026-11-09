import api from '../api';

/** Inventory > Solution Packages: the categorization (categories, families and their plans) and the building sizes */

/** standard / premium = only that package; both = Standard straight away, Premium after the user confirms; none = no package */
export type SolutionUsage = 'standard' | 'premium' | 'both' | 'none';
export interface SolutionLine { id: number; groupId: number; name: string; inStandard: boolean; inPremium: boolean; usage: SolutionUsage; sortOrder: number }
export interface SolutionGroup { id: number; name: string; sortOrder: number; lines: SolutionLine[] }
export interface PackageSize { id: number; name: string; sortOrder: number }
export interface SolutionData { groups: SolutionGroup[]; sizes: PackageSize[] }

interface LinePayload { groupId: number; name: string; inStandard: boolean; inPremium: boolean }

export type MoveKind = 'groups' | 'lines' | 'sizes';

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

  move: (kind: MoveKind, id: number, dir: -1 | 1) => data(api.post<SolutionData>(`${base}/move/${kind}/${id}?dir=${dir}`)),
};
