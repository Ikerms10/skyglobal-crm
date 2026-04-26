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
  Clock, AlertTriangle, Activity, FileText, Calendar,
  BarChart2, ChevronRight, Receipt, Users, CheckCircle2, Award,
} from 'lucide-react';
import Link from 'next/link';
import { TodaysFocus } from '@/components/dashboard/TodaysFocus';
import { AgendaWidget } from '@/components/dashboard/AgendaWidget';
import { BibleVerse } from '@/components/dashboard/BibleVerse';

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
  'New Lead':      { bg: 'rgba(122,158,126,0.12)', text: '#4A6741', bar: '#7A9E7E' },
  'Estimate Sent': { bg: 'rgba(139,105,20,0.12)',  text: '#8B6914', bar: '#8B6914' },
  'Follow-up':     { bg: 'rgba(160,120,80,0.12)',  text: '#A07850', bar: '#A07850' },
  Won:             { bg: 'rgba(74,103,65,0.14)',   text: '#4A6741', bar: '#4A6741' },
  Lost:            { bg: 'rgba(185,74,58,0.10)',   text: '#B94A3A', bar: '#B94A3A' },
  'On Hold':       { bg: 'rgba(200,188,168,0.2)',  text: '#9a9585', bar: '#CFC4B4' },
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

// ── Tiny SVG sparkline ────────────────────────────────────────────────────────
function SparkLine({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const w = 72, h = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.75}
      />
    </svg>
  );
}

// ── Count-up hook — requestAnimationFrame, cubic ease-out ─────────────────────
function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (target === prev.current) return;
    const from = prev.current;
    const start = performance.now();
    let raf: number;
    const run = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) { raf = requestAnimationFrame(run); }
      else { setVal(target); prev.current = target; }
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
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

// ── 3-D perspective tilt card ─────────────────────────────────────────────────
function TiltCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const y = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    ref.current.style.transition = 'transform 0.08s ease';
    ref.current.style.transform  = `perspective(800px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg) translateY(-4px) scale(1.015)`;
  };
  const handleLeave = () => {
    if (!ref.current) return;
    ref.current.style.transition = 'transform 0.5s cubic-bezier(0.34,1.3,0.64,1)';
    ref.current.style.transform  = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
  };
  return (
    <div ref={ref} className={className} style={{ willChange: 'transform', ...style }}
      onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </div>
  );
}

// ── KPI Card — isolated component so useCountUp hook is valid ─────────────────
interface KPIKind {
  label: string;
  value: number;
  fmt: 'currency' | 'number';
  color: string;       // accent color (dark, readable on light card)
  iconColor: string;   // icon fill (slightly lighter)
  bg: string;          // warm-cream tinted base — high enough opacity to show over dark canvas
  border: string;
  glow: string;
  icon: React.ElementType;
  href: string;
  sub?: string;
  sparkline?: number[];
  trend?: number | null;
}

function KPICard({ kpi }: { kpi: KPIKind }) {
  const Icon = kpi.icon;
  const animated = useCountUp(kpi.value);
  const display  = kpi.fmt === 'currency'
    ? formatCurrency(animated)
    : animated.toLocaleString('en-US');

  const trendUp = (kpi.trend ?? 0) >= 0;

  return (
    // ios-glass supplies backdrop-filter + white inset highlight; we override bg + border
    <TiltCard
      className="ios-glass"
      style={{
        borderRadius: 22,
        background: kpi.bg,
        border: `1px solid ${kpi.border}`,
        boxShadow: `0 4px 32px ${kpi.glow}, 0 1px 0 rgba(255,255,255,0.75) inset`,
        cursor: 'pointer',
      }}
    >
      <Link href={kpi.href} style={{ display: 'flex', flexDirection: 'column', padding: '22px 22px 18px', textDecoration: 'none' }}>

        {/* Top: icon pill + trend badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: `rgba(255,255,255,0.72)`,
            border: `1px solid ${kpi.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 8px ${kpi.glow}, inset 0 1px 0 rgba(255,255,255,0.9)`,
          }}>
            <Icon size={20} style={{ color: kpi.iconColor }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {kpi.trend != null && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: trendUp ? '#2d6b28' : '#9b2c2c',
                background: trendUp ? 'rgba(45,107,40,0.12)' : 'rgba(155,44,44,0.10)',
                border: `1px solid ${trendUp ? 'rgba(45,107,40,0.22)' : 'rgba(155,44,44,0.18)'}`,
                borderRadius: 20, padding: '3px 8px',
                fontFamily: "'DM Mono', monospace",
              }}>
                {trendUp ? '▲' : '▼'} {Math.abs(kpi.trend).toFixed(0)}%
              </span>
            )}
            <ChevronRight size={13} style={{ color: kpi.color, opacity: 0.35, marginTop: 1 }} />
          </div>
        </div>

        {/* Big animated number */}
        <div style={{
          fontSize: 'clamp(1.55rem, 2vw, 1.95rem)',
          fontWeight: 800,
          color: kpi.color,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: 6,
        }}>
          {display}
        </div>

        {/* Label */}
        <p style={{
          fontSize: 10, fontWeight: 700,
          color: kpi.color,
          opacity: 0.65,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          {kpi.label}
        </p>

        {/* Bottom: sub-stat + sparkline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, minHeight: 28 }}>
          {kpi.sub
            ? <span style={{ fontSize: 11, color: kpi.color, fontFamily: "'DM Mono', monospace", fontWeight: 600, opacity: 0.75 }}>{kpi.sub}</span>
            : <span />
          }
          {kpi.sparkline && kpi.sparkline.length > 1 && (
            <SparkLine values={kpi.sparkline} color={kpi.color} />
          )}
        </div>

      </Link>
    </TiltCard>
  );
}

// ── Lead Stat Card — smaller, simpler, uses its own countUp ──────────────────
interface LeadStatKind {
  label: string;
  value: number;
  fmt?: 'number' | 'currency' | 'percent';
  color: string;
  iconColor: string;
  bg: string;
  border: string;
  glow: string;
  icon: React.ElementType;
  href: string;
  sub?: string;
}
function LeadStatCard({ stat }: { stat: LeadStatKind }) {
  const Icon = stat.icon;
  const animated = useCountUp(stat.value, 700);
  const display = stat.fmt === 'currency' ? formatCurrency(animated)
    : stat.fmt === 'percent' ? `${animated}%`
    : animated.toLocaleString('en-US');
  return (
    <Link href={stat.href} className="ios-glass"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 20px', textDecoration: 'none', borderRadius: 18,
        background: stat.bg, border: `1px solid ${stat.border}`,
        boxShadow: `0 4px 24px ${stat.glow}, 0 1px 0 rgba(255,255,255,0.7) inset`,
        transition: 'transform 0.22s cubic-bezier(0.34,1.3,0.64,1)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.015)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: 'rgba(255,255,255,0.72)',
        border: `1px solid ${stat.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 2px 8px ${stat.glow}`,
      }}>
        <Icon size={18} style={{ color: stat.iconColor }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color, fontFamily: "'DM Mono', monospace", letterSpacing: '-0.03em', lineHeight: 1 }}>
          {display}
        </div>
        <p style={{ fontSize: 10, fontWeight: 700, color: stat.color, opacity: 0.6, fontFamily: "'DM Mono', monospace", letterSpacing: '0.09em', textTransform: 'uppercase', margin: '3px 0 0' }}>
          {stat.label}
        </p>
        {stat.sub && <p style={{ fontSize: 10, color: stat.color, opacity: 0.5, fontFamily: "'DM Mono', monospace", margin: '1px 0 0' }}>{stat.sub}</p>}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('Month');
  const [time, setTime]           = useState('');
  const shouldReduceMotion        = useReducedMotion();

  // Live clock
  useEffect(() => {
    const tick = () => setTime(
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
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

      const revenue       = projects.filter(p => p.status === 'In Progress' || p.status === 'Completed')
        .reduce((s, p) => s + (p.contract_value ?? 0), 0);
      const totalExpenses = [...expenses.map(e => e.amount), ...projExp.map(e => e.amount)].reduce((s, a) => s + a, 0);
      const profit        = revenue - totalExpenses;
      const margin        = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

      // 6-month chart data
      const chartData = Array.from({ length: 6 }, (_, i) => {
        const d   = subMonths(new Date(), 5 - i);
        const mon = d.toLocaleDateString('en-US', { month: 'short' });
        const yr  = d.getFullYear();
        const rev = (allProjRes.data ?? []).filter(p => {
          const pd = new Date(p.created_at);
          return pd.toLocaleDateString('en-US', { month: 'short' }) === mon
            && pd.getFullYear() === yr
            && (p.status === 'In Progress' || p.status === 'Completed');
        }).reduce((s, p) => s + (p.contract_value ?? 0), 0);
        const exp = [
          ...(allExpRes.data ?? []).filter(e => {
            const ed = new Date(e.date);
            return ed.toLocaleDateString('en-US', { month: 'short' }) === mon && ed.getFullYear() === yr;
          }).map(e => e.amount),
          ...(allProjExpRes.data ?? []).filter(e => {
            const ed = new Date(e.date);
            return ed.toLocaleDateString('en-US', { month: 'short' }) === mon && ed.getFullYear() === yr;
          }).map(e => e.amount),
        ].reduce((s, a) => s + a, 0);
        return { month: mon, revenue: Math.round(rev), expenses: Math.round(exp), profit: Math.round(rev - exp) };
      });

      // Month-over-month trends
      const lastRev  = chartData[5]?.revenue  ?? 0;
      const prevRev  = chartData[4]?.revenue  ?? 0;
      const lastProf = chartData[5]?.profit   ?? 0;
      const prevProf = chartData[4]?.profit   ?? 0;
      const revTrend  = prevRev  > 0 ? Math.round(((lastRev  - prevRev)  / prevRev)  * 100) : null;
      const profTrend = prevProf > 0 ? Math.round(((lastProf - prevProf) / Math.abs(prevProf)) * 100) : null;

      const stages       = ['New Lead', 'Estimate Sent', 'Follow-up', 'Won', 'Lost', 'On Hold'];
      const stageCounts  = Object.fromEntries(stages.map(s => [s, leads.filter(l => l.stage === s).length]));
      const revenueSparkline = chartData.map(d => d.revenue);

      const wonLeads   = leads.filter(l => l.stage === 'Won').length;
      const lostLeads  = leads.filter(l => l.stage === 'Lost').length;
      const openLeads  = leads.filter(l => !['Won', 'Lost', 'On Hold'].includes(l.stage)).length;
      const pipelineValue = leads
        .filter(l => !['Won', 'Lost', 'On Hold'].includes(l.stage))
        .reduce((s, l) => s + (l.estimated_value ?? 0), 0);
      const conversionRate = (wonLeads + lostLeads) > 0
        ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100)
        : 0;

      return {
        revenue, totalExpenses, profit, margin,
        wonLeads,
        lostLeads,
        openLeads,
        pipelineValue,
        conversionRate,
        totalLeads:     leads.length,
        activeProjects: projects.filter(p => p.status === 'In Progress' || p.status === 'Scheduled').length,
        chartData, stageCounts,
        activities: activitiesRes.data ?? [],
        followUps:  followUpsRes.data  ?? [],
        overdue:    overdueRes.data    ?? [],
        revenueSparkline,
        revTrend,
        profTrend,
      };
    },
    staleTime: 60_000,
  });

  const maxStageCount = Math.max(...Object.values(data?.stageCounts ?? {}).map(Number), 1);

  const kpis: KPIKind[] = [
    {
      label: 'Revenue',
      value: data?.revenue        ?? 0,
      fmt: 'currency',
      // Warm gold-cream glass — opaque enough to read over dark canvas
      color: '#7A5210',
      iconColor: '#A87820',
      bg: 'rgba(255,248,222,0.88)',
      border: 'rgba(200,150,40,0.32)',
      glow: 'rgba(230,171,53,0.20)',
      icon: DollarSign,
      href: '/reports',
      sparkline: data?.revenueSparkline,
      trend: data?.revTrend,
    },
    {
      label: 'Gross Profit',
      value: data?.profit         ?? 0,
      fmt: 'currency',
      // Sage-cream glass
      color: '#2E5C28',
      iconColor: '#4A7A42',
      bg: 'rgba(228,245,230,0.88)',
      border: 'rgba(74,103,65,0.28)',
      glow: 'rgba(74,103,65,0.16)',
      icon: TrendingUp,
      href: '/reports',
      sub: data?.margin != null ? `${data.margin}% margin` : undefined,
      trend: data?.profTrend,
    },
    {
      label: 'Active Projects',
      value: data?.activeProjects ?? 0,
      fmt: 'number',
      // Warm amber-cream glass — no blue, stays within warm palette
      color: '#7A4E10',
      iconColor: '#A06820',
      bg: 'rgba(255,242,218,0.88)',
      border: 'rgba(180,120,40,0.28)',
      glow: 'rgba(180,120,40,0.16)',
      icon: Briefcase,
      href: '/projects',
    },
    {
      label: 'Pipeline Leads',
      value: data?.totalLeads     ?? 0,
      fmt: 'number',
      // Terracotta-cream glass
      color: '#7A3418',
      iconColor: '#A04828',
      bg: 'rgba(255,238,228,0.88)',
      border: 'rgba(185,80,50,0.26)',
      glow: 'rgba(185,80,50,0.14)',
      icon: Target,
      href: '/leads',
      sub: data?.wonLeads ? `${data.wonLeads} won` : undefined,
    },
  ];

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.07, duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] },
  });

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--c-canvas)', overflow: 'hidden' }}>

      {/* Ambient orbs */}
      <div className="dash-orb dash-orb-gold" aria-hidden="true" />
      <div className="dash-orb dash-orb-sage" aria-hidden="true" />
      <div className="dash-orb dash-orb-warm" aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px', maxWidth: 1360, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }} className="p-4 md:p-8">

        {/* ROW 0 — Bible verse of the day */}
        <motion.div {...stagger(0)}>
          <BibleVerse />
        </motion.div>

        {/* ROW 1 — Hero glass card */}
        <motion.div {...stagger(1)}>
          <div className="ios-glass bento-card" style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                {todayLabel()} · Orlando, FL
              </p>
              <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.035em', lineHeight: 1.1 }}>
                {greeting()},&nbsp;<span className="value-shimmer">Iker</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--c-text-3)', margin: '8px 0 0', fontFamily: "'DM Mono', monospace" }}>
                Here's what needs your attention today.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {/* Live clock */}
              <div className="ios-glass-gold" style={{ padding: '16px 24px', textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontSize: 'clamp(1.4rem, 2vw, 1.75rem)', fontWeight: 800, color: '#8B6914', fontFamily: "'DM Mono', monospace", letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {time.split(':')[0]}<span className="time-colon">:</span>{time.slice(time.indexOf(':') + 1)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--c-text-3)', marginTop: 4, fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Local Time
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
                    transition: 'all 180ms ease',
                    boxShadow: timeframe === tf.value ? '0 2px 8px rgba(230,171,53,0.2)' : 'none',
                  }}>
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ROW 2 — KPI Command Center */}
        <motion.div {...stagger(2)}>
          {/* Section label with live pulse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span className="live-dot" aria-hidden="true" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Command Center · Live
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 168, borderRadius: 22 }} />
                ))
              : kpis.map(kpi => <KPICard key={kpi.label} kpi={kpi} />)
            }
          </div>
        </motion.div>

        {/* ROW 3 — Lead KPIs */}
        <motion.div {...stagger(3)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Target size={11} style={{ color: '#A04828' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Leads Overview
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 18 }} />)
              : ([
                  { label: 'Open Leads',     value: data?.openLeads ?? 0,     fmt: 'number'  as const, icon: Target,        color: '#7A3C14', iconColor: '#A05020', bg: 'rgba(255,238,220,0.88)', border: 'rgba(185,80,40,0.26)',  glow: 'rgba(185,80,40,0.14)',  href: '/leads', sub: `of ${data?.totalLeads ?? 0} total` },
                  { label: 'Won',            value: data?.wonLeads ?? 0,      fmt: 'number'  as const, icon: CheckCircle2,   color: '#2A5822', iconColor: '#3E7A32', bg: 'rgba(220,248,224,0.88)', border: 'rgba(60,120,50,0.26)',  glow: 'rgba(60,120,50,0.14)',  href: '/leads', sub: 'this period' },
                  { label: 'Pipeline Value', value: data?.pipelineValue ?? 0, fmt: 'currency'as const, icon: DollarSign,     color: '#7A5210', iconColor: '#A87820', bg: 'rgba(255,248,222,0.88)', border: 'rgba(200,150,40,0.28)', glow: 'rgba(200,150,40,0.14)', href: '/leads', sub: 'est. value' },
                  { label: 'Win Rate',       value: data?.conversionRate ?? 0,fmt: 'percent' as const, icon: Award,          color: '#5C3A7A', iconColor: '#7A52A0', bg: 'rgba(240,228,255,0.88)', border: 'rgba(120,80,180,0.24)', glow: 'rgba(120,80,180,0.12)', href: '/leads', sub: `${data?.lostLeads ?? 0} lost` },
                ] as LeadStatKind[]).map(stat => <LeadStatCard key={stat.label} stat={stat} />)
            }
          </div>
        </motion.div>

        {/* ROW 4 — Today's Focus */}
        <motion.div {...stagger(4)}>
          <div className="ios-glass bento-card" style={{ padding: '22px 26px' }}>
            <TodaysFocus />
          </div>
        </motion.div>

        {/* ROW 5 — Revenue chart + Pipeline */}
        <motion.div {...stagger(5)} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>

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

          <div className="ios-glass bento-card" style={{ padding: '24px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>Pipeline</h3>
              <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--c-gold)', textDecoration: 'none', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                {data?.totalLeads ?? 0} leads <ArrowRight size={11} />
              </Link>
            </div>
            {isLoading
              ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 12 }} />)}</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {Object.entries(data?.stageCounts ?? {}).filter(([, c]) => Number(c) > 0).map(([stage, count]) => {
                    const sc  = STAGE_COLORS[stage] ?? STAGE_COLORS['On Hold'];
                    const pct = Math.round((Number(count) / maxStageCount) * 100);
                    return (
                      <Link key={stage} href="/leads" className="pipeline-pill" style={{ background: sc.bg, border: `1px solid ${sc.bar}25`, textDecoration: 'none' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: sc.text, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stage}</p>
                          <div style={{ height: 3, borderRadius: 2, background: `${sc.bar}25`, marginTop: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: sc.bar, boxShadow: `0 0 6px ${sc.bar}60`, transition: 'width 700ms cubic-bezier(0.34,1.3,0.64,1)' }} />
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

        {/* ROW 6 — Activity + Follow-ups + Overdue */}
        <motion.div {...stagger(6)} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>

          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Activity</h3>
              <Activity size={14} style={{ color: 'var(--c-sage)' }} />
            </div>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 10 }} />)
              : (data?.activities ?? []).length > 0
                ? (data!.activities as Array<{ id: string; type: string; content: string | null; created_at: string; customer_id: string }>).map(a => (
                    <Link key={a.id} href={a.customer_id ? `/customers/${a.customer_id}` : '/customers'}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 10, marginBottom: 2, textDecoration: 'none', transition: 'background 150ms' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
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

          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Follow-ups</h3>
              <Clock size={14} style={{ color: '#8B6914' }} />
            </div>
            {(data?.followUps ?? []).length > 0
              ? (data!.followUps as unknown as Array<{ id: string; title: string; follow_up_date: string | null; customers: { name: string } | null }>).map(f => {
                  const isToday = f.follow_up_date === new Date().toISOString().split('T')[0];
                  return (
                    <Link key={f.id} href="/leads" className="ios-glass-gold"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginBottom: 6, textDecoration: 'none', transition: 'transform 150ms' }}
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
              : <p style={{ fontSize: 13, color: 'var(--c-text-4)', textAlign: 'center', padding: '20px 0', fontFamily: "'DM Mono', monospace" }}>No upcoming follow-ups</p>
            }
          </div>

          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Overdue Payments</h3>
              <AlertTriangle size={14} style={{ color: '#B94A3A' }} />
            </div>
            {(data?.overdue ?? []).length > 0
              ? (data!.overdue as unknown as Array<{ id: string; title: string; customer_id: string; contract_value: number | null; amount_paid: number; customers: { name: string } | null }>).map(p => (
                  <Link key={p.id} href={`/customers/${p.customer_id}/projects/${p.id}`} className="ios-glass-danger"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginBottom: 6, textDecoration: 'none', transition: 'transform 150ms' }}
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

        {/* ROW 7 — Quick Actions */}
        <motion.div {...stagger(7)}>
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

        {/* ROW 8 — Agenda */}
        <motion.div {...stagger(8)}>
          <AgendaWidget />
        </motion.div>

      </div>
    </div>
  );
}
