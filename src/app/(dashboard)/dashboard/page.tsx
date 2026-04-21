'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow, subMonths, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  DollarSign,
  Briefcase,
  Target,
  TrendingUp,
  ArrowRight,
  Clock,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { KPICard } from '@/components/dashboard/KPICard';
import { BibleVerse } from '@/components/dashboard/BibleVerse';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';
import { DailyBriefing } from '@/components/dashboard/DailyBriefing';
import { KPICommandCenter } from '@/components/dashboard/KPICommandCenter';

type Timeframe = 'Week' | 'Month' | 'Year' | 'All';

function getStartDate(tf: Timeframe): string | null {
  const now = new Date();
  if (tf === 'Week') return startOfWeek(now).toISOString();
  if (tf === 'Month') return startOfMonth(now).toISOString();
  if (tf === 'Year') return startOfYear(now).toISOString();
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
        borderRadius: 'var(--r-md)',
        padding: '10px 14px',
        boxShadow: 'var(--s-card-hover)',
        fontSize: 13,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <p style={{ color: 'var(--c-text-3)', marginBottom: 6, fontWeight: 500 }}>{label}</p>
      {payload.map((p) => (
        <p
          key={p.name}
          style={{
            color: p.color,
            fontWeight: 600,
            margin: '2px 0',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: 'Week', value: 'Week' },
  { label: 'Month', value: 'Month' },
  { label: 'Year', value: 'Year' },
  { label: 'All', value: 'All' },
];

const STAGE_COLORS: Record<string, string> = {
  'New Lead': '#7A9E7E',
  'Estimate Sent': '#8B6914',
  'Follow-up': '#A07850',
  Won: '#4A6741',
  Lost: '#B94A3A',
  'On Hold': '#CFC4B4',
};

const card: React.CSSProperties = {
  background: 'var(--c-card)',
  border: '1px solid var(--c-border-light)',
  borderRadius: 'var(--r-lg)',
  padding: '20px 24px',
  boxShadow: 'var(--s-card), var(--s-card-inset)',
};

export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('Month');
  const shouldReduceMotion = useReducedMotion();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', timeframe],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const startDate = getStartDate(timeframe);
      const fallbackId = '00000000-0000-0000-0000-000000000000';
      const today = new Date().toISOString().split('T')[0];

      const [
        projectsRes,
        leadsRes,
        expensesRes,
        projectExpensesRes,
        activitiesRes,
        allProjRes,
        allExpRes,
        allProjExpRes,
        followUpsRes,
        overdueRes,
      ] = await Promise.all([
        supabase
          .from('projects')
          .select(
            'id, contract_value, amount_paid, payment_status, status, created_at, customer_id, title, customers(name)'
          )
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', startDate ?? fallbackId),
        supabase
          .from('leads')
          .select(
            'id, stage, source, estimated_value, follow_up_date, title, customer_id, created_at'
          )
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', startDate ?? fallbackId),
        supabase
          .from('expenses')
          .select('id, amount, category, date')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .gte(startDate ? 'date' : 'id', startDate ? startDate.split('T')[0] : fallbackId),
        supabase.from('project_expenses').select('id, amount, date').eq('user_id', user.id),
        supabase
          .from('activities')
          .select('id, type, content, created_at, customer_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('projects')
          .select('contract_value, created_at, status')
          .eq('user_id', user.id)
          .is('deleted_at', null),
        supabase
          .from('expenses')
          .select('amount, date')
          .eq('user_id', user.id)
          .is('deleted_at', null),
        supabase.from('project_expenses').select('amount, date').eq('user_id', user.id),
        supabase
          .from('leads')
          .select('id, title, follow_up_date, customers(name)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .lte('follow_up_date', subMonths(new Date(), -1).toISOString().split('T')[0])
          .gte('follow_up_date', today)
          .not('stage', 'in', '("Won","Lost")')
          .order('follow_up_date', { ascending: true })
          .limit(5),
        supabase
          .from('projects')
          .select('id, title, contract_value, amount_paid, customer_id, customers(name)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .in('payment_status', ['Unpaid', 'Partial', 'Overdue'])
          .lt('end_date', today)
          .limit(4),
      ]);

      const projects = projectsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const projExp = projectExpensesRes.data ?? [];

      const revenue = projects
        .filter((p) => p.status === 'In Progress' || p.status === 'Completed')
        .reduce((s, p) => s + (p.contract_value ?? 0), 0);
      const totalExpenses = [
        ...expenses.map((e) => e.amount),
        ...projExp.map((e) => e.amount),
      ].reduce((s, a) => s + a, 0);
      const profit = revenue - totalExpenses;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

      const chartData = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        const m = d.toLocaleDateString('en-US', { month: 'short' });
        const yr = d.getFullYear();
        const rev = (allProjRes.data ?? [])
          .filter((p) => {
            const pd = new Date(p.created_at);
            return (
              pd.toLocaleDateString('en-US', { month: 'short' }) === m &&
              pd.getFullYear() === yr &&
              (p.status === 'In Progress' || p.status === 'Completed')
            );
          })
          .reduce((s, p) => s + (p.contract_value ?? 0), 0);
        const exp = [
          ...(allExpRes.data ?? [])
            .filter((e) => {
              const ed = new Date(e.date);
              return (
                ed.toLocaleDateString('en-US', { month: 'short' }) === m && ed.getFullYear() === yr
              );
            })
            .map((e) => e.amount),
          ...(allProjExpRes.data ?? [])
            .filter((e) => {
              const ed = new Date(e.date);
              return (
                ed.toLocaleDateString('en-US', { month: 'short' }) === m && ed.getFullYear() === yr
              );
            })
            .map((e) => e.amount),
        ].reduce((s, a) => s + a, 0);
        return { month: m, revenue: Math.round(rev), expenses: Math.round(exp) };
      });

      const stages = ['New Lead', 'Estimate Sent', 'Follow-up', 'Won', 'Lost', 'On Hold'];
      const stageCounts = Object.fromEntries(
        stages.map((s) => [s, leads.filter((l) => l.stage === s).length])
      );

      const activeProjectsList = projects.filter((p) => p.status === 'In Progress').slice(0, 4);

      const revenueSparkline = chartData.map((d) => d.revenue);
      const profitSparkline = chartData.map((d) => Math.max(0, d.revenue - d.expenses));

      return {
        revenue,
        totalExpenses,
        profit,
        margin,
        wonLeads: leads.filter((l) => l.stage === 'Won').length,
        totalLeads: leads.length,
        activeProjects: projects.filter(
          (p) => p.status === 'In Progress' || p.status === 'Scheduled'
        ).length,
        chartData,
        stageCounts,
        activities: activitiesRes.data ?? [],
        followUps: followUpsRes.data ?? [],
        overdue: overdueRes.data ?? [],
        activeProjectsList,
        revenueSparkline,
        profitSparkline,
      };
    },
    staleTime: 60_000,
  });

  const maxStageCount = Math.max(...Object.values(data?.stageCounts ?? {}).map(Number), 1);

  const kpis = [
    {
      label: 'Total Revenue',
      value: data?.revenue ?? 0,
      format: 'currency' as const,
      color: 'gold' as const,
      icon: DollarSign,
      sparkline: data?.revenueSparkline,
      href: '/reports',
    },
    {
      label: 'Gross Profit',
      value: data?.profit ?? 0,
      format: 'currency' as const,
      color: 'green' as const,
      icon: TrendingUp,
      trend: data?.margin != null ? { value: data.margin, label: 'margin' } : undefined,
      sparkline: data?.profitSparkline,
      href: '/reports',
    },
    {
      label: 'Active Projects',
      value: data?.activeProjects ?? 0,
      format: 'number' as const,
      color: 'sky' as const,
      icon: Briefcase,
      href: '/projects',
    },
    {
      label: 'Leads',
      value: data?.totalLeads ?? 0,
      format: 'number' as const,
      color: 'sky' as const,
      icon: Target,
      trend: data?.wonLeads != null ? { value: data.wonLeads, label: 'won' } : undefined,
      href: '/leads',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ padding: '32px 40px', maxWidth: 1280, margin: '0 auto' }}
      className="p-4 md:p-8"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              color: 'var(--sg-text-1)',
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.03em',
            }}
          >
            {greeting()}, Iker
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--sg-text-2)',
              marginTop: 4,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {todayLabel()} &middot; Orlando, FL
          </p>
        </div>

        {/* Timeframe selector */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            padding: 3,
            background: 'var(--c-sidebar)',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--c-border)',
          }}
        >
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              style={{
                padding: '5px 14px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: timeframe === tf.value ? 700 : 500,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: timeframe === tf.value ? 'var(--c-gold-bg)' : 'transparent',
                color: timeframe === tf.value ? 'var(--c-gold)' : 'var(--c-text-3)',
                boxShadow: 'none',
                transition: 'background 150ms, color 150ms, box-shadow 150ms',
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI COMMAND CENTER — above existing widgets */}
        <KPICommandCenter />

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--c-border)', opacity: 0.5 }} />

        {/* ROW 1: Bible verse */}
        <BibleVerse />

        {/* ROW 2: Weather + Briefing */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '38% 1fr',
            gap: 16,
            alignItems: 'stretch',
          }}
          className="grid-cols-1 md:grid-cols-[38%_1fr]"
        >
          <WeatherWidget />
          <DailyBriefing />
        </div>

        {/* ROW 3: KPI Cards with stagger */}
        <motion.div
          variants={{ visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08 } } }}
          initial="hidden"
          animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
          className="grid-cols-2 md:grid-cols-4"
        >
          {kpis.map((kpi) => (
            <motion.div
              key={kpi.label}
              variants={{
                hidden: { y: shouldReduceMotion ? 0 : 32, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: 'easeOut' }}
            >
              <Link href={kpi.href} style={{ textDecoration: 'none' }}>
                <KPICard
                  label={kpi.label}
                  value={kpi.value}
                  format={kpi.format}
                  color={kpi.color}
                  icon={kpi.icon}
                  sparkline={kpi.sparkline}
                  trend={kpi.trend}
                  loading={isLoading}
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* ROW 4: Charts */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: 16 }}
          className="grid-cols-1 md:grid-cols-[60%_1fr]"
        >
          {/* Line chart */}
          <div style={card}>
            <div
              style={{
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--sg-text-1)',
                    margin: 0,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: '-0.01em',
                  }}
                >
                  Revenue vs Expenses
                </h3>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--sg-text-3)',
                    marginTop: 2,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  Last 6 months
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { c: '#8B6914', n: 'Revenue' },
                  { c: '#B94A3A', n: 'Expenses' },
                ].map(({ c, n }) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: c,
                        boxShadow: `0 0 6px ${c}80`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--sg-text-3)',
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
              <div className="skeleton" style={{ height: 200 }} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={data?.chartData ?? []}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    tick={{
                      fill: 'var(--sg-text-3)',
                      fontSize: 11,
                      fontFamily: "'DM Mono', monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#8B6914"
                    strokeWidth={2}
                    dot={false}
                    type="monotone"
                  />
                  <Line
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#B94A3A"
                    strokeWidth={2}
                    dot={false}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pipeline */}
          <div style={card}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 20,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--sg-text-1)',
                    margin: 0,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: '-0.01em',
                  }}
                >
                  Pipeline
                </h3>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--sg-text-3)',
                    marginTop: 2,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {data?.totalLeads ?? 0} leads
                </p>
              </div>
              <Link
                href="/leads"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  color: 'var(--sg-sky)',
                  textDecoration: 'none',
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                View <ArrowRight size={11} />
              </Link>
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 28 }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(data?.stageCounts ?? {})
                  .filter(([, count]) => Number(count) > 0)
                  .map(([stage, count]) => (
                    <div key={stage}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--sg-text-2)',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                        >
                          {stage}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: STAGE_COLORS[stage] ?? 'var(--sg-text-3)',
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          {count}
                        </span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: 'var(--sg-elevated)' }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 2,
                            background: STAGE_COLORS[stage] ?? 'var(--sg-text-3)',
                            boxShadow: `0 0 6px ${STAGE_COLORS[stage] ?? 'transparent'}60`,
                            width: `${Math.round((Number(count) / maxStageCount) * 100)}%`,
                            transition: 'width 600ms var(--ease-smooth)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* ROW 5: Activity + Follow-ups + Overdue */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
          className="grid-cols-1 md:grid-cols-3"
        >
          {/* Activity */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--sg-text-1)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '-0.01em',
                }}
              >
                Recent Activity
              </h3>
              <Activity size={14} style={{ color: 'var(--sg-sky)' }} />
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 36 }} />
                ))}
              </div>
            ) : (data?.activities ?? []).length > 0 ? (
              <div>
                {(
                  data!.activities as Array<{
                    id: string;
                    type: string;
                    content: string | null;
                    created_at: string;
                    customer_id: string;
                  }>
                ).map((a) => (
                  <Link
                    key={a.id}
                    href={a.customer_id ? `/customers/${a.customer_id}` : '#'}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '8px 0',
                      borderBottom: '1px solid var(--sg-border)',
                      textDecoration: 'none',
                      transition: 'opacity 150ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <div
                      className="pulse-dot"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'var(--sg-sky)',
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--sg-text-1)',
                          margin: 0,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {a.type}
                      </p>
                      {a.content && (
                        <p
                          style={{
                            fontSize: 11,
                            color: 'var(--sg-text-3)',
                            margin: '1px 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {a.content}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--sg-text-3)',
                        flexShrink: 0,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: false }).replace(
                        'about ',
                        ''
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--sg-text-3)',
                  textAlign: 'center',
                  padding: '20px 0',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                No recent activity
              </p>
            )}
          </div>

          {/* Follow-ups */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--sg-text-1)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '-0.01em',
                }}
              >
                Follow-ups
              </h3>
              <Clock size={14} style={{ color: 'var(--sg-gold)' }} />
            </div>
            {(data?.followUps ?? []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(
                  data!.followUps as unknown as Array<{
                    id: string;
                    title: string;
                    follow_up_date: string | null;
                    customers: { name: string } | null;
                  }>
                ).map((f) => {
                  const isToday = f.follow_up_date === new Date().toISOString().split('T')[0];
                  return (
                    <Link
                      key={f.id}
                      href="/leads"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '9px 12px',
                        background: 'var(--c-sage-bg)',
                        border: '1px solid var(--c-sage-border)',
                        borderRadius: 'var(--r-sm)',
                        textDecoration: 'none',
                        transition: 'background 100ms, border-color 100ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--c-card-hover)';
                        e.currentTarget.style.borderColor = 'var(--c-border-mid)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--c-sage-bg)';
                        e.currentTarget.style.borderColor = 'var(--c-sage-border)';
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--sg-text-1)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                        >
                          {f.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--sg-text-3)', margin: 0 }}>
                          {(f.customers as { name: string } | null)?.name}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: isToday ? 'var(--sg-gold)' : 'var(--sg-text-3)',
                          fontWeight: isToday ? 700 : 400,
                          flexShrink: 0,
                          marginLeft: 8,
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {isToday ? 'Today' : f.follow_up_date}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--sg-text-3)',
                  textAlign: 'center',
                  padding: '20px 0',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                No upcoming follow-ups
              </p>
            )}
          </div>

          {/* Overdue + Active Projects */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--sg-text-1)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '-0.01em',
                }}
              >
                Overdue Payments
              </h3>
              <AlertTriangle size={14} style={{ color: 'var(--sg-danger)' }} />
            </div>
            {(data?.overdue ?? []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(
                  data!.overdue as unknown as Array<{
                    id: string;
                    title: string;
                    customer_id: string;
                    contract_value: number | null;
                    amount_paid: number;
                    customers: { name: string } | null;
                  }>
                ).map((p) => (
                  <Link
                    key={p.id}
                    href={`/customers/${p.customer_id}/projects/${p.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 12px',
                      background: 'var(--c-danger-bg)',
                      border: '1px solid var(--c-danger-border)',
                      borderRadius: 'var(--r-sm)',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--sg-text-1)',
                          margin: 0,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {p.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--sg-text-3)', margin: 0 }}>
                        {(p.customers as { name: string } | null)?.name}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--sg-danger)',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginLeft: 8,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {formatCurrency(Math.max(0, (p.contract_value ?? 0) - (p.amount_paid ?? 0)))}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--sg-success)',
                    textAlign: 'center',
                    padding: '12px 0',
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  &gt; No overdue payments
                </p>
                {(data?.activeProjectsList ?? []).length > 0 && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        margin: '12px 0 10px',
                        paddingTop: 12,
                        borderTop: '1px solid var(--sg-border)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--sg-text-2)',
                          fontFamily: "'DM Mono', monospace",
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Active Projects
                      </span>
                      <Link
                        href="/projects"
                        style={{ fontSize: 11, color: 'var(--sg-sky)', textDecoration: 'none' }}
                      >
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                    {(
                      data!.activeProjectsList as unknown as Array<{
                        id: string;
                        title: string;
                        contract_value: number | null;
                        customer_id: string;
                        customers: { name: string } | null;
                      }>
                    ).map((p) => (
                      <Link
                        key={p.id}
                        href={`/customers/${p.customer_id}/projects/${p.id}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '7px 0',
                          borderBottom: '1px solid var(--sg-border)',
                          textDecoration: 'none',
                        }}
                      >
                        <p
                          style={{
                            fontSize: 13,
                            color: 'var(--sg-text-1)',
                            margin: 0,
                            fontWeight: 500,
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                        >
                          {p.title}
                        </p>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--sg-gold)',
                            fontWeight: 700,
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          {formatCurrency(p.contract_value)}
                        </span>
                      </Link>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
