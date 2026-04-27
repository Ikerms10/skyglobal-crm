'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.string().min(1),
  status: z.string().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  contract_value: z.string().optional(),
  amount_paid: z.string().optional(),
  lead_cost: z.string().optional(),
  payment_status: z.string().min(1),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface EditProjectModalProps {
  project: Project | null
  open: boolean
  onClose: () => void
  onSuccess: (updated: Project) => void
}

export function EditProjectModal({ project, open, onClose, onSuccess }: EditProjectModalProps) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
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
      lead_cost: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (project) {
      reset({
        title: project.title ?? '',
        type: project.type ?? 'Residential',
        status: project.status ?? 'Scheduled',
        address: project.address ?? '',
        description: project.description ?? '',
        start_date: project.start_date ?? '',
        end_date: project.end_date ?? '',
        contract_value: project.contract_value != null ? String(project.contract_value) : '',
        amount_paid: String(project.amount_paid ?? 0),
        lead_cost: project.lead_cost != null ? String(project.lead_cost) : '',
        payment_status: project.payment_status ?? 'Unpaid',
        notes: project.notes ?? '',
      })
    }
  }, [project, reset])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!project) throw new Error('No project selected')
      const supabase = createClient()
      const { data: updated, error } = await supabase.from('projects').update({
        title: data.title,
        type: data.type as 'Residential' | 'Commercial',
        status: data.status as 'Scheduled' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled',
        address: data.address || null,
        description: data.description || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        contract_value: data.contract_value ? Number(data.contract_value) : null,
        amount_paid: data.amount_paid ? Number(data.amount_paid) : 0,
        lead_cost: data.lead_cost ? Number(data.lead_cost) : null,
        payment_status: data.payment_status as 'Unpaid' | 'Partial' | 'Paid' | 'Overdue',
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', project.id).select().single()
      if (error) throw new Error(error.message)
      return updated as Project
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['focus'] })
      queryClient.invalidateQueries({ queryKey: ['customer-lifetime-values'] })
      toast.success('Project updated')
      onClose()
      onSuccess(updated)
    },
    onError: () => toast.error('Failed to update project'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Edit Project" size="lg">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Project Title" {...register('title')} error={errors.title?.message} required />
          </div>
          <Select label="Type" {...register('type')} options={[{ value: 'Residential', label: 'Residential' }, { value: 'Commercial', label: 'Commercial' }]} />
          <Select label="Status" {...register('status')} options={['Scheduled', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map(s => ({ value: s, label: s }))} />
          <Input label="Start Date" type="date" {...register('start_date')} />
          <Input label="End Date" type="date" {...register('end_date')} />
          <Input label="Contract Value ($)" type="number" step="0.01" {...register('contract_value')} />
          <Input label="Amount Paid ($)" type="number" step="0.01" {...register('amount_paid')} />
          <Input label="Lead Cost ($)" type="number" step="0.01" {...register('lead_cost')} />
          <Select label="Payment Status" {...register('payment_status')} options={['Unpaid', 'Partial', 'Paid', 'Overdue'].map(s => ({ value: s, label: s }))} />
          <div className="col-span-2">
            <Input label="Address" {...register('address')} />
          </div>
          <div className="col-span-2">
            <Textarea label="Description" rows={2} {...register('description')} />
          </div>
          <div className="col-span-2">
            <Textarea label="Notes" rows={2} {...register('notes')} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={mutation.isPending} className="flex-1">Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}
