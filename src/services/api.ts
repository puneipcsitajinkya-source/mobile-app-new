import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

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
