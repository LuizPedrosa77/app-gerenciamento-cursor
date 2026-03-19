import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authService } from './authService';

const ENV_API_BASE = import.meta.env.VITE_API_URL?.trim();
const FALLBACK_API_BASE = typeof window !== 'undefined' ? window.location.origin : '';
const API_BASE = (ENV_API_BASE || FALLBACK_API_BASE).replace(/\/+$/, '');

if (!ENV_API_BASE && typeof window !== 'undefined') {
  console.warn('[API] VITE_API_URL não configurada. Usando fallback:', API_BASE);
}

type ApiClient = AxiosInstance & {
  upload: (url: string, file: File) => Promise<AxiosResponse<any>>;
};

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
}) as ApiClient;

// Injeta o token automaticamente em todas as requisições
api.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Upload helper (multipart/form-data)
api.upload = (url: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;
