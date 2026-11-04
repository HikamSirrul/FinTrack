
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Menambahkan token autentikasi pada setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fintrack_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
