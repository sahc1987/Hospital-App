import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Mail, AtSign, ShieldCheck, Calendar, Save } from 'lucide-react'
import { authApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { notify } from '@/utils/notify'
import { cn } from '@/utils/cn'
import { roleTone } from '@/components/ui/Badge'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(150),
  email:    z.string().email('Invalid email address'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ProfileForm  = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

// ─── Shared field component ───────────────────────────────────────────────────

function strengthLabel(strong: boolean, medium: boolean): string {
  if (strong) return '✓ Strong password'
  return medium ? 'Medium — add uppercase, numbers & symbols' : 'Too short'
}

/** Label wraps the control, so it's associated without needing an id. */
function Field({
  label, error, children,
}: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        {children}
      </label>
      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </div>
  )
}

function inputCls(hasError = false) {
  return cn('input', hasError && 'border-danger focus:border-danger focus:ring-danger/20')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, updateUser } = useAuthStore()

  // ── Profile form ──
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? '', email: user?.email ?? '' },
  })

  // Keep form in sync if store changes externally (e.g. storage event)
  useEffect(() => {
    profileForm.reset({ fullName: user?.fullName ?? '', email: user?.email ?? '' })
  }, [user?.fullName, user?.email]) // eslint-disable-line react-hooks/exhaustive-deps

  const profileMutation = useMutation({
    mutationFn: (d: ProfileForm) => authApi.updateProfile(d),
    onSuccess: (res) => {
      const updated = res.data.data
      updateUser({ fullName: updated.fullName, email: updated.email })
      notify('success', 'Profile updated', 'Your information has been saved.')
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? 'Failed to update profile'
      notify('error', 'Update failed', msg)
    },
  })

  // ── Password form ──
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const passwordMutation = useMutation({
    mutationFn: (d: PasswordForm) =>
      authApi.changePassword({ currentPassword: d.currentPassword, newPassword: d.newPassword }),
    onSuccess: () => {
      passwordForm.reset()
      notify('success', 'Password changed', 'Your password has been updated successfully.')
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? 'Failed to change password'
      notify('error', 'Password change failed', msg)
    },
  })

  const roleStyle = roleTone[user?.role ?? ''] ?? 'bg-surface-alt text-ink'

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Account hero ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-6 flex items-center gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-2xl font-bold select-none">
          {user?.fullName?.charAt(0) ?? user?.username?.charAt(0) ?? 'U'}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-ink truncate">{user?.fullName}</p>
          <p className="text-sm text-ink-muted">@{user?.username}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold', roleStyle)}>
              <ShieldCheck size={11} className="mr-1" />
              {user?.role?.replace('_', ' ')}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <Calendar size={11} />
              Member since {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Account Information ───────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <User size={16} className="text-ink-muted" />
          <div>
            <p className="text-sm font-semibold text-ink">Account Information</p>
            <p className="text-xs text-ink-muted">Update your name and email address</p>
          </div>
        </div>

        <form
          onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))}
          className="p-6 space-y-4"
        >
          {/* Read-only username */}
          <Field label="Username">
            <div className="relative">
              <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={user?.username ?? ''}
                readOnly
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 pl-8 text-sm text-ink-muted cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-ink-muted">Username cannot be changed. Contact an admin if needed.</p>
          </Field>

          <Field label="Full Name" error={profileForm.formState.errors.fullName?.message}>
            <input
              {...profileForm.register('fullName')}
              placeholder="Your full name"
              className={inputCls(!!profileForm.formState.errors.fullName)}
            />
          </Field>

          <Field label="Email Address" error={profileForm.formState.errors.email?.message}>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                {...profileForm.register('email')}
                type="email"
                placeholder="you@hospital.com"
                className={cn(inputCls(!!profileForm.formState.errors.email), 'pl-8')}
              />
            </div>
          </Field>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileMutation.isPending || !profileForm.formState.isDirty}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                profileForm.formState.isDirty
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-surface-alt text-ink-muted cursor-not-allowed',
              )}
            >
              <Save size={14} />
              {profileMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change Password ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Lock size={16} className="text-ink-muted" />
          <div>
            <p className="text-sm font-semibold text-ink">Change Password</p>
            <p className="text-xs text-ink-muted">Choose a strong password of at least 8 characters</p>
          </div>
        </div>

        <form
          onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))}
          className="p-6 space-y-4"
        >
          <Field label="Current Password" error={passwordForm.formState.errors.currentPassword?.message}>
            <input
              {...passwordForm.register('currentPassword')}
              type="password"
              placeholder="Enter your current password"
              className={inputCls(!!passwordForm.formState.errors.currentPassword)}
            />
          </Field>

          <Field label="New Password" error={passwordForm.formState.errors.newPassword?.message}>
            <input
              {...passwordForm.register('newPassword')}
              type="password"
              placeholder="Min 8 characters"
              className={inputCls(!!passwordForm.formState.errors.newPassword)}
            />
          </Field>

          <Field label="Confirm New Password" error={passwordForm.formState.errors.confirmPassword?.message}>
            <input
              {...passwordForm.register('confirmPassword')}
              type="password"
              placeholder="Repeat new password"
              className={inputCls(!!passwordForm.formState.errors.confirmPassword)}
            />
          </Field>

          {/* Password strength hint */}
          {(() => {
            const pw = passwordForm.watch('newPassword') ?? ''
            if (!pw) return null
            const strong = pw.length >= 12 && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z\d]/.test(pw)
            const medium = pw.length >= 8
            return (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn('h-1 flex-1 rounded-full transition-colors', {
                        'bg-danger':  !medium && i === 1,
                        'bg-warning': medium && !strong && i <= 2,
                        'bg-success': strong,
                        'bg-border':  (medium && !strong && i === 3) || (!medium && i > 1),
                      })}
                    />
                  ))}
                </div>
                <p className="text-xs text-ink-muted">
                  {strengthLabel(strong, medium)}
                </p>
              </div>
            )
          })()}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              <Lock size={14} />
              {passwordMutation.isPending ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
