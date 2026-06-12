import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  createDriveFolder,
  getCategoryFolderId,
  getDriveFolderUrl,
  toLeadCategory,
} from '@/lib/google-drive'

// POST /api/drive/create-lead-folder
// Creates "{Customer Name} {Zip}" inside the RESIDENTIAL or COMMERCIAL Drive
// category folder (by customer type) and stores the folder ID on the lead.
// Idempotent — returns the existing folder if set.
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leadId } = (await req.json()) as { leadId?: string }
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const db = createServiceClient()

    const { data: tuRow } = await db
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    const { data: lead, error: leadErr } = await db
      .from('leads')
      .select('id, user_id, tenant_id, title, drive_folder_id, customer:customers!leads_customer_id_fkey(name, zip, type)')
      .eq('id', leadId)
      .is('deleted_at', null)
      .single()
    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const isOwner =
      lead.user_id === user.id ||
      (lead.tenant_id != null && lead.tenant_id === tuRow?.tenant_id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (lead.drive_folder_id) {
      return NextResponse.json({
        folderId: lead.drive_folder_id,
        folderUrl: getDriveFolderUrl(lead.drive_folder_id),
      })
    }

    const customer = (Array.isArray(lead.customer) ? lead.customer[0] : lead.customer) as
      | { name: string; zip: string | null; type: string | null }
      | null
    const folderName = [customer?.name ?? lead.title, customer?.zip]
      .filter(Boolean)
      .join(' ')
      .trim()

    const category = toLeadCategory(customer?.type)
    const folderId = await createDriveFolder(folderName, getCategoryFolderId(category))

    const { error: updateErr } = await db
      .from('leads')
      .update({ drive_folder_id: folderId })
      .eq('id', leadId)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      folderId,
      folderUrl: getDriveFolderUrl(folderId),
      category: category.toUpperCase(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[create-lead-folder]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
