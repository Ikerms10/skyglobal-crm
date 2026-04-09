'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Expense } from '@/types'
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { toast } from 'sonner'
import { Plus, Download, Trash2, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocalStorageDraft } from '@/lib/hooks/useLocalStorageDraft'
import Link from 'next/link'

const CATEGORIES = ['Labor','Materials','Advertising','Fuel','Tools','Subcontractors','Overhead','Insurance','Software','Other']

const schema = z.object({
  category: z.string().min(1, 'Required'),
  description: z.string().optional(),
  amount: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  recurring: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

export default function ExpensesPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const queryClient = useQueryClient()

  const defaultValues = { category: 'Advertising', description: '', amount: '', date: new Date().toISOString().split('T')[0], recurring: false }

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const { clearDraft } = useLocalStorageDraft({ key: 'add-expense', watch, reset, defaultValues })

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase.from('expenses')
        .select('*').eq('user_id', user.id).is('deleted_at', null)
        .order('date', { ascending: false })
      return (data ?? []) as Expense[]
    },
  })

  const { data: projectExpenses = [] } = useQuery({
    queryKey: ['all-project-expenses'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase.from('project_expenses')
        .select('*, projects(title, id, customer_id)').eq('user_id', user.id)
        .order('date', { ascending: false })
      return data ?? []
    },
  })

  const addMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        category: data.category,
        description: data.description || null,
        amount: Number(data.amount),
        date: data.date,
        recurring: data.recurring ?? false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense added')
      clearDraft()
      reset(defaultValues)
      setAddOpen(false)
    },
    onError: () => toast.error('Failed to add expense'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('expenses')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense deleted')
      setDeleteId(null)
    },
  })

  const filtered = expenses.filter(e => {
    const matchCat = !filterCategory || e.category === filterCategory
    const matchFrom = !filterFrom || e.date >= filterFrom
    const matchTo = !filterTo || e.date <= filterTo
    return matchCat && matchFrom && matchTo
  })

  // Monthly totals per category
  const categoryTotals = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
    return acc
  }, {} as Record<string, number>)

  const totalGeneral = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalProject = projectExpenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0)

  const handleExport = () => {
    exportToCSV(filtered.map(e => ({
      Date: e.date, Category: e.category, Description: e.description ?? '',
      Amount: e.amount, Recurring: e.recurring ? 'Yes' : 'No',
    })), 'general-expenses')
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-slate-400 text-sm">Track all business costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Expense</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <p className="text-xs text-slate-400">General Expenses</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totalGeneral)}</p>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <p className="text-xs text-slate-400">Project Expenses</p>
          <p className="text-xl font-bold text-orange-400">{formatCurrency(totalProject)}</p>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <p className="text-xs text-slate-400">Total All Expenses</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalGeneral + totalProject)}</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General Expenses</TabsTrigger>
          <TabsTrigger value="project">Project Expenses</TabsTrigger>
          <TabsTrigger value="breakdown">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="bg-[#1a1d27] border border-[#2a2d3a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="bg-[#1a1d27] border border-[#2a2d3a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="bg-[#1a1d27] border border-[#2a2d3a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            {(filterCategory || filterFrom || filterTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterCategory(''); setFilterFrom(''); setFilterTo('') }}>Clear</Button>
            )}
          </div>

          {isLoading ? <TableSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={DollarSign} title="No expenses" description="Add general business expenses here (ads, insurance, software, etc.)" action={{ label: 'Add Expense', onClick: () => setAddOpen(true) }} />
          ) : (
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2d3a]">
                    {['Date', 'Category', 'Description', 'Amount', 'Recurring', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b border-[#2a2d3a] hover:bg-[#0f1117] group">
                      <td className="px-4 py-3 text-sm text-slate-400">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{e.category}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{e.description ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-400">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3">{e.recurring ? <span className="text-xs text-yellow-400">Recurring</span> : <span className="text-xs text-slate-600">One-time</span>}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteId(e.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#0f1117]">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-white text-right">Total</td>
                    <td className="px-4 py-3 text-lg font-bold text-red-400">{formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="project" className="mt-6">
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
            {projectExpenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No project expenses yet. Add them inside each project.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2d3a]">
                    {['Date', 'Project', 'Category', 'Description', 'Amount'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectExpenses.map((e: { id: string; date: string; category: string; description: string | null; amount: number; projects: { title: string; id: string; customer_id: string } | null }) => (
                    <tr key={e.id} className="border-b border-[#2a2d3a] hover:bg-[#0f1117]">
                      <td className="px-4 py-3 text-sm text-slate-400">{formatDate(e.date)}</td>
                      <td className="px-4 py-3">
                        {e.projects && (
                          <Link href={`/customers/${e.projects.customer_id}/projects/${e.projects.id}`}
                            className="text-sm text-white hover:text-sky-400">{e.projects.title}</Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{e.category}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{e.description ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-400">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.filter(c => categoryTotals[c] > 0).map(cat => (
              <div key={cat} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">{cat}</span>
                  <span className="text-sm font-bold text-red-400">{formatCurrency(categoryTotals[cat])}</span>
                </div>
                <div className="h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(100, (categoryTotals[cat] / Math.max(...Object.values(categoryTotals))) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add expense drawer */}
      <Drawer open={addOpen} onClose={() => setAddOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="space-y-4">
          <Select label="Category" {...register('category')} error={errors.category?.message}
            options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Textarea label="Description" rows={2} {...register('description')} placeholder="What was this expense for?" />
          <Input label="Amount ($)" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} required />
          <Input label="Date" type="date" {...register('date')} error={errors.date?.message} required />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" {...register('recurring')} className="rounded" />
            Recurring monthly expense
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={addMutation.isPending} className="flex-1">Add Expense</Button>
          </div>
        </form>
      </Drawer>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Delete Expense"
        description="Remove this expense record?"
      />
    </div>
  )
}
