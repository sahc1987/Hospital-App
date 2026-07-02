import toast from 'react-hot-toast'
import { useNotificationsStore } from '@/store/notificationsStore'
import type { NotifType } from '@/store/notificationsStore'

export function notify(type: NotifType, title: string, message?: string) {
  useNotificationsStore.getState().add({ type, title, message })

  switch (type) {
    case 'success': toast.success(title); break
    case 'error':   toast.error(title);   break
    case 'warning': toast(title, { icon: '⚠️' }); break
    default:        toast(title);         break
  }
}
