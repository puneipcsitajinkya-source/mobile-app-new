import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const envUrl = process.env.EXPO_PUBLIC_API_URL;
const androidUrl = process.env.EXPO_PUBLIC_API_URL_ANDROID;
const iosUrl = process.env.EXPO_PUBLIC_API_URL_IOS;
const expoApiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  ((Constants.manifest as any)?.extra?.apiUrl as string | undefined);

// Dynamically resolve host IP in development
const getDevServerUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.debuggerHost;
  if (!hostUri) return undefined;
  const ip = hostUri.split(':')[0];
  return ip ? `http://${ip}:3001` : undefined;
};

const devHostUrl = getDevServerUrl();
const DEFAULT_API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://127.0.0.1:3001';
const candidates = [
  envUrl,
  Platform.OS === 'android' ? androidUrl : undefined,
  Platform.OS === 'ios' ? iosUrl : undefined,
  expoApiUrl,
  devHostUrl,
  DEFAULT_API_BASE,
]
  .filter((value): value is string => Boolean(value && value.trim()))
  .map((value) => value.trim());

const uniqueCandidates = Array.from(new Set(candidates));
let currentCandidateIndex = 0;
export let API_BASE = uniqueCandidates[currentCandidateIndex] || DEFAULT_API_BASE;

console.log('API base URL candidates:', uniqueCandidates);
console.log('Selected initial API base URL:', API_BASE);
console.log('API source values:', {
  platform: Platform.OS,
  expoApiUrl,
  envUrl,
  androidUrl,
  iosUrl,
  devHostUrl,
  default: DEFAULT_API_BASE,
});

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 7000,
});

// Interceptor to handle network errors and try fallback base URLs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isNetworkError = !error.response && error.message === 'Network Error';
    
    if (isNetworkError && error.config) {
      const currentActiveBaseUrl = api.defaults.baseURL || API_BASE;
      // If the failed request's baseURL matches our current active baseURL, advance to the next fallback
      if (error.config.baseURL === currentActiveBaseUrl) {
        if (currentCandidateIndex < uniqueCandidates.length - 1) {
          currentCandidateIndex++;
          const nextBaseUrl = uniqueCandidates[currentCandidateIndex];
          console.log(`⚠️ Network Error with ${currentActiveBaseUrl}. Trying fallback base URL: ${nextBaseUrl}`);
          API_BASE = nextBaseUrl;
          api.defaults.baseURL = nextBaseUrl;
        }
      }
      
      // Retry the failed request with the latest active baseURL
      error.config.baseURL = api.defaults.baseURL || API_BASE;
      return api(error.config);
    }
    
    return Promise.reject(error);
  }
);

export const getApiBaseUrl = () => api.defaults.baseURL || API_BASE;

export const resolveMediaUrl = (value?: string) => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^(https?:|data:|file:)/i.test(trimmed)) return trimmed;

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const currentBaseUrl = api.defaults.baseURL || API_BASE;
  return `${currentBaseUrl}${normalizedPath}`;
};

export const getProducts = (params?: any) => api.get('/products', { params });
export const getProduct = (id: string) => api.get(`/products/${id}`);
export const getOrder = (id: string) => api.get(`/orders/${id}`);
export const getSubcategory = (id: string) => api.get(`/subcategories/${id}`);
export const placeOrder = (data: object) => api.post('/orders', data);
export const getOrdersByMobile = (mobile: string) => api.get(`/orders/customer/${mobile}`);
export const getCategories = (params?: any) => api.get('/categories?showOnApp=true', { params });
export const getSubcategories = (categoryId: string, storeId?: string) => api.get('/subcategories', { params: { categoryId, store: storeId } });
export const getSettings = (params?: any) => api.get('/settings', { params });
export const updateOrderStatus = (id: string, status: string) => api.patch(`/orders/${id}/status`, { status });
export const submitFeedback = (data: {
  name?: string;
  email?: string;
  type: 'feedback' | 'report';
  rating?: number;
  message: string;
}) => api.post('/feedback', data);

// Store Location APIs
export const getStores = () => api.get('/stores');
export const findNearestStore = (latitude: number, longitude: number) =>
  api.get('/stores/nearest', { params: { latitude, longitude } });
