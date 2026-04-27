import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const bodySchema = z.object({
  plan: z.enum(['beta', 'starter', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'trial', 'suspended', 'cancelled']).optional(),
}).refine(d => d.plan !== undefined || d.status !== undefined, {
  message: 'Must provide plan or status',
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: adminRow } = await db
      .from('master_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }

    const update: Record<string, string> = {}
    if (parsed.data.plan)   update.plan   = parsed.data.plan
    if (parsed.data.status) update.status = parsed.data.status

    const { error } = await db.from('tenants').update(update).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
