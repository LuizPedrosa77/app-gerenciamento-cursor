import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.painelzap.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
