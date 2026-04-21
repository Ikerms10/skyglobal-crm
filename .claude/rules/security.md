---
paths:
  - "src/api/**"
  - "src/auth/**"
  - "src/middleware/**"
  - "**/routes/**"
  - "**/controllers/**"
---

# Security

- Validate all user input at the system boundary. Never trust request parameters.
- Use parameterized queries — never concatenate user input into SQL or shell commands.
- Sanitize output to prevent XSS. Use framework-provided escaping.
- Authentication tokens must be short-lived. Store refresh tokens server-side only.
- Never log secrets, tokens, passwords, or PII.
- Use constant-time comparison for secrets and tokens.
- Set appropriate CORS, CSP, and security headers.
- Rate-limit authentication endpoints.

## Sensitive Values — Never Commit

- `SUPABASE_SERVICE_ROLE_KEY` — grants full DB bypass of RLS; server-only, never expose to client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public but should never be hardcoded in source; use env var
- `RESEND_API_KEY` — email sending credentials; treat as a secret
- Open-Meteo (`api.open-meteo.com`) — no key required, but requests from server-side only to avoid exposing location data

## Supabase-specific

- Never call Supabase with the service role key from a client component
- Always filter soft-deleted records: `.is('deleted_at', null)`
- Row Level Security is enabled — never disable or bypass it in migrations
