import axios from 'axios';

// Utiliser le backend local en développement
// Pour la production, utiliser: 'https://nest-secure.onrender.com'
export const API_URL = import.meta.env.VITE_API_URL || 'https://thundering-laura-ndigueul-80527457.koyeb.app/api';
// export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);



export default api;
