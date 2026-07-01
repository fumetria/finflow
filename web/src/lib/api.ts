import axios from 'axios';

// Same-origin by default: nginx reverse-proxies /api to the api service, so no
// CORS and no hardcoded host. VITE_API_URL can override it (e.g. separate-domain
// deploys or pointing the dev server at a remote API).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
