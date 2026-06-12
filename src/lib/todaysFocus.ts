import { createClient } from '@/lib/supabase/client'

export interface FocusItem {
  id: string
  type: 'follow_up' | 'proposal_check' | 'job_starting' | 'collect_payment'
  priority: 'high' | 'medium' | 'low'
  title: string
  subtitle: string
  actionLabel: string
  actionRoute: string
  amount?: number
  daysOverdue?: number
}

export async function getTodaysFocusItems(): Promise<FocusItem[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const items: FocusItem[] = []
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString()
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString()
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]

  const [stuckLeads, unrespondedProposals, startingProjects, overdueInvoices] = await Promise.all([
    supabase.from('leads')
      .select('id, title, stage, estimated_value, updated_at')
      .not('stage', 'in', '("Won","Lost")')
      .is('deleted_at', null)
      .lt('updated_at', fiveDaysAgo)
      .order('updated_at', { ascending: true })
      .limit(3),

    supabase.from('proposals')
      .select('id, client_name, total_investment, created_at, viewed_at, status, share_token')
      .eq('status', 'Sent')
      .is('deleted_at', null)
      .lt('created_at', threeDaysAgo)
      .is('signed_at', null)
      .order('created_at', { ascending: true })
      .limit(3),

    supabase.from('projects')
      .select('id, title, start_date, contract_value')
      .gte('start_date', today)
      .lte('start_date', tomorrow)
      .eq('status', 'Scheduled')
      .is('deleted_at', null),

    supabase.from('invoices')
      .select('id, total, due_date, project_id, customer_id')
      .eq('status', 'sent')
      .lt('due_date', today)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(3),
  ])

  stuckLeads.data?.forEach(lead => {
    const days = Math.floor((now.getTime() - new Date(lead.updated_at ?? now).getTime()) / 86400000)
    items.push({
      id: `lead-${lead.id}`,
      type: 'follow_up',
      priority: days > 7 ? 'high' : 'medium',
      title: `Follow up: ${lead.title}`,
      subtitle: `${days} days in "${lead.stage}" — no recent activity`,
      actionLabel: 'View Lead',
      actionRoute: `/leads`,
      amount: lead.estimated_value ?? undefined,
    })
  })

  unrespondedProposals.data?.forEach(proposal => {
    const days = Math.floor((now.getTime() - new Date(proposal.created_at ?? now).getTime()) / 86400000)
    items.push({
      id: `proposal-${proposal.id}`,
      type: 'proposal_check',
      priority: 'medium',
      title: `Check in: ${proposal.client_name ?? 'Client'}`,
      subtitle: `Sent ${days} days ago — ${proposal.viewed_at ? 'viewed but not signed' : 'not viewed yet'}`,
      actionLabel: 'View Proposal',
      actionRoute: `/proposals`,
      amount: proposal.total_investment ?? undefined,
    })
  })

  startingProjects.data?.forEach(project => {
    const isToday = project.start_date === today
    items.push({
      id: `project-${project.id}`,
      type: 'job_starting',
      priority: 'high',
      title: `Job starting ${isToday ? 'today' : 'tomorrow'}: ${project.title}`,
      subtitle: isToday ? 'Make sure your crew and materials are ready' : 'Confirm with client tonight',
      actionLabel: 'View Project',
      actionRoute: `/projects`,
      amount: project.contract_value ?? undefined,
    })
  })

  overdueInvoices.data?.forEach(invoice => {
    const daysOverdue = Math.floor((now.getTime() - new Date(invoice.due_date ?? now).getTime()) / 86400000)
    items.push({
      id: `invoice-${invoice.id}`,
      type: 'collect_payment',
      priority: daysOverdue > 14 ? 'high' : 'medium',
      title: `Collect payment — ${(invoice.total ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}`,
      subtitle: `Invoice ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
      actionLabel: 'View Invoice',
      actionRoute: `/invoices`,
      amount: invoice.total ?? undefined,
      daysOverdue,
    })
  })

  return items.sort((a, b) => {
    const priorityWeight = { high: 0, medium: 1, low: 2 }
    const diff = priorityWeight[a.priority] - priorityWeight[b.priority]
    if (diff !== 0) return diff
    return (b.amount ?? 0) - (a.amount ?? 0)
  })
}
