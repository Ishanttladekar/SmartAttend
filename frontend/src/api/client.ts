import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartattend_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 unauthorized and not on login page, can clear token
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Clear token if expired
      localStorage.removeItem('smartattend_token');
      localStorage.removeItem('smartattend_user');
    }
    return Promise.reject(error);
  }
);

