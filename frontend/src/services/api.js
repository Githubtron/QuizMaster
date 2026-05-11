import axios from 'axios'

// In local dev the Vite proxy handles /api → localhost:8000 (no VITE_API_URL needed).
// On Render (static site), set VITE_API_URL=https://quizmaster-api.onrender.com
// so API calls reach the correct backend service.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('qm_token')
      localStorage.removeItem('qm_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
