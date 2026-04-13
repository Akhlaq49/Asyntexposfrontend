import api from './api';

export type WebContentSection = 'header' | 'banner' | 'slider' | 'near_slider' | 'footer';

export interface WebContentItem {
  id: number;
  section: string;
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  sortOrder: number;
  status: string;
  createdAt: string;
}

export interface UpsertWebContentInput {
  section: string;
  title?: string;
  subtitle?: string;
  content?: string;
  linkUrl?: string;
  buttonText?: string;
  sortOrder: number;
  status: string;
}

const toFormData = (input: UpsertWebContentInput, image?: File | null) => {
  const formData = new FormData();
  formData.append('Section', input.section);
  formData.append('Title', input.title || '');
  formData.append('Subtitle', input.subtitle || '');
  formData.append('Content', input.content || '');
  formData.append('LinkUrl', input.linkUrl || '');
  formData.append('ButtonText', input.buttonText || '');
  formData.append('SortOrder', String(input.sortOrder || 0));
  formData.append('Status', input.status || 'active');

  if (image) {
    formData.append('image', image);
  }

  return formData;
};

export const getWebContents = async (section?: string): Promise<WebContentItem[]> => {
  const url = section ? `/webcontent/section/${section}` : '/webcontent';
  const res = await api.get<WebContentItem[]>(url);
  return res.data;
};

export const createWebContent = async (
  input: UpsertWebContentInput,
  image?: File | null
): Promise<WebContentItem> => {
  const res = await api.post<WebContentItem>('/webcontent', toFormData(input, image), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateWebContent = async (
  id: number,
  input: UpsertWebContentInput,
  image?: File | null
): Promise<WebContentItem> => {
  const res = await api.put<WebContentItem>(`/webcontent/${id}`, toFormData(input, image), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const deleteWebContent = async (id: number): Promise<void> => {
  await api.delete(`/webcontent/${id}`);
};
