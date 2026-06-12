import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'

// GET /api/proposals/public?token=xxx — fetch proposal by share token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*, line_items:proposal_line_items(*)')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (error || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  // Token expires after 30 days from creation
  const createdAt = proposal.created_at ? new Date(proposal.created_at) : new Date()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  if (Date.now() - createdAt.getTime() > thirtyDaysMs) {
    return NextResponse.json({ error: 'This proposal link has expired' }, { status: 410 })
  }

  // Increment view count (fire-and-forget)
  supabase
    .from('proposals')
    .update({
      viewed_count: (proposal.viewed_count ?? 0) + 1,
      viewed_at: new Date().toISOString(),
    })
    .eq('share_token', token)
    .then(() => {})

  return NextResponse.json({ proposal })
}
