import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types'

// route -> list of roles that can access it
export type PermissionMatrix = Record<string, UserRole[]>

interface PermissionsState {
  matrix: PermissionMatrix
  loaded: boolean
  setMatrix: (m: PermissionMatrix) => void
  setLoaded: (v: boolean) => void
}

export const DEFAULT_MATRIX: PermissionMatrix = {
  '/':             ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECH', 'PHARMACIST', 'HR'],
  '/patients':     ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECH', 'PHARMACIST'],
  '/appointments': ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  '/doctors':      ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HR'],
  '/departments':  ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HR'],
  '/admissions':   ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  '/rooms':        ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  '/lab':          ['ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECH'],
  '/pharmacy':     ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'],
  '/billing':      ['ADMIN', 'RECEPTIONIST'],
  '/employees':    ['ADMIN', 'HR'],
  '/payroll':      ['ADMIN', 'HR'],
  '/reports':      ['ADMIN', 'DOCTOR', 'HR'],
  '/users':        ['ADMIN'],
  '/access-matrix':['ADMIN'],
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set) => ({
      matrix: DEFAULT_MATRIX,
      loaded: false,
      setMatrix: (matrix) => set({ matrix, loaded: true }),
      setLoaded: (loaded) => set({ loaded }),
    }),
    { name: 'hms-permissions' },
  ),
)
