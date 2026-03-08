import api from './api';

export const tenantMenuService = {
  /** Get hidden menu keys for the current tenant */
  async getHiddenKeys(): Promise<string[]> {
    const { data } = await api.get<string[]>('/tenantmenu/hidden');
    return data;
  },

  /** Replace the set of hidden menu keys for the current tenant */
  async updateHiddenKeys(hiddenKeys: string[]): Promise<void> {
    await api.put('/tenantmenu/hidden', hiddenKeys);
  },

  /** Get the default dashboard path for the current tenant */
  async getDefaultDashboard(): Promise<string> {
    const { data } = await api.get<string>('/tenantmenu/default-dashboard');
    return data;
  },

  /** Set the default dashboard path for the current tenant */
  async setDefaultDashboard(dashboardPath: string): Promise<void> {
    await api.put('/tenantmenu/default-dashboard', { dashboardPath });
  },
};
