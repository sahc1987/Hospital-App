import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { HeartPulse, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { authApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

/** Wrong password → 401; lockout / inactive account → 400 with the server's own message. */
function loginError(err: unknown): string {
  if (!isAxiosError(err) || !err.response) return "Can't reach the server. Check your connection and try again."
  const { status, data } = err.response
  if (status === 401) return 'Wrong username or password.'
  if (status >= 500) return 'The server had a problem. Please try again in a moment.'
  return data?.message ?? 'Sign-in failed. Please try again.'
}

export default function Login() {
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.login(data.username, data.password)
      login(res.data.data)
      toast.success(`Welcome back, ${res.data.data.fullName || res.data.data.username}!`)
      navigate('/')
    } catch (e) {
      setError(loginError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-card">
      {/* Left panel — dark Omni-style */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-surface-dark text-white p-12">
        <div className="flex items-center gap-3 mb-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <HeartPulse size={22} aria-hidden="true" />
          </div>
          <span className="font-bold text-lg">HMS</span>
        </div>

        <div className="mb-auto">
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Modern Hospital<br />
            <span className="text-primary-200">Management</span><br />
            System
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs">
            Appointments, admissions, lab, pharmacy and billing for every team, in one place.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <HeartPulse size={18} className="text-white" aria-hidden="true" />
            </div>
            <span className="font-bold">HMS</span>
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Sign in</h1>
          <p className="text-sm text-ink-muted mb-8">Enter your credentials to access the system.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-light px-3 py-2.5 text-sm text-danger-ink">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-username" className="text-sm font-medium text-ink">Username</label>
              <input
                id="login-username"
                {...register('username')}
                autoComplete="username"
                aria-invalid={!!errors.username}
                className="input"
              />
              {errors.username && <p className="text-xs text-danger">{errors.username.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-ink">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className="input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {showPw ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {import.meta.env.VITE_DEMO === 'true' && (
            <p className="mt-6 text-center text-xs text-ink-subtle">
              Demo credentials: <strong>admin</strong> / <strong>Admin@123</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
