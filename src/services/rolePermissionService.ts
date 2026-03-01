import api from './api';

export const rolePermissionService = {
  /** Get allowed menu keys for a specific role */
  async getByRole(role: string): Promise<string[]> {
    const { data } = await api.get<string[]>(`/rolepermissions/by-role/${encodeURIComponent(role)}`);
    return data;
  },

  /** Get allowed menu keys for the current authenticated user */
  async getMyPermissions(): Promise<string[]> {
    const { data } = await api.get<string[]>('/rolepermissions/my-permissions');
    return data;
  },

  /** Replace all permissions for a role with the given menu keys */
  async updateRole(role: string, menuKeys: string[]): Promise<void> {
    await api.put(`/rolepermissions/by-role/${encodeURIComponent(role)}`, menuKeys);
  },

  /** Get list of roles that already have permissions configured */
  async getConfiguredRoles(): Promise<string[]> {
    const { data } = await api.get<string[]>('/rolepermissions/roles');
    return data;
  },
};
