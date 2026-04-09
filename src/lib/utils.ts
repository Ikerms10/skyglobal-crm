import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try { return format(new Date(date), 'MMM d, yyyy') } catch { return '—' }
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—'
  try { return format(new Date(date), 'MM/dd/yy') } catch { return '—' }
}

export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return '—'
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }) } catch { return '—' }
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
  return phone
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function calculateProfit(contractValue: number | null, expenses: number): number {
  return (contractValue ?? 0) - expenses
}

export function calculateMargin(revenue: number, expenses: number): number {
  if (revenue === 0) return 0
  return Math.round(((revenue - expenses) / revenue) * 100)
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      const str = val == null ? '' : String(val)
      return str.includes(',') ? `"${str}"` : str
    }).join(','))
  ].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
