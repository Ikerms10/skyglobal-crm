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
import { Plus, Search, Filter } from 'lucide-react'
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

const STAGES: LeadStage[] = ['New Lead', 'Estimate Sent', 'Follow-up', 'Won', 'Lost', 'On Hold']
const SOURCES: LeadSource[] = ['Thumbtack', 'Referral', 'Google', 'Instagram', 'Door Knock', 'Facebook', 'Yelp', 'Other']

const STAGE_CONFIG: Record<LeadStage, { border: string; headerColor: string; glow: string }> = {
  'New Lead':      { border: 'rgba(122,158,126,0.4)', headerColor: '#7A9E7E', glow: 'rgba(122,158,126,0.10)' },
  'Estimate Sent': { border: 'rgba(139,105,20,0.4)',  headerColor: '#8B6914', glow: 'rgba(139,105,20,0.08)' },
  'Follow-up':     { border: 'rgba(160,120,80,0.4)',  headerColor: '#A07850', glow: 'rgba(160,120,80,0.08)' },
  'Won':           { border: 'rgba(74,103,65,0.5)',   headerColor: '#4A6741', glow: 'rgba(74,103,65,0.12)' },
  'Lost':          { border: 'rgba(185,74,58,0.3)',   headerColor: '#B94A3A', glow: 'rgba(185,74,58,0.04)' },
  'On Hold':       { border: 'rgba(207,196,180,0.4)', headerColor: '#CFC4B4', glow: 'rgba(207,196,180,0.06)' },
}

function KanbanColumn({
  stage,
  leads,
  onCardClick,
}: {
  stage: LeadStage
  leads: Lead[]
  onCardClick: (lead: Lead) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0)
  const isWon = stage === 'Won'
  const isLost = stage === 'Lost'

  return (
    <div
      style={{
        flexShrink: 0,
        width: 280,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 200,
        background: isOver ? 'var(--c-sidebar-hover)' : 'var(--c-nested)',
        border: '1px solid var(--c-border)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
        boxShadow: isWon ? '0 0 0 1.5px var(--c-sage), var(--s-card)' : 'var(--s-card)',
        opacity: isLost ? 0.75 : 1,
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '10px 12px 8px',
        background: 'var(--c-sidebar)',
        borderBottom: '1px solid var(--c-border)',
        borderTop: isWon ? '3px solid var(--c-sage)' : isLost ? '3px solid var(--c-danger)' : '3px solid transparent',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <h3 style={{
            fontSize: 12,
            fontWeight: 700,
            color: isWon ? 'var(--c-sage)' : isLost ? 'var(--c-danger)' : 'var(--c-text-1)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            {stage}
          </h3>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 99,
            background: 'var(--c-sidebar-active)',
            color: 'var(--c-text-2)',
          }}>
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p style={{
            fontSize: 11,
            color: 'var(--c-gold)',
            fontFamily: "'DM Mono', monospace",
            margin: 0,
          }}>
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, padding: 10 }}>
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={onCardClick} />
        ))}
      </div>
    </div>
  )
}

type FilterMode = 'all' | 'overdue' | 'high-value'

export default function LeadsPage() {
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
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
    onError: () => {
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
      queryClient.setQueryData<Lead[]>(['leads'], old =>
        (old ?? []).map(l => l.id === lostLead.lead.id ? { ...l, stage: lostLead.prevStage } : l)
      )
    }
    setLostLead(null)
  }

  const today = new Date().toISOString().split('T')[0]

  const filteredLeads = leads.filter(l => {
    const customer = l.customer as { name?: string } | null
    const matchSearch = !debouncedSearch ||
      l.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchSource = !filterSource || l.source === filterSource
    const matchMode =
      filterMode === 'all' ? true
      : filterMode === 'overdue' ? (l.follow_up_date != null && l.follow_up_date < today && !['Won', 'Lost'].includes(l.stage))
      : filterMode === 'high-value' ? (l.estimated_value != null && l.estimated_value >= 5000)
      : true
    return matchSearch && matchSource && matchMode
  })

  const totalPipelineValue = leads
    .filter(l => !['Won', 'Lost'].includes(l.stage))
    .reduce((s, l) => s + (l.estimated_value ?? 0), 0)

  const activeDragLead = activeDragId ? leads.find(l => l.id === activeDragId) : null

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ height: 32, marginBottom: 24, width: 192, background: 'var(--sg-bg-elevated)', borderRadius: 6 }} className="animate-pulse" />
        <KanbanSkeleton />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', minHeight: '100%' }}>

      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 20px',
          marginBottom: 20,
          borderRadius: 12,
          background: 'var(--c-card)',
          border: '1px solid var(--c-border)',
          boxShadow: 'var(--s-card)',
        }}
      >
        <div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--c-text-1)',
            margin: 0,
          }}>
            Pipeline
          </h1>
          <p style={{ fontSize: 12, color: 'var(--c-text-3)', margin: '2px 0 0' }}>
            <span style={{ color: 'var(--c-gold)', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{formatCurrency(totalPipelineValue)}</span>
            {' '}active &middot; {leads.length} leads
          </p>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'overdue', 'high-value'] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: `1px solid ${filterMode === mode ? 'var(--c-gold-border)' : 'var(--c-border)'}`,
                background: filterMode === mode ? 'var(--c-gold-bg)' : 'var(--c-sidebar)',
                color: filterMode === mode ? 'var(--c-gold)' : 'var(--c-text-3)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 150ms, color 150ms, border-color 150ms',
              }}
            >
              {mode === 'all' ? 'All' : mode === 'overdue' ? 'Overdue' : 'High Value'}
            </button>
          ))}
        </div>

        {/* Search + Add */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--c-text-4)',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              aria-label="Search leads"
              style={{
                background: 'var(--c-nested)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-1)',
                borderRadius: 8,
                paddingLeft: 30,
                paddingRight: 12,
                paddingTop: 7,
                paddingBottom: 7,
                fontSize: 13,
                width: 200,
                outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-sage-soft)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
            />
          </div>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            aria-label="Filter by source"
            style={{
              background: 'var(--c-nested)',
              border: '1px solid var(--c-border)',
              color: filterSource ? 'var(--c-text-1)' : 'var(--c-text-3)',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button
            onClick={() => setAddLeadOpen(true)}
            style={{
              background: 'var(--c-sage)',
              border: 'none',
              color: '#FEFCF8',
              fontSize: 13,
            }}
          >
            <Plus size={14} aria-hidden="true" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 24,
            minHeight: 600,
          }}
        >
          {STAGES.filter(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage)
            return stage === 'New Lead' || stageLeads.length > 0
          }).map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={filteredLeads.filter(l => l.stage === stage)}
              onCardClick={lead => {
                setSelectedLead(lead)
                setDrawerOpen(true)
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragLead ? (
            <LeadCard lead={activeDragLead} onClick={() => {}} isDragOverlay />
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
