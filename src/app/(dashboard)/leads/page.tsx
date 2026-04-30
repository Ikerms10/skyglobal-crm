'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
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
import { Plus, Search, List, Columns, Users } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { fireWinConfetti } from '@/lib/confetti'
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
import { useLanguage } from '@/contexts/LanguageContext'

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
  proposalMap,
  activityMap,
}: {
  stage: LeadStage
  leads: Lead[]
  onCardClick: (lead: Lead) => void
  proposalMap: Record<string, number>
  activityMap: Record<string, string>
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
        {leads.map(lead => {
          const customer = lead.customer as { id?: string } | null
          return (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={onCardClick}
              proposalValue={customer?.id ? (proposalMap[customer.id] ?? null) : null}
              lastActivity={activityMap[lead.id] ?? null}
            />
          )
        })}
      </div>
    </div>
  )
}

type FilterMode = 'all' | 'overdue' | 'high-value'
type ViewMode = 'board' | 'list'

function LeadListView({
  leads,
  onCardClick,
  proposalMap,
  activityMap,
}: {
  leads: Lead[]
  onCardClick: (lead: Lead) => void
  proposalMap: Record<string, number>
  activityMap: Record<string, string>
}) {
  const grouped = STAGES.map(stage => ({
    stage,
    items: leads.filter(l => l.stage === stage),
  })).filter(g => g.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {grouped.map(({ stage, items }) => {
        const stageConfig = STAGE_CONFIG[stage]
        return (
          <div key={stage}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: stageConfig.headerColor,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: "'DM Mono', monospace",
              }}>
                {stage}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 99,
                background: 'var(--c-sidebar-active)',
                color: 'var(--c-text-3)',
              }}>
                {items.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(lead => {
                const customer = lead.customer as { id?: string; name?: string; phone?: string; type?: string } | null
                return (
                  <div
                    key={lead.id}
                    onClick={() => onCardClick(lead)}
                    style={{
                      background: 'var(--c-card)',
                      border: '1px solid var(--c-border-light)',
                      borderLeft: `3px solid ${stageConfig.headerColor}`,
                      borderRadius: 10,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'background 150ms, box-shadow 150ms',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.background = 'var(--c-card-hover)'
                      el.style.boxShadow = 'var(--s-card-hover)'
                      el.style.borderLeftColor = '#e6ab35'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.background = 'var(--c-card)'
                      el.style.boxShadow = 'none'
                      el.style.borderLeftColor = stageConfig.headerColor
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {customer?.name ?? lead.title}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--c-text-4)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.title}
                      </p>
                      {activityMap[lead.id] && (
                        <p style={{ fontSize: 10, color: 'var(--c-text-4)', margin: '2px 0 0', fontFamily: "'DM Mono', monospace" }}>
                          Last: {activityMap[lead.id]}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {lead.estimated_value != null && lead.estimated_value > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-gold)', fontFamily: "'DM Mono', monospace" }}>
                          {formatCurrency(lead.estimated_value)}
                        </span>
                      )}
                      {customer?.id && proposalMap[customer.id] && (
                        <span style={{ fontSize: 10, color: 'var(--c-sage)', fontFamily: "'DM Mono', monospace" }}>
                          Proposal: {formatCurrency(proposalMap[customer.id])}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function LeadsPage() {
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('board')

  useEffect(() => {
    if (window.innerWidth < 768) setViewMode('list')
  }, [])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [wonLead, setWonLead] = useState<Lead | null>(null)
  const [lostLead, setLostLead] = useState<{ lead: Lead; prevStage: LeadStage } | null>(null)
  const debouncedSearch = useDebounce(search, 300)
  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const [debugInfo, setDebugInfo] = useState<string>('initializing...')

  const { data: leads = [], isLoading, error: leadsError } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        const msg = `AUTH ERROR: ${authError.message}`
        setDebugInfo(msg)
        console.error('[Leads]', msg)
        return []
      }
      if (!user) {
        setDebugInfo('NO USER — auth.getUser() returned null')
        console.error('[Leads] No authenticated user found')
        return []
      }
      setDebugInfo(`User: ${user.email} (${user.id.substring(0,8)}...) — querying leads...`)
      const { data, error, status, statusText } = await supabase
        .from('leads')
        .select('*, customer:customers(id, name, phone, email, type, address, city, state, zip)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) {
        const msg = `QUERY ERROR: ${error.message} | code=${error.code} | details=${error.details} | hint=${error.hint} | status=${status}`
        setDebugInfo(msg)
        console.error('[Leads]', msg)
        toast.error(`Failed to load leads: ${error.message}`)
        return []
      }
      const msg = `✅ Loaded ${data?.length ?? 0} leads (HTTP ${status})`
      setDebugInfo(msg)
      console.log('[Leads]', msg)
      return (data ?? []) as Lead[]
    },
    staleTime: 30_000,
    retry: false,
  })

  const { data: proposalMap = {} } = useQuery({
    queryKey: ['proposal-values'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return {}
      const { data } = await supabase
        .from('proposals')
        .select('customer_id, total_investment')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      const map: Record<string, number> = {}
      for (const p of data ?? []) {
        if (p.customer_id && !map[p.customer_id] && p.total_investment)
          map[p.customer_id] = p.total_investment
      }
      return map
    },
    staleTime: 60_000,
  })

  const { data: activityMap = {} } = useQuery({
    queryKey: ['lead-last-activities'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return {}
      const { data } = await supabase
        .from('activities')
        .select('lead_id, type')
        .not('lead_id', 'is', null)
        .order('created_at', { ascending: false })
      const map: Record<string, string> = {}
      for (const a of data ?? []) {
        if (a.lead_id && !map[a.lead_id]) map[a.lead_id] = a.type
      }
      return map
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
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
      fireWinConfetti()
      toast.success(t('leads.won'))
    } else if (newStage === 'Lost') {
      setLostLead({ lead, prevStage: lead.stage })
    } else {
      updateStageMutation.mutate({ leadId, stage: newStage })
      toast.success(t('leads.movedTo', { stage: newStage }))
    }
  }, [leads, queryClient, updateStageMutation])

  const handleLostConfirm = (reason: string) => {
    if (!lostLead) return
    updateStageMutation.mutate({ leadId: lostLead.lead.id, stage: 'Lost', lostReason: reason })
    toast.success(t('leads.markedLost'))
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

  const totalOpenValue = leads
    .filter(l => !['Won', 'Lost'].includes(l.stage))
    .reduce((s, l) => s + (l.estimated_value ?? 0), 0)

  const totalWonValue = leads
    .filter(l => l.stage === 'Won')
    .reduce((s, l) => s + (l.estimated_value ?? 0), 0)

  const activeDragLead = activeDragId ? leads.find(l => l.id === activeDragId) : null

  const boardRef = useRef<HTMLDivElement>(null)
  const [scrolledRight, setScrolledRight] = useState(false)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const onScroll = () => {
      setScrolledRight(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ height: 32, marginBottom: 24, width: 192, background: 'var(--sg-bg-elevated)', borderRadius: 6 }} className="animate-pulse" />
        <KanbanSkeleton />
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(12px, 4vw, 24px)', minHeight: '100%' }}>

      {/* TEMPORARY DEBUG BANNER — REMOVE AFTER FIXING */}
      <div style={{ background: '#1a1a2e', border: '2px solid #e94560', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontFamily: 'monospace', fontSize: 13, color: '#e94560' }}>
        <strong>🔍 DEBUG:</strong> {debugInfo} | leads.length={leads.length} | isLoading={String(isLoading)} | error={leadsError ? String(leadsError) : 'none'}
      </div>

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
            {t('leads.title')}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--c-text-3)', margin: '2px 0 0' }}>
            <span style={{ color: 'var(--c-gold)', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{formatCurrency(totalOpenValue)}</span>
            {' '}open
            {totalWonValue > 0 && (
              <> &middot; <span style={{ color: 'var(--c-sage)', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{formatCurrency(totalWonValue)}</span> won</>
            )}
            {' '}&middot; {leads.length} leads
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
              {mode === 'all' ? t('leads.filterAll') : mode === 'overdue' ? t('leads.filterOverdue') : t('leads.filterHighValue')}
            </button>
          ))}
        </div>

        {/* Search + Add */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
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
              placeholder={t('leads.searchPlaceholder')}
              aria-label={t('leads.searchPlaceholder')}
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
                width: '100%',
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
            <option value="">{t('leads.allSources')}</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* List / Board toggle */}
          <div style={{ display: 'flex', background: 'var(--c-nested)', border: '1px solid var(--c-border)', borderRadius: 8, padding: 2, gap: 2 }}>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: viewMode === 'list' ? 'var(--c-gold)' : 'transparent',
                color: viewMode === 'list' ? 'var(--c-text-on-gold)' : 'var(--c-text-3)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              <List size={13} aria-hidden="true" /> {t('leads.listView')}
            </button>
            <button
              onClick={() => setViewMode('board')}
              aria-label="Board view"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: viewMode === 'board' ? 'var(--c-gold)' : 'transparent',
                color: viewMode === 'board' ? 'var(--c-text-on-gold)' : 'var(--c-text-3)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              <Columns size={13} aria-hidden="true" /> {t('leads.boardView')}
            </button>
          </div>

          <Button
            onClick={() => setAddLeadOpen(true)}
            style={{
              background: 'var(--c-sage)',
              border: 'none',
              color: '#FEFCF8',
              fontSize: 13,
            }}
          >
            <Plus size={14} aria-hidden="true" /> {t('leads.addLead')}
          </Button>
        </div>
      </div>

      {/* Empty state when no leads at all */}
      {leads.length === 0 && (
        <EmptyState
          icon={Users}
          title={t('leads.noLeads')}
          description={t('leads.noLeadsDesc')}
          action={{ label: `+ ${t('leads.addLead')}`, onClick: () => setAddLeadOpen(true) }}
        />
      )}

      {/* List view */}
      {leads.length > 0 && viewMode === 'list' && (
        <LeadListView
          leads={filteredLeads}
          onCardClick={lead => {
            setSelectedLead(lead)
            setDrawerOpen(true)
          }}
          proposalMap={proposalMap}
          activityMap={activityMap}
        />
      )}

      {/* Kanban board */}
      {leads.length > 0 && viewMode === 'board' && <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ position: 'relative' }}>
          {/* Right-edge scroll fade */}
          {!scrolledRight && (
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 24, width: 60, zIndex: 10,
              background: 'linear-gradient(to right, transparent, var(--c-canvas))',
              pointerEvents: 'none',
            }} aria-hidden="true" />
          )}
        <div
          ref={boardRef}
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
              proposalMap={proposalMap}
              activityMap={activityMap}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragLead ? (
            <LeadCard
              lead={activeDragLead}
              onClick={() => {}}
              isDragOverlay
              proposalValue={(activeDragLead.customer as { id?: string } | null)?.id
                ? (proposalMap[(activeDragLead.customer as { id: string }).id] ?? null)
                : null}
              lastActivity={activityMap[activeDragLead.id] ?? null}
            />
          ) : null}
        </DragOverlay>
        </div>{/* end relative wrapper */}
      </DndContext>}

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
