import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      if (refresh) {
        try {
          const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
          const { data } = await axios.post(
            `${baseURL}/api/auth/refresh`,
            { refreshToken: refresh }
          );
          localStorage.setItem('access_token',  data.data.token);
          localStorage.setItem('refresh_token', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.token}`;
          return axios(original);
        } catch {
          /* refresh itself failed — wipe everything and force re-login */
        }
      }

      /* Clear all auth artefacts so Zustand re-hydrates as logged-out */
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth-store');  // clears Zustand persist cache
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);
