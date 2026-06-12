'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { getDateRange, toDateOnly } from '@/lib/date-utils';
import { formatDistanceToNow, subMonths } from 'date-fns';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import {
  DollarSign, Briefcase, Target, TrendingUp, ArrowRight,
  Clock, AlertTriangle, Activity, Calendar,
  BarChart2, ChevronRight, Receipt, Users, CheckCircle2, Award,
} from 'lucide-react';
import Link from 'next/link';
import { TodaysFocus } from '@/components/dashboard/TodaysFocus';
import { AgendaWidget } from '@/components/dashboard/AgendaWidget';
import { BibleVerse } from '@/components/dashboard/BibleVerse';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTimeFilter, Period } from '@/contexts/TimeFilterContext';

function todayLabel(lang: string) {
  const locale = lang === 'es' ? 'es-PR' : 'en-US';
  return new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
}

const STAGE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  'New Lead':      { bg: 'rgba(122,158,126,0.12)', text: '#4A6741', bar: '#7A9E7E' },
  'Estimate Sent': { bg: 'rgba(139,105,20,0.12)',  text: '#8B6914', bar: '#8B6914' },
  'Follow-up':     { bg: 'rgba(160,120,80,0.12)',  text: '#A07850', bar: '#A07850' },
  Won:             { bg: 'rgba(74,103,65,0.14)',   text: '#4A6741', bar: '#4A6741' },
  Lost:            { bg: 'rgba(185,74,58,0.10)',   text: '#B94A3A', bar: '#B94A3A' },
  'On Hold':       { bg: 'rgba(200,188,168,0.2)',  text: '#9a9585', bar: '#CFC4B4' },
};

const QUICK_ACTION_DEFS = [
  { key: 'dashboard.newLead',     href: '/leads',     icon: Target,   bg: 'rgba(74,103,65,0.14)',  color: '#4A6741' },
  { key: 'dashboard.newProject',  href: '/projects',  icon: Briefcase,bg: 'rgba(91,140,187,0.14)', color: '#5B8CBB' },
  { key: 'nav.expenses',          href: '/expenses',  icon: Receipt,  bg: 'rgba(160,120,80,0.14)', color: '#A07850' },
  { key: 'nav.schedule',          href: '/schedule',  icon: Calendar, bg: 'rgba(122,158,126,0.14)',color: '#7A9E7E' },
  { key: 'nav.reports',           href: '/reports',   icon: BarChart2,bg: 'rgba(167,139,250,0.14)',color: '#A78BFA' },
  { key: 'nav.customers',         href: '/customers', icon: Users,    bg: 'rgba(185,74,58,0.10)',  color: '#B94A3A' },
] as const;

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

// ── KPI Card — CSS class system: kpi-card + kpi-{type} handles all color modes
type KPIType = 'gold' | 'sage' | 'amber' | 'terra' | 'purple';

interface KPIKind {
  label: string;
  value: number;
  fmt: 'currency' | 'number';
  type: KPIType;
  icon: React.ElementType;
  href: string;
  sub?: string;
  sparkline?: number[];
  trend?: number | null;
}

function KPICard({ kpi }: { kpi: KPIKind }) {
  const Icon    = kpi.icon;
  const animated = useCountUp(kpi.value);
  const display  = kpi.fmt === 'currency'
    ? formatCurrency(animated)
    : animated.toLocaleString('en-US');
  const trendUp  = (kpi.trend ?? 0) >= 0;

  return (
    <TiltCard className={`kpi-card kpi-${kpi.type}`}>
      <Link href={kpi.href} style={{ display: 'flex', flexDirection: 'column', padding: '22px 22px 18px', textDecoration: 'none' }}>

        {/* Top: icon + trend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div className="kpi-icon-pill">
            <Icon size={20} style={{ color: 'var(--kpi-icon)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {kpi.trend != null && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: trendUp ? 'var(--c-sage)' : 'var(--c-danger)',
                background: trendUp ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.08)',
                border: `1px solid ${trendUp ? 'rgba(22,163,74,0.20)' : 'rgba(220,38,38,0.16)'}`,
                borderRadius: 20, padding: '3px 8px',
                fontFamily: "'DM Mono', monospace",
              }}>
                {trendUp ? '▲' : '▼'} {Math.abs(kpi.trend).toFixed(0)}%
              </span>
            )}
            <ChevronRight size={13} style={{ color: 'var(--kpi-text)', opacity: 0.35, marginTop: 1 }} />
          </div>
        </div>

        {/* Number */}
        <div style={{
          fontSize: 'clamp(1.55rem, 2vw, 1.95rem)', fontWeight: 800,
          color: 'var(--kpi-text)', fontFamily: "'DM Mono', monospace",
          letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6,
        }}>
          {display}
        </div>

        {/* Label */}
        <p style={{
          fontSize: 10, fontWeight: 700, color: 'var(--kpi-text)', opacity: 0.60,
          fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em',
          textTransform: 'uppercase', margin: 0,
        }}>
          {kpi.label}
        </p>

        {/* Sub + sparkline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, minHeight: 28 }}>
          {kpi.sub
            ? <span style={{ fontSize: 11, color: 'var(--kpi-text)', fontFamily: "'DM Mono', monospace", fontWeight: 600, opacity: 0.70 }}>{kpi.sub}</span>
            : <span />
          }
          {kpi.sparkline && kpi.sparkline.length > 1 && (
            <SparkLine values={kpi.sparkline} color="var(--kpi-text)" />
          )}
        </div>

      </Link>
    </TiltCard>
  );
}

// ── Lead Stat Card ────────────────────────────────────────────────────────────
interface LeadStatKind {
  label: string;
  value: number;
  fmt?: 'number' | 'currency' | 'percent';
  type: KPIType;
  icon: React.ElementType;
  href: string;
  sub?: string;
}
function LeadStatCard({ stat }: { stat: LeadStatKind }) {
  const Icon    = stat.icon;
  const animated = useCountUp(stat.value, 700);
  const display  = stat.fmt === 'currency' ? formatCurrency(animated)
    : stat.fmt === 'percent' ? `${animated}%`
    : animated.toLocaleString('en-US');
  return (
    <Link href={stat.href} className={`lead-stat-card kpi-${stat.type}`}>
      <div className="kpi-icon-pill-sm">
        <Icon size={18} style={{ color: 'var(--kpi-icon)' }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--kpi-text)', fontFamily: "'DM Mono', monospace", letterSpacing: '-0.03em', lineHeight: 1 }}>
          {display}
        </div>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--kpi-text)', opacity: 0.58, fontFamily: "'DM Mono', monospace", letterSpacing: '0.09em', textTransform: 'uppercase', margin: '4px 0 0' }}>
          {stat.label}
        </p>
        {stat.sub && <p style={{ fontSize: 10, color: 'var(--kpi-text)', opacity: 0.45, fontFamily: "'DM Mono', monospace", margin: '2px 0 0' }}>{stat.sub}</p>}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { period, setPeriod }     = useTimeFilter();
  const [time, setTime]           = useState('');
  const [displayName, setDisplayName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const shouldReduceMotion        = useReducedMotion();
  const { language, t }           = useLanguage();

  const TIMEFRAMES: { label: string; value: Period }[] = [
    { label: t('dashboard.timeframe.week'),  value: 'week' },
    { label: t('dashboard.timeframe.month'), value: 'month' },
    { label: t('dashboard.timeframe.year'),  value: 'year' },
    { label: t('dashboard.timeframe.all'),   value: 'all' },
  ];

  const QUICK_ACTIONS = QUICK_ACTION_DEFS.map(d => ({ ...d, label: t(d.key) }));

  // Live clock
  useEffect(() => {
    const tick = () => setTime(
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // User display name
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name?.split(' ')[0] ||
        user.user_metadata?.first_name ||
        user.email?.split('@')[0] ||
        '';
      setDisplayName(name);
    });
  }, []);

  // Location city — read cache first, fall back to geolocation + Nominatim
  useEffect(() => {
    try {
      const cached = localStorage.getItem('sg_user_city');
      if (cached) { setLocationCity(cached); return; }
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'User-Agent': 'SkyGlobalCRM/1.0' } }
          );
          const json = await res.json();
          const city = json.address?.city || json.address?.town || json.address?.village || '';
          const state = json.address?.state_code || json.address?.state || '';
          const label = [city, state].filter(Boolean).join(', ');
          if (label) {
            localStorage.setItem('sg_user_city', label);
            setLocationCity(label);
          }
        } catch {}
      }, () => {});
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { start } = getDateRange(period);
      const startIso = start.toISOString();
      const startDateOnly = toDateOnly(start);
      const today = toDateOnly(new Date());

      const [
        projectsRes, leadsRes, expensesRes, projectExpensesRes,
        activitiesRes, allProjRes, allExpRes, allProjExpRes,
        followUpsRes, overdueRes,
      ] = await Promise.all([
        supabase.from('projects').select('id,contract_value,amount_paid,payment_status,status,created_at,customer_id,title,customers(name)')
          .is('deleted_at', null)
          .gte('created_at', startIso),
        supabase.from('leads').select('id,stage,source,estimated_value,follow_up_date,title,customer_id,created_at')
          .is('deleted_at', null)
          .gte('created_at', startIso),
        supabase.from('expenses').select('id,amount,category,date')
          .is('deleted_at', null)
          .gte('date', startDateOnly),
        supabase.from('project_expenses').select('id,amount,date,project_id'),
        supabase.from('activities').select('id,type,content,created_at,customer_id')
          .order('created_at', { ascending: false }).limit(8),
        supabase.from('projects').select('contract_value,created_at,status').is('deleted_at', null),
        supabase.from('expenses').select('amount,date').is('deleted_at', null),
        supabase.from('project_expenses').select('amount,date'),
        supabase.from('leads').select('id,title,follow_up_date,customers!leads_customer_id_fkey(name)')
          .is('deleted_at', null)
          .lte('follow_up_date', subMonths(new Date(), -1).toISOString().split('T')[0])
          .gte('follow_up_date', today).not('stage', 'in', '("Won","Lost")')
          .order('follow_up_date', { ascending: true }).limit(5),
        supabase.from('projects').select('id,title,contract_value,amount_paid,customer_id,customers(name)')
          .is('deleted_at', null)
          .in('payment_status', ['Unpaid', 'Partial', 'Overdue']).lt('end_date', today).limit(4),
      ]);

      const projects = projectsRes.data ?? [];
      const leads    = leadsRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const projExp  = projectExpensesRes.data ?? [];

      const revenue       = projects.filter(p => p.status === 'In Progress' || p.status === 'Completed')
        .reduce((s, p) => s + (p.contract_value ?? 0), 0);
      // Project expenses travel with their project's period (same attribution as
      // Reports, PR #59) so revenue and costs are always paired to the same range.
      const periodProjectIds = new Set(projects.map(p => p.id));
      const periodProjExp    = projExp.filter(e => e.project_id != null && periodProjectIds.has(e.project_id));
      const totalExpenses = [...expenses.map(e => e.amount), ...periodProjExp.map(e => e.amount)].reduce((s, a) => s + a, 0);
      const profit        = revenue - totalExpenses;
      const margin        = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

      // 6-month chart data
      const chartData = Array.from({ length: 6 }, (_, i) => {
        const d   = subMonths(new Date(), 5 - i);
        const mon = d.toLocaleDateString('en-US', { month: 'short' });
        const yr  = d.getFullYear();
        const rev = (allProjRes.data ?? []).filter(p => {
          if (!p.created_at) return false;
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
      const openLeads  = leads.filter(l => !['Won', 'Lost', 'On Hold'].includes(l.stage ?? '')).length;
      const pipelineValue = leads
        .filter(l => !['Won', 'Lost', 'On Hold'].includes(l.stage ?? ''))
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
        // Currently-active work, independent of the period filter — a project
        // started last month and still in progress is still active this week.
        activeProjects: (allProjRes.data ?? []).filter(p => p.status === 'In Progress' || p.status === 'Scheduled').length,
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
    { label: t('kpi.revenue'),         value: data?.revenue        ?? 0, fmt: 'currency', type: 'gold',  icon: DollarSign, href: '/reports',  sparkline: data?.revenueSparkline, trend: data?.revTrend },
    { label: t('kpi.profit'),          value: data?.profit         ?? 0, fmt: 'currency', type: 'sage',  icon: TrendingUp, href: '/reports',  sub: data?.margin != null ? `${data.margin}% margin` : undefined, trend: data?.profTrend },
    { label: t('kpi.activeProjects'),  value: data?.activeProjects ?? 0, fmt: 'number',   type: 'amber', icon: Briefcase,  href: '/projects' },
    { label: t('kpi.totalLeads'),      value: data?.totalLeads     ?? 0, fmt: 'number',   type: 'terra', icon: Target,     href: '/leads',    sub: data?.wonLeads ? `${data.wonLeads} ${t('kpi.won').toLowerCase()}` : undefined },
  ];

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.07, duration: 0.42, ease: 'easeOut' as const },
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
                {todayLabel(language)}{locationCity ? ` · ${locationCity}` : ''}
              </p>
              <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.035em', lineHeight: 1.1 }}>
                {new Date().getHours() < 12 ? t('dashboard.greeting.morning') : new Date().getHours() < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')},{displayName ? <>&nbsp;<span className="value-shimmer">{displayName}</span></> : ''}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--c-text-3)', margin: '8px 0 0', fontFamily: "'DM Mono', monospace" }}>
                Here's what needs your attention today.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {/* Live clock */}
              <div className="ios-glass-gold" style={{ padding: '16px 24px', textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontSize: 'clamp(1.4rem, 2vw, 1.75rem)', fontWeight: 800, color: 'var(--c-gold)', fontFamily: "'DM Mono', monospace", letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {time.split(':')[0]}<span className="time-colon">:</span>{time.slice(time.indexOf(':') + 1)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--c-text-3)', marginTop: 4, fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Local Time
                </div>
              </div>

              {/* Timeframe selector */}
              <div style={{ display: 'flex', gap: 3, padding: 4, background: 'var(--c-nested)', borderRadius: 12, border: '1px solid var(--c-border)' }}>
                {TIMEFRAMES.map(tf => (
                  <button key={tf.value} onClick={() => setPeriod(tf.value)} style={{
                    padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: period === tf.value ? 700 : 500,
                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                    background: period === tf.value ? 'var(--c-gold-bg)' : 'transparent',
                    color: period === tf.value ? 'var(--c-gold)' : 'var(--c-text-3)',
                    transition: 'all 180ms ease',
                    boxShadow: period === tf.value ? 'var(--c-gold-shadow) 0 2px 8px' : 'none',
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
              {t('dashboard.commandCenter')} · {t('dashboard.live')}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-[14px]">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-[12px]">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 18 }} />)
              : ([
                  { label: t('kpi.openLeads'),  value: data?.openLeads ?? 0,      fmt: 'number'   as const, type: 'terra'  as const, icon: Target,       href: '/leads', sub: `of ${data?.totalLeads ?? 0} total` },
                  { label: t('kpi.won'),        value: data?.wonLeads ?? 0,       fmt: 'number'   as const, type: 'sage'   as const, icon: CheckCircle2, href: '/leads', sub: 'this period' },
                  { label: t('kpi.pipeline'),   value: data?.pipelineValue ?? 0,  fmt: 'currency' as const, type: 'gold'   as const, icon: DollarSign,   href: '/leads', sub: 'est. value' },
                  { label: t('kpi.winRate'),    value: data?.conversionRate ?? 0, fmt: 'percent'  as const, type: 'purple' as const, icon: Award,        href: '/leads', sub: `${data?.lostLeads ?? 0} lost` },
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
        <motion.div {...stagger(5)} className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-[14px]">

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
        <motion.div {...stagger(6)} className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">

          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.recentActivity')}</h3>
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
                : <p style={{ fontSize: 13, color: 'var(--c-text-4)', textAlign: 'center', padding: '20px 0', fontFamily: "'DM Mono', monospace" }}>{t('dashboard.noActivity')}</p>
            }
          </div>

          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.followUps')}</h3>
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
                        <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: 0 }}>{f.customers?.name}</p>
                      </div>
                      <span style={{ fontSize: 11, color: isToday ? '#8B6914' : 'var(--c-text-3)', fontWeight: isToday ? 700 : 400, flexShrink: 0, marginLeft: 8, fontFamily: "'DM Mono', monospace" }}>
                        {isToday ? t('focus.today') : f.follow_up_date}
                      </span>
                    </Link>
                  );
                })
              : <p style={{ fontSize: 13, color: 'var(--c-text-4)', textAlign: 'center', padding: '20px 0', fontFamily: "'DM Mono', monospace" }}>{t('dashboard.noFollowUps')}</p>
            }
          </div>

          <div className="ios-glass bento-card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.overdueInvoices')}</h3>
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
                      <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: 0 }}>{p.customers?.name}</p>
                    </div>
                    <span style={{ fontSize: 12, color: '#B94A3A', fontWeight: 700, flexShrink: 0, marginLeft: 8, fontFamily: "'DM Mono', monospace" }}>
                      {formatCurrency(Math.max(0, (p.contract_value ?? 0) - (p.amount_paid ?? 0)))}
                    </span>
                  </Link>
                ))
              : <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: 22, margin: '0 0 4px' }} className="float-anim">✅</p>
                  <p style={{ fontSize: 12, color: 'var(--c-sage)', fontFamily: "'DM Mono', monospace", margin: 0, fontWeight: 600 }}>All paid up</p>
                </div>
            }
          </div>
        </motion.div>

        {/* ROW 7 — Quick Actions */}
        <motion.div {...stagger(7)}>
          <div className="ios-glass bento-card" style={{ padding: '20px 28px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 16px' }}>{t('dashboard.quickActions')}</p>
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

        {/* ROW 8 — Weather + Agenda */}
        <motion.div {...stagger(8)} className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-[14px]" style={{ alignItems: 'start' }}>
          <WeatherWidget />
          <AgendaWidget />
        </motion.div>

      </div>
    </div>
  );
}
