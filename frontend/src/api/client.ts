import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    if (status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    } else if (status === 403) {
      toast.error('You do not have permission to do that.')
    } else if (status >= 500) {
      toast.error('Server error. Please try again.')
    }
    return Promise.reject(err)
  },
)

export default client
