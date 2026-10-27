import api from './api';

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  /** frozen by an admin: cannot sign in */
  isFrozen?: boolean;
  frozenAt?: string | null;
  frozenBy?: string | null;
  createdAt: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  isActive: boolean;
}

export interface UpdateUserPayload {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  role: string;
  isActive: boolean;
}

export const userService = {
  async getAll(): Promise<UserDto[]> {
    const { data } = await api.get<UserDto[]>('/users');
    return data;
  },

  async getById(id: number): Promise<UserDto> {
    const { data } = await api.get<UserDto>(`/users/${id}`);
    return data;
  },

  async create(payload: CreateUserPayload): Promise<UserDto> {
    const { data } = await api.post<UserDto>('/users', payload);
    return data;
  },

  async update(id: number, payload: UpdateUserPayload): Promise<UserDto> {
    const { data } = await api.put<UserDto>(`/users/${id}`, payload);
    return data;
  },

  /** SuperAdmin / Admin only */
  async setFrozen(id: number, frozen: boolean): Promise<UserDto> {
    const { data } = await api.post<UserDto>(`/users/${id}/${frozen ? 'freeze' : 'unfreeze'}`);
    return data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
