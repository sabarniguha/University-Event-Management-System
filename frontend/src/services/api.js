import axios from 'axios';

export const TOKEN_KEY = 'uems_token';

// Empty on a single-service deploy (same origin). On Vercel set VITE_API_URL=https://<your-api>/api
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token is rejected, drop it and tell the app to log the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthAttempt = /\/auth\/(login|register|forgot-password|reset-password|verify-email|change-password)/.test(url);
    if (error.response?.status === 401 && !isAuthAttempt && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('uems:logout'));
    }
    return Promise.reject(error);
  }
);

// Uploaded images are stored as "/api/media/<id>". When the API lives on another origin, make them absolute.
export const mediaUrl = (value) => {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/api/') && /^https?:\/\//i.test(API_URL)) {
    return API_URL.replace(/\/api\/?$/, '') + value;
  }
  return value;
};

// Uploads an image file and returns its stored URL (e.g. "/api/media/12").
export async function uploadImage(file) {
  const { data } = await api.post('/media', file, { headers: { 'Content-Type': file.type } });
  return data.url;
}

// Downloads a CSV (or any file) from an authenticated endpoint.
export async function downloadFile(path, filename) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default api;
