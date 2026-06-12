'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Lead, CustomerType, ProjectStatus } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'
import { createDriveFolderInBackground } from '@/lib/drive-client'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.string().min(1, 'Required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  contract_value: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface CreateProjectModalProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onCreated?: (projectId: string) => void
}

export function CreateProjectModal({ lead, open, onClose, onCreated }: CreateProjectModalProps) {
  const queryClient = useQueryClient()
  const customer = lead?.customer as { type?: CustomerType; address?: string | null } | null

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title: lead ? lead.title : '',
      type: customer?.type ?? 'Residential',
      contract_value: lead?.estimated_value != null ? String(lead.estimated_value) : '',
      address: customer?.address ?? '',
      description: '',
      start_date: '',
      end_date: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!lead?.customer_id) throw new Error('No customer associated with this lead')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          customer_id: lead.customer_id,
          lead_id: lead.id,
          title: data.title,
          status: 'Scheduled' as ProjectStatus,
          type: data.type as CustomerType,
          address: data.address || null,
          contract_value: data.contract_value ? Number(data.contract_value) : null,
          amount_paid: 0,
          payment_status: 'Unpaid',
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          description: data.description || null,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      await supabase.from('activities').insert({
        user_id: user.id,
        customer_id: lead.customer_id,
        lead_id: lead.id,
        project_id: project.id,
        type: 'Stage Change',
        content: `Lead won — Project "${data.title}" created`,
      })

      return project
    },
    onSuccess: (project) => {
      createDriveFolderInBackground({ kind: 'project', projectId: project.id })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Project created!')
      onCreated?.(project.id)
      onClose()
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create project'),
  })

  if (!lead) return null

  return (
    <Modal open={open} onClose={onClose} title="Create Project from Lead" size="lg">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div className="bg-[var(--sg-base)] rounded-lg p-3 border border-[var(--sg-border)]">
          <p className="text-xs text-[var(--sg-text-2)] mb-1">Lead won</p>
          <p className="text-sm font-medium text-[var(--sg-text-1)]">{lead.title}</p>
          {lead.customer && (
            <p className="text-xs text-[var(--sg-text-2)]">
              {(lead.customer as { name?: string })?.name}
            </p>
          )}
        </div>

        <p className="text-sm text-[var(--sg-text-2)]">Create the project now to track progress and payments.</p>

        <Input label="Project Title" {...register('title')} error={errors.title?.message} required />

        <Select
          label="Job Type"
          {...register('type')}
          options={[
            { value: 'Residential', label: 'Residential' },
            { value: 'Commercial', label: 'Commercial' },
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date" type="date" {...register('start_date')} />
          <Input label="End Date" type="date" {...register('end_date')} />
        </div>

        <Input
          label="Contract Value ($)"
          type="number"
          step="0.01"
          min="0"
          {...register('contract_value')}
          placeholder="0.00"
        />

        <Input label="Job Address" {...register('address')} placeholder="Job site address" />

        <Textarea label="Description" rows={2} {...register('description')} />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Skip for Now</Button>
          <Button type="submit" loading={mutation.isPending} className="flex-1">Create Project</Button>
        </div>
      </form>
    </Modal>
  )
}
