'use client'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Lead, LeadStage, LeadSource } from '@/types'
import { KanbanSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { LeadCard } from '@/components/leads/LeadCard'
import { LeadDrawer } from '@/components/leads/LeadDrawer'
import { AddLeadDrawer } from '@/components/leads/AddLeadDrawer'
import { CreateProjectModal } from '@/components/leads/CreateProjectModal'
import { LostReasonModal } from '@/components/leads/LostReasonModal'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core'
import { formatCurrency, cn } from '@/lib/utils'

const STAGES: LeadStage[] = ['New Lead', 'Estimate Sent', 'Follow-up', 'Negotiating', 'Won', 'Lost', 'On Hold']

const STAGE_BORDER_COLORS: Record<LeadStage, string> = {
  'New Lead': 'border-t-[#3583b3]',
  'Estimate Sent': 'border-t-[#e6ab35]',
  'Follow-up': 'border-t-[#e6ab35]',
  'Negotiating': 'border-t-[#e6ab35]',
  'Won': 'border-t-[#e6ab35]',
  'Lost': 'border-t-[#ef4444]',
  'On Hold': 'border-t-[#9a9585]',
}

const STAGE_HEADER_COLORS: Record<LeadStage, string> = {
  'New Lead': 'text-[#3583b3]',
  'Estimate Sent': 'text-[#e6ab35]',
  'Follow-up': 'text-[#e6ab35]',
  'Negotiating': 'text-[#e6ab35]',
  'Won': 'text-[#e6ab35]',
  'Lost': 'text-[#ef4444]',
  'On Hold': 'text-[#9a9585]',
}

const SOURCES: LeadSource[] = ['Thumbtack', 'Referral', 'Google', 'Instagram', 'Door Knock', 'Facebook', 'Yelp', 'Other']

function KanbanColumn({
  stage,
  leads,
  borderColor,
  headerColor,
  onCardClick,
}: {
  stage: LeadStage
  leads: Lead[]
  borderColor: string
  headerColor: string
  onCardClick: (lead: Lead) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0)

  return (
    <div className={cn(
      'flex-shrink-0 w-72 bg-[#252419] rounded-xl border border-t-2 border-[#2e2d26] p-3 flex flex-col min-h-[400px] transition-colors',
      borderColor,
      isOver && 'bg-[#2e2d26]',
    )}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${headerColor}`}>{stage}</h3>
        <span className="text-xs text-[#9a9585] bg-[#2e2d26] px-2 py-0.5 rounded-full">{leads.length}</span>
      </div>
      {totalValue > 0 && (
        <p className="text-xs text-[#9a9585] mb-2">{formatCurrency(totalValue)} total</p>
      )}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 flex-1"
      >
        {leads.length === 0 ? (
          <div className={cn(
            'flex items-center justify-center h-24 border-2 border-dashed rounded-lg transition-colors',
            isOver ? 'border-[#e6ab35]/50 bg-[#e6ab35]/5' : 'border-[#2e2d26]',
          )}>
            <p className="text-[#9a9585] text-xs">Drop here</p>
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [wonLead, setWonLead] = useState<Lead | null>(null)
  const [lostLead, setLostLead] = useState<{ lead: Lead; prevStage: LeadStage } | null>(null)
  const debouncedSearch = useDebounce(search, 300)
  const queryClient = useQueryClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('leads')
        .select('*, customer:customers(id, name, phone, email, type, address, city, state, zip)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      return (data ?? []) as Lead[]
    },
    staleTime: 30_000,
  })

  const updateStageMutation = useMutation({
    mutationFn: async ({ leadId, stage, lostReason }: { leadId: string; stage: LeadStage; lostReason?: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('leads')
        .update({ stage, lost_reason: lostReason ?? null, updated_at: new Date().toISOString() })
        .eq('id', leadId)
      if (error) throw new Error(error.message)
      await supabase.from('activities').insert({
        user_id: user.id,
        lead_id: leadId,
        type: 'Stage Change',
        content: `Lead moved to ${stage}`,
      })
    },
    onError: (_err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.error('Failed to update stage')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveDragId(String(e.active.id))
  }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e
    setActiveDragId(null)
    if (!over) return

    const leadId = String(active.id)
    const newStage = String(over.id) as LeadStage
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stage === newStage || !STAGES.includes(newStage)) return

    // Optimistic update
    queryClient.setQueryData<Lead[]>(['leads'], old =>
      (old ?? []).map(l => l.id === leadId ? { ...l, stage: newStage } : l)
    )

    if (newStage === 'Won') {
      setWonLead({ ...lead, stage: newStage })
      updateStageMutation.mutate({ leadId: lead.id, stage: newStage })
    } else if (newStage === 'Lost') {
      setLostLead({ lead, prevStage: lead.stage })
    } else {
      updateStageMutation.mutate({ leadId, stage: newStage })
      toast.success(`Moved to ${newStage}`)
    }
  }, [leads, queryClient, updateStageMutation])

  const handleLostConfirm = (reason: string) => {
    if (!lostLead) return
    updateStageMutation.mutate({ leadId: lostLead.lead.id, stage: 'Lost', lostReason: reason })
    toast.success('Lead marked as lost')
    setLostLead(null)
  }

  const handleLostCancel = () => {
    if (lostLead) {
      // Revert optimistic update
      queryClient.setQueryData<Lead[]>(['leads'], old =>
        (old ?? []).map(l => l.id === lostLead.lead.id ? { ...l, stage: lostLead.prevStage } : l)
      )
    }
    setLostLead(null)
  }

  const filteredLeads = leads.filter(l => {
    const customer = l.customer as { name?: string } | null
    const matchSearch = !debouncedSearch ||
      l.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchSource = !filterSource || l.source === filterSource
    return matchSearch && matchSource
  })

  const activeDragLead = activeDragId ? leads.find(l => l.id === activeDragId) : null

  if (isLoading) return (
    <div className="p-4 md:p-6">
      <div className="h-8 mb-6 w-48 bg-[#252419] animate-pulse rounded" />
      <KanbanSkeleton />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Pipeline</h1>
          <p className="text-[#9a9585] text-sm">{leads.length} leads total</p>
        </div>
        <Button onClick={() => setAddLeadOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="bg-[#252419] border border-[#2e2d26] text-[#efeae2] placeholder-[#9a9585] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3] w-64"
        />
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="bg-[#252419] border border-[#2e2d26] text-[#efeae2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]"
        >
          <option value="">All Sources</option>
          {SOURCES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
          {STAGES.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={filteredLeads.filter(l => l.stage === stage)}
              borderColor={STAGE_BORDER_COLORS[stage]}
              headerColor={STAGE_HEADER_COLORS[stage]}
              onCardClick={lead => {
                setSelectedLead(lead)
                setDrawerOpen(true)
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragLead ? (
            <div className="opacity-80 rotate-2 scale-105">
              <LeadCard lead={activeDragLead} onClick={() => {}} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Drawers & Modals */}
      <LeadDrawer
        lead={selectedLead}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedLead(null)
        }}
      />

      <AddLeadDrawer open={addLeadOpen} onClose={() => setAddLeadOpen(false)} />

      <CreateProjectModal
        lead={wonLead}
        open={!!wonLead}
        onClose={() => setWonLead(null)}
      />

      <LostReasonModal
        open={!!lostLead}
        onClose={handleLostCancel}
        onConfirm={handleLostConfirm}
        loading={updateStageMutation.isPending}
      />
    </div>
  )
}
