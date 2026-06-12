'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Period = 'week' | 'month' | 'year' | 'all'

export const PERIODS: Period[] = ['week', 'month', 'year', 'all']

const STORAGE_KEY = 'skyglobal_period'

interface TimeFilterContextValue {
  period: Period
  setPeriod: (p: Period) => void
}

const TimeFilterContext = createContext<TimeFilterContextValue | null>(null)

export function TimeFilterProvider({ children }: { children: ReactNode }) {
  const [period, setPeriodState] = useState<Period>('month')

  // localStorage is read after mount so SSR markup stays deterministic.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && PERIODS.includes(saved as Period)) {
        setPeriodState(saved as Period)
      }
    } catch {}
  }, [])

  const setPeriod = (p: Period) => {
    setPeriodState(p)
    try {
      localStorage.setItem(STORAGE_KEY, p)
    } catch {}
  }

  return (
    <TimeFilterContext.Provider value={{ period, setPeriod }}>
      {children}
    </TimeFilterContext.Provider>
  )
}

export function useTimeFilter() {
  const ctx = useContext(TimeFilterContext)
  if (!ctx) throw new Error('useTimeFilter must be used inside TimeFilterProvider')
  return ctx
}
