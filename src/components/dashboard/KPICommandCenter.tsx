'use client';
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  format,
  differenceInDays,
} from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Info,
  X,
  Zap,
  Filter,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = 'weekly' | 'monthly' | 'yearly';

const LS_KEY = 'sg-kpi-period';

// ─── Period helpers ───────────────────────────────────────────────────────────

function getBounds(period: Period) {
  const now = new Date();
  if (period === 'weekly')
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  if (period === 'monthly') return { start: startOfMonth(now), end: endOfMonth(now) };
  return { start: startOfYear(now), end: endOfYear(now) };
}

function getPrevBounds(period: Period) {
  const now = new Date();
  if (period === 'weekly') {
    const p = subWeeks(now, 1);
    return { start: startOfWeek(p, { weekStartsOn: 1 }), end: endOfWeek(p, { weekStartsOn: 1 }) };
  }
  if (period === 'monthly') {
    const p = subMonths(now, 1);
    return { start: startOfMonth(p), end: endOfMonth(p) };
  }
  const p = subYears(now, 1);
  return { start: startOfYear(p), end: endOfYear(p) };
}

function pLabel(period: Period) {
  return period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'year';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--c-card)',
  border: '1px solid var(--c-border-light)',
  borderRadius: 'var(--r-lg)',
  padding: '18px 20px',
  boxShadow: 'var(--s-card), var(--s-card-inset)',
  position: 'relative',
  overflow: 'hidden',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--c-text-4)',
  fontFamily: "'DM Mono', monospace",
};

const valueStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: 'var(--c-text-1)',
  fontFamily: "'DM Mono', monospace",
  letterSpacing: '-0.02em',
  margin: '8px 0 4px',
  lineHeight: 1.1,
};

const subtextStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--c-text-4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  lineHeight: 1.4,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={card}>
      <div className="skeleton" style={{ height: 12, width: '55%', borderRadius: 4 }} />
      <div
        className="skeleton"
        style={{ height: 28, width: '75%', borderRadius: 4, margin: '14px 0 8px' }}
      />
      <div className="skeleton" style={{ height: 11, width: '90%', borderRadius: 4 }} />
      <div
        className="skeleton"
        style={{ height: 11, width: '60%', borderRadius: 4, marginTop: 5 }}
      />
    </div>
  );
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0)
    return (
      <span
        style={{
          fontSize: 10,
          color: 'var(--c-sage)',
          fontFamily: "'DM Mono', monospace",
          fontWeight: 700,
        }}
      >
        NEW
      </span>
    );
  const delta = ((current - previous) / previous) * 100;
  const up = delta >= 0;
  const color = up ? 'var(--c-sage)' : 'var(--c-danger)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        fontSize: 10,
        color,
        fontFamily: "'DM Mono', monospace",
        fontWeight: 700,
      }}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Info
        size={12}
        style={{ color: 'var(--c-text-5)', cursor: 'help' }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--c-card)',
            border: '1px solid var(--c-border-mid)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            color: 'var(--c-text-2)',
            width: 220,
            boxShadow: 'var(--s-card-hover)',
            zIndex: 60,
            lineHeight: 1.5,
            whiteSpace: 'normal',
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function CircularRing({ pct, size = 76 }: { pct: number; size?: number }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circ * (1 - clamped / 100);
  const color = pct >= 80 ? '#4A9B56' : pct >= 40 ? '#E6AB35' : '#B94A3A';
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--c-border)"
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 700ms ease' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={12}
        fontWeight={700}
        fontFamily="'DM Mono', monospace"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {clamped.toFixed(0)}%
      </text>
    </svg>
  );
}

function GoalModal({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(current || '10000');
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--c-card)',
          border: '1px solid var(--c-border-mid)',
          borderRadius: 'var(--r-lg)',
          padding: '24px 28px',
          width: 320,
          boxShadow: 'var(--s-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--c-text-1)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Monthly Revenue Goal
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--c-text-4)',
              padding: 2,
              lineHeight: 1,
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span
            style={{ fontSize: 20, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}
          >
            $
          </span>
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="10000"
            autoFocus
            style={{ flex: 1, fontSize: 15, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(val);
            }}
          />
        </div>
        <p
          style={{
            fontSize: 11,
            color: 'var(--c-text-4)',
            marginBottom: 18,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            lineHeight: 1.5,
          }}
        >
          Sets your monthly baseline. Yearly view = ×12, Weekly view = ÷4.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ flex: 1, cursor: 'pointer' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, cursor: 'pointer' }}
            onClick={() => onSave(val)}
          >
            Save Goal
          </button>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--c-card)',
        border: '1px solid var(--c-border)',
        borderRadius: 8,
        padding: '9px 13px',
        boxShadow: 'var(--s-card-hover)',
        fontSize: 12,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <p style={{ color: 'var(--c-text-3)', marginBottom: 5, fontWeight: 500 }}>{label}</p>
      {payload.map((p) => (
        <p
          key={p.name}
          style={{
            color: p.color,
            fontWeight: 700,
            margin: '2px 0',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {p.name === 'Revenue' ? formatCurrency(p.value) : `${p.value} leads`}
        </p>
      ))}
    </div>
  );
}

// ─── Main fetch logic ─────────────────────────────────────────────────────────

async function fetchKPIData(period: Period) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const now = new Date();
  const uid = user.id;
  const { start, end } = getBounds(period);
  const { start: ps, end: pe } = getPrevBounds(period);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const yearStart = startOfYear(now);

  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const psISO = ps.toISOString();
  const peISO = pe.toISOString();
  const weekStartISO = weekStart.toISOString();
  const yearStartISO = yearStart.toISOString();
  const startDate = format(start, 'yyyy-MM-dd');
  const endDate = format(end, 'yyyy-MM-dd');
  const psDate = format(ps, 'yyyy-MM-dd');
  const peDate = format(pe, 'yyyy-MM-dd');

  const [
    projRes,
    leadsRes,
    mktRes,
    prevProjRes,
    prevLeadsRes,
    prevMktRes,
    allCompletedRes,
    proposalsRes,
    outstandingRes,
    weekLeadsRes,
    weekProjRes,
    weekPropsRes,
    goalRes,
    trendProjRes,
    trendLeadsRes,
  ] = await Promise.all([
    // Current period: projects
    supabase
      .from('projects')
      .select('id, contract_value, amount_paid, payment_status, status, created_at')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('created_at', startISO)
      .lte('created_at', endISO),

    // Current period: leads
    supabase
      .from('leads')
      .select('id, stage, created_at')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('created_at', startISO)
      .lte('created_at', endISO),

    // Current period: marketing/advertising expenses
    supabase
      .from('expenses')
      .select('id, amount')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .eq('category', 'Advertising')
      .gte('date', startDate)
      .lte('date', endDate),

    // Previous period: projects
    supabase
      .from('projects')
      .select('id, contract_value, status')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('created_at', psISO)
      .lte('created_at', peISO),

    // Previous period: leads
    supabase
      .from('leads')
      .select('id, stage')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('created_at', psISO)
      .lte('created_at', peISO),

    // Previous period: advertising
    supabase
      .from('expenses')
      .select('id, amount')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .eq('category', 'Advertising')
      .gte('date', psDate)
      .lte('date', peDate),

    // All-time completed projects (avg job value benchmark)
    supabase
      .from('projects')
      .select('id, contract_value')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .eq('status', 'Completed'),

    // Open pipeline: proposals in Draft or Sent
    supabase
      .from('proposals')
      .select('id, total_investment, status')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .in('status', ['Draft', 'Sent']),

    // Outstanding payments
    supabase
      .from('projects')
      .select('id, contract_value, amount_paid, payment_status, end_date')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .in('payment_status', ['Unpaid', 'Partial', 'Overdue']),

    // This week: leads
    supabase
      .from('leads')
      .select('id')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('created_at', weekStartISO),

    // This week: projects (started)
    supabase
      .from('projects')
      .select('id, start_date, contract_value, payment_status')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('start_date', format(weekStart, 'yyyy-MM-dd')),

    // This week: proposals sent
    supabase
      .from('proposals')
      .select('id, status')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('created_at', weekStartISO),

    // Revenue goal setting
    supabase
      .from('business_settings')
      .select('value')
      .eq('user_id', uid)
      .eq('key', 'monthly_revenue_goal')
      .maybeSingle(),

    // Trend: all projects from year start (aggregated in JS)
    supabase
      .from('projects')
      .select('id, contract_value, status, created_at')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('created_at', yearStartISO),

    // Trend: all leads from year start
    supabase
      .from('leads')
      .select('id, created_at')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .gte('created_at', yearStartISO),
  ]);

  // Log any errors but don't fail the whole fetch
  const errors: string[] = [];
  [
    projRes,
    leadsRes,
    mktRes,
    prevProjRes,
    prevLeadsRes,
    prevMktRes,
    allCompletedRes,
    proposalsRes,
    outstandingRes,
  ].forEach((r, i) => {
    if (r.error) errors.push(`Query ${i}: ${r.error.message}`);
  });
  if (errors.length > 0) errors.forEach((e) => console.error('[KPI]', e));

  const projects = projRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const mkt = mktRes.data ?? [];
  const prevProjects = prevProjRes.data ?? [];
  const prevLeads = prevLeadsRes.data ?? [];
  const prevMkt = prevMktRes.data ?? [];
  const allCompleted = allCompletedRes.data ?? [];
  const proposals = proposalsRes.data ?? [];
  const outstanding = outstandingRes.data ?? [];
  const trendProjects = trendProjRes.data ?? [];
  const trendLeadsAll = trendLeadsRes.data ?? [];

  // ── Revenue ──────────────────────────────────────────────────────────────
  const revenue = projects
    .filter((p) => p.status === 'Completed' || p.status === 'In Progress')
    .reduce((s, p) => s + (p.contract_value ?? 0), 0);

  const prevRevenue = prevProjects
    .filter((p) => p.status === 'Completed' || p.status === 'In Progress')
    .reduce((s, p) => s + (p.contract_value ?? 0), 0);

  // ── Leads ─────────────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.stage === 'Won').length;
  const lostLeads = leads.filter((l) => l.stage === 'Lost').length;
  const newLeads = leads.filter((l) => l.stage === 'New Lead').length;
  const quotedLeads = leads.filter(
    (l) => l.stage === 'Estimate Sent' || l.stage === 'Follow-up' || l.stage === 'Negotiating'
  ).length;
  const prevTotalLeads = prevLeads.length;
  const prevWonLeads = prevLeads.filter((l) => l.stage === 'Won').length;

  // ── Close rate ────────────────────────────────────────────────────────────
  const closeRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  const prevCloseRate = prevTotalLeads > 0 ? (prevWonLeads / prevTotalLeads) * 100 : 0;

  // ── Marketing spend ───────────────────────────────────────────────────────
  const marketingSpend = mkt.reduce((s, e) => s + e.amount, 0);
  const prevMarketingSpend = prevMkt.reduce((s, e) => s + e.amount, 0);

  // ── Revenue / lead ────────────────────────────────────────────────────────
  const revenuePerLead = totalLeads > 0 ? revenue / totalLeads : null;
  const prevRevPerLead = prevTotalLeads > 0 ? prevRevenue / prevTotalLeads : null;

  // ── Cost / lead acquired ──────────────────────────────────────────────────
  const costPerLead = totalLeads > 0 ? marketingSpend / totalLeads : 0;

  // ── CPA (cost per closed lead) ────────────────────────────────────────────
  const cpa = wonLeads > 0 ? marketingSpend / wonLeads : null;

  // CPA color relative to avg job value
  let cpaColor = 'var(--c-text-2)';
  if (cpa !== null && revenuePerLead !== null && revenuePerLead > 0) {
    const ratio = cpa / revenuePerLead;
    cpaColor = ratio < 0.15 ? '#4A9B56' : ratio < 0.3 ? '#E6AB35' : '#B94A3A';
  }

  // ── Avg job value (all-time baseline) ─────────────────────────────────────
  const completedWithVal = allCompleted.filter((p) => (p.contract_value ?? 0) > 0);
  const avgJobValue =
    completedWithVal.length > 0
      ? completedWithVal.reduce((s, p) => s + (p.contract_value ?? 0), 0) / completedWithVal.length
      : null;

  const periodCompleted = projects.filter(
    (p) => p.status === 'Completed' && (p.contract_value ?? 0) > 0
  );
  const periodAvgJob =
    periodCompleted.length > 0
      ? periodCompleted.reduce((s, p) => s + (p.contract_value ?? 0), 0) / periodCompleted.length
      : null;

  // ── Open pipeline ─────────────────────────────────────────────────────────
  const pipelineValue = proposals.reduce((s, p) => s + (p.total_investment ?? 0), 0);
  const pipelineDrafts = proposals.filter((p) => p.status === 'Draft').length;
  const pipelineSent = proposals.filter((p) => p.status === 'Sent').length;

  // ── Outstanding payments ──────────────────────────────────────────────────
  const outstandingTotal = outstanding.reduce(
    (s, p) => s + Math.max(0, (p.contract_value ?? 0) - (p.amount_paid ?? 0)),
    0
  );
  const overdueItems = outstanding.filter((p) => p.payment_status === 'Overdue');
  const oldestDays =
    overdueItems.length > 0
      ? Math.max(
          ...overdueItems.map((p) => (p.end_date ? differenceInDays(now, new Date(p.end_date)) : 0))
        )
      : null;

  // ── Revenue goal ──────────────────────────────────────────────────────────
  const monthlyGoalStr = goalRes.data?.value ?? null;
  const monthlyGoal = monthlyGoalStr ? parseFloat(monthlyGoalStr) : null;
  let goalForPeriod: number | null = null;
  if (monthlyGoal) {
    goalForPeriod =
      period === 'yearly' ? monthlyGoal * 12 : period === 'weekly' ? monthlyGoal / 4 : monthlyGoal;
  }
  const goalPct =
    goalForPeriod && goalForPeriod > 0 ? Math.min((revenue / goalForPeriod) * 100, 999) : 0;
  const remaining = goalForPeriod ? Math.max(0, goalForPeriod - revenue) : null;

  // ── This week activity (always current week, period-agnostic) ─────────────
  const weekLeadCount = weekLeadsRes.data?.length ?? 0;
  const weekJobsStarted = weekProjRes.data?.length ?? 0;
  const weekProposalsSent = (weekPropsRes.data ?? []).filter((p) => p.status === 'Sent').length;
  const weekPayments = (weekProjRes.data ?? [])
    .filter((p) => p.payment_status === 'Paid')
    .reduce((s, p) => s + (p.contract_value ?? 0), 0);

  // ── Trend chart data ──────────────────────────────────────────────────────
  let trendData: Array<{ label: string; revenue: number; leads: number }> = [];

  if (period === 'yearly') {
    trendData = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), i, 1);
      const dEnd = new Date(now.getFullYear(), i + 1, 0, 23, 59, 59);
      const rev = trendProjects
        .filter((p) => {
          const pd = new Date(p.created_at);
          return pd >= d && pd <= dEnd && (p.status === 'Completed' || p.status === 'In Progress');
        })
        .reduce((s, p) => s + (p.contract_value ?? 0), 0);
      const lc = trendLeadsAll.filter((l) => {
        const ld = new Date(l.created_at);
        return ld >= d && ld <= dEnd;
      }).length;
      return { label: format(d, 'MMM'), revenue: Math.round(rev), leads: lc };
    });
  } else if (period === 'monthly') {
    const ms = startOfMonth(now);
    trendData = Array.from({ length: 4 }, (_, i) => {
      const wStart = new Date(ms.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(
        Math.min(wStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1, endOfMonth(now).getTime())
      );
      const rev = trendProjects
        .filter((p) => {
          const pd = new Date(p.created_at);
          return (
            pd >= wStart && pd <= wEnd && (p.status === 'Completed' || p.status === 'In Progress')
          );
        })
        .reduce((s, p) => s + (p.contract_value ?? 0), 0);
      const lc = trendLeadsAll.filter((l) => {
        const ld = new Date(l.created_at);
        return ld >= wStart && ld <= wEnd;
      }).length;
      return { label: `Wk ${i + 1}`, revenue: Math.round(rev), leads: lc };
    });
  } else {
    trendData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
      const rev = trendProjects
        .filter((p) => {
          const pd = new Date(p.created_at);
          return pd >= d && pd <= dEnd && (p.status === 'Completed' || p.status === 'In Progress');
        })
        .reduce((s, p) => s + (p.contract_value ?? 0), 0);
      const lc = trendLeadsAll.filter((l) => {
        const ld = new Date(l.created_at);
        return ld >= d && ld <= dEnd;
      }).length;
      return { label: format(d, 'EEE'), revenue: Math.round(rev), leads: lc };
    });
  }

  return {
    revenue,
    prevRevenue,
    totalLeads,
    wonLeads,
    lostLeads,
    newLeads,
    quotedLeads,
    prevTotalLeads,
    prevWonLeads,
    closeRate,
    prevCloseRate,
    marketingSpend,
    prevMarketingSpend,
    revenuePerLead,
    prevRevPerLead,
    costPerLead,
    cpa,
    cpaColor,
    avgJobValue,
    completedJobCount: completedWithVal.length,
    periodAvgJob,
    pipelineValue,
    pipelineDrafts,
    pipelineSent,
    outstandingTotal,
    outstandingCount: outstanding.length,
    overdueCount: overdueItems.length,
    oldestDays,
    weekLeadCount,
    weekJobsStarted,
    weekProposalsSent,
    weekPayments,
    monthlyGoalStr,
    goalForPeriod,
    goalPct,
    remaining,
    trendData,
  };
}

// ─── KPICommandCenter ─────────────────────────────────────────────────────────

export function KPICommandCenter() {
  const qc = useQueryClient();

  const [period, setPeriod] = useState<Period>(() => {
    if (typeof window === 'undefined') return 'monthly';
    return (localStorage.getItem(LS_KEY) as Period) ?? 'monthly';
  });

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState('');

  const { data, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['kpi-center', period],
    queryFn: () => fetchKPIData(period),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (dataUpdatedAt) {
      const mins = Math.floor((Date.now() - dataUpdatedAt) / 60000);
      setUpdatedLabel(mins < 1 ? 'just now' : `${mins}m ago`);
    }
  }, [dataUpdatedAt]);

  // Auto-refresh "updated X min ago" label every minute
  useEffect(() => {
    const id = setInterval(() => {
      if (dataUpdatedAt) {
        const mins = Math.floor((Date.now() - dataUpdatedAt) / 60000);
        setUpdatedLabel(mins < 1 ? 'just now' : `${mins}m ago`);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    localStorage.setItem(LS_KEY, p);
  }, []);

  const handleSaveGoal = useCallback(
    async (val: string) => {
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) {
        toast.error('Enter a valid amount');
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('business_settings')
        .upsert(
          {
            user_id: user.id,
            key: 'monthly_revenue_goal',
            value: String(num),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,key' }
        );
      if (error) {
        toast.error('Failed to save goal');
        return;
      }
      toast.success('Revenue goal saved');
      setShowGoalModal(false);
      qc.invalidateQueries({ queryKey: ['kpi-center', period] });
    },
    [period, qc]
  );

  const d = data;
  const pl = pLabel(period);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section>
      {showGoalModal && (
        <GoalModal
          current={d?.monthlyGoalStr ?? ''}
          onSave={handleSaveGoal}
          onClose={() => setShowGoalModal(false)}
        />
      )}

      {/* Section header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--c-text-3)',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            KPI Command Center
          </h2>
          {updatedLabel && (
            <span
              style={{ fontSize: 11, color: 'var(--c-text-5)', fontFamily: "'DM Mono', monospace" }}
            >
              Updated {updatedLabel}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Period pills */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              background: 'var(--c-sidebar)',
              border: '1px solid var(--c-border)',
              borderRadius: 99,
              padding: 3,
            }}
          >
            {(['weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                style={{
                  padding: '4px 14px',
                  border: 'none',
                  borderRadius: 99,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: period === p ? 700 : 500,
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: '0.05em',
                  textTransform: 'capitalize',
                  background: period === p ? 'var(--c-gold)' : 'transparent',
                  color: period === p ? '#1C1209' : 'var(--c-text-3)',
                  transition: 'background 150ms, color 150ms',
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            title="Refresh"
            style={{
              background: 'var(--c-nested)',
              border: '1px solid var(--c-border)',
              borderRadius: 8,
              padding: '5px 8px',
              cursor: 'pointer',
              color: 'var(--c-text-3)',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* ── ROW 1: Revenue · Goal Ring · Leads · Close Rate ─────────────── */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
          className="grid-cols-2 md:grid-cols-4"
        >
          {/* Card 1 — Total Revenue */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <span style={labelStyle}>Revenue</span>
                <DollarSign size={16} style={{ color: 'var(--c-gold)', flexShrink: 0 }} />
              </div>
              <div style={valueStyle}>{formatCurrency(d?.revenue ?? 0)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendBadge current={d?.revenue ?? 0} previous={d?.prevRevenue ?? 0} />
                <span style={subtextStyle}>vs last {pl}</span>
              </div>
              <div style={{ ...subtextStyle, marginTop: 4 }}>
                {(d?.revenue ?? 0) === 0
                  ? 'No revenue this ' + pl
                  : formatCurrency(d?.prevRevenue ?? 0) + ' last ' + pl}
              </div>
            </div>
          )}

          {/* Card 2 — Revenue Goal */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <span style={labelStyle}>Goal Progress</span>
                <button
                  onClick={() => setShowGoalModal(true)}
                  title="Set goal"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--c-text-4)',
                    padding: 0,
                    fontSize: 10,
                    fontFamily: "'DM Mono', monospace",
                    textDecoration: 'underline',
                  }}
                >
                  {d?.goalForPeriod ? 'Edit' : 'Set Goal'}
                </button>
              </div>

              {d?.goalForPeriod ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
                  <CircularRing pct={d.goalPct} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--c-text-1)',
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {formatCurrency(d.goalForPeriod)} goal
                    </div>
                    <div style={{ ...subtextStyle, marginTop: 4 }}>
                      {d.goalPct >= 100
                        ? '🎯 Goal reached!'
                        : `${formatCurrency(d.remaining ?? 0)} remaining`}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...valueStyle, fontSize: 16, color: 'var(--c-text-4)' }}>
                    No goal set
                  </div>
                  <button
                    onClick={() => setShowGoalModal(true)}
                    style={{
                      marginTop: 8,
                      background: 'var(--c-gold)',
                      color: '#1C1209',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    Set Monthly Goal
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Card 3 — Total Leads */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <span style={labelStyle}>Total Leads</span>
                <Target size={16} style={{ color: 'var(--c-sage-soft)', flexShrink: 0 }} />
              </div>
              <div style={valueStyle}>{d?.totalLeads ?? 0}</div>
              <div style={{ ...subtextStyle, lineHeight: 1.6 }}>
                {d && d.totalLeads > 0
                  ? `${d.newLeads} New · ${d.quotedLeads} Quoted · ${d.wonLeads} Won · ${d.lostLeads} Lost`
                  : `No leads this ${pl}`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <TrendBadge current={d?.totalLeads ?? 0} previous={d?.prevTotalLeads ?? 0} />
                <span style={subtextStyle}>vs last {pl}</span>
              </div>
            </div>
          )}

          {/* Card 4 — Close Rate */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <span style={labelStyle}>Close Rate</span>
              <div
                style={{
                  ...valueStyle,
                  color:
                    (d?.closeRate ?? 0) >= 30
                      ? '#4A9B56'
                      : (d?.closeRate ?? 0) >= 15
                        ? '#E6AB35'
                        : (d?.totalLeads ?? 0) === 0
                          ? 'var(--c-text-4)'
                          : '#B94A3A',
                }}
              >
                {d && d.totalLeads > 0 ? `${d.closeRate.toFixed(1)}%` : '—'}
              </div>
              <div style={subtextStyle}>
                {d && d.totalLeads > 0
                  ? `${d.wonLeads} won out of ${d.totalLeads} leads`
                  : `No leads this ${pl}`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <TrendBadge current={d?.closeRate ?? 0} previous={d?.prevCloseRate ?? 0} />
                <span style={subtextStyle}>vs last {pl}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── ROW 2: Rev/Lead · Cost/Lead · CPA ──────────────────────────── */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
          className="grid-cols-1 md:grid-cols-3"
        >
          {/* Card 5 — Revenue per Lead */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={labelStyle}>Revenue / Lead</span>
                <InfoTip text="Total revenue divided by total leads. Tells you the average value each new lead brings to the business." />
              </div>
              <div style={valueStyle}>
                {d?.revenuePerLead != null ? formatCurrency(d.revenuePerLead) : '—'}
              </div>
              {d?.revenuePerLead != null ? (
                <>
                  <div style={subtextStyle}>
                    Based on {d.totalLeads} leads · {formatCurrency(d.revenue)} revenue this {pl}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <TrendBadge current={d.revenuePerLead} previous={d.prevRevPerLead ?? 0} />
                    <span style={subtextStyle}>vs last {pl}</span>
                  </div>
                </>
              ) : (
                <div style={subtextStyle}>No leads this {pl} — divide by zero avoided</div>
              )}
            </div>
          )}

          {/* Card 6 — Cost per Lead */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={labelStyle}>Cost / Lead Acquired</span>
                <InfoTip text="How much you spend on advertising to acquire each lead. Lower is better. Pulls from expenses categorized as 'Advertising'." />
              </div>
              <div style={valueStyle}>
                {d && d.totalLeads > 0 ? formatCurrency(d.costPerLead) : '—'}
              </div>
              {d && d.marketingSpend === 0 ? (
                <div style={subtextStyle}>No advertising expenses logged this {pl}</div>
              ) : d && d.totalLeads > 0 ? (
                <div style={subtextStyle}>
                  {formatCurrency(d.marketingSpend)} ad spend ÷ {d.totalLeads} leads
                </div>
              ) : (
                <div style={subtextStyle}>No leads this {pl}</div>
              )}
            </div>
          )}

          {/* Card 7 — CPA (Cost per Closed Lead) */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={labelStyle}>Cost / Closed Lead (CPA)</span>
                <InfoTip text="Your real customer acquisition cost. Marketing spend ÷ won leads. Compare to avg job value to see ROI on your ad spend." />
              </div>
              <div style={{ ...valueStyle, color: d?.cpaColor ?? 'var(--c-text-1)' }}>
                {d?.cpa != null ? formatCurrency(d.cpa) : '—'}
              </div>
              {d?.cpa != null ? (
                <div style={subtextStyle}>
                  {formatCurrency(d.marketingSpend)} spend ÷ {d.wonLeads} won leads (
                  {d.closeRate.toFixed(1)}% close rate)
                </div>
              ) : (
                <div style={subtextStyle}>
                  {d?.wonLeads === 0 ? `No won leads this ${pl}` : 'No ad spend this ' + pl}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ROW 3: Pipeline · Avg Job · Outstanding · This Week ─────────── */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
          className="grid-cols-2 md:grid-cols-4"
        >
          {/* Card 8 — Open Pipeline */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <Link href="/proposals" style={{ textDecoration: 'none' }}>
              <div style={{ ...card, cursor: 'pointer' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={labelStyle}>Open Pipeline</span>
                  <Filter size={15} style={{ color: 'var(--c-gold)', flexShrink: 0 }} />
                </div>
                <div style={valueStyle}>{formatCurrency(d?.pipelineValue ?? 0)}</div>
                <div style={subtextStyle}>
                  {d?.pipelineSent ?? 0} proposals sent · {d?.pipelineDrafts ?? 0} drafts
                </div>
                <div
                  style={{
                    ...subtextStyle,
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--c-text-5)',
                  }}
                >
                  View proposals <ChevronRight size={10} />
                </div>
              </div>
            </Link>
          )}

          {/* Card 9 — Avg Job Value */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <span style={labelStyle}>Avg Job Value</span>
                <TrendingUp size={15} style={{ color: 'var(--c-sage-soft)', flexShrink: 0 }} />
              </div>
              <div style={valueStyle}>
                {d?.avgJobValue != null ? formatCurrency(d.avgJobValue) : '—'}
              </div>
              <div style={subtextStyle}>
                Lifetime avg · {d?.completedJobCount ?? 0} completed jobs
              </div>
              {d?.periodAvgJob != null && d?.avgJobValue != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <TrendBadge current={d.periodAvgJob} previous={d.avgJobValue} />
                  <span style={subtextStyle}>vs lifetime avg this {pl}</span>
                </div>
              )}
            </div>
          )}

          {/* Card 10 — Outstanding Invoices */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <Link href="/projects" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  ...card,
                  cursor: 'pointer',
                  borderColor:
                    (d?.overdueCount ?? 0) > 0 ? 'var(--c-danger-border)' : 'var(--c-border-light)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={labelStyle}>Outstanding</span>
                  {(d?.overdueCount ?? 0) > 0 ? (
                    <AlertTriangle size={15} style={{ color: 'var(--c-danger)', flexShrink: 0 }} />
                  ) : (
                    <DollarSign size={15} style={{ color: 'var(--c-text-4)', flexShrink: 0 }} />
                  )}
                </div>
                <div
                  style={{
                    ...valueStyle,
                    color: (d?.overdueCount ?? 0) > 0 ? 'var(--c-danger)' : 'var(--c-text-1)',
                  }}
                >
                  {(d?.outstandingTotal ?? 0) > 0 ? formatCurrency(d!.outstandingTotal) : '—'}
                </div>
                <div style={subtextStyle}>
                  {d?.outstandingCount ?? 0} projects with unpaid balance
                </div>
                {d?.oldestDays != null && (
                  <div style={{ ...subtextStyle, color: 'var(--c-danger)', marginTop: 4 }}>
                    Oldest: {d.oldestDays} days overdue
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Card 11 — This Week */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <span style={labelStyle}>This Week</span>
                <Zap size={15} style={{ color: 'var(--c-gold)', flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                {[
                  { label: 'Leads in', value: String(d?.weekLeadCount ?? 0) },
                  { label: 'Proposals sent', value: String(d?.weekProposalsSent ?? 0) },
                  { label: 'Jobs started', value: String(d?.weekJobsStarted ?? 0) },
                  { label: 'Payments', value: formatCurrency(d?.weekPayments ?? 0) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ ...subtextStyle, fontSize: 12 }}>{label}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--c-text-1)',
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Revenue Trend Chart ─────────────────────────────────────────── */}
        <div style={{ ...card, padding: '20px 24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 18,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--c-text-1)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '-0.01em',
                }}
              >
                Revenue & Lead Trend
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 11,
                  color: 'var(--c-text-4)',
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {period === 'yearly'
                  ? `${new Date().getFullYear()} by month`
                  : period === 'monthly'
                    ? 'Current month by week'
                    : 'Current week by day'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { c: '#E6AB35', n: 'Revenue' },
                { c: '#3583b3', n: 'Leads' },
              ].map(({ c, n }) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: c,
                      boxShadow: `0 0 5px ${c}80`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--c-text-4)',
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {n}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="skeleton" style={{ height: 180 }} />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={d?.trendData ?? []}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="var(--c-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{
                    fill: 'var(--c-text-4)',
                    fontSize: 11,
                    fontFamily: "'DM Mono', monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="rev"
                  orientation="left"
                  tick={{
                    fill: 'var(--c-text-4)',
                    fontSize: 10,
                    fontFamily: "'DM Mono', monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <YAxis
                  yAxisId="leads"
                  orientation="right"
                  tick={{
                    fill: 'var(--c-text-4)',
                    fontSize: 10,
                    fontFamily: "'DM Mono', monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <ReTooltip content={<ChartTooltip />} />
                <Line
                  yAxisId="rev"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#E6AB35"
                  strokeWidth={2}
                  dot={false}
                  type="monotone"
                />
                <Line
                  yAxisId="leads"
                  dataKey="leads"
                  name="Leads"
                  stroke="#3583b3"
                  strokeWidth={2}
                  dot={false}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
