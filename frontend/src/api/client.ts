import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    // Extract the most specific message available from the response body
    const serverMsg: string | undefined =
      err.response?.data?.message || err.response?.data?.error

    // A wrong password is also a 401 — let the login form show it instead of reloading
    if (status === 401 && !err.config?.url?.includes('/auth/login')) {
      useAuthStore.getState().logout()
      globalThis.location.href = '/login'
    } else if (status === 403) {
      toast.error(serverMsg ?? 'You do not have permission to do that.')
    } else if (status === 400) {
      // Validation errors bubble up per-field; let the caller handle them.
      // Only show a global toast if no field errors are present.
      if (!err.response?.data?.fields && serverMsg) {
        toast.error(serverMsg)
      }
    } else if (status != null && status >= 500) {
      toast.error(serverMsg ?? 'Server error. Please try again.')
    }
    return Promise.reject(err)
  },
)

export default client
