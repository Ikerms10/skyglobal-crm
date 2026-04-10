'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'

const schema = z.object({
  type: z.string().min(1, 'Required'),
  content: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function AddActivityModal({ open, onClose, customerId, projectId, leadId }: {
  open: boolean
  onClose: () => void
  customerId: string
  projectId?: string
  leadId?: string
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'Note', content: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('activities').insert({
        user_id: user.id,
        customer_id: customerId,
        project_id: projectId ?? null,
        lead_id: leadId ?? null,
        type: data.type,
        content: data.content || null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-activities', customerId] })
      if (projectId) queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] })
      toast.success('Activity logged')
      reset()
      onClose()
    },
    onError: () => toast.error('Failed to log activity'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Log Activity" size="sm">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <Select
          label="Activity Type"
          {...register('type')}
          error={errors.type?.message}
          options={['Call','Text','Email','Visit','Note','Stage Change','Payment Received','Photo Added','Estimate Sent'].map(t => ({ value: t, label: t }))}
        />
        <Textarea label="Notes" rows={3} {...register('content')} placeholder="What happened?" />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={mutation.isPending} className="flex-1">Log Activity</Button>
        </div>
      </form>
    </Modal>
  )
}
