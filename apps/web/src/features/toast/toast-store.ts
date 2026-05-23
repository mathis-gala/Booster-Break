export type ToastTone = 'error' | 'success'

export interface ToastMessage {
  id: string
  message: string
  tone: ToastTone
}

type ToastListener = (toasts: ToastMessage[]) => void

const TOAST_TTL_MS = 4_800

let toasts: ToastMessage[] = []
const listeners = new Set<ToastListener>()

export const toast = {
  show(message: string, tone: ToastTone = 'error') {
    const id = crypto.randomUUID()

    toasts = [...toasts, { id, message, tone }].slice(-4)
    emit()

    window.setTimeout(() => {
      toast.dismiss(id)
    }, TOAST_TTL_MS)
  },

  dismiss(id: string) {
    toasts = toasts.filter((toastMessage) => toastMessage.id !== id)
    emit()
  },

  clear() {
    toasts = []
    emit()
  },

  subscribe(listener: ToastListener) {
    listeners.add(listener)
    listener(toasts)

    return () => listeners.delete(listener)
  },

  getSnapshot() {
    return toasts
  },
}

const emit = () => {
  for (const listener of listeners) {
    listener(toasts)
  }
}
