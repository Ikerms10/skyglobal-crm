'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Project, ProjectLineItem, ProjectExpense, ProjectPhoto, Activity } from '@/types'
import { formatCurrency, formatDate, formatRelativeTime, calculateProfit } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { StatusBadge, PaymentBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { TableSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddActivityModal } from '@/components/customers/AddActivityModal'
import { toast } from 'sonner'
import { ArrowLeft, DollarSign, Calendar, MapPin, Plus, Trash2, Upload, Image } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  unit_price: z.string().optional(),
  total: z.string().optional(),
})
type LineItemForm = z.infer<typeof lineItemSchema>

const expenseSchema = z.object({
  category: z.string().min(1, 'Required'),
  description: z.string().optional(),
  amount: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
})
type ExpenseForm = z.infer<typeof expenseSchema>

const ACTIVITY_ICONS: Record<string, string> = {
  'Call': '📞', 'Text': '💬', 'Email': '📧', 'Visit': '🏠',
  'Note': '📝', 'Stage Change': '🔄', 'Payment Received': '💰',
  'Photo Added': '📷', 'Estimate Sent': '📋',
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string; projectId: string }> }) {
  const { id: customerId, projectId } = use(params)
  const queryClient = useQueryClient()
  const [deleteLineItem, setDeleteLineItem] = useState<string | null>(null)
  const [deleteExpense, setDeleteExpense] = useState<string | null>(null)
  const [addActivityOpen, setAddActivityOpen] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoLabel, setPhotoLabel] = useState<'Before' | 'During' | 'After'>('Before')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('projects').select('*, customers(name)').eq('id', projectId).single()
      return data as (Project & { customers: { name: string } | null }) | null
    },
  })

  const { data: lineItems = [], isLoading: loadingLineItems } = useQuery({
    queryKey: ['line-items', projectId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('project_line_items').select('*').eq('project_id', projectId).order('created_at')
      return (data ?? []) as ProjectLineItem[]
    },
  })

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['project-expenses', projectId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('project_expenses').select('*').eq('project_id', projectId).order('date', { ascending: false })
      return (data ?? []) as ProjectExpense[]
    },
  })

  const { data: photos = [], isLoading: loadingPhotos } = useQuery({
    queryKey: ['project-photos', projectId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('project_photos').select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false })
      return (data ?? []) as ProjectPhoto[]
    },
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('activities').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
      return (data ?? []) as Activity[]
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('projects').update({ status, updated_at: new Date().toISOString() }).eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Project updated')
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('projects').update({
        payment_status: 'Paid',
        amount_paid: project?.contract_value ?? 0,
        updated_at: new Date().toISOString(),
      }).eq('id', projectId)
      if (error) throw error
      await supabase.from('activities').insert({
        user_id: user.id,
        customer_id: customerId,
        project_id: projectId,
        type: 'Payment Received',
        content: `Full payment received: ${formatCurrency(project?.contract_value)}`,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      toast.success('Project marked as paid')
    },
    onError: () => toast.error('Failed to update payment'),
  })

  // Line items form
  const { register: liReg, handleSubmit: liSubmit, reset: liReset, watch: liWatch, setValue: liSetValue, formState: { errors: liErrors } } = useForm<LineItemForm>({
    resolver: zodResolver(lineItemSchema),
  })

  const qty = liWatch('quantity')
  const price = liWatch('unit_price')
  if (qty && price) {
    const computed = (Number(qty) * Number(price)).toFixed(2)
    liSetValue('total', computed)
  }

  const addLineItemMutation = useMutation({
    mutationFn: async (data: LineItemForm) => {
      const supabase = createClient()
      const { error } = await supabase.from('project_line_items').insert({
        project_id: projectId,
        description: data.description,
        quantity: data.quantity ? Number(data.quantity) : null,
        unit: data.unit || null,
        unit_price: data.unit_price ? Number(data.unit_price) : null,
        total: data.total ? Number(data.total) : null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-items', projectId] })
      liReset()
      toast.success('Line item added')
    },
    onError: () => toast.error('Failed to add line item'),
  })

  const deleteLineItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('project_line_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-items', projectId] })
      toast.success('Line item removed')
      setDeleteLineItem(null)
    },
  })

  // Expense form
  const { register: expReg, handleSubmit: expSubmit, reset: expReset, formState: { errors: expErrors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: 'Labor', date: new Date().toISOString().split('T')[0] },
  })

  const addExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseForm) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('project_expenses').insert({
        project_id: projectId,
        user_id: user.id,
        category: data.category,
        description: data.description || null,
        amount: Number(data.amount),
        date: data.date,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-expenses', projectId] })
      expReset({ category: 'Labor', date: new Date().toISOString().split('T')[0] })
      toast.success('Expense added')
    },
    onError: () => toast.error('Failed to add expense'),
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('project_expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-expenses', projectId] })
      toast.success('Expense removed')
      setDeleteExpense(null)
    },
  })

  // Photo upload
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${projectId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('project-photos').upload(path, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('project-photos').getPublicUrl(path)
      const { error } = await supabase.from('project_photos').insert({
        project_id: projectId,
        user_id: user.id,
        url: publicUrl,
        label: photoLabel,
      })
      if (error) throw error
      await supabase.from('activities').insert({
        user_id: user.id,
        customer_id: customerId,
        project_id: projectId,
        type: 'Photo Added',
        content: `${photoLabel} photo uploaded`,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-photos', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      toast.success('Photo uploaded')
      setUploadingPhoto(false)
    },
    onError: () => { toast.error('Failed to upload photo'); setUploadingPhoto(false) },
  })

  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.total ?? 0), 0)
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const profit = calculateProfit(project?.contract_value ?? null, expensesTotal)

  const progressSteps = ['Scheduled', 'In Progress', 'Completed']
  const currentStep = progressSteps.indexOf(project?.status ?? 'Scheduled')

  if (loadingProject) {
    return <div className="p-4 md:p-6 space-y-6"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
  }

  if (!project) return <div className="p-6 text-[#9a9585]">Project not found.</div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Back */}
      <Link href={`/customers/${customerId}`} className="flex items-center gap-2 text-[#9a9585] hover:text-[#efeae2] transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to {project.customers?.name}
      </Link>

      {/* Project Header */}
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
              <StatusBadge status={project.status} />
              <Badge variant={project.type === 'Commercial' ? 'purple' : 'info'}>{project.type}</Badge>
            </div>
            <Link href={`/customers/${customerId}`} className="text-[#3583b3] hover:underline text-sm">
              {project.customers?.name}
            </Link>
            {project.address && (
              <div className="flex items-center gap-1 mt-1 text-[#9a9585] text-sm">
                <MapPin className="h-4 w-4" />{project.address}
              </div>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-[#9a9585]">
              {project.start_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Start: {formatDate(project.start_date)}</span>}
              {project.end_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />End: {formatDate(project.end_date)}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:text-right">
            <div>
              <p className="text-2xl font-bold text-[#e6ab35]">{formatCurrency(project.contract_value)}</p>
              <p className="text-xs text-[#9a9585]">Contract value</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[#efeae2]">{formatCurrency(project.amount_paid)}</p>
              <p className="text-xs text-[#9a9585]">Paid</p>
            </div>
            <div className="flex items-center md:justify-end gap-2">
              <PaymentBadge status={project.payment_status} />
              {project.payment_status !== 'Paid' && (
                <span className="text-sm text-[#ef4444] font-medium">
                  {formatCurrency((project.contract_value ?? 0) - project.amount_paid)} due
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#2e2d26]">
          {project.payment_status !== 'Paid' && (
            <Button size="sm" variant="secondary" onClick={() => markPaidMutation.mutate()} loading={markPaidMutation.isPending}>
              <DollarSign className="h-4 w-4" /> Mark Paid
            </Button>
          )}
          {project.status !== 'Completed' && (
            <Button size="sm" variant="secondary" onClick={() => updateStatusMutation.mutate('Completed')}>
              Complete Project
            </Button>
          )}
          {project.status === 'Scheduled' && (
            <Button size="sm" variant="secondary" onClick={() => updateStatusMutation.mutate('In Progress')}>
              Start Project
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAddActivityOpen(true)}>
            <Plus className="h-4 w-4" /> Log Activity
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-[#2e2d26]">
          <div className="flex items-center gap-0">
            {progressSteps.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`h-2 flex-1 rounded-full ${i <= currentStep ? 'bg-[#e6ab35]' : 'bg-[#2e2d26]'}`} />
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i <= currentStep ? 'bg-[#e6ab35]' : 'bg-[#2e2d26]'}`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {progressSteps.map(s => (
              <span key={s} className="text-xs text-[#9a9585]">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scope">Scope of Work</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Contract Value', value: formatCurrency(project.contract_value), color: 'text-[#e6ab35]' },
              { label: 'Total Expenses', value: formatCurrency(expensesTotal), color: 'text-[#ef4444]' },
              { label: 'Gross Profit', value: formatCurrency(profit), color: profit >= 0 ? 'text-[#3583b3]' : 'text-[#ef4444]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#252419] border border-[#2e2d26] rounded-xl p-4">
                <p className="text-xs text-[#9a9585] mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          {project.description && (
            <div className="mt-4 bg-[#252419] border border-[#2e2d26] rounded-xl p-4">
              <p className="text-xs text-[#9a9585] uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-[#efeae2] whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
          {project.notes && (
            <div className="mt-4 bg-[#252419] border border-[#2e2d26] rounded-xl p-4">
              <p className="text-xs text-[#9a9585] uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-[#efeae2] whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="scope" className="mt-6 space-y-4">
          {loadingLineItems ? <TableSkeleton /> : (
            <>
              <div className="bg-[#252419] border border-[#2e2d26] rounded-xl overflow-hidden">
                {lineItems.length === 0 ? (
                  <div className="p-8 text-center text-[#9a9585] text-sm">No line items yet. Add scope of work below.</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-b-[#e6ab35]">
                        {['Description', 'Qty', 'Unit', 'Unit Price', 'Total', ''].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#efeae2] uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, i) => (
                        <tr key={item.id} className={`border-b border-[#2e2d26] group ${i % 2 === 0 ? 'bg-[#1d1c17]' : 'bg-[#252419]'} hover:bg-[#2e2d26]`}>
                          <td className="px-4 py-3 text-sm text-[#efeae2]">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-[#9a9585]">{item.quantity ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-[#9a9585]">{item.unit ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-[#9a9585]">{item.unit_price ? formatCurrency(item.unit_price) : '—'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-[#e6ab35]">{item.total ? formatCurrency(item.total) : '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => setDeleteLineItem(item.id)} className="opacity-0 group-hover:opacity-100 text-[#9a9585] hover:text-[#ef4444] transition-all p-1">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#1d1c17]">
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-[#efeae2] text-right">Subtotal</td>
                        <td className="px-4 py-3 text-lg font-bold text-[#e6ab35]">{formatCurrency(lineItemsTotal)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Add line item form */}
              <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Add Line Item</h3>
                <form onSubmit={liSubmit(d => addLineItemMutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="col-span-2 md:col-span-2">
                    <Input placeholder="Description (e.g. Living room ceiling)" {...liReg('description')} error={liErrors.description?.message} />
                  </div>
                  <Input placeholder="Qty" type="number" step="0.01" {...liReg('quantity')} />
                  <Input placeholder="Unit (sqft, hrs)" {...liReg('unit')} />
                  <Input placeholder="Unit Price" type="number" step="0.01" {...liReg('unit_price')} />
                  <div className="flex gap-2 items-end">
                    <Input placeholder="Total" type="number" step="0.01" {...liReg('total')} className="flex-1" />
                    <Button type="submit" loading={addLineItemMutation.isPending} size="sm">Add</Button>
                  </div>
                </form>
              </div>
            </>
          )}

          <ConfirmModal open={!!deleteLineItem} onClose={() => setDeleteLineItem(null)} onConfirm={() => deleteLineItem && deleteLineItemMutation.mutate(deleteLineItem)} loading={deleteLineItemMutation.isPending} title="Remove Line Item" description="Remove this line item from the scope of work?" confirmLabel="Remove" />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6 space-y-4">
          {loadingExpenses ? <TableSkeleton /> : (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Contract Value', value: formatCurrency(project.contract_value), color: 'text-[#e6ab35]' },
                  { label: 'Total Costs', value: formatCurrency(expensesTotal), color: 'text-[#ef4444]' },
                  { label: 'Profit', value: formatCurrency(profit), color: profit >= 0 ? 'text-[#3583b3]' : 'text-[#ef4444]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#252419] border border-[#2e2d26] rounded-xl p-4">
                    <p className="text-xs text-[#9a9585] mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#252419] border border-[#2e2d26] rounded-xl overflow-hidden">
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-[#9a9585] text-sm">No expenses logged for this project.</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-b-[#e6ab35]">
                        {['Date', 'Category', 'Description', 'Amount', ''].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#efeae2] uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp, i) => (
                        <tr key={exp.id} className={`border-b border-[#2e2d26] group ${i % 2 === 0 ? 'bg-[#1d1c17]' : 'bg-[#252419]'} hover:bg-[#2e2d26]`}>
                          <td className="px-4 py-3 text-sm text-[#9a9585]">{formatDate(exp.date)}</td>
                          <td className="px-4 py-3 text-sm text-[#efeae2]">{exp.category}</td>
                          <td className="px-4 py-3 text-sm text-[#efeae2]">{exp.description ?? '—'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-[#ef4444]">{formatCurrency(exp.amount)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => setDeleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 text-[#9a9585] hover:text-[#ef4444] transition-all p-1">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Add expense */}
              <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Add Expense</h3>
                <form onSubmit={expSubmit(d => addExpenseMutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Select {...expReg('category')} options={['Labor','Materials','Subcontractors','Fuel','Tools','Other'].map(c => ({ value: c, label: c }))} />
                  <Input placeholder="Description" {...expReg('description')} />
                  <Input placeholder="Amount" type="number" step="0.01" {...expReg('amount')} error={expErrors.amount?.message} />
                  <Input type="date" {...expReg('date')} error={expErrors.date?.message} />
                  <Button type="submit" loading={addExpenseMutation.isPending}>Add</Button>
                </form>
              </div>
            </>
          )}

          <ConfirmModal open={!!deleteExpense} onClose={() => setDeleteExpense(null)} onConfirm={() => deleteExpense && deleteExpenseMutation.mutate(deleteExpense)} loading={deleteExpenseMutation.isPending} title="Remove Expense" description="Remove this expense?" confirmLabel="Remove" />
        </TabsContent>

        <TabsContent value="photos" className="mt-6 space-y-4">
          {/* Upload section */}
          <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Upload Photo</h3>
            <div className="flex flex-wrap items-center gap-3">
              <select value={photoLabel} onChange={e => setPhotoLabel(e.target.value as 'Before' | 'During' | 'After')}
                className="bg-[#1d1c17] border border-[#2e2d26] text-[#efeae2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]">
                <option value="Before">Before</option>
                <option value="During">During</option>
                <option value="After">After</option>
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingPhoto(true)
                  uploadPhotoMutation.mutate(file)
                  e.target.value = ''
                }}
              />
              <Button variant="secondary" loading={uploadingPhoto} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload Photo
              </Button>
            </div>
          </div>

          {/* Photo grid */}
          {loadingPhotos ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
            </div>
          ) : photos.length === 0 ? (
            <EmptyState icon={Image} title="No photos yet" description="Upload before, during, and after photos to document this project." />
          ) : (
            <>
              {(['Before', 'During', 'After'] as const).map(label => {
                const labelPhotos = photos.filter(p => p.label === label)
                if (!labelPhotos.length) return null
                return (
                  <div key={label}>
                    <h3 className="text-sm font-semibold text-[#9a9585] mb-2 uppercase tracking-wider">{label}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {labelPhotos.map(photo => (
                        <div key={photo.id} className="relative group">
                          <img src={photo.url} alt={`${label} photo`} className="w-full h-40 object-cover rounded-lg" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <a href={photo.url} target="_blank" rel="noopener noreferrer" className="text-white text-xs bg-[#1d1c17] px-2 py-1 rounded">View</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setAddActivityOpen(true)}>
              <Plus className="h-4 w-4" /> Log Activity
            </Button>
          </div>
          {activities.length === 0 ? (
            <EmptyState icon={Plus} title="No activity" description="Log calls, texts, payments, and notes here." action={{ label: 'Log Activity', onClick: () => setAddActivityOpen(true) }} />
          ) : (
            <div className="space-y-1">
              {activities.map((a, i) => (
                <div key={a.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#2e2d26] flex items-center justify-center text-sm flex-shrink-0">
                      {ACTIVITY_ICONS[a.type] ?? '📋'}
                    </div>
                    {i < activities.length - 1 && <div className="w-0.5 bg-[#2e2d26] flex-1 my-1" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{a.type}</p>
                      <span className="text-xs text-[#9a9585]">{formatRelativeTime(a.created_at)}</span>
                    </div>
                    {a.content && <p className="text-sm text-[#9a9585] mt-0.5">{a.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddActivityModal open={addActivityOpen} onClose={() => setAddActivityOpen(false)} customerId={customerId} projectId={projectId} />
    </div>
  )
}
