'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow, subMonths, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import {
  DollarSign, Briefcase, Target, TrendingUp, ArrowRight,
  Clock, AlertTriangle, Activity, Plus, FileText, Calendar,
  BarChart2, ChevronRight, Zap, Receipt, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TodaysFocus } from '@/components/dashboard/TodaysFocus';
import { AgendaWidget } from '@/components/dashboard/AgendaWidget';
import { BibleVerse } from '@/components/dashboard/BibleVerse';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

type Timeframe = 'Week' | 'Month' | 'Year' | 'All';

function getStartDate(tf: Timeframe): string | null {
  const now = new Date();
  if (tf === 'Week')  return startOfWeek(now).toISOString();
  if (tf === 'Month') return startOfMonth(now).toISOString();
  if (tf === 'Year')  return startOfYear(now).toISOString();
  return null;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: 'Week', value: 'Week' },
  { label: 'Month', value: 'Month' },
  { label: 'Year', value: 'Year' },
  { label: 'All', value: 'All' },
];

const STAGE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  'New Lead':     { bg: 'rgba(122,158,126,0.12)', text: '#4A6741', bar: '#7A9E7E' },
  'Estimate Sent':{ bg: 'rgba(139,105,20,0.12)',  text: '#8B6914', bar: '#8B6914' },
  'Follow-up':    { bg: 'rgba(160,120,80,0.12)',  text: '#A07850', bar: '#A07850' },
  Won:            { bg: 'rgba(74,103,65,0.14)',   text: '#4A6741', bar: '#4A6741' },
  Lost:           { bg: 'rgba(185,74,58,0.10)',   text: '#B94A3A', bar: '#B94A3A' },
  'On Hold':      { bg: 'rgba(200,188,168,0.2)',  text: '#9a9585', bar: '#CFC4B4' },
};

const QUICK_ACTIONS = [
  { label: 'New Lead',     href: '/leads',     icon: Target,   bg: 'rgba(74,103,65,0.14)',  color: '#4A6741' },
  { label: 'New Project',  href: '/projects',  icon: Briefcase,bg: 'rgba(91,140,187,0.14)', color: '#5B8CBB' },
  { label: 'New Proposal', href: '/proposals', icon: FileText, bg: 'rgba(139,105,20,0.14)', color: '#8B6914' },
  { label: 'New Invoice',  href: '/invoices',  icon: Receipt,  bg: 'rgba(160,120,80,0.14)', color: '#A07850' },
  { label: 'Schedule',     href: '/schedule',  icon: Calendar, bg: 'rgba(122,158,126,0.14)',color: '#7A9E7E' },
  { label: 'Reports',      href: '/reports',   icon: BarChart2,bg: 'rgba(167,139,250,0.14)',color: '#A78BFA' },
  { label: 'Customers',    href: '/customers', icon: Users,    bg: 'rgba(185,74,58,0.10)',  color: '#B94A3A' },
];

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ios-glass" style={{ padding: '10px 14px', fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ color: 'var(--c-text-3)', marginBottom: 4, fontWeight: 500 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 700, margin: '2px 0', fontFamily: "'DM Mono', monospace" }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

function TiltCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const y = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    ref.current.style.transform = `perspective(800px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg) translateY(-3px)`;
  };
  const handleLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
    ref.current.style.transition = 'transform 0.4s cubic-bezier(0.34,1.3,0.64,1)';
  };
  const handleEnter = () => {
    if (!ref.current) ref.current!.style.transition = 'transform 0.08s ease';
  };
  return (
    <div ref={ref} className={className} style={{ willChange: 'transform', ...style }}
      onMouseMove={handleMove} onMouseLeave={handleLeave} onMouseEnter={handleEnter}>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [timeframe, setTimeframe]   = useState<Timeframe>('Month');
  const [time, setTime]             = useState('');
  const shouldReduceMotion          = useReducedMotion();
  const router = useRouter();

  // Live clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', timeframe],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const startDate = getStartDate(timeframe);
      const fallbackId = '00000000-0000-0000-0000-000000000000';
      const today = new Date().toISOString().split('T')[0];

      const [
        projectsRes, leadsRes, expensesRes, projectExpensesRes,
        activitiesRes, allProjRes, allExpRes, allProjExpRes,
        followUpsRes, overdueRes,
      ] = await Promise.all([
        supabase.from('projects').select('id,contract_value,amount_paid,payment_status,status,created_at,customer_id,title,customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', startDate ?? fallbackId),
        supabase.from('leads').select('id,stage,source,estimated_value,follow_up_date,title,customer_id,created_at')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', startDate ?? fallbackId),
        supabase.from('expenses').select('id,amount,category,date')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'date' : 'id', startDate ? startDate.split('T')[0] : fallbackId),
        supabase.from('project_expenses').select('id,amount,date').eq('user_id', user.id),
        supabase.from('activities').select('id,type,content,created_at,customer_id')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
        supabase.from('projects').select('contract_value,created_at,status').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('expenses').select('amount,date').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('project_expenses').select('amount,date').eq('user_id', user.id),
        supabase.from('leads').select('id,title,follow_up_date,customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .lte('follow_up_date', subMonths(new Date(), -1).toISOString().split('T')[0])
          .gte('follow_up_date', today).not('stage', 'in', '("Won","Lost")')
          .order('follow_up_date', { ascending: true }).limit(5),
        supabase.from('projects').select('id,title,contract_value,amount_paid,customer_id,customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .in('payment_status', ['Unpaid', 'Partial', 'Overdue']).lt('end_date', today).limit(4),
      ]);

      const projects = projectsRes.data ?? [];
      const leads    = leadsRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const projExp  = projectExpensesRes.data ?? [];

      const revenue = projects.filter(p => p.status === 'In Progress' || p.status === 'Completed')
        .reduce((s, p) => s + (p.contract_value ?? 0), 0);
      const totalExpenses = [...expenses.map(e => e.amount), ...projExp.map(e => e.amount)].reduce((s, a) => s + a, 0);
      const profit = revenue - totalExpenses;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

      const chartData = Array.from({ length: 6 }, (_, i) => {
        const d  = subMonths(new Date(), 5 - i);
        const m  = d.toLocaleDateString('en-US', { month: 'short' });
        const yr = d.getFullYear();
        const rev = (allProjRes.data ?? []).filter(p => {
          const pd = new Date(p.created_at);
          return pd.toLocaleDateString('en-US', { month: 'short' }) === m && pd.getFullYear() === yr
            && (p.status === 'In Progress' || p.status === 'Completed');
        }).reduce((s, p) => s + (p.contract_value ?? 0), 0);
        const exp = [
          ...(allExpRes.data ?? []).filter(e => { const ed = new Date(e.date); return ed.toLocaleDateString('en-US', { month: 'short' }) === m && ed.getFullYear() === yr; }).map(e => e.amount),
          ...(allProjExpRes.data ?? []).filter(e => { const ed = new Date(e.date); return ed.toLocaleDateString('en-US', { month: 'short' }) === m && ed.getFullYear() === yr; }).map(e => e.amount),
        ].reduce((s, a) => s + a, 0);
        return { month: m, revenue: Math.round(rev), expenses: Math.round(exp) };
      });

      const stages = ['New Lead', 'Estimate Sent', 'Follow-up', 'Won', 'Lost', 'On Hold'];
      const stageCounts = Object.fromEntries(stages.map(s => [s, leads.filter(l => l.stage === s).length]));
      const revenueSparkline = chartData.map(d => d.revenue);

      return {
        revenue, totalExpenses, profit, margin,
        wonLeads: leads.filter(l => l.stage === 'Won').length,
        totalLeads: leads.length,
        activeProjects: projects.filter(p => p.status === 'In Progress' || p.status === 'Scheduled').length,
        chartData, stageCounts,
        activities: activitiesRes.data ?? [],
        followUps:  followUpsRes.data ?? [],
        overdue:    overdueRes.data ?? [],
        revenueSparkline,
      };
    },
    staleTime: 60_000,
  });

  const maxStageCount = Math.max(...Object.values(data?.stageCounts ?? {}).map(Number), 1);

  const kpis = [
    { label: 'Revenue',        value: data?.revenue ?? 0,        fmt: 'currency', color: '#8B6914', bg: 'rgba(230,171,53,0.10)', border: 'rgba(230,171,53,0.25)', icon: DollarSign, href: '/reports',  sparkline: data?.revenueSparkline },
    { label: 'Gross Profit',   value: data?.profit ?? 0,         fmt: 'currency', color: '#4A6741', bg: 'rgba(74,103,65,0.09)',  border: 'rgba(74,103,65,0.22)',  icon: TrendingUp, href: '/reports',  sub: data?.margin != null ? `${data.margin}% margin` : undefined },
    { label: 'Active Projects',value: data?.activeProjects ?? 0, fmt: 'number',   color: '#5B8CBB', bg: 'rgba(91,140,187,0.09)', border: 'rgba(91,140,187,0.22)', icon: Briefcase,  href: '/projects' },
    { label: 'Leads',          value: data?.totalLeads ?? 0,     fmt: 'number',   color: '#A07850', bg: 'rgba(160,120,80,0.09)', border: 'rgba(160,120,80,0.22)', icon: Target,     href: '/leads',   sub: data?.wonLeads ? `${data.wonLeads} won` : undefined },
  ];

  const stagger = (i: number) => ({ initial: { opacity: 0, y: shouldReduceMotion ? 0 : 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } });

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--c-canvas)', overflow: 'hidden' }}>
      {/* ── Ambient orbs ── */}
      <div className="dash-orb dash-orb-gold"  aria-hidden="true" />
      <div className="dash-orb dash-orb-sage"  aria-hidden="true" />
      <div className="dash-orb dash-orb-warm"  aria-hidden="true" />

      {/* ── Page content ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px', maxWidth: 1360, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }} className="p-4 md:p-8">

        {/* ── ROW 1: Hero glass card ── */}
        <motion.div {...stagger(0)}>
          <div className="ios-glass bento-card" style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                {todayLabel()} · Orlando, FL
              </p>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.035em', lineHeight: 1.1 }}>
                {greeting()},&nbsp;<span className="value-shimmer">Iker</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--c-text-3)', margin: '8px 0 0', fontFamily: "'DM Mono', monospace" }}>
                Here's what needs your attention today.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {/* Live clock */}
              <div className="ios-glass-gold" style={{ padding: '14px 22px', textAlign: 'center', minWidth: 110 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8B6914', fontFamily: "'DM Mono', monospace", letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {time.split(':')[0]}<span className="time-colon">:</span>{time.slice(time.indexOf(':') + 1)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--c-text-3)', marginTop: 3, fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em' }}>
                  LOCAL TIME
                </div>
              </div>

              {/* Timeframe selector */}
              <div style={{ display: 'flex', gap: 3, padding: 4, background: 'rgba(28,18,9,0.06)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
                {TIMEFRAMES.map(tf => (
                  <button key={tf.value} onClick={() => setTimeframe(tf.value)} style={{
                    padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: timeframe === tf.value ? 700 : 500,
                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                    background: timeframe === tf.value ? 'rgba(230,171,53,0.18)' : 'transparent',
                    color: timeframe === tf.value ? '#8B6914' : 'var(--c-text-3)',
                    transition: 'all 150ms',
                    boxShadow: timeframe === tf.value ? '0 2px 8px rgba(230,171,53,0.2)' : 'none',
                  }}>
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── ROW 2: KPI stat bubbles ── */}
        <motion.div {...stagger(1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="grid-cols-2 md:grid-cols-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            const fmtVal = kpi.fmt === 'currency'
              ? formatCurrency(kpi.value)
              : kpi.value.toLocaleString('en-US');
            return (
              <TiltCard key={kpi.label} className="stat-bubble" style={{ borderRadius: 20, background: kpi.bg, backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: `1px solid ${kpi.border}`, boxShadow: `0 4px 24px ${kpi.bg}, inset 0 1px 0 rgba(255,255,255,0.45)` }}>
                <Link href={kpi.href} style={{ display: 'block', padding: '22px 20px', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: `rgba(255,255,255,0.5)`, border: `1px solid ${kpi.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <Icon size={18} style={{ color: kpi.color }} />
                    </div>
                    <ChevronRight size={14} style={{ color: kpi.color, opacity: 0.5, marginTop: 4 }} />
                  </div>
                  {isLoading
                    ? <div className="skeleton" style={{ height: 36, width: 100, marginBottom: 6 }} />
                    : <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpi.color, fontFamily: "'DM Mono', monospace", letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>
                        {fmtVal}
                      </div>
                  }
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
                    {kpi.label}
                  </p>
                  {kpi.sub && <p style={{ fontSize: 11, color: kpi.color, margin: '3px 0 0', fontFamily: "'DM Mono', monospace", fontWeight: 600, opacity: 0.8 }}>{kpi.sub}</p>}
                </Link>
              </TiltCard>
            );
          })}
        </motion.div>

        {/* ── ROW 3: Today's Focus ── */}
        <motion.div {...stagger(2)}>
          <div className="ios-glass bento-card" style={{ padding: '22px 26px' }}>
            <TodaysFocus />
          </div>
        </motion.div>

        {/* ── ROW 4: Chart + Pipeline ── */}
        <motion.div {...stagger(3)} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }} className="grid-cols-1 md:grid-cols-[3fr_2fr]">

          {/* Revenue chart */}
          <Link href="/reports" style={{ textDecoration: 'none' }}>
            <div className="ios-glass bento-card" style={{ padding: '24px 28px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                    Revenue vs Expenses
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: '2px 0 0', fontFamily: "'DM Mono', monospace" }}>Last 6 months · tap to view reports</p>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  {[{ c: '#8B6914', n: 'Revenue' }, { c: '#B94A3A', n: 'Expenses' }].map(({ c, n }) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}80` }} />
                      <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              {isLoading
                ? <div className="skeleton" style={{ height: 180 }} />
                : <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={data?.chartData ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#8B6914" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#8B6914" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="exp-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#B94A3A" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#B94A3A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fill: 'var(--c-text-3)', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="revenue"  name="Revenue"  stroke="#8B6914" strokeWidth={2} fill="url(#rev-grad)" dot={false} />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#B94A3A" strokeWidth={2} fill="url(#exp-grad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
              }
            </div>
          </Link>

          {/* Pipeline stages */}
          <div className="ios-glass bento-card" style={{ padding: '24px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                Pipeline
              </h3>
              <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--c-gold)', textDecoration: 'none', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                {data?.totalLeads ?? 0} leads <ArrowRight size={11} />
              </Link>
            </div>
            {isLoading
              ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 12 }} />)}</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {Object.entries(data?.stageCounts ?? {}).filter(([, c]) => Number(c) > 0).map(([stage, count]) => {
                    const sc = STAGE_COLORS[stage] ?? STAGE_COLORS['On Hold'];
                    const pct = Math.round((Number(count) / maxStageCount) * 100);
                    return (
                      <Link key={stage} href="/leads" className="pipeline-pill" style={{ background: sc.bg, border: `1px solid ${sc.bar}25`, textDecoration: 'none' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: sc.text, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stage}</p>
                          <div style={{ height: 3, borderRadius: 2, background: `${sc.bar}25`, marginTop: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: sc.bar, boxShadow: `0 0 6px ${sc.bar}60`, transition: 'width 600ms ease' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: sc.text, fontFamily: "'DM Mono', monospace", marginLeft: 12, flexShrink: 0 }}>{String(count)}</span>
                      </Link>
                    );
                  })}
                </div>
            }
          </div>
        </motion.div>

        {/* ── ROW 5: Activity + Follow-ups + Overdue ── */}
        <motion.div {...stagger(4)} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="grid-cols-1 md:grid-cols-3">

          {/* Recent activity */}
          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Activity</h3>
              <Activity size={14} style={{ color: 'var(--c-sage)' }} />
            </div>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 10 }} />)
              : (data?.activities ?? []).length > 0
                ? (data!.activities as Array<{ id: string; type: string; content: string | null; created_at: string; customer_id: string }>).map(a => (
                    <Link key={a.id} href={a.customer_id ? `/customers/${a.customer_id}` : '/customers'} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 10, marginBottom: 2, textDecoration: 'none', transition: 'background 150ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-sage)', flexShrink: 0, marginTop: 5, boxShadow: '0 0 6px var(--c-sage)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.type}</p>
                        {a.content && <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.content}</p>}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--c-text-4)', flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: false }).replace('about ', '')}
                      </span>
                    </Link>
                  ))
                : <p style={{ fontSize: 13, color: 'var(--c-text-4)', textAlign: 'center', padding: '20px 0', fontFamily: "'DM Mono', monospace" }}>No recent activity</p>
            }
          </div>

          {/* Follow-ups */}
          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Follow-ups</h3>
              <Clock size={14} style={{ color: '#8B6914' }} />
            </div>
            {(data?.followUps ?? []).length > 0
              ? (data!.followUps as unknown as Array<{ id: string; title: string; follow_up_date: string | null; customers: { name: string } | null }>).map(f => {
                  const isToday = f.follow_up_date === new Date().toISOString().split('T')[0];
                  return (
                    <Link key={f.id} href="/leads" className="ios-glass-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginBottom: 6, textDecoration: 'none', transition: 'transform 150ms' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: 0 }}>{(f.customers as any)?.name}</p>
                      </div>
                      <span style={{ fontSize: 11, color: isToday ? '#8B6914' : 'var(--c-text-3)', fontWeight: isToday ? 700 : 400, flexShrink: 0, marginLeft: 8, fontFamily: "'DM Mono', monospace" }}>
                        {isToday ? 'Today' : f.follow_up_date}
                      </span>
                    </Link>
                  );
                })
              : <p style={{ fontSize: 13, color: 'var(--c-text-4)', textAlign: 'center', padding: '20px 0', fontFamily: "'DM Mono', monospace" }}>No upcoming follow-ups 🎉</p>
            }
          </div>

          {/* Overdue payments */}
          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Overdue Payments</h3>
              <AlertTriangle size={14} style={{ color: '#B94A3A' }} />
            </div>
            {(data?.overdue ?? []).length > 0
              ? (data!.overdue as unknown as Array<{ id: string; title: string; customer_id: string; contract_value: number | null; amount_paid: number; customers: { name: string } | null }>).map(p => (
                  <Link key={p.id} href={`/customers/${p.customer_id}/projects/${p.id}`} className="ios-glass-danger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginBottom: 6, textDecoration: 'none', transition: 'transform 150ms' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: 0 }}>{(p.customers as any)?.name}</p>
                    </div>
                    <span style={{ fontSize: 12, color: '#B94A3A', fontWeight: 700, flexShrink: 0, marginLeft: 8, fontFamily: "'DM Mono', monospace" }}>
                      {formatCurrency(Math.max(0, (p.contract_value ?? 0) - (p.amount_paid ?? 0)))}
                    </span>
                  </Link>
                ))
              : <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: 22, margin: '0 0 4px' }} className="float-anim">✅</p>
                  <p style={{ fontSize: 12, color: 'var(--c-sage)', fontFamily: "'DM Mono', monospace", margin: 0, fontWeight: 600 }}>All paid up</p>
                  <Link href="/invoices" style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", textDecoration: 'none', display: 'block', marginTop: 4 }}>View invoices →</Link>
                </div>
            }
          </div>
        </motion.div>

        {/* ── ROW 6: Quick Actions ── */}
        <motion.div {...stagger(5)}>
          <div className="ios-glass bento-card" style={{ padding: '20px 28px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 16px' }}>Quick Actions</p>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
              {QUICK_ACTIONS.map(({ label, href, icon: Icon, bg, color }) => (
                <Link key={label} href={href} className="quick-action-btn">
                  <div className="quick-action-icon" style={{ background: bg }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-2)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── ROW 7: Agenda + Bible ── */}
        <motion.div {...stagger(6)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="grid-cols-1 md:grid-cols-2">
          <AgendaWidget />
          <BibleVerse />
        </motion.div>

      </div>
    </div>
  );
}
