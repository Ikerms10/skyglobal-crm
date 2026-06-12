import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createDriveFolder, getDriveFolderUrl } from '@/lib/google-drive'

// POST /api/drive/create-project-folder
// Creates "{Project Title} - {Address}" inside the parent lead's Drive folder
// (falls back to the root folder for projects created without a lead) and
// stores the folder ID on the project. Idempotent.
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = (await req.json()) as { projectId?: string }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
    if (!rootFolderId) {
      return NextResponse.json({ error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID not set' }, { status: 500 })
    }

    const db = createServiceClient()

    const { data: tuRow } = await db
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    const { data: project, error: projErr } = await db
      .from('projects')
      .select('id, user_id, tenant_id, title, address, lead_id, drive_folder_id')
      .eq('id', projectId)
      .is('deleted_at', null)
      .single()
    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const isOwner =
      project.user_id === user.id ||
      (project.tenant_id != null && project.tenant_id === tuRow?.tenant_id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (project.drive_folder_id) {
      return NextResponse.json({
        folderId: project.drive_folder_id,
        folderUrl: getDriveFolderUrl(project.drive_folder_id),
      })
    }

    let parentFolderId = rootFolderId
    if (project.lead_id) {
      const { data: lead } = await db
        .from('leads')
        .select('drive_folder_id')
        .eq('id', project.lead_id)
        .maybeSingle()
      if (lead?.drive_folder_id) parentFolderId = lead.drive_folder_id
    }

    const folderName = [project.title, project.address].filter(Boolean).join(' - ').trim()
    const folderId = await createDriveFolder(folderName, parentFolderId)

    const { error: updateErr } = await db
      .from('projects')
      .update({ drive_folder_id: folderId })
      .eq('id', projectId)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ folderId, folderUrl: getDriveFolderUrl(folderId) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[create-project-folder]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
