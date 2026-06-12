import { toast } from 'sonner'

type DriveFolderRequest =
  | { kind: 'lead'; leadId: string }
  | { kind: 'project'; projectId: string }

// Fire-and-forget — folder creation must never block or fail lead/project
// creation, so this is called from onSuccess handlers without awaiting.
export function createDriveFolderInBackground(request: DriveFolderRequest) {
  const url =
    request.kind === 'lead'
      ? '/api/drive/create-lead-folder'
      : '/api/drive/create-project-folder'
  const body =
    request.kind === 'lead'
      ? { leadId: request.leadId }
      : { projectId: request.projectId }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(res => res.json())
    .then((data: { folderId?: string; category?: string; error?: string }) => {
      if (data.folderId) {
        toast.success(
          request.kind === 'lead'
            ? `Folder created in ${data.category ?? 'Drive'} → Drive`
            : 'Project folder created on Drive'
        )
        return
      }
      // Stay silent while the integration is unconfigured — otherwise every
      // lead/project creation shows a red toast until the env vars are set.
      const isUnconfigured = /not set|not configured/i.test(data.error ?? '')
      if (!isUnconfigured) {
        toast.error(`Drive folder creation failed: ${data.error ?? 'unknown error'}`)
      }
    })
    .catch(() => toast.error('Could not reach Drive API'))
}
