import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  let body: { proposalId: string; tenantId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { proposalId, tenantId } = body
  if (!proposalId || !tenantId) {
    return NextResponse.json({ error: 'proposalId and tenantId required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch the full proposal — must belong to this tenant
  const { data: proposal, error: proposalErr } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single()

  if (proposalErr || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  // Idempotent — if project already created, just return it
  if (proposal.project_id) {
    return NextResponse.json({ success: true, projectId: proposal.project_id, customerId: proposal.customer_id, alreadyProcessed: true })
  }

  const now = new Date().toISOString()

  // ── STEP 1: Find or create customer ──────────────────────────────────────
  let customerId: string = proposal.customer_id ?? null

  if (!customerId) {
    const clientName = proposal.client_name ?? ''
    if (!clientName) {
      return NextResponse.json({ error: 'Proposal has no client_name — cannot create customer' }, { status: 422 })
    }

    // Search by name within tenant (case-insensitive)
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', clientName)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenantId,
          user_id: proposal.user_id,
          name: clientName,
          phone: null,
          email: null,
          address: proposal.client_address ?? null,
          notes: `Auto-created from approved proposal ${proposalId.slice(0, 8)}`,
          type: 'Residential',
          tags: [],
        })
        .select('id')
        .single()

      if (custErr || !newCustomer) {
        return NextResponse.json({ error: `Failed to create customer: ${custErr?.message}` }, { status: 500 })
      }
      customerId = newCustomer.id
    }
  }

  // ── STEP 2: Create the project ────────────────────────────────────────────
  const projectTitle = proposal.project_name ?? `${proposal.client_name ?? 'Client'} Project`

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      tenant_id: tenantId,
      user_id: proposal.user_id,
      customer_id: customerId,
      proposal_id: proposalId,
      lead_id: proposal.lead_id ?? null,
      title: projectTitle,
      address: proposal.client_address ?? '',
      status: 'Scheduled',
      type: 'Residential',
      contract_value: proposal.total_investment ?? 0,
      amount_paid: 0,
      payment_status: 'Unpaid',
      description: `Created from approved proposal. Client: ${proposal.client_name ?? '—'}`,
    })
    .select('id')
    .single()

  if (projErr || !project) {
    return NextResponse.json({ error: `Failed to create project: ${projErr?.message}` }, { status: 500 })
  }

  // ── STEP 3: Update proposal — mark Accepted, link customer + project ──────
  await supabase
    .from('proposals')
    .update({
      status: 'Accepted',
      approved_at: now,
      customer_id: customerId,
      project_id: project.id,
    })
    .eq('id', proposalId)

  // ── STEP 4: Update lead — mark Won, record conversion ────────────────────
  if (proposal.lead_id) {
    await supabase
      .from('leads')
      .update({
        stage: 'Won',
        converted_at: now,
        converted_to_customer_id: customerId,
        converted_to_project_id: project.id,
      })
      .eq('id', proposal.lead_id)
      .eq('tenant_id', tenantId)
  }

  // ── STEP 5: Activity log ──────────────────────────────────────────────────
  const activityRows = [
    {
      tenant_id: tenantId,
      user_id: proposal.user_id,
      customer_id: customerId,
      lead_id: proposal.lead_id ?? null,
      project_id: project.id,
      type: 'Stage Change',
      content: `Proposal approved — project "${projectTitle}" created (${proposal.total_investment != null ? `$${proposal.total_investment.toLocaleString()}` : '—'})`,
    },
  ]

  if (proposal.lead_id) {
    activityRows.push({
      tenant_id: tenantId,
      user_id: proposal.user_id,
      customer_id: customerId,
      lead_id: proposal.lead_id,
      project_id: project.id,
      type: 'Stage Change',
      content: `Lead converted to Won — ${proposal.client_name ?? 'client'} approved proposal`,
    })
  }

  await supabase.from('activities').insert(activityRows)

  // ── STEP 6: Notification ──────────────────────────────────────────────────
  const amount = proposal.total_investment ?? 0
  await supabase.from('notifications').insert({
    tenant_id: tenantId,
    user_id: proposal.user_id,
    type: 'proposal_approved',
    title: '🎉 Proposal Approved!',
    body: `${proposal.client_name ?? 'Client'} approved the ${amount > 0 ? `$${amount.toLocaleString()}` : ''} proposal. Project created.`,
    resource_type: 'proposal',
    resource_id: proposalId,
    action_url: `/customers/${customerId}/projects/${project.id}`,
    icon: 'check-circle',
  })

  return NextResponse.json({
    success: true,
    projectId: project.id,
    customerId,
  })
}
