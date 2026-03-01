import api from './api';

export interface Party {
  id: number;
  fullName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneWork?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  picture?: string;
  code?: string;
  companyName?: string;
  contactPerson?: string;
  userName?: string;
  role: string;
  status: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePartyPayload {
  fullName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneWork?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  code?: string;
  companyName?: string;
  contactPerson?: string;
  userName?: string;
  password?: string;
  role: string;
  status: string;
  isActive: boolean;
}

export const getParties = async (role: string): Promise<Party[]> => {
  try {
    const { data } = await api.get(`/parties?role=${role}`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch parties with role ${role}:`, error);
    return [];
  }
};

export const getPartyById = async (id: number): Promise<Party | null> => {
  try {
    const { data } = await api.get(`/parties/${id}`);
    return data;
  } catch (error) {
    console.error('Failed to fetch party:', error);
    return null;
  }
};

export const createParty = async (payload: CreatePartyPayload): Promise<Party | null> => {
  try {
    const { data } = await api.post('/parties', payload);
    return data;
  } catch (error) {
    console.error('Failed to create party:', error);
    throw error;
  }
};

export const updateParty = async (id: number, payload: CreatePartyPayload): Promise<Party | null> => {
  try {
    const { data } = await api.put(`/parties/${id}`, payload);
    return data;
  } catch (error) {
    console.error('Failed to update party:', error);
    throw error;
  }
};

export const uploadPartyPicture = async (id: number, file: File): Promise<Party | null> => {
  try {
    const formData = new FormData();
    formData.append('picture', file);
    const { data } = await api.post(`/parties/${id}/picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (error) {
    console.error('Failed to upload picture:', error);
    throw error;
  }
};

export const deleteParty = async (id: number): Promise<boolean> => {
  try {
    await api.delete(`/parties/${id}`);
    return true;
  } catch (error) {
    console.error('Failed to delete party:', error);
    return false;
  }
};
