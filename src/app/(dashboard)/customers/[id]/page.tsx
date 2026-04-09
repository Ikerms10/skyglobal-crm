'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Customer, Lead, Project, Activity, ProjectPhoto } from '@/types'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge, StageBadge, StatusBadge, PaymentBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddLeadDrawer } from '@/components/leads/AddLeadDrawer'
import { toast } from 'sonner'
import { Phone, Mail, MapPin, Tag, Plus, Edit2, Check, X, Building2, Briefcase, Target, Activity as ActivityIcon, Image } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { AddActivityModal } from '@/components/customers/AddActivityModal'

const ACTIVITY_ICONS: Record<string, string> = {
  'Call': '📞', 'Text': '💬', 'Email': '📧', 'Visit': '🏠',
  'Note': '📝', 'Stage Change': '🔄', 'Payment Received': '💰',
  'Photo Added': '📷', 'Estimate Sent': '📋',
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [editingTags, setEditingTags] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [addActivityOpen, setAddActivityOpen] = useState(false)

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('customers').select('*').eq('id', id).single()
      return data as Customer | null
    },
  })

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['customer-projects', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('projects')
        .select('*').eq('customer_id', id).is('deleted_at', null)
        .order('created_at', { ascending: false })
      return (data ?? []) as Project[]
    },
  })

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['customer-leads', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('leads')
        .select('*').eq('customer_id', id).is('deleted_at', null)
        .order('created_at', { ascending: false })
      return (data ?? []) as Lead[]
    },
  })

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['customer-activities', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('activities')
        .select('*').eq('customer_id', id)
        .order('created_at', { ascending: false })
      return (data ?? []) as Activity[]
    },
  })

  const { data: photos = [] } = useQuery({
    queryKey: ['customer-photos', id],
    queryFn: async () => {
      const supabase = createClient()
      const projectIds = projects.map(p => p.id)
      if (!projectIds.length) return []
      const { data } = await supabase.from('project_photos')
        .select('*').in('project_id', projectIds)
        .order('uploaded_at', { ascending: false })
      return (data ?? []) as ProjectPhoto[]
    },
    enabled: projects.length > 0,
  })

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const supabase = createClient()
      const { error } = await supabase.from('customers').update({ tags }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      toast.success('Tags updated')
      setEditingTags(false)
    },
  })

  const addTag = () => {
    if (!tagInput.trim() || !customer) return
    const newTags = [...(customer.tags ?? []), tagInput.trim()]
    updateTagsMutation.mutate(newTags)
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    if (!customer) return
    updateTagsMutation.mutate((customer.tags ?? []).filter(t => t !== tag))
  }

  const totalRevenue = projects.reduce((sum, p) => sum + (p.contract_value ?? 0), 0)
  const completedProjects = projects.filter(p => p.status === 'Completed').length

  if (loadingCustomer) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  if (!customer) return <div className="p-6 text-slate-400">Customer not found.</div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <Avatar name={customer.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
              <Badge variant={customer.type === 'Commercial' ? 'purple' : 'info'}>{customer.type}</Badge>
            </div>
            {customer.company_name && (
              <div className="flex items-center gap-1 text-slate-400 text-sm mb-2">
                <Building2 className="h-4 w-4" />{customer.company_name}
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-sky-400 transition-colors">
                  <Phone className="h-4 w-4" />{customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-sky-400 transition-colors">
                  <Mail className="h-4 w-4" />{customer.email}
                </a>
              )}
              {customer.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="h-4 w-4 text-slate-500" />
              {customer.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-[#2a2d3a] text-slate-300 rounded-full">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {editingTags ? (
                <div className="flex items-center gap-1">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    placeholder="Add tag..."
                    className="text-xs bg-[#0f1117] border border-[#2a2d3a] text-white rounded px-2 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    autoFocus
                  />
                  <button onClick={addTag} className="text-green-400"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingTags(false)} className="text-slate-400"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button onClick={() => setEditingTags(true)} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add tag
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex md:flex-col gap-4 md:text-right">
            <div>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-slate-400">Lifetime revenue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completedProjects}</p>
              <p className="text-xs text-slate-400">Completed jobs</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#2a2d3a]">
          {customer.phone && (
            <a href={`tel:${customer.phone}`}>
              <Button size="sm" variant="secondary"><Phone className="h-4 w-4" /> Call</Button>
            </a>
          )}
          {customer.phone && (
            <a href={`sms:${customer.phone}`}>
              <Button size="sm" variant="secondary">💬 Text</Button>
            </a>
          )}
          <Button size="sm" variant="secondary" onClick={() => setAddActivityOpen(true)}>
            <Plus className="h-4 w-4" /> Add Note
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setAddLeadOpen(true)}>
            <Target className="h-4 w-4" /> New Lead
          </Button>
          <Link href={`/customers/${id}/projects/new`}>
            <Button size="sm"><Briefcase className="h-4 w-4" /> New Project</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-green-400' },
              { label: 'Active Projects', value: String(projects.filter(p => ['Scheduled','In Progress'].includes(p.status)).length), color: 'text-sky-400' },
              { label: 'Total Leads', value: String(leads.length), color: 'text-purple-400' },
              { label: 'Won Leads', value: String(leads.filter(l => l.stage === 'Won').length), color: 'text-green-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          {customer.notes && (
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
          {customer.referred_by && (
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Referred by</p>
              <p className="text-sm text-slate-300">{customer.referred_by}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          {loadingProjects ? <TableSkeleton /> : projects.length === 0 ? (
            <EmptyState icon={Briefcase} title="No projects yet" description="Projects appear here when a lead is won." />
          ) : (
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2d3a]">
                    {['Title', 'Status', 'Type', 'Contract', 'Payment', 'Dates'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id} className="border-b border-[#2a2d3a] hover:bg-[#0f1117] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/customers/${id}/projects/${p.id}`} className="text-sm font-medium text-white hover:text-sky-400 transition-colors">
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3"><Badge variant={p.type === 'Commercial' ? 'purple' : 'info'}>{p.type}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{formatCurrency(p.contract_value)}</td>
                      <td className="px-4 py-3"><PaymentBadge status={p.payment_status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(p.start_date)} → {formatDate(p.end_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          {loadingLeads ? <TableSkeleton /> : leads.length === 0 ? (
            <EmptyState icon={Target} title="No leads" description="No leads linked to this customer." action={{ label: 'Add Lead', onClick: () => setAddLeadOpen(true) }} />
          ) : (
            <div className="space-y-2">
              {leads.map(l => (
                <div key={l.id} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{l.title}</p>
                    <p className="text-xs text-slate-400">{l.source} · {formatDate(l.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {l.estimated_value && <span className="text-sm text-green-400 font-medium">{formatCurrency(l.estimated_value)}</span>}
                    <StageBadge stage={l.stage} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          {loadingActivities ? <TableSkeleton /> : activities.length === 0 ? (
            <EmptyState icon={ActivityIcon} title="No activity" description="Activity will appear here as you interact with this customer." action={{ label: 'Add Note', onClick: () => setAddActivityOpen(true) }} />
          ) : (
            <div className="space-y-1">
              {activities.map((a, i) => (
                <div key={a.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#2a2d3a] flex items-center justify-center text-sm flex-shrink-0">
                      {ACTIVITY_ICONS[a.type] ?? '📋'}
                    </div>
                    {i < activities.length - 1 && <div className="w-0.5 bg-[#2a2d3a] flex-1 my-1" />}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{a.type}</p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{formatRelativeTime(a.created_at)}</span>
                    </div>
                    {a.content && <p className="text-sm text-slate-400 mt-0.5">{a.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          {photos.length === 0 ? (
            <EmptyState icon={Image} title="No photos" description="Photos will appear here as you upload them to projects." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map(photo => (
                <div key={photo.id} className="relative group">
                  <img src={photo.url} alt={photo.label ?? 'Project photo'} className="w-full h-40 object-cover rounded-lg" />
                  {photo.label && (
                    <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded font-medium ${
                      photo.label === 'Before' ? 'bg-yellow-500 text-black' :
                      photo.label === 'During' ? 'bg-blue-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>{photo.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddLeadDrawer open={addLeadOpen} onClose={() => setAddLeadOpen(false)} />
      <AddActivityModal
        open={addActivityOpen}
        onClose={() => setAddActivityOpen(false)}
        customerId={id}
      />
    </div>
  )
}
