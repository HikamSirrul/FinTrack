
import axios from 'axios'

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const apiBaseUrl = isLocalHost
  ? '/api'
  : import.meta.env.VITE_API_URL?.trim() || '/api'

const api = axios.create({
  baseURL: apiBaseUrl,
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
