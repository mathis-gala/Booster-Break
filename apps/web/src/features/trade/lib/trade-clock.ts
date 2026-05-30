const listeners = new Set<() => void>()

let timerId: number | null = null
let now = Date.now()

const TICK_MS = 1_000

const start = () => {
  if (timerId !== null) {
    return
  }

  timerId = window.setInterval(() => {
    now = Date.now()
    emit()
  }, TICK_MS)
}

const stop = () => {
  if (timerId === null) {
    return
  }

  window.clearInterval(timerId)
  timerId = null
}

const emit = () => {
  for (const listener of listeners) {
    listener()
  }
}

export const tradeClock = {
  subscribe(listener: () => void) {
    listeners.add(listener)

    if (listeners.size === 1) {
      start()
    }

    return () => {
      listeners.delete(listener)

      if (listeners.size === 0) {
        stop()
      }
    }
  },

  getSnapshot() {
    return now
  },
}
