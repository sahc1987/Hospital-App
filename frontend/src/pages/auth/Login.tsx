import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HeartPulse, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await authApi.login(data.username, data.password)
      login(res.data.data)
      toast.success(`Welcome back, ${res.data.data.fullName || res.data.data.username}!`)
      navigate('/')
    } catch {
      toast.error('Invalid username or password')
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
            <HeartPulse size={22} />
          </div>
          <span className="font-bold text-lg">HMS</span>
        </div>

        <div className="mb-auto">
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Modern Hospital<br />
            <span className="text-primary">Management</span><br />
            System
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            A comprehensive solution to digitize and automate hospital operations — from patients to payroll.
          </p>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-2">
          {['JWT Auth', 'RBAC', 'Real-time', 'HIPAA Ready', 'Redis Cache', 'PostgreSQL'].map((f) => (
            <span key={f} className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">{f}</span>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <HeartPulse size={18} className="text-white" />
            </div>
            <span className="font-bold">HMS</span>
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Sign in</h1>
          <p className="text-sm text-ink-muted mb-8">Enter your credentials to access the system.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Username</label>
              <input
                {...register('username')}
                placeholder="admin"
                autoComplete="username"
                className="input"
              />
              {errors.username && <p className="text-xs text-danger">{errors.username.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-subtle">
            Default credentials: <strong>admin</strong> / <strong>Admin@123</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
