import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Required: it's the dialog's accessible name, and the header row also holds the close button */
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-6xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: Readonly<ModalProps>) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className={cn('card w-full shadow-xl', sizes[size])}>
                <div className="flex items-center justify-between mb-5">
                  <DialogTitle className="text-base font-semibold text-ink">{title}</DialogTitle>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-card text-ink-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
                {children}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

/** Destructive-action confirmation (replaces window.confirm): names the action on the button, not "OK". */
export function ConfirmDialog({ open, title, children, confirmLabel, pending, onConfirm, onClose }: Readonly<{
  open: boolean; title: string; children: React.ReactNode; confirmLabel: string
  pending?: boolean; onConfirm: () => void; onClose: () => void
}>) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-5 text-sm text-ink">
        {children}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Go back</Button>
          <Button variant="danger" loading={pending} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}
