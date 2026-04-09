'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'
import { useLocalStorageDraft } from '@/lib/hooks/useLocalStorageDraft'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  type: z.string().min(1, 'Required'),
  company_name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  referred_by: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function AddCustomerDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const defaultValues = {
    name: '', email: '', phone: '', type: 'Residential', company_name: '',
    address: '', city: '', state: 'FL', zip: '', referred_by: '', notes: '',
  }

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const { clearDraft } = useLocalStorageDraft({ key: 'add-customer', watch, reset, defaultValues })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('customers').insert({
        user_id: user.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        type: data.type,
        company_name: data.company_name || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        referred_by: data.referred_by || null,
        notes: data.notes || null,
        tags: [],
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer added!')
      clearDraft()
      reset(defaultValues)
      onClose()
    },
    onError: () => toast.error('Failed to add customer'),
  })

  return (
    <Drawer open={open} onClose={onClose} title="Add Customer">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <Input label="Full Name" {...register('name')} error={errors.name?.message} required />
        <Select label="Type" {...register('type')} options={[{ value: 'Residential', label: 'Residential' }, { value: 'Commercial', label: 'Commercial' }]} />
        <Input label="Company Name" {...register('company_name')} placeholder="For commercial clients" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" {...register('phone')} placeholder="(407) 555-0123" />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        </div>
        <Input label="Address" {...register('address')} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1"><Input label="City" {...register('city')} /></div>
          <div><Input label="State" {...register('state')} /></div>
          <div><Input label="ZIP" {...register('zip')} /></div>
        </div>
        <Input label="Referred By" {...register('referred_by')} placeholder="Who referred this customer?" />
        <Textarea label="Notes" rows={3} {...register('notes')} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={mutation.isPending} className="flex-1">Add Customer</Button>
        </div>
      </form>
    </Drawer>
  )
}
