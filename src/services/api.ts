import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const envUrl = process.env.EXPO_PUBLIC_API_URL;
const androidUrl = process.env.EXPO_PUBLIC_API_URL_ANDROID;
const iosUrl = process.env.EXPO_PUBLIC_API_URL_IOS;
const expoApiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  ((Constants.manifest as any)?.extra?.apiUrl as string | undefined);

const DEFAULT_API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://127.0.0.1:3001';
const API_BASE = [
  expoApiUrl,
  envUrl,
  Platform.OS === 'android' ? androidUrl : undefined,
  Platform.OS === 'ios' ? iosUrl : undefined,
  DEFAULT_API_BASE,
]
  .filter((value): value is string => Boolean(value && value.trim()))
  .map((value) => value.trim())[0] || DEFAULT_API_BASE;

console.log('API base URL:', API_BASE);
console.log('API source values:', {
  platform: Platform.OS,
  expoApiUrl,
  envUrl,
  androidUrl,
  iosUrl,
  default: DEFAULT_API_BASE,
});

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const getApiBaseUrl = () => API_BASE;

export const resolveMediaUrl = (value?: string) => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^(https?:|data:|file:)/i.test(trimmed)) return trimmed;

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (normalizedPath.startsWith('/uploads/')) {
    return `${API_BASE}${normalizedPath}`;
  }

  return `${API_BASE}${normalizedPath}`;
};

export const getProducts = (params?: any) => api.get('/products', { params });
export const getProduct = (id: string) => api.get(`/products/${id}`);
export const getSubcategory = (id: string) => api.get(`/subcategories/${id}`);
export const placeOrder = (data: object) => api.post('/orders', data);
export const getOrdersByMobile = (mobile: string) => api.get(`/orders/customer/${mobile}`);
export const getCategories = () => api.get('/categories?showOnApp=true');
export const getSubcategories = (categoryId: string) => api.get('/subcategories', { params: { categoryId } });
export const getSettings = () => api.get('/settings');
