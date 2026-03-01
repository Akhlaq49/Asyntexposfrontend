import api from './api';

export interface FormFieldConfig {
  id: number;
  formName: string;
  fieldName: string;
  fieldLabel: string;
  isVisible: boolean;
}

export interface FormFieldConfigDto {
  formName: string;
  fieldName: string;
  fieldLabel: string;
  isVisible: boolean;
}

/**
 * Get all field configs, optionally filtered by form name.
 */
export const getFormFieldConfigs = async (formName?: string): Promise<FormFieldConfig[]> => {
  const params = formName ? { formName } : {};
  const res = await api.get<FormFieldConfig[]>('/formfieldconfigs', { params });
  return res.data;
};

/**
 * Bulk upsert (save) field configs.
 */
export const saveFormFieldConfigs = async (configs: FormFieldConfigDto[]): Promise<FormFieldConfig[]> => {
  const res = await api.put<FormFieldConfig[]>('/formfieldconfigs/bulk', configs);
  return res.data;
};

/**
 * Seed defaults (POST /api/formfieldconfigs/seed).
 */
export const seedFormFieldConfigs = async (): Promise<FormFieldConfig[]> => {
  const res = await api.post<FormFieldConfig[]>('/formfieldconfigs/seed');
  return res.data;
};
