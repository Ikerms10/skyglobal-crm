# Weekly Report Email Setup

## Step 1 — Resend Account
- Go to resend.com → sign up (free tier available)
- Add domain: skyglobalsvcs.com
- Follow DNS verification steps in dashboard
- Get API key from Settings → API Keys

## Step 2 — Deploy Edge Function

Install Supabase CLI:
```bash
npm install -g supabase
```

Login:
```bash
supabase login
```

Link project:
```bash
supabase link --project-ref vnmnncffirjyqtyvimhp
```

Deploy function:
```bash
supabase functions deploy weekly-report
```

## Step 3 — Set Secrets

`REPORT_USER_ID` and `REPORT_EMAIL` are no longer used — the function now reads all
tenants from the database. Only two secrets are required:

```bash
supabase secrets set RESEND_API_KEY=re_YOUR_KEY_HERE
supabase secrets set MASTER_ADMIN_EMAIL=ikerms10@gmail.com
```

`MASTER_ADMIN_EMAIL` defaults to `ikerms10@gmail.com` if not set.

## Step 4 — Schedule (run in Supabase SQL Editor)

Enable pg_cron extension first:
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

Then schedule Monday 8am EST (13:00 UTC):
```sql
select cron.schedule(
  'weekly-business-report',
  '0 13 * * 1',
  $$
  select net.http_post(
    url:='https://vnmnncffirjyqtyvimhp.supabase.co/functions/v1/weekly-report',
    headers:='{"Authorization":"Bearer YOUR_ANON_KEY","Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

Get your anon key from: Supabase → Project Settings → API → anon/public key

## Step 5 — Test It Now

```bash
curl -X POST \
  https://vnmnncffirjyqtyvimhp.supabase.co/functions/v1/weekly-report \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Check ikerms10@gmail.com for the report!

## Troubleshooting

- If email doesn't arrive: check Resend dashboard → Emails tab for delivery status
- If function errors: check Supabase → Edge Functions → weekly-report → Logs
- Verify secrets are set: `supabase secrets list`
