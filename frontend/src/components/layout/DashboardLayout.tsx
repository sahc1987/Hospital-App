import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { permissionsApi } from '@/api/endpoints'
import { usePermissionsStore } from '@/store/permissionsStore'

export default function DashboardLayout() {
  const setMatrix = usePermissionsStore((s) => s.setMatrix)

  useEffect(() => {
    permissionsApi.get()
      .then((r) => setMatrix(r.data.data))
      .catch(() => { /* keep cached/default matrix on network failure */ })
  }, [setMatrix])

  return (
    <div className="flex h-screen overflow-hidden bg-surface-card">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
