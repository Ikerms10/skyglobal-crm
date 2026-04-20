'use client'
import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  active: string
  setActive: (v: string) => void
}
const TabsContext = createContext<TabsContextValue>({ active: '', setActive: () => {} })

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [active, setActive] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex gap-1 bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-lg p-1', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { active, setActive } = useContext(TabsContext)
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-md transition-colors',
        active === value
          ? 'border-b-2 border-[var(--sg-gold)] text-[var(--sg-gold)] bg-[var(--sg-base)]'
          : 'text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)] hover:bg-[var(--sg-elevated)]'
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return <div className={className}>{children}</div>
}
