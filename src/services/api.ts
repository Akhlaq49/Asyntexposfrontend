import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web.asyntexconsultancy.com/api';
export const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'https://web.asyntexconsultancy.com';

/** Prefix a relative image path with the media base URL */
export const mediaUrl = (path?: string | null): string => {
  if (!path) return '/assets/img/products/stock-img-01.png';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on auth page
      if (!window.location.pathname.startsWith('/signin') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
