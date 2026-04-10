'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { LeadStage, LeadSource, Customer, CustomerType } from '@/types'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'
import { useLocalStorageDraft } from '@/lib/hooks/useLocalStorageDraft'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Search, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  customer_search: z.string().optional(),
  new_customer_name: z.string().optional(),
  new_customer_phone: z.string().optional(),
  new_customer_type: z.string().optional(),
  title: z.string().min(1, 'Job title is required'),
  source: z.string().min(1, 'Source is required'),
  stage: z.string().min(1).optional(),
  estimated_value: z.string().optional(),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const STAGES: LeadStage[] = ['New Lead', 'Estimate Sent', 'Follow-up', 'Negotiating', 'Won', 'Lost', 'On Hold']
const SOURCES: LeadSource[] = ['Thumbtack', 'Referral', 'Google', 'Instagram', 'Door Knock', 'Facebook', 'Yelp', 'Other']

const DEFAULT_VALUES: FormData = {
  customer_search: '',
  new_customer_name: '',
  new_customer_phone: '',
  new_customer_type: 'Residential',
  title: '',
  source: 'Referral',
  stage: 'New Lead',
  estimated_value: '',
  notes: '',
  follow_up_date: '',
}

export function AddLeadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const { clearDraft } = useLocalStorageDraft({
    key: 'add-lead',
    watch,
    reset,
    defaultValues: DEFAULT_VALUES,
  })

  const customerSearch = watch('customer_search') ?? ''
  const debouncedSearch = useDebounce(customerSearch, 300)

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
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .ilike('name', `%${debouncedSearch}%`)
        .limit(6)
      return (data ?? []) as Customer[]
    },
    enabled: debouncedSearch.length >= 2,
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let customerId = selectedCustomer?.id ?? null

      if (customerMode === 'new' && data.new_customer_name) {
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            name: data.new_customer_name,
            phone: data.new_customer_phone || null,
            type: (data.new_customer_type as CustomerType) || 'Residential',
          })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        customerId = newCustomer.id
      }

      const { error } = await supabase.from('leads').insert({
        user_id: user.id,
        customer_id: customerId,
        title: data.title,
        source: data.source as LeadSource,
        stage: (data.stage as LeadStage) || 'New Lead',
        estimated_value: data.estimated_value ? Number(data.estimated_value) : null,
        notes: data.notes || null,
        follow_up_date: data.follow_up_date || null,
      })
      if (error) throw new Error(error.message)

      if (customerId) {
        await supabase.from('activities').insert({
          user_id: user.id,
          customer_id: customerId,
          type: 'Stage Change',
          content: `New lead created: ${data.title}`,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Lead created!')
      clearDraft()
      reset(DEFAULT_VALUES)
      setSelectedCustomer(null)
      setCustomerMode('existing')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create lead'),
  })

  return (
    <Drawer open={open} onClose={onClose} title="Add New Lead" width="md">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-5">
        {/* Customer section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[#efeae2] block">Customer</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCustomerMode('existing')}
              className={cn(
                'flex-1 py-2 text-sm rounded-lg border transition-colors',
                customerMode === 'existing'
                  ? 'bg-[#e6ab35] border-[#e6ab35] text-[#1d1c17] font-semibold'
                  : 'border-[#2e2d26] text-[#9a9585] hover:text-[#efeae2]',
              )}
            >
              Existing Customer
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode('new')}
              className={cn(
                'flex-1 py-2 text-sm rounded-lg border transition-colors',
                customerMode === 'new'
                  ? 'bg-[#e6ab35] border-[#e6ab35] text-[#1d1c17] font-semibold'
                  : 'border-[#2e2d26] text-[#9a9585] hover:text-[#efeae2]',
              )}
            >
              New Customer
            </button>
          </div>

          {customerMode === 'existing' ? (
            selectedCustomer ? (
              <div className="flex items-center justify-between bg-[#1d1c17] border border-[#2e2d26] rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-[#efeae2]">{selectedCustomer.name}</p>
                  <p className="text-xs text-[#9a9585]">{selectedCustomer.phone || selectedCustomer.email}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9585]" />
                <input
                  {...register('customer_search')}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search existing customers..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#2e2d26] bg-[#1d1c17] text-sm text-[#efeae2] placeholder-[#9a9585] focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]"
                />
                {showDropdown && customerResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#252419] border border-[#2e2d26] rounded-lg shadow-xl overflow-hidden">
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setShowDropdown(false)
                          reset({ ...DEFAULT_VALUES, customer_search: '' })
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#2e2d26] transition-colors"
                      >
                        <p className="text-sm font-medium text-[#efeae2]">{c.name}</p>
                        <p className="text-xs text-[#9a9585]">{c.email || c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="space-y-3 p-3 bg-[#1d1c17] rounded-lg border border-[#2e2d26]">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="h-4 w-4 text-[#3583b3]" />
                <span className="text-sm text-[#3583b3] font-medium">New Customer</span>
              </div>
              <Input label="Name" {...register('new_customer_name')} placeholder="John Smith" required />
              <Input label="Phone" {...register('new_customer_phone')} placeholder="(407) 555-0123" />
              <Select
                label="Type"
                {...register('new_customer_type')}
                options={[
                  { value: 'Residential', label: 'Residential' },
                  { value: 'Commercial', label: 'Commercial' },
                ]}
              />
            </div>
          )}
        </div>

        <Input
          label="Job Title"
          {...register('title')}
          error={errors.title?.message}
          required
          placeholder="e.g. Exterior repaint - 3 bed house"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Source"
            {...register('source')}
            error={errors.source?.message}
            options={SOURCES.map(s => ({ value: s, label: s }))}
          />
          <Select
            label="Stage"
            {...register('stage')}
            options={STAGES.map(s => ({ value: s, label: s }))}
          />
        </div>

        <Input
          label="Estimated Value ($)"
          type="number"
          step="0.01"
          min="0"
          {...register('estimated_value')}
          placeholder="0.00"
        />

        <Input label="Follow-up Date" type="date" {...register('follow_up_date')} />

        <Textarea
          label="Notes"
          rows={3}
          {...register('notes')}
          placeholder="Any notes about this lead..."
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={mutation.isPending} className="flex-1">Create Lead</Button>
        </div>
      </form>
    </Drawer>
  )
}
