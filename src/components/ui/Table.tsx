'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface TableProps<T = Record<string, unknown>> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
}

type SortDir = 'asc' | 'desc' | null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data found.',
  className,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'))
      if (sortDir === 'desc') setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av
    }
    return 0
  })

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b-2 border-b-[var(--sg-gold)]">
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={cn(
                  'text-left text-xs font-medium text-[var(--sg-text-1)] uppercase tracking-wider py-3 px-4',
                  col.sortable && 'cursor-pointer select-none hover:text-[var(--sg-gold)]',
                  col.className
                )}
                onClick={() => col.sortable && handleSort(String(col.key))}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="ml-1">
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-[var(--sg-text-2)] py-12 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-[var(--sg-border)] transition-colors',
                  i % 2 === 0 ? 'bg-[var(--sg-base)]' : 'bg-[var(--sg-surface)]',
                  onRowClick && 'cursor-pointer hover:bg-[var(--sg-elevated)]'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={String(col.key)} className={cn('py-3 px-4 text-sm text-[var(--sg-text-1)]', col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
