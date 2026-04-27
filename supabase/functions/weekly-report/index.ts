import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? ''
const MASTER_ADMIN_EMAIL   = Deno.env.get('MASTER_ADMIN_EMAIL') ?? 'ikerms10@gmail.com'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt    = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

function weekLabel(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${from.toLocaleDateString('en-US', opts)} – ${to.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

// ─── Email delivery ───────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SkyGlobal CRM <reports@skyglobalsvcs.com>',
      to: [to],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend ${res.status}: ${body}`)
  }
}

// ─── Shared email CSS ─────────────────────────────────────────────────────────

const EMAIL_CSS = `
  body { font-family: Arial, sans-serif; background: #EDE7DB; margin: 0; padding: 20px; }
  .wrap { max-width: 620px; margin: 0 auto; background: #FEFCF8; border-radius: 12px; overflow: hidden; border: 1px solid #D5C9B8; }
  .hdr { background: #1C1209; padding: 28px 32px; display: flex; align-items: center; gap: 16px; }
  .hdr-logo { width: 52px; height: 52px; border-radius: 8px; object-fit: contain; background: #fff; padding: 4px; }
  .hdr-logo-placeholder { width: 52px; height: 52px; border-radius: 8px; background: #2D1F0E; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #D4A853; flex-shrink: 0; }
  .hdr-text h1 { color: #D4A853; margin: 0; font-size: 20px; line-height: 1.2; }
  .hdr-text p { color: #A07850; margin: 3px 0 0; font-size: 12px; }
  .body { padding: 24px 32px; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  .kpi { background: #F7F4EF; border-radius: 8px; padding: 14px 16px; border-left: 3px solid #8B6914; }
  .kpi.green { border-left-color: #4A6741; }
  .kpi.red { border-left-color: #B94A3A; }
  .kpi.blue { border-left-color: #3A5A8B; }
  .kpi .lbl { font-size: 10px; color: #A07850; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .kpi .val { font-size: 20px; font-weight: bold; color: #1C1209; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 12px; color: #1C1209; font-weight: bold; border-bottom: 1px solid #D5C9B8; padding-bottom: 6px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: #A07850; font-weight: 600; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; background: #F7F4EF; }
  td { padding: 7px 8px; border-bottom: 1px solid #EDE7DB; color: #3B2A1A; vertical-align: middle; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
  .badge-gold { background: #D4A853; color: #1C1209; }
  .badge-green { background: #4A6741; color: #fff; }
  .badge-red { background: #B94A3A; color: #fff; }
  .badge-blue { background: #3A5A8B; color: #fff; }
  .badge-grey { background: #A07850; color: #fff; }
  .alert-box { border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px; }
  .alert-yellow { background: #FFF8E1; border: 1px solid #D4A853; color: #7A5E1A; }
  .alert-red { background: #FFF0EE; border: 1px solid #B94A3A; color: #7A1A1A; }
  .footer { background: #F7F4EF; padding: 14px 32px; text-align: center; font-size: 10px; color: #A07850; border-top: 1px solid #D5C9B8; }
`

// ─── Per-tenant email ─────────────────────────────────────────────────────────

interface TenantStats {
  newLeads: number
  wonLeads: number
  revenue: number
  expenses: number
  proposalsSent: number
  activeProjects: number
  completedThisWeek: number
}

function buildTenantEmail(
  tenant: { business_name: string; business_logo_url: string | null },
  stats: TenantStats,
  label: string,
): string {
  const initials = tenant.business_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const logoHtml = tenant.business_logo_url
    ? `<img class="hdr-logo" src="${tenant.business_logo_url}" alt="${tenant.business_name}" />`
    : `<div class="hdr-logo-placeholder">${initials}</div>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${EMAIL_CSS}</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    ${logoHtml}
    <div class="hdr-text">
      <h1>${tenant.business_name}</h1>
      <p>Weekly CRM Report &mdash; ${label}</p>
    </div>
  </div>
  <div class="body">
    <div class="kpi-grid">
      <div class="kpi green"><div class="lbl">New Leads</div><div class="val">${stats.newLeads}</div></div>
      <div class="kpi green"><div class="lbl">Leads Won</div><div class="val">${stats.wonLeads}</div></div>
      <div class="kpi"><div class="lbl">Revenue (paid)</div><div class="val">${fmtInt(stats.revenue)}</div></div>
      <div class="kpi red"><div class="lbl">Expenses</div><div class="val">${fmtInt(stats.expenses)}</div></div>
      <div class="kpi blue"><div class="lbl">Proposals Sent</div><div class="val">${stats.proposalsSent}</div></div>
      <div class="kpi blue"><div class="lbl">Active Projects</div><div class="val">${stats.activeProjects}</div></div>
    </div>

    ${stats.completedThisWeek > 0 ? `
    <div class="alert-box alert-green" style="background:#F0F7EE;border:1px solid #4A6741;color:#1C3A18;">
      ✅ <strong>${stats.completedThisWeek}</strong> project${stats.completedThisWeek !== 1 ? 's' : ''} completed this week
    </div>` : ''}

    <p style="font-size:12px;color:#A07850;margin:0;">
      Net this week: <strong style="color:${stats.revenue - stats.expenses >= 0 ? '#4A6741' : '#B94A3A'};">${fmt(stats.revenue - stats.expenses)}</strong>
    </p>
  </div>
  <div class="footer">SkyGlobal CRM &middot; Automated Weekly Report &middot; Powered by skyglobalsvcs.com</div>
</div>
</body>
</html>`
}

// ─── Master summary email ─────────────────────────────────────────────────────

interface TenantSummary {
  tenant: {
    id: string
    business_name: string
    business_email: string | null
    status: string
    plan: string
  }
  stats: TenantStats
}

interface InactiveOwner {
  businessName: string
  email: string
  daysSinceLogin: number
}

interface ExpiringTrial {
  businessName: string
  email: string
  daysLeft: number
}

function buildMasterEmail(
  summaries: TenantSummary[],
  label: string,
  inactive: InactiveOwner[],
  expiring: ExpiringTrial[],
): string {
  const totals = summaries.reduce(
    (acc, { stats }) => ({
      newLeads:         acc.newLeads         + stats.newLeads,
      wonLeads:         acc.wonLeads         + stats.wonLeads,
      revenue:          acc.revenue          + stats.revenue,
      expenses:         acc.expenses         + stats.expenses,
      proposalsSent:    acc.proposalsSent    + stats.proposalsSent,
      activeProjects:   acc.activeProjects   + stats.activeProjects,
      completedThisWeek: acc.completedThisWeek + stats.completedThisWeek,
    }),
    { newLeads: 0, wonLeads: 0, revenue: 0, expenses: 0, proposalsSent: 0, activeProjects: 0, completedThisWeek: 0 },
  )

  const STATUS_BADGE: Record<string, string> = {
    active:    'badge-green',
    trial:     'badge-gold',
    suspended: 'badge-red',
    cancelled: 'badge-grey',
  }

  const breakdownRows = summaries.map(({ tenant, stats }) => `
    <tr>
      <td><strong>${tenant.business_name}</strong><br><span style="font-size:10px;color:#A07850;">${tenant.business_email ?? '—'}</span></td>
      <td style="text-align:center;"><span class="badge ${STATUS_BADGE[tenant.status] ?? 'badge-grey'}">${tenant.status}</span></td>
      <td style="text-align:center;">${stats.newLeads}</td>
      <td style="text-align:right;">${fmtInt(stats.revenue)}</td>
      <td style="text-align:center;">${stats.proposalsSent}</td>
      <td style="text-align:center;">${stats.activeProjects}</td>
      <td style="text-align:center;">${stats.completedThisWeek}</td>
    </tr>`).join('')

  const inactiveSection = inactive.length > 0 ? `
    <div class="section">
      <h2>⚠ Inactive Owners (7+ days no login)</h2>
      <div class="alert-box alert-yellow">
        ${inactive.map(o => `<div style="margin-bottom:4px;"><strong>${o.businessName}</strong> &mdash; ${o.email} &mdash; ${o.daysSinceLogin === 999 ? 'never logged in' : `${o.daysSinceLogin}d ago`}</div>`).join('')}
      </div>
    </div>` : ''

  const expiringSection = expiring.length > 0 ? `
    <div class="section">
      <h2>⏳ Trials Expiring This Week</h2>
      <div class="alert-box alert-red">
        ${expiring.map(t => `<div style="margin-bottom:4px;"><strong>${t.businessName}</strong> &mdash; ${t.email} &mdash; ${t.daysLeft === 0 ? 'expires today' : `${t.daysLeft}d left`}</div>`).join('')}
      </div>
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${EMAIL_CSS}</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-logo-placeholder" style="font-size:22px;">🛡</div>
    <div class="hdr-text">
      <h1>Master Admin Summary</h1>
      <p>Weekly CRM Report &mdash; ${label} &mdash; ${summaries.length} tenant${summaries.length !== 1 ? 's' : ''}</p>
    </div>
  </div>
  <div class="body">

    <div class="kpi-grid">
      <div class="kpi green"><div class="lbl">Total New Leads</div><div class="val">${totals.newLeads}</div></div>
      <div class="kpi green"><div class="lbl">Total Leads Won</div><div class="val">${totals.wonLeads}</div></div>
      <div class="kpi"><div class="lbl">Total Revenue</div><div class="val">${fmtInt(totals.revenue)}</div></div>
      <div class="kpi red"><div class="lbl">Total Expenses</div><div class="val">${fmtInt(totals.expenses)}</div></div>
      <div class="kpi blue"><div class="lbl">Proposals Sent</div><div class="val">${totals.proposalsSent}</div></div>
      <div class="kpi blue"><div class="lbl">Active Projects</div><div class="val">${totals.activeProjects}</div></div>
    </div>

    <div class="section">
      <h2>📊 Per-Business Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Business</th>
            <th style="text-align:center;">Status</th>
            <th style="text-align:center;">Leads</th>
            <th style="text-align:right;">Revenue</th>
            <th style="text-align:center;">Proposals</th>
            <th style="text-align:center;">Active</th>
            <th style="text-align:center;">Completed</th>
          </tr>
        </thead>
        <tbody>
          ${breakdownRows}
          <tr style="background:#F7F4EF;font-weight:bold;">
            <td>TOTAL</td>
            <td></td>
            <td style="text-align:center;">${totals.newLeads}</td>
            <td style="text-align:right;">${fmtInt(totals.revenue)}</td>
            <td style="text-align:center;">${totals.proposalsSent}</td>
            <td style="text-align:center;">${totals.activeProjects}</td>
            <td style="text-align:center;">${totals.completedThisWeek}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${inactiveSection}
    ${expiringSection}

  </div>
  <div class="footer">SkyGlobal CRM &middot; Master Admin Report &middot; skyglobalsvcs.com</div>
</div>
</body>
</html>`
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const today   = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoDate = weekAgo.toISOString().split('T')[0]
    const label = weekLabel(weekAgo, today)

    // 1. All active/trial tenants
    const { data: tenants, error: tenantsErr } = await db
      .from('tenants')
      .select('id, business_name, business_email, business_logo_url, status, plan, trial_ends_at, created_at, owner_id')
      .in('status', ['active', 'trial'])

    if (tenantsErr) throw tenantsErr
    if (!tenants?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No active tenants' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tenantIds = tenants.map(t => t.id)

    // 2. Batch-fetch all data across all tenants in parallel
    const [
      leadsRes,
      projectsRes,
      invoicesRes,
      expensesRes,
      proposalsRes,
      authRes,
    ] = await Promise.all([
      db.from('leads')
        .select('tenant_id, stage')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .gte('created_at', weekAgo.toISOString()),

      // All projects (no date filter) — need active count across all time
      db.from('projects')
        .select('tenant_id, status, created_at')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null),

      db.from('invoices')
        .select('tenant_id, total, status')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .gte('created_at', weekAgo.toISOString()),

      db.from('expenses')
        .select('tenant_id, amount')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .gte('date', weekAgoDate),

      db.from('proposals')
        .select('tenant_id')
        .in('tenant_id', tenantIds)
        .is('deleted_at', null)
        .gte('created_at', weekAgo.toISOString()),

      db.auth.admin.listUsers({ perPage: 1000 }),
    ])

    // 3. Build owner → last_sign_in_at map
    const lastLoginMap: Record<string, string | null> = {}
    for (const u of (authRes.data?.users ?? [])) {
      lastLoginMap[u.id] = u.last_sign_in_at ?? null
    }

    const leads     = leadsRes.data     ?? []
    const projects  = projectsRes.data  ?? []
    const invoices  = invoicesRes.data  ?? []
    const expenses  = expensesRes.data  ?? []
    const proposals = proposalsRes.data ?? []

    // 4. Process each tenant
    const summaries: TenantSummary[]  = []
    const inactive:  InactiveOwner[]  = []
    const expiring:  ExpiringTrial[]  = []
    const results: { tenant: string; ok: boolean; error?: string }[] = []

    for (const tenant of tenants) {
      const tLeads     = leads.filter(r => r.tenant_id === tenant.id)
      const tProjects  = projects.filter(r => r.tenant_id === tenant.id)
      const tInvoices  = invoices.filter(r => r.tenant_id === tenant.id)
      const tExpenses  = expenses.filter(r => r.tenant_id === tenant.id)
      const tProposals = proposals.filter(r => r.tenant_id === tenant.id)

      const stats: TenantStats = {
        newLeads:          tLeads.length,
        wonLeads:          tLeads.filter(l => l.stage === 'Won').length,
        revenue:           tInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0),
        expenses:          tExpenses.reduce((s, e) => s + (e.amount ?? 0), 0),
        proposalsSent:     tProposals.length,
        activeProjects:    tProjects.filter(p => ['Scheduled', 'In Progress'].includes(p.status)).length,
        completedThisWeek: tProjects.filter(p => p.status === 'Completed' && p.created_at >= weekAgo.toISOString()).length,
      }

      summaries.push({ tenant, stats })

      // Inactive owner check
      if (tenant.owner_id) {
        const last = lastLoginMap[tenant.owner_id]
        const daysSince = last
          ? Math.floor((today.getTime() - new Date(last).getTime()) / 86_400_000)
          : 999
        if (daysSince >= 7) {
          inactive.push({ businessName: tenant.business_name, email: tenant.business_email ?? '', daysSinceLogin: daysSince })
        }
      }

      // Expiring trial check — use trial_ends_at if set, else created_at + 14d
      if (tenant.status === 'trial') {
        const endsAt = tenant.trial_ends_at
          ? new Date(tenant.trial_ends_at)
          : (() => { const d = new Date(tenant.created_at); d.setDate(d.getDate() + 14); return d })()
        const daysLeft = Math.ceil((endsAt.getTime() - today.getTime()) / 86_400_000)
        if (daysLeft >= 0 && daysLeft <= 7) {
          expiring.push({ businessName: tenant.business_name, email: tenant.business_email ?? '', daysLeft })
        }
      }

      // Send per-tenant email (skip if no business_email)
      if (tenant.business_email) {
        try {
          const html    = buildTenantEmail(tenant, stats, label)
          const subject = `[${tenant.business_name}] Weekly CRM Report — Week of ${label}`
          await sendEmail(tenant.business_email, subject, html)
          results.push({ tenant: tenant.business_name, ok: true })
        } catch (err) {
          // Don't abort the whole run — log and continue
          results.push({ tenant: tenant.business_name, ok: false, error: String(err) })
        }
      } else {
        results.push({ tenant: tenant.business_name, ok: false, error: 'no business_email' })
      }
    }

    // 5. Send master summary to Iker
    const masterHtml    = buildMasterEmail(summaries, label, inactive, expiring)
    const masterSubject = `[Master] Weekly CRM Summary — ${label} (${tenants.length} tenants)`
    await sendEmail(MASTER_ADMIN_EMAIL, masterSubject, masterHtml)

    return new Response(
      JSON.stringify({ success: true, tenants: results, inactive: inactive.length, expiring: expiring.length }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
