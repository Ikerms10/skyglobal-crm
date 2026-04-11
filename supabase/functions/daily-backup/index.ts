// Supabase Edge Function — daily-backup
// Schedule: '0 2 * * *' (2am UTC daily)
// Deploy: supabase functions deploy daily-backup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TABLES = [
  'customers',
  'leads',
  'projects',
  'project_expenses',
  'expenses',
  'activities',
  'project_line_items',
] as const

Deno.serve(async (req) => {
  // Allow manual triggers via POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Get all users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    return new Response(JSON.stringify({ error: usersError.message }), { status: 500 })
  }

  const results = []
  const date = new Date().toISOString().split('T')[0]

  for (const user of users.users) {
    try {
      // Fetch all user data
      const tableData: Record<string, unknown[]> = {}
      let totalRecords = 0

      for (const table of TABLES) {
        let query = supabase.from(table).select('*')

        if (table === 'customers' || table === 'leads' || table === 'projects' || table === 'expenses') {
          query = query.eq('user_id', user.id).is('deleted_at', null)
        } else if (table === 'project_expenses' || table === 'activities') {
          query = query.eq('user_id', user.id)
        }

        const { data } = await query
        tableData[table] = data ?? []
        totalRecords += (data ?? []).length
      }

      const backup = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        version: '1.0',
        data: tableData,
      }

      const backupJson = JSON.stringify(backup)

      // Store in Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(`${user.id}/backup-${date}.json`, backupJson, {
          contentType: 'application/json',
          upsert: true,
        })

      if (uploadError) {
        console.error(`Storage error for user ${user.id}:`, uploadError.message)
      }

      // Clean up old backups (keep last 30)
      const { data: files } = await supabase.storage
        .from('backups')
        .list(user.id, { sortBy: { column: 'created_at', order: 'asc' } })

      if (files && files.length > 30) {
        const toDelete = files.slice(0, files.length - 30).map(f => `${user.id}/${f.name}`)
        await supabase.storage.from('backups').remove(toDelete)
      }

      results.push({
        user_id: user.id,
        success: true,
        records_backed_up: totalRecords,
        backup_size: backupJson.length,
      })
    } catch (err) {
      results.push({
        user_id: user.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return new Response(JSON.stringify({
    success: true,
    timestamp: new Date().toISOString(),
    users_backed_up: results.filter(r => r.success).length,
    results,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
