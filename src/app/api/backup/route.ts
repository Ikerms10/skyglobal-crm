import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch all user data
    const [
      customersRes,
      leadsRes,
      projectsRes,
      projectExpensesRes,
      expensesRes,
      activitiesRes,
      lineItemsRes,
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('leads').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('projects').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('project_expenses').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('activities').select('*').eq('user_id', user.id),
      supabase.from('project_line_items').select('*'),
    ])

    const backup = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
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

    return NextResponse.json(
      {
        success: true,
        records_backed_up: totalRecords,
        backup_size: JSON.stringify(backup).length,
        timestamp: backup.exported_at,
        data: backup,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (err) {
    console.error('Backup error:', err)
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Run a live backup and return as downloadable JSON
    const [customersRes, leadsRes, projectsRes, projectExpensesRes, expensesRes, activitiesRes, lineItemsRes] = await Promise.all([
      supabase.from('customers').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('leads').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('projects').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('project_expenses').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('activities').select('*').eq('user_id', user.id),
      supabase.from('project_line_items').select('*'),
    ])

    const backup = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
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
