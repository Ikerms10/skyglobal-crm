import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const REPORT_USER_ID = Deno.env.get('REPORT_USER_ID') ?? ''
const REPORT_EMAIL = Deno.env.get('REPORT_EMAIL') ?? ''

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    // Fetch data for this week
    const [projectsRes, leadsRes, expensesRes, projExpRes] = await Promise.all([
      supabase.from('projects')
        .select('id, title, contract_value, amount_paid, status, payment_status, customer_id, start_date, created_at')
        .eq('user_id', REPORT_USER_ID)
        .is('deleted_at', null),
      supabase.from('leads')
        .select('id, title, stage, estimated_value, created_at')
        .eq('user_id', REPORT_USER_ID)
        .is('deleted_at', null)
        .gte('created_at', weekAgo.toISOString()),
      supabase.from('expenses')
        .select('id, amount, category, date')
        .eq('user_id', REPORT_USER_ID)
        .is('deleted_at', null)
        .gte('date', weekAgoStr)
        .lte('date', todayStr),
      supabase.from('project_expenses')
        .select('id, amount, category, date')
        .eq('user_id', REPORT_USER_ID)
        .gte('date', weekAgoStr)
        .lte('date', todayStr),
    ])

    const projects = projectsRes.data ?? []
    const leads = leadsRes.data ?? []
    const expenses = expensesRes.data ?? []
    const projExp = projExpRes.data ?? []

    // This week stats
    const activeProjects = projects.filter(p => ['Scheduled', 'In Progress'].includes(p.status))
    const completedThisWeek = projects.filter(p =>
      p.status === 'Completed' && p.created_at >= weekAgo.toISOString()
    )
    const totalRevenue = projects
      .filter(p => ['In Progress', 'Completed'].includes(p.status))
      .reduce((s, p) => s + (p.contract_value ?? 0), 0)
    const weekExpenses = [...expenses, ...projExp].reduce((s, e) => s + e.amount, 0)
    const newLeads = leads.length
    const wonLeads = leads.filter(l => l.stage === 'Won').length
    const overduePayments = projects.filter(p => p.payment_status === 'Overdue').length

    const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const weekLabel = `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #EDE7DB; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #FEFCF8; border-radius: 12px; overflow: hidden; }
  .header { background: #1C1209; padding: 28px 32px; }
  .header h1 { color: #D4A853; margin: 0; font-size: 24px; }
  .header p { color: #A07850; margin: 4px 0 0; font-size: 13px; }
  .body { padding: 24px 32px; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .kpi { background: #F7F4EF; border-radius: 8px; padding: 14px 16px; border-left: 3px solid #8B6914; }
  .kpi .label { font-size: 11px; color: #A07850; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi .value { font-size: 20px; font-weight: bold; color: #1C1209; margin-top: 4px; }
  .kpi.red { border-left-color: #B94A3A; }
  .kpi.green { border-left-color: #4A6741; }
  .kpi.blue { border-left-color: #4A6741; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 13px; color: #1C1209; font-weight: bold; border-bottom: 1px solid #8B6914; padding-bottom: 6px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: #A07850; font-weight: 600; padding: 6px 8px; font-size: 11px; text-transform: uppercase; }
  td { padding: 7px 8px; border-bottom: 1px solid #EDE7DB; color: #3B2A1A; }
  .footer { background: #F7F4EF; padding: 16px 32px; text-align: center; font-size: 11px; color: #A07850; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
  .badge-gold { background: #D4A853; color: #1C1209; }
  .badge-green { background: #4A6741; color: #fff; }
  .badge-red { background: #B94A3A; color: #fff; }
  .badge-blue { background: #4A6741; color: #fff; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>📊 Weekly Business Report</h1>
    <p>${weekLabel}</p>
  </div>
  <div class="body">
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Total Revenue</div><div class="value">${fmt(totalRevenue)}</div></div>
      <div class="kpi red"><div class="label">This Week Expenses</div><div class="value">${fmt(weekExpenses)}</div></div>
      <div class="kpi blue"><div class="label">Active Projects</div><div class="value">${activeProjects.length}</div></div>
      <div class="kpi green"><div class="label">New Leads</div><div class="value">${newLeads}</div></div>
      <div class="kpi green"><div class="label">Won This Week</div><div class="value">${wonLeads}</div></div>
      <div class="kpi red"><div class="label">Overdue Payments</div><div class="value">${overduePayments}</div></div>
    </div>

    ${activeProjects.length > 0 ? `
    <div class="section">
      <h2>🔨 Active Projects</h2>
      <table>
        <tr><th>Project</th><th>Status</th><th>Value</th></tr>
        ${activeProjects.slice(0, 10).map(p => `
        <tr>
          <td>${p.title}</td>
          <td><span class="badge badge-blue">${p.status}</span></td>
          <td>${fmt(p.contract_value ?? 0)}</td>
        </tr>`).join('')}
      </table>
    </div>` : ''}

    ${leads.length > 0 ? `
    <div class="section">
      <h2>🎯 New Leads This Week</h2>
      <table>
        <tr><th>Lead</th><th>Stage</th><th>Value</th></tr>
        ${leads.slice(0, 10).map(l => `
        <tr>
          <td>${l.title}</td>
          <td><span class="badge ${l.stage === 'Won' ? 'badge-green' : l.stage === 'Lost' ? 'badge-red' : 'badge-blue'}">${l.stage}</span></td>
          <td>${l.estimated_value ? fmt(l.estimated_value) : '—'}</td>
        </tr>`).join('')}
      </table>
    </div>` : ''}
  </div>
  <div class="footer">SkyGlobal Renovations CRM · Automated Weekly Report</div>
</div>
</body>
</html>`

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SkyGlobal CRM <reports@skyglobalsvcs.com>',
        to: REPORT_EMAIL.split(',').map(e => e.trim()).filter(Boolean),
        subject: `📊 Weekly Business Report — ${weekLabel}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, sent_to: REPORT_EMAIL.split(',').map(e => e.trim()).filter(Boolean) }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
