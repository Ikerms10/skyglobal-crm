'use client'
import { createContext, useContext, useEffect } from 'react'

const Ctx = createContext<{ theme: 'dark' }>({ theme: 'dark' })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.removeItem('sg-theme')
  }, [])
  return <Ctx.Provider value={{ theme: 'dark' }}>{children}</Ctx.Provider>
}

export function useTheme() { return useContext(Ctx) }
