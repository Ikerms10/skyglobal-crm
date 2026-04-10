'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'

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

interface EditCustomerModalProps {
  customer: Customer | null
  onClose: () => void
}

export function EditCustomerModal({ customer, onClose }: EditCustomerModalProps) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', email: '', phone: '', type: 'Residential', company_name: '',
      address: '', city: '', state: 'FL', zip: '', referred_by: '', notes: '',
    },
  })

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        type: customer.type,
        company_name: customer.company_name ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        zip: customer.zip ?? '',
        referred_by: customer.referred_by ?? '',
        notes: customer.notes ?? '',
      })
    }
  }, [customer, reset])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!customer) throw new Error('No customer selected')
      const supabase = createClient()
      const { error } = await supabase.from('customers').update({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        type: data.type as Customer['type'],
        company_name: data.company_name || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        referred_by: data.referred_by || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', customer.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      if (customer) queryClient.invalidateQueries({ queryKey: ['customer', customer.id] })
      toast.success('Customer updated')
      onClose()
    },
    onError: () => toast.error('Failed to update customer'),
  })

  return (
    <Modal open={!!customer} onClose={onClose} title="Edit Customer" size="lg">
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
          <Button type="submit" loading={mutation.isPending} className="flex-1">Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}
