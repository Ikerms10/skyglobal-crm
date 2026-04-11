'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'

interface BriefingData {
  activeJobs: Array<{ id: string; title: string; customer_name: string | null }>
  followUps: Array<{ id: string; title: string; customer_name: string | null }>
  overduePayments: Array<{ id: string; title: string; owed: number; customer_id: string }>
  todayLeads: Array<{ id: string; estimated_value: number | null }>
}

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-tertiary)',
  margin: '0 0 8px',
}

const COUNT = (color: string): React.CSSProperties => ({
  fontSize: 36,
  fontWeight: 700,
  color,
  letterSpacing: '-0.02em',
  lineHeight: 1,
  margin: '0 0 6px',
})

const ITEM: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-secondary)',
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export function DailyBriefing({ onAddLead }: { onAddLead?: () => void }) {
  const [data, setData] = useState<BriefingData | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const [jobsRes, followRes, overdueRes, leadsRes] = await Promise.all([
        supabase.from('projects')
          .select('id, title, customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .eq('status', 'In Progress')
          .lte('start_date', today),
        supabase.from('leads')
          .select('id, title, customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .eq('follow_up_date', today)
          .not('stage', 'in', '("Won","Lost")'),
        supabase.from('projects')
          .select('id, title, contract_value, amount_paid, customer_id')
          .eq('user_id', user.id).is('deleted_at', null)
          .eq('status', 'Completed')
          .not('payment_status', 'eq', 'Paid'),
        supabase.from('leads')
          .select('id, estimated_value')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte('created_at', today + 'T00:00:00'),
      ])

      setData({
        activeJobs: (jobsRes.data ?? []).map(j => ({
          id: j.id,
          title: j.title,
          customer_name: (j.customers as { name?: string } | null)?.name ?? null,
        })),
        followUps: (followRes.data ?? []).map(f => ({
          id: f.id,
          title: f.title,
          customer_name: (f.customers as { name?: string } | null)?.name ?? null,
        })),
        overduePayments: (overdueRes.data ?? []).map(p => ({
          id: p.id,
          title: p.title,
          owed: (p.contract_value ?? 0) - (p.amount_paid ?? 0),
          customer_id: p.customer_id,
        })),
        todayLeads: leadsRes.data ?? [],
      })
    }
    load()
  }, [])

  const totalOwed = data?.overduePayments.reduce((s, p) => s + p.owed, 0) ?? 0
  const todayLeadValue = data?.todayLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0) ?? 0

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          ☀️ Today&apos;s Briefing
        </p>
        <Link href="/daily" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
          Daily Notes <ArrowRight size={12} />
        </Link>
      </div>

      {/* 2×2 grid — no gap, dividers via borders */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        flex: 1,
      }}>
        {/* TOP-LEFT: Active Jobs */}
        <div style={{
          padding: '16px 20px',
          minHeight: 110,
          borderRight: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column',
        }}>
          <p style={LABEL}>Jobs in Progress</p>
          <p style={COUNT('var(--gold)')}>{data?.activeJobs.length ?? '—'}</p>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(data?.activeJobs ?? []).slice(0, 2).map(j => (
              <p key={j.id} style={ITEM}>{j.customer_name ?? j.title}</p>
            ))}
            {!data?.activeJobs.length && (
              <p style={{ ...ITEM, color: 'var(--text-tertiary)' }}>✓ No active jobs</p>
            )}
          </div>
        </div>

        {/* TOP-RIGHT: Follow-ups */}
        <div style={{
          padding: '16px 20px',
          minHeight: 110,
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column',
        }}>
          <p style={LABEL}>Follow-ups Due Today</p>
          <p style={COUNT('var(--blue)')}>{data?.followUps.length ?? '—'}</p>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(data?.followUps ?? []).slice(0, 2).map(f => (
              <Link key={f.id} href="/leads" style={{ ...ITEM, textDecoration: 'none', display: 'block' }}>
                {f.customer_name ?? f.title}
              </Link>
            ))}
            {!data?.followUps.length && (
              <p style={{ ...ITEM, color: 'var(--text-tertiary)' }}>✓ All clear</p>
            )}
          </div>
        </div>

        {/* BOTTOM-LEFT: Overdue Payments */}
        <div style={{
          padding: '16px 20px',
          minHeight: 110,
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column',
        }}>
          <p style={LABEL}>Payments Outstanding</p>
          <p style={COUNT((data?.overduePayments.length ?? 0) > 0 ? 'var(--error)' : 'var(--success)')}>
            {data?.overduePayments.length ?? '—'}
          </p>
          {totalOwed > 0 && (
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginTop: 2 }}>
              {formatCurrency(totalOwed)} owed
            </p>
          )}
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(data?.overduePayments ?? []).slice(0, 2).map(p => (
              <Link key={p.id} href={`/customers/${p.customer_id}/projects/${p.id}`} style={{ ...ITEM, textDecoration: 'none', display: 'block' }}>
                {p.title}
              </Link>
            ))}
            {!data?.overduePayments.length && (
              <p style={{ ...ITEM, color: 'var(--text-tertiary)' }}>✓ All paid up</p>
            )}
          </div>
        </div>

        {/* BOTTOM-RIGHT: New Leads Today */}
        <div style={{
          padding: '16px 20px',
          minHeight: 110,
          display: 'flex', flexDirection: 'column',
        }}>
          <p style={LABEL}>New Leads Today</p>
          <p style={COUNT('var(--blue)')}>{data?.todayLeads.length ?? '—'}</p>
          {todayLeadValue > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {formatCurrency(todayLeadValue)} pipeline
            </p>
          )}
          {!data?.todayLeads.length && (
            <p style={{ ...ITEM, color: 'var(--text-tertiary)', marginTop: 4 }}>No leads yet today</p>
          )}
          {onAddLead && (
            <button
              onClick={onAddLead}
              style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--text-tertiary)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <Plus size={12} /> Add Lead
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
