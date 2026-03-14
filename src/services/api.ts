import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.painelzap.com/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
