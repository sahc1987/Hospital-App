import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope, Building2,
  BedDouble, FlaskConical, Pill, DollarSign, UserCog, BarChart3,
  KeyRound, ShieldCheck, RotateCcw, Save, LockKeyhole,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { permissionsApi } from '@/api/endpoints'
import { usePermissionsStore, DEFAULT_MATRIX, type PermissionMatrix } from '@/store/permissionsStore'
import type { UserRole } from '@/types'
import { cn } from '@/utils/cn'

// ─── Config ─────────────────────────────────────────────────────────────────

const ROLES: { id: UserRole; label: string; color: string; bg: string }[] = [
  { id: 'ADMIN',        label: 'Admin',        color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  { id: 'DOCTOR',       label: 'Doctor',       color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'NURSE',        label: 'Nurse',        color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  { id: 'RECEPTIONIST', label: 'Receptionist', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { id: 'LAB_TECH',     label: 'Lab Tech',     color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { id: 'PHARMACIST',   label: 'Pharmacist',   color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20' },
  { id: 'HR',           label: 'HR',           color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
]

const MODULES: { route: string; label: string; icon: React.ElementType; locked?: boolean }[] = [
  { route: '/',             label: 'Dashboard',          icon: LayoutDashboard },
  { route: '/patients',     label: 'Patients',           icon: Users },
  { route: '/appointments', label: 'Appointments',       icon: CalendarDays },
  { route: '/doctors',      label: 'Doctors',            icon: Stethoscope },
  { route: '/departments',  label: 'Departments',        icon: Building2 },
  { route: '/admissions',   label: 'OPD / IPD',          icon: BedDouble },
  { route: '/rooms',        label: 'Rooms',              icon: BedDouble },
  { route: '/lab',          label: 'Laboratory',         icon: FlaskConical },
  { route: '/pharmacy',     label: 'Pharmacy',           icon: Pill },
  { route: '/billing',      label: 'Billing & Insurance',icon: DollarSign },
  { route: '/employees',    label: 'Employees',          icon: UserCog },
  { route: '/payroll',      label: 'Payroll',            icon: DollarSign },
  { route: '/reports',      label: 'Reports & Analytics',icon: BarChart3 },
  { route: '/users',        label: 'User Management',    icon: KeyRound,    locked: true },
  { route: '/access-matrix',label: 'Access Matrix',      icon: ShieldCheck, locked: true },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matrixHasAccess(matrix: PermissionMatrix, route: string, role: UserRole): boolean {
  return matrix[route]?.includes(role) ?? false
}

function toggleCell(matrix: PermissionMatrix, route: string, role: UserRole): PermissionMatrix {
  const current = matrix[route] ?? []
  const next = current.includes(role)
    ? current.filter((r) => r !== role)
    : [...current, role]
  return { ...matrix, [route]: next }
}

function countGranted(matrix: PermissionMatrix, role: UserRole): number {
  return Object.values(matrix).filter((roles) => roles.includes(role)).length
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AccessMatrix() {
  const { matrix: storedMatrix, setMatrix } = usePermissionsStore()
  const [draft, setDraft] = useState<PermissionMatrix>(storedMatrix)
  const [dirty, setDirty] = useState(false)

  // Sync draft when store loads fresh data from server (on mount)
  useEffect(() => {
    setDraft(storedMatrix)
    setDirty(false)
  }, [storedMatrix])

  function toggle(route: string, role: UserRole) {
    setDraft((prev) => toggleCell(prev, route, role))
    setDirty(true)
  }

  function resetToDefaults() {
    setDraft(DEFAULT_MATRIX)
    setDirty(true)
  }

  function discardChanges() {
    setDraft(storedMatrix)
    setDirty(false)
  }

  const saveMutation = useMutation({
    mutationFn: () => permissionsApi.update(draft),
    onSuccess: (res) => {
      setMatrix(res.data.data)
      setDirty(false)
      toast.success('Access matrix saved')
    },
    onError: () => toast.error('Failed to save permissions'),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Access Matrix</h1>
            <p className="text-sm text-ink-subtle">Control which modules each role can access</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <span className="text-xs font-medium text-yellow-400 bg-yellow-400/10 rounded-lg px-2.5 py-1.5 border border-yellow-400/20">
              Unsaved changes
            </span>
          )}
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-ink-subtle hover:bg-surface-alt transition-colors"
          >
            <RotateCcw size={14} />
            Reset defaults
          </button>
          {dirty && (
            <button
              onClick={discardChanges}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-ink-subtle hover:bg-surface-alt transition-colors"
            >
              Discard
            </button>
          )}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              dirty
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-surface-alt text-ink-subtle cursor-not-allowed',
            )}
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-7 gap-3">
        {ROLES.map((role) => (
          <div key={role.id} className={cn('rounded-xl border p-3 text-center', role.bg)}>
            <p className={cn('text-sm font-semibold', role.color)}>{role.label}</p>
            <p className="text-xl font-bold text-ink mt-1">{countGranted(draft, role.id)}</p>
            <p className="text-[11px] text-ink-subtle">modules</p>
          </div>
        ))}
      </div>

      {/* Matrix table */}
      <div className="rounded-2xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-alt">
              <th className="px-4 py-3 text-left font-medium text-ink-subtle w-52">Module</th>
              {ROLES.map((role) => (
                <th key={role.id} className="px-3 py-3 text-center font-medium min-w-[90px]">
                  <span className={cn('inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold border', role.bg, role.color)}>
                    {role.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MODULES.map(({ route, label, icon: Icon, locked }) => (
              <tr key={route} className="hover:bg-surface-alt/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} className="text-ink-subtle shrink-0" />
                    <span className="text-ink font-medium">{label}</span>
                    {locked && (
                      <LockKeyhole size={11} className="text-ink-subtle shrink-0" />
                    )}
                  </div>
                </td>
                {ROLES.map((role) => {
                  const isLocked = locked && role.id !== 'ADMIN'
                  const granted  = matrixHasAccess(draft, route, role.id)
                  return (
                    <td key={role.id} className="px-3 py-3 text-center">
                      <button
                        onClick={() => !isLocked && toggle(route, role.id)}
                        disabled={isLocked}
                        title={isLocked ? 'Admin-only — locked' : granted ? 'Revoke access' : 'Grant access'}
                        className={cn(
                          'mx-auto flex h-7 w-7 items-center justify-center rounded-lg border transition-all',
                          isLocked
                            ? 'border-border bg-surface-alt opacity-30 cursor-not-allowed'
                            : granted
                              ? cn('border-current cursor-pointer hover:opacity-80', role.bg, role.color)
                              : 'border-border bg-surface-alt cursor-pointer hover:border-ink-subtle',
                        )}
                      >
                        {isLocked ? (
                          <LockKeyhole size={12} />
                        ) : granted ? (
                          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                            <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-border" />
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-subtle">
        <LockKeyhole size={10} className="inline mr-1" />
        Locked rows are admin-only and cannot be toggled. Changes take effect immediately for all active sessions after saving.
      </p>
    </div>
  )
}
