import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type TimerState = {
  seconds: number
  running: boolean
  _interval?: any
  start: () => void
  stop: () => void
  reset: () => void
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      seconds: 0,
      running: false,
      start: () => {
        if (get().running) return
        const id = setInterval(() => set((s) => ({ seconds: s.seconds + 1 })), 1000)
        set({ running: true, _interval: id })
      },
      stop: () => {
        const id = get()._interval
        if (id) clearInterval(id)
        set({ running: false, _interval: undefined })
      },
      reset: () => {
        const id = get()._interval
        if (id) clearInterval(id)
        set({ seconds: 0, running: false, _interval: undefined })
      },
    }),
    { name: 'ultimaratio-timer' },
  ),
)