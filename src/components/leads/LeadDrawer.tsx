'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Lead, LeadStage, LeadSource } from '@/types'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { toast } from 'sonner'
import { useLocalStorageDraft } from '@/lib/hooks/useLocalStorageDraft'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Phone, Mail } from 'lucide-react'

const schema = z.object({
  title: z.string().min(1, 'Required'),
  source: z.string().min(1, 'Required'),
  stage: z.string().min(1, 'Required'),
  estimated_value: z.string().optional(),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
  lost_reason: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const STAGES: LeadStage[] = ['New Lead', 'Estimate Sent', 'Follow-up', 'Won', 'Lost', 'On Hold']
const SOURCES: LeadSource[] = ['Thumbtack', 'Referral', 'Google', 'Instagram', 'Door Knock', 'Facebook', 'Yelp', 'Other']

interface LeadDrawerProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
}

export function LeadDrawer({ lead, open, onClose }: LeadDrawerProps) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const getDefaults = (l: Lead | null): FormData => ({
    title: l?.title ?? '',
    source: l?.source ?? 'Referral',
    stage: l?.stage ?? 'New Lead',
    estimated_value: l?.estimated_value != null ? String(l.estimated_value) : '',
    notes: l?.notes ?? '',
    follow_up_date: l?.follow_up_date ?? '',
    lost_reason: l?.lost_reason ?? '',
  })

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(lead),
  })

  const { clearDraft } = useLocalStorageDraft({
    key: `lead-edit-${lead?.id ?? 'none'}`,
    watch,
    reset,
    defaultValues: getDefaults(lead),
  })

  useEffect(() => {
    if (lead) {
      reset(getDefaults(lead))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('leads')
        .update({
          title: data.title,
          source: data.source as LeadSource,
          stage: data.stage as LeadStage,
          estimated_value: data.estimated_value ? Number(data.estimated_value) : null,
          notes: data.notes || null,
          follow_up_date: data.follow_up_date || null,
          lost_reason: data.lost_reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead!.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      clearDraft()
      toast.success('Lead updated')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update lead'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', lead!.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead deleted')
      onClose()
    },
    onError: () => toast.error('Failed to delete lead'),
  })

  const customer = lead?.customer as { id?: string; name?: string; phone?: string | null; email?: string | null } | null

  if (!lead) return null

  return (
    <Drawer open={open} onClose={onClose} title="Lead Details" width="md">
      <div className="p-5 space-y-5">
        {/* Customer info */}
        {customer && (
          <div className="bg-[#1d1c17] rounded-lg p-3 border border-[#2e2d26]">
            <p className="text-xs text-[#9a9585] mb-1">Customer</p>
            {customer.id ? (
              <Link href={`/customers/${customer.id}`} className="text-[#3583b3] font-medium hover:underline text-sm">
                {customer.name}
              </Link>
            ) : (
              <p className="text-sm font-medium text-white">{customer.name}</p>
            )}
            <div className="mt-2 flex gap-3 flex-wrap">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-xs text-[#3583b3] hover:text-[#efeae2]">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1 text-xs text-[#3583b3] hover:text-[#efeae2]">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </a>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <Input label="Job Title" {...register('title')} error={errors.title?.message} required />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Source"
              {...register('source')}
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
          />

          <Input label="Follow-up Date" type="date" {...register('follow_up_date')} />

          <Textarea label="Notes" rows={3} {...register('notes')} placeholder="Add notes about this lead..." />

          <Input
            label="Lost Reason"
            {...register('lost_reason')}
            placeholder="Why was this lead lost?"
          />

          <div className="text-xs text-[#9a9585] pt-2 border-t border-[#2e2d26]">
            <p>Created: {formatDate(lead.created_at)}</p>
            <p>Updated: {formatDate(lead.updated_at)}</p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={mutation.isPending} className="flex-1">Save Changes</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>

          <div className="pt-2 border-t border-[#2e2d26]">
            <Button type="button" variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
              Delete Lead
            </Button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete Lead"
        description={`Delete "${lead?.title}"? This cannot be undone.`}
      />
    </Drawer>
  )
}
