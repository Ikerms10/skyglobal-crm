# SkyGlobal CRM

Business management system for SkyGlobal Renovations LLC, a residential and commercial painting contractor. Tracks customers, leads, projects, proposals, expenses, and scheduling.

## Commands

```bash
# Dev
npm run dev              # Next.js dev server on port 3000

# Build
npm run build            # Production build (Vercel runs this on every deploy)

# Typecheck
npm run typecheck        # tsc --noEmit (no emit, just type errors)

# Lint
npm run lint             # next lint (ESLint)

# Deploy workflow — direct push to main is blocked by hook
git checkout -b feat/name
git push origin feat/name
gh pr create
gh pr merge <number> --merge
```

## Architecture

Next.js 14 App Router with two route groups:
- `(auth)/` — login, register (no sidebar)
- `(dashboard)/` — all CRM pages, guarded by Supabase auth middleware

All DB access goes through `createClient()` from `@/lib/supabase/client`. Never raw SQL from components. Data fetching uses `@tanstack/react-query`. Forms use `react-hook-form + zod`.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database / Auth**: Supabase (PostgreSQL + Row Level Security + Storage)
- **Styling**: Tailwind CSS + CSS custom properties (`--c-*` warm token system; `--sg-*` are legacy aliases pointing to `--c-*` values)
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer — uses hardcoded hex values, not CSS vars (vars don't resolve in PDF renderer)
- **Email**: Resend (`RESEND_API_KEY`)
- **Deployment**: Vercel (auto-deploys from main via GitHub)
- **Drag & drop**: @dnd-kit
- **Animation**: Framer Motion

## Key Decisions

- **`--sg-*` CSS aliases**: All `--sg-*` tokens alias `--c-*` warm values in `tokens.css`. Use `--c-*` in new code, never add new `--sg-*` tokens.
- **No direct push to main**: Hook blocks it. Always: branch → push → `gh pr create` → `gh pr merge`.
- **Soft deletes**: Records use `deleted_at` timestamp, never hard-deleted. Always filter `.is('deleted_at', null)`.
- **Supabase migrations**: No local runner. Write SQL to `supabase/migrations/` and run manually in the Supabase dashboard SQL editor.
- **PDF renderer exception**: `@react-pdf/renderer` components keep hardcoded hex colors — CSS variables do not resolve inside the PDF rendering sandbox.
- **`template_data` JSONB**: Stores template-specific proposal fields (coatingTier, sheen, scopeOfWork) inside the `proposals` table row.

## Domain Knowledge

- **Lead stages**: New Lead → Estimate Sent → Follow-up → Won / Lost / On Hold
- **Customer types**: Residential, Commercial
- **Proposal templates**: Interior Painting, Exterior Painting, Cabinet Refinishing, Custom/Other — all in `src/components/proposals/templates/`
- **ScopeStep**: `{ title: string; bullets: string[] }` — the editable scope-of-work JSON shape stored in `template_data.scopeOfWork`

## Workflow

- Run `npm run typecheck` after a series of changes
- Feature branches only — never commit directly to main
- Schema changes: write migration SQL in `supabase/migrations/` and run in Supabase dashboard
- When unsure about approach, use plan mode (`Shift+Tab`) before coding

## Don'ts

- Don't add CSS vars inside `@react-pdf/renderer` components — use hex values
- Don't push directly to main
- Don't hardcode `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, or any secret in source files
- Don't hard-delete records — always soft-delete with `deleted_at`
- Don't modify `*.gen.ts` or `*.generated.*` files
