'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createDriveFolderInBackground } from '@/lib/drive-client'
import { Search } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'

const schema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  title: z.string().min(1, 'Title is required'),
  type: z.string().min(1),
  status: z.string().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  contract_value: z.string().optional(),
  amount_paid: z.string().optional(),
  payment_status: z.string().min(1),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  preselectedCustomerId?: string
}

export function NewProjectModal({ open, onClose, preselectedCustomerId }: NewProjectModalProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const debouncedSearch = useDebounce(customerSearch, 300)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: preselectedCustomerId ?? '',
      title: '',
      type: 'Residential',
      status: 'Scheduled',
      address: '',
      description: '',
      start_date: '',
      end_date: '',
      contract_value: '',
      amount_paid: '',
      payment_status: 'Unpaid',
      notes: '',
    },
  })

  const { data: customerResults = [] } = useQuery({
    queryKey: ['customer-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim() || debouncedSearch.length < 2) return []
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('customers')
        .select('*')
        
        .is('deleted_at', null)
        .ilike('name', `%${debouncedSearch}%`)
        .limit(6)
      return (data ?? []) as Customer[]
    },
    enabled: debouncedSearch.length >= 2 && !preselectedCustomerId,
  })

  const { data: preselectedCustomerData } = useQuery({
    queryKey: ['customer', preselectedCustomerId],
    queryFn: async () => {
      if (!preselectedCustomerId) return null
      const supabase = createClient()
      const { data } = await supabase.from('customers').select('*').eq('id', preselectedCustomerId).single()
      return data as Customer | null
    },
    enabled: !!preselectedCustomerId,
  })

  useEffect(() => {
    if (preselectedCustomerData) {
      setSelectedCustomer(preselectedCustomerData)
      setValue('customer_id', preselectedCustomerData.id)
    }
  }, [preselectedCustomerData, setValue])

  useEffect(() => {
    if (!open) {
      if (!preselectedCustomerId) {
        setSelectedCustomer(null)
        setCustomerSearch('')
      }
      reset({
        customer_id: preselectedCustomerId ?? '',
        title: '',
        type: 'Residential',
        status: 'Scheduled',
        address: '',
        description: '',
        start_date: '',
        end_date: '',
        contract_value: '',
        amount_paid: '',
        payment_status: 'Unpaid',
        notes: '',
      })
    }
  }, [open, preselectedCustomerId, reset])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: newProject, error } = await supabase.from('projects').insert({
        user_id: user.id,
        customer_id: data.customer_id,
        title: data.title,
        type: data.type as 'Residential' | 'Commercial',
        status: data.status as 'Scheduled' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled',
        address: data.address || null,
        description: data.description || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        contract_value: data.contract_value ? Number(data.contract_value) : null,
        amount_paid: data.amount_paid ? Number(data.amount_paid) : 0,
        payment_status: data.payment_status as 'Unpaid' | 'Partial' | 'Paid' | 'Overdue',
        notes: data.notes || null,
      }).select('id').single()
      if (error) throw new Error(error.message)
      return { projectId: newProject.id, customerId: data.customer_id }
    },
    onSuccess: ({ projectId, customerId }) => {
      createDriveFolderInBackground({ kind: 'project', projectId })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['customer-projects', customerId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['customer-lifetime-values'] })
      toast.success('Project created!')
      onClose()
      router.push(`/customers/${customerId}/projects/${projectId}`)
    },
    onError: () => toast.error('Failed to create project'),
  })

  return (
    <Modal open={open} onClose={onClose} title="New Project" size="lg">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {/* Customer selector */}
        {!preselectedCustomerId && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--sg-text-1)] block">Customer <span className="text-[var(--sg-danger)]">*</span></label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-[var(--sg-base)] border border-[var(--sg-border)] rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--sg-text-1)]">{selectedCustomer.name}</p>
                  <p className="text-xs text-[var(--sg-text-2)]">{selectedCustomer.phone || selectedCustomer.email}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setValue('customer_id', '') }}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sg-text-2)]" />
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search customers..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--sg-border)] bg-[var(--sg-base)] text-sm text-[var(--sg-text-1)] placeholder-[var(--sg-text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)] focus:border-[var(--sg-sky)]"
                />
                {showDropdown && customerResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-lg shadow-xl overflow-hidden">
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setValue('customer_id', c.id)
                          setCustomerSearch('')
                          setShowDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--sg-elevated)] transition-colors"
                      >
                        <p className="text-sm font-medium text-[var(--sg-text-1)]">{c.name}</p>
                        <p className="text-xs text-[var(--sg-text-2)]">{c.email || c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.customer_id && <p className="text-xs text-[var(--sg-danger)]">{errors.customer_id.message}</p>}
          </div>
        )}

        {preselectedCustomerId && selectedCustomer && (
          <div className="bg-[var(--sg-base)] border border-[var(--sg-border)] rounded-lg p-3">
            <p className="text-xs text-[var(--sg-text-2)] mb-0.5">Customer</p>
            <p className="text-sm font-medium text-[var(--sg-text-1)]">{selectedCustomer.name}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Project Title" {...register('title')} error={errors.title?.message} required placeholder="e.g. Exterior repaint - 2 story home" />
          </div>
          <Select label="Type" {...register('type')} options={[{ value: 'Residential', label: 'Residential' }, { value: 'Commercial', label: 'Commercial' }]} />
          <Select label="Status" {...register('status')} options={['Scheduled', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map(s => ({ value: s, label: s }))} />
          <Input label="Start Date" type="date" {...register('start_date')} />
          <Input label="End Date" type="date" {...register('end_date')} />
          <Input label="Contract Value ($)" type="number" step="0.01" {...register('contract_value')} placeholder="0.00" />
          <Input label="Amount Paid ($)" type="number" step="0.01" {...register('amount_paid')} placeholder="0.00" />
          <Select label="Payment Status" {...register('payment_status')} options={['Unpaid', 'Partial', 'Paid', 'Overdue'].map(s => ({ value: s, label: s }))} />
          <div className="col-span-2">
            <Input label="Address" {...register('address')} placeholder="Job site address" />
          </div>
          <div className="col-span-2">
            <Textarea label="Description" rows={2} {...register('description')} placeholder="Project description..." />
          </div>
          <div className="col-span-2">
            <Textarea label="Notes" rows={2} {...register('notes')} placeholder="Internal notes..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={mutation.isPending} className="flex-1">Create Project</Button>
        </div>
      </form>
    </Modal>
  )
}
