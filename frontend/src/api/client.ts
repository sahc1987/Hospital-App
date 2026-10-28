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

    // The login form shows its own errors inline (wrong password is a 401, lockout a 400)
    if (err.config?.url?.includes('/auth/login')) {
      // no toast, no redirect
    } else if (status === 401) {
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
    } else if (status === 409) {
      // e.g. deleting a patient with history (V10 RESTRICT FKs)
      toast.error(serverMsg ?? 'This change conflicts with existing data.')
    } else if (status != null && status >= 500) {
      // id: a page firing several calls during an outage shows one toast, not a stack
      toast.error(serverMsg ?? 'Server error. Please try again.', serverMsg ? undefined : { id: 'server-error' })
    } else if (!err.response && !axios.isCancel(err)) {
      toast.error("Can't reach the server. Check your connection and try again.", { id: 'offline' })
    }
    return Promise.reject(err)
  },
)

export default client
