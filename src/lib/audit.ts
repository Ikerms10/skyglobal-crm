import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT' | 'EXPORT';
export type AuditResource =
  | 'lead'
  | 'customer'
  | 'project'
  | 'proposal'
  | 'invoice'
  | 'expense'
  | 'settings'
  | 'backup';

interface AuditParams {
  userId: string | null;
  userEmail?: string | null;
  action: AuditAction;
  resourceType: AuditResource;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  request?: Request;
}

/**
 * Inserts a row into audit_log. Accepts the already-created Supabase client
 * from the calling route so we don't re-create clients or re-validate cookies.
 *
 * Failures are caught and logged — audit errors must never crash the app.
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  params: AuditParams
): Promise<void> {
  try {
    const ip =
      params.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ua = params.request?.headers.get('user-agent') ?? 'unknown';

    await supabase.from('audit_log').insert({
      user_id: params.userId ?? null,
      user_email: params.userEmail ?? null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      ip_address: ip,
      user_agent: ua,
    });
  } catch (err) {
    console.error('[audit]', err);
  }
}
