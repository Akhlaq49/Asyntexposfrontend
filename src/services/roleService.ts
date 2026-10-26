import { useCallback, useEffect, useState } from 'react';
import api from './api';

/** A staff role of the company (from the Roles table) */
export interface RoleDto { id: number; name: string; isSystem: boolean; users: number }

export const roleService = {
  getAll: async () => (await api.get<RoleDto[]>('/roles')).data,
  create: async (name: string) => (await api.post<RoleDto>('/roles', { name })).data,
  rename: async (id: number, name: string) => (await api.put<RoleDto>(`/roles/${id}`, { name })).data,
  remove: async (id: number) => { await api.delete(`/roles/${id}`); },
};

/** The company's roles, loaded once; call reload() after a change */
export function useRoles() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try { setRoles(await roleService.getAll()); } catch { /* keep the last list */ }
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { roles, loading, reload };
}
