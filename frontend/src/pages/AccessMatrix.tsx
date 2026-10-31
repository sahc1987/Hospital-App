import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope, Building2, ClipboardPlus,
  BedDouble, FlaskConical, Pill, Receipt, Wallet, UserCog, BarChart3,
  KeyRound, ShieldCheck, RotateCcw, Save, LockKeyhole,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { permissionsApi } from '@/api/endpoints'
import { usePermissionsStore, DEFAULT_MATRIX, type PermissionMatrix } from '@/store/permissionsStore'
import type { UserRole } from '@/types'
import { cn } from '@/utils/cn'
import { Badge, roleTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

// ─── Config ─────────────────────────────────────────────────────────────────

const ROLES: { id: UserRole; label: string }[] = [
  { id: 'ADMIN',        label: 'Admin' },
  { id: 'DOCTOR',       label: 'Doctor' },
  { id: 'NURSE',        label: 'Nurse' },
  { id: 'RECEPTIONIST', label: 'Receptionist' },
  { id: 'LAB_TECH',     label: 'Lab Tech' },
  { id: 'PHARMACIST',   label: 'Pharmacist' },
  { id: 'HR',           label: 'HR' },
]

const MODULES: { route: string; label: string; icon: React.ElementType; locked?: boolean }[] = [
  { route: '/',             label: 'Dashboard',          icon: LayoutDashboard },
  { route: '/patients',     label: 'Patients',           icon: Users },
  { route: '/appointments', label: 'Appointments',       icon: CalendarDays },
  { route: '/doctors',      label: 'Doctors',            icon: Stethoscope },
  { route: '/departments',  label: 'Departments',        icon: Building2 },
  { route: '/admissions',   label: 'Admissions',         icon: ClipboardPlus },
  { route: '/rooms',        label: 'Rooms',              icon: BedDouble },
  { route: '/lab',          label: 'Laboratory',         icon: FlaskConical },
  { route: '/pharmacy',     label: 'Pharmacy',           icon: Pill },
  { route: '/billing',      label: 'Billing',            icon: Receipt },
  { route: '/employees',    label: 'Employees',          icon: UserCog },
  { route: '/payroll',      label: 'Payroll',            icon: Wallet },
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
      {/* Actions (the page title lives in Header) */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {dirty && <Badge variant="warning">Unsaved changes</Badge>}
        <Button variant="secondary" onClick={resetToDefaults} icon={<RotateCcw size={14} aria-hidden="true" />}>
          Reset defaults
        </Button>
        {dirty && <Button variant="ghost" onClick={discardChanges}>Discard</Button>}
        <Button onClick={() => saveMutation.mutate()} disabled={!dirty} loading={saveMutation.isPending}
          icon={<Save size={14} aria-hidden="true" />}>
          Save changes
        </Button>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {ROLES.map((role) => (
          <div key={role.id} className={cn('rounded-xl p-3 text-center', roleTone[role.id])}>
            <p className="text-sm font-semibold">{role.label}</p>
            <p className="text-xl font-bold text-ink mt-1">{countGranted(draft, role.id)}</p>
            <p className="text-xs text-ink-muted">modules</p>
          </div>
        ))}
      </div>

      {/* Matrix table */}
      <div className="rounded-2xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-alt">
              {/* sticky: the module name stays visible while the role columns scroll sideways on phones */}
              <th className="sticky left-0 z-10 bg-surface-alt px-4 py-3 text-left font-medium text-ink-muted w-52">Module</th>
              {ROLES.map((role) => (
                <th key={role.id} className="px-3 py-3 text-center font-medium min-w-[90px]">
                  <span className={cn('inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold', roleTone[role.id])}>
                    {role.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MODULES.map(({ route, label, icon: Icon, locked }) => (
              <tr key={route} className="hover:bg-surface-alt/40 transition-colors">
                <td className="sticky left-0 z-10 bg-surface px-4 py-3">
                  <div className="flex items-center gap-2.5 whitespace-nowrap">
                    <Icon size={14} className="text-ink-muted shrink-0" />
                    <span className="text-ink font-medium">{label}</span>
                    {locked && (
                      <LockKeyhole size={11} className="text-ink-muted shrink-0" />
                    )}
                  </div>
                </td>
                {ROLES.map((role) => {
                  const isLocked = !!locked && role.id !== 'ADMIN'
                  const granted  = matrixHasAccess(draft, route, role.id)
                  return (
                    <td key={role.id} className="px-3 py-3 text-center">
                      <button
                        onClick={() => !isLocked && toggle(route, role.id)}
                        disabled={isLocked}
                        title={cellTitle(isLocked, granted)}
                        aria-label={cellTitle(isLocked, granted) + ': ' + role.id + ', ' + label}
                        aria-pressed={granted}
                        className={cn(
                          'mx-auto flex h-7 w-7 items-center justify-center rounded-lg border transition-all',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          cellTone(isLocked, granted, roleTone[role.id]),
                        )}
                      >
                        <CellIcon locked={isLocked} granted={granted} />
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-muted">
        <LockKeyhole size={10} className="inline mr-1" aria-hidden="true" />
        Locked rows are admin-only and cannot be toggled. Changes take effect immediately for all active sessions after saving.
      </p>
    </div>
  )
}

function cellTitle(locked: boolean, granted: boolean): string {
  if (locked) return 'Admin-only — locked'
  return granted ? 'Revoke access' : 'Grant access'
}

function cellTone(locked: boolean, granted: boolean, roleTone: string): string {
  if (locked) return 'border-border bg-surface-alt opacity-30 cursor-not-allowed'
  return granted ? cn('border-current cursor-pointer hover:opacity-80', roleTone) : 'border-border-strong bg-surface cursor-pointer hover:border-ink'
}

function CellIcon({ locked, granted }: Readonly<{ locked: boolean; granted: boolean }>) {
  if (locked) return <LockKeyhole size={12} aria-hidden="true" />
  if (!granted) return <span className="h-1.5 w-1.5 rounded-full bg-border" aria-hidden="true" />
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true" focusable="false">
      <title>Granted</title>
      <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
