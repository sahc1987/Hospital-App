import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import Sidebar from './Sidebar'
import Header from './Header'
import { permissionsApi } from '@/api/endpoints'
import { usePermissionsStore } from '@/store/permissionsStore'

export default function DashboardLayout() {
  const setMatrix = usePermissionsStore((s) => s.setMatrix)
  const [menuOpen, setMenuOpen] = useState(false)
  const { key } = useLocation()

  useEffect(() => {
    permissionsApi.get()
      .then((r) => setMatrix(r.data.data))
      .catch(() => { /* keep cached/default matrix on network failure */ })
  }, [setMatrix])

  // Any navigation closes the phone drawer (key changes even when re-clicking the current page)
  useEffect(() => setMenuOpen(false), [key])

  return (
    // h-dvh: on phones 100vh includes the area behind the browser's toolbar, hiding the bottom of the page
    <div className="flex h-screen h-dvh overflow-hidden bg-surface-card">
      {/* md+: persistent rail. Below md: the same nav as a modal drawer (focus trap, Esc, backdrop tap) */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      {/* aria-label on Dialog: that element carries role="dialog", the panel is just its content */}
      <Dialog open={menuOpen} onClose={setMenuOpen} aria-label="Main menu" className="relative z-50 md:hidden">
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <DialogPanel className="fixed inset-y-0 left-0 flex">
          <Sidebar mobile onClose={() => setMenuOpen(false)} />
        </DialogPanel>
      </Dialog>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 motion-safe:animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
