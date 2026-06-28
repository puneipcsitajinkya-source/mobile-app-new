import axios from 'axios';

// Change this to your computer's local IP when testing on a physical device
// e.g. 'http://192.168.1.10:3001'
const API_BASE = 'http://13.201.103.106';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});



export const getProducts = () => api.get('/products');
export const getProduct = (id: string) => api.get(`/products/${id}`);
export const placeOrder = (data: object) => api.post('/orders', data);
export const getOrdersByMobile = (mobile: string) => api.get(`/orders/customer/${mobile}`);
export const getCategories = () => api.get('/categories?showOnApp=true');
export const getSettings = () => api.get('/settings');
