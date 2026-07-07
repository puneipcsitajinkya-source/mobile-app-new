import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const expoApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const envUrl = process.env.EXPO_PUBLIC_API_URL;
const androidUrl = process.env.EXPO_PUBLIC_API_URL_ANDROID;
const iosUrl = process.env.EXPO_PUBLIC_API_URL_IOS;

const DEFAULT_API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
const API_BASE = expoApiUrl || envUrl || (Platform.OS === 'android' ? androidUrl || DEFAULT_API_BASE : iosUrl || DEFAULT_API_BASE);

console.log('API base URL:', API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});


export const getProducts = (params?: any) => api.get('/products', { params });
export const getProduct = (id: string) => api.get(`/products/${id}`);
export const placeOrder = (data: object) => api.post('/orders', data);
export const getOrdersByMobile = (mobile: string) => api.get(`/orders/customer/${mobile}`);
export const getCategories = () => api.get('/categories?showOnApp=true');
export const getSubcategories = (categoryId: string) => api.get('/subcategories', { params: { categoryId } });
export const getSettings = () => api.get('/settings');
 