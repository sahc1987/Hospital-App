import type { UserRole } from '@/types'
import { usePermissionsStore, DEFAULT_MATRIX } from '@/store/permissionsStore'

export { DEFAULT_MATRIX }

export function canAccess(role: UserRole, path: string): boolean {
  // getState() works outside React — Zustand's escape hatch for non-hook callers
  const matrix = usePermissionsStore.getState().matrix
  const allowed = matrix[path] ?? DEFAULT_MATRIX[path]
  if (!allowed) return true
  return allowed.includes(role)
}

export function getDefaultRoute(role: UserRole): string {
  const ordered = ['/', '/patients', '/appointments', '/admissions',
    '/lab', '/pharmacy', '/billing', '/employees', '/payroll', '/reports']
  return ordered.find((r) => canAccess(role, r)) ?? '/'
}
