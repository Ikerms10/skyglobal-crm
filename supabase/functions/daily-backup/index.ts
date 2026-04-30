// Supabase Edge Function — daily-backup
// Schedule: '0 10 * * *' (5:00 AM EST = 10:00 AM UTC daily)
// Deploy: supabase functions deploy daily-backup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TENANT_TABLES = [
  'customers',
  'leads',
  'projects',
  'proposals',
  'invoices',
  'expenses',
  'project_expenses',
  'activities',
  'project_line_items',
  'tenant_integrations',
] as const

const ADMIN_EMAIL = 'ikerms10@gmail.com'

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const supabase = createClient(supabaseUrl, serviceKey)

  // Get all tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, status')

  if (tenantsError) {
    return new Response(JSON.stringify({ error: tenantsError.message }), { status: 500 })
  }

  const results: Array<{
    tenant_id: string
    business_name: string
    success: boolean
    records_backed_up?: number
    backup_size?: number
    error?: string
  }> = []

  const date = new Date().toISOString().split('T')[0]

  for (const tenant of tenants ?? []) {
    try {
      const tableData: Record<string, unknown[]> = {}
      let totalRecords = 0

      for (const table of TENANT_TABLES) {
        let query = supabase.from(table).select('*').eq('tenant_id', tenant.id)

        // Apply soft-delete filter where applicable
        if (['customers', 'leads', 'projects', 'proposals', 'invoices', 'expenses'].includes(table)) {
          query = query.is('deleted_at', null)
        }

        const { data } = await query
        tableData[table] = data ?? []
        totalRecords += (data ?? []).length
      }

      const backup = {
        exported_at: new Date().toISOString(),
        tenant_id: tenant.id,
        business_name: tenant.business_name,
        version: '2.0',
        data: tableData,
      }

      const backupJson = JSON.stringify(backup)

      const { error: uploadError } = await supabase.storage
        .from('crm-backups')
        .upload(`${tenant.id}/backup-${date}.json`, backupJson, {
          contentType: 'application/json',
          upsert: true,
        })

      if (uploadError) {
        console.error(`Storage error for tenant ${tenant.id}:`, uploadError.message)
      }

      // Keep last 30 backups per tenant
      const { data: files } = await supabase.storage
        .from('crm-backups')
        .list(tenant.id, { sortBy: { column: 'created_at', order: 'asc' } })

      if (files && files.length > 30) {
        const toDelete = files.slice(0, files.length - 30).map(f => `${tenant.id}/${f.name}`)
        await supabase.storage.from('crm-backups').remove(toDelete)
      }

      results.push({
        tenant_id: tenant.id,
        business_name: tenant.business_name,
        success: true,
        records_backed_up: totalRecords,
        backup_size: backupJson.length,
      })
    } catch (err) {
      results.push({
        tenant_id: tenant.id,
        business_name: tenant.business_name,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  const totalRecords = results.reduce((s, r) => s + (r.records_backed_up ?? 0), 0)

  // Send confirmation email to admin
  if (resendKey) {
    const completedAt = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const rowsHtml = results
      .map(r =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e8e0d8;">${r.business_name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e8e0d8; text-align: center;">
            ${r.success ? `✅ ${r.records_backed_up} records` : `❌ ${r.error}`}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e8e0d8; text-align: right; font-family: monospace; font-size: 11px; color: #9a8a80;">
            ${r.backup_size ? `${(r.backup_size / 1024).toFixed(1)} KB` : '—'}
          </td>
        </tr>`
      )
      .join('')

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "Iker's CRM <noreply@skyglobalsvcs.com>",
          to: ADMIN_EMAIL,
          subject: `Daily Backup Complete — ${successCount}/${results.length} tenants · ${date}`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
              <h2 style="color: #4A3728; margin-bottom: 4px;">Daily Backup Complete</h2>
              <p style="color: #9a8a80; font-size: 13px; margin-bottom: 24px;">${completedAt} EST</p>
              <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                <div style="background: #f5f0ea; border-radius: 8px; padding: 12px 20px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 800; color: #4A6741;">${successCount}</div>
                  <div style="font-size: 11px; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em;">Succeeded</div>
                </div>
                <div style="background: #f5f0ea; border-radius: 8px; padding: 12px 20px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 800; color: #8B6914;">${totalRecords.toLocaleString()}</div>
                  <div style="font-size: 11px; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em;">Total Records</div>
                </div>
                <div style="background: #f5f0ea; border-radius: 8px; padding: 12px 20px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 800; color: #2d1f14;">${results.length}</div>
                  <div style="font-size: 11px; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em;">Tenants</div>
                </div>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background: #f5f0ea;">
                    <th style="padding: 8px 12px; text-align: left; color: #9a8a80; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Business</th>
                    <th style="padding: 8px 12px; text-align: center; color: #9a8a80; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Status</th>
                    <th style="padding: 8px 12px; text-align: right; color: #9a8a80; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Size</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
              <p style="font-size: 11px; color: #9a8a80; margin-top: 24px;">
                Stored in Supabase Storage · crm-backups bucket · Last 30 days retained per tenant
              </p>
            </div>
          `,
        }),
      })
    } catch (emailErr) {
      console.error('Failed to send backup confirmation email:', emailErr)
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      tenants_backed_up: successCount,
      total_records: totalRecords,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
