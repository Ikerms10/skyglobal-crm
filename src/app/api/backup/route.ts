import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { rateLimit, getClientIp } from '@/lib/ratelimit'
import { logAuditEvent } from '@/lib/audit'

// 5 backup exports per 10-minute window — expensive operation
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000

function createSupabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

async function runBackup(supabase: ReturnType<typeof createSupabaseClient>, userId: string) {
  // Resolve tenant — backup must capture all team members' records, not just this user's
  const { data: tuRow } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const tenantId = tuRow?.tenant_id
  if (!tenantId) {
    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      tenant_id: null,
      version: '1.0',
      data: { customers: [], leads: [], projects: [], project_expenses: [], expenses: [], activities: [], project_line_items: [] },
    }
  }

  const [customersRes, leadsRes, projectsRes, expensesRes, activitiesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
    supabase.from('leads').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
    supabase.from('projects').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
    supabase.from('expenses').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
    supabase.from('activities').select('*').eq('tenant_id', tenantId),
  ])

  const projectIds = (projectsRes.data ?? []).map((p: { id: string }) => p.id)
  const [projectExpensesRes, lineItemsRes] = await Promise.all([
    projectIds.length
      ? supabase.from('project_expenses').select('*').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase.from('project_line_items').select('*').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
  ])

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    tenant_id: tenantId,
    version: '1.0',
    data: {
      customers: customersRes.data ?? [],
      leads: leadsRes.data ?? [],
      projects: projectsRes.data ?? [],
      project_expenses: projectExpensesRes.data ?? [],
      expenses: expensesRes.data ?? [],
      activities: activitiesRes.data ?? [],
      project_line_items: lineItemsRes.data ?? [],
    },
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!rateLimit(`backup:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const backup = await runBackup(supabase, user.id)
    const totalRecords = Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0)

    // Store in Supabase Storage if bucket exists
    try {
      const date = new Date().toISOString().split('T')[0]
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(`${user.id}/backup-${date}.json`, JSON.stringify(backup, null, 2), {
          contentType: 'application/json',
          upsert: true,
        })
      if (uploadError) console.warn('Storage upload skipped:', uploadError.message)
    } catch {
      // Storage bucket may not exist — backup still returned as response
    }

    await logAuditEvent(supabase, {
      userId: user.id,
      userEmail: user.email,
      action: 'EXPORT',
      resourceType: 'backup',
      newValues: { records: totalRecords },
      request,
    })

    return NextResponse.json({
      success: true,
      records_backed_up: totalRecords,
      backup_size: JSON.stringify(backup).length,
      timestamp: backup.exported_at,
      data: backup,
    })
  } catch (err) {
    console.error('Backup error:', err)
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  if (!rateLimit(`backup:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const backup = await runBackup(supabase, user.id)
    const totalRecords = Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0)

    await logAuditEvent(supabase, {
      userId: user.id,
      userEmail: user.email,
      action: 'EXPORT',
      resourceType: 'backup',
      newValues: { records: totalRecords, format: 'json-download' },
      request,
    })

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="skyglobal-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (err) {
    console.error('Backup GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
