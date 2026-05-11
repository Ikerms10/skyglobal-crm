'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatCurrencyCompact, getProfitGrade, exportToCSV } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  parseISO,
  eachMonthOfInterval,
  startOfDay,
  endOfDay,
  subMonths as subM,
} from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

type Timeframe = 'this_month' | 'last_month' | 'this_year' | 'all_time';

const SOURCE_COLORS: Record<string, string> = {
  Thumbtack: '#3583b3',
  Referral: '#22c55e',
  Google: '#e6ab35',
  Instagram: '#a78bfa',
  'Door Knock': '#f0c060',
  Facebook: '#60a5fa',
  Yelp: '#ef4444',
  Other: '#8b857a',
};

const EXPENSE_COLORS = [
  '#e6ab35',
  '#3583b3',
  '#22c55e',
  '#ef4444',
  '#a78bfa',
  '#f0c060',
  '#60a5fa',
  '#8b857a',
];

export default function ReportsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState<Timeframe>('this_year');

  const { data: reportData, isLoading: loading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [p, l, e, pe] = await Promise.all([
        supabase
          .from('projects')
          .select('id, title, contract_value, amount_paid, lead_cost, type, status, customer_id, start_date, created_at, customers(name, id)')
          .is('deleted_at', null),
        supabase
          .from('leads')
          .select('id, stage, source, estimated_value, customer_id, created_at')
          .is('deleted_at', null),
        supabase
          .from('expenses')
          .select('id, amount, category, date')
          .is('deleted_at', null),
        supabase
          .from('project_expenses')
          .select('id, amount, category, date, project_id')
          ,
      ]);

      return {
        projects: p.data ?? [],
        leads: l.data ?? [],
        expenses: e.data ?? [],
        projExpenses: pe.data ?? [],
      };
    },
  });

  const projects = reportData?.projects ?? [];
  const leads = reportData?.leads ?? [];
  const expenses = reportData?.expenses ?? [];
  const projExpenses = reportData?.projExpenses ?? [];
  const projExpByProject = projExpenses;

  const { dateStart, dateEnd } = useMemo(() => {
    const now = new Date();
    if (timeframe === 'this_month')
      return { dateStart: startOfMonth(now), dateEnd: endOfMonth(now) };
    if (timeframe === 'last_month') {
      const lm = subMonths(now, 1);
      return { dateStart: startOfMonth(lm), dateEnd: endOfMonth(lm) };
    }
    if (timeframe === 'this_year') return { dateStart: startOfYear(now), dateEnd: endOfYear(now) };
    return { dateStart: new Date(2000, 0, 1), dateEnd: now };
  }, [timeframe]);

  const filteredProjects = useMemo(() => {
    const s = dateStart.toISOString();
    const e = dateEnd.toISOString();
    return projects.filter((p) => {
      const d = p.start_date ?? p.created_at;
      return d >= s && d <= e;
    });
  }, [projects, dateStart, dateEnd]);

  const filteredExpenses = useMemo(() => {
    const s = format(dateStart, 'yyyy-MM-dd');
    const e = format(dateEnd, 'yyyy-MM-dd');
    return expenses.filter((x) => x.date >= s && x.date <= e);
  }, [expenses, dateStart, dateEnd]);

  const filteredProjExp = useMemo(() => {
    const s = format(dateStart, 'yyyy-MM-dd');
    const e = format(dateEnd, 'yyyy-MM-dd');
    return projExpenses.filter((x) => x.date >= s && x.date <= e);
  }, [projExpenses, dateStart, dateEnd]);

  // Project expenses attributed to the period by project membership, not expense date.
  // A project expense should travel with its project — if a project started in April,
  // all its costs belong to April even if an expense was logged later.
  const periodProjExpenses = useMemo(() => {
    const ids = new Set(filteredProjects.map((p) => p.id));
    return projExpenses.filter((e) => ids.has(e.project_id));
  }, [filteredProjects, projExpenses]);

  const filteredLeads = useMemo(() => {
    const s = dateStart.toISOString();
    const e = dateEnd.toISOString();
    return leads.filter((l) => l.created_at >= s && l.created_at <= e);
  }, [leads, dateStart, dateEnd]);

  // KPI calculations
  const kpi = useMemo(() => {
    // Cancelled projects are excluded — all others (Planning, Scheduled, In Progress, Completed) count.
    const revenue = filteredProjects
      .filter((p) => p.status !== 'Cancelled')
      .reduce((s, p) => s + (p.contract_value ?? 0), 0);
    // Project expenses follow their project's period, not the expense date, so revenue and
    // costs are always paired to the same period. General expenses remain date-filtered.
    const totalExp =
      filteredExpenses.reduce((s, e) => s + e.amount, 0) +
      periodProjExpenses.reduce((s, e) => s + e.amount, 0);
    const profit = revenue - totalExp;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, totalExp, profit, margin };
  }, [filteredProjects, filteredExpenses, periodProjExpenses]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateStart, end: dateEnd });
    return months.map((m) => {
      const ms = format(startOfMonth(m), 'yyyy-MM-dd');
      const me = format(endOfMonth(m), 'yyyy-MM-dd');

      // Projects starting this month, excluding Cancelled — consistent with KPI revenue logic
      const monthProjects = filteredProjects.filter((p) => {
        const d = (p.start_date ?? p.created_at ?? '').substring(0, 10);
        return d >= ms && d <= me && p.status !== 'Cancelled';
      });
      const monthProjectIds = new Set(monthProjects.map((p) => p.id));

      const rev = monthProjects.reduce((s, p) => s + (p.contract_value ?? 0), 0);

      const genExp = filteredExpenses
        .filter((e) => e.date >= ms && e.date <= me)
        .reduce((s, e) => s + e.amount, 0);
      // Project expenses attributed to the month their project started, not the expense date
      const prjExp = projExpenses
        .filter((e) => monthProjectIds.has(e.project_id))
        .reduce((s, e) => s + e.amount, 0);
      const exp = genExp + prjExp;

      return {
        month: format(m, 'MMM'),
        revenue: Math.round(rev),
        expenses: Math.round(exp),
        profit: Math.round(rev - exp),
      };
    });
  }, [filteredProjects, filteredExpenses, projExpenses, dateStart, dateEnd]);

  // Lead source donut
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      map[l.source] = (map[l.source] ?? 0) + 1;
    });
    return Object.entries(map).map(([source, count]) => ({ name: source, value: count }));
  }, [filteredLeads]);

  // Lead stage funnel
  const STAGES = ['New Lead', 'Estimate Sent', 'Follow-up', 'Negotiating', 'Won', 'Lost'];
  const stageData = useMemo(
    () =>
      STAGES.map((stage) => ({
        stage,
        count: filteredLeads.filter((l) => l.stage === stage).length,
      })),
    [filteredLeads]
  );

  // Expenses breakdown by category
  const expBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    filteredProjExp.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, filteredProjExp]);

  // Monthly P&L table (all months in timeframe)
  const plTable = useMemo(() => {
    return monthlyData.map((row) => ({
      ...row,
      margin: row.revenue > 0 ? Math.round((row.profit / row.revenue) * 100) : 0,
    }));
  }, [monthlyData]);

  const plTotals = useMemo(() => {
    const revenue = plTable.reduce((s, r) => s + r.revenue, 0);
    const expenses = plTable.reduce((s, r) => s + r.expenses, 0);
    const profit = revenue - expenses;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { revenue, expenses, profit, margin };
  }, [plTable]);

  // Top customers
  const topCustomers = useMemo(() => {
    const map: Record<
      string,
      { name: string; id: string; revenue: number; projects: number; lastProject: string }
    > = {};
    filteredProjects.forEach((p) => {
      const cust = (Array.isArray(p.customers) ? p.customers[0] : p.customers) as {
        name: string;
        id: string;
      } | null;
      if (!cust) return;
      if (!map[cust.id])
        map[cust.id] = { name: cust.name, id: cust.id, revenue: 0, projects: 0, lastProject: '' };
      map[cust.id].revenue += p.contract_value ?? 0;
      map[cust.id].projects += 1;
      const d = (p.start_date ?? p.created_at ?? '').substring(0, 10);
      if (d > map[cust.id].lastProject) map[cust.id].lastProject = d;
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredProjects]);

  // Project performance table
  const projectPerf = useMemo(() => {
    // Pre-aggregate expenses by project_id to avoid O(n×m) .filter() in .map()
    const expByProject = new Map<string, number>()
    for (const e of projExpByProject) {
      expByProject.set(e.project_id, (expByProject.get(e.project_id) ?? 0) + e.amount)
    }
    return filteredProjects
      .map((p) => {
        const costs = expByProject.get(p.id) ?? 0;
        const profit = (p.contract_value ?? 0) - (p.lead_cost ?? 0) - costs;
        const margin =
          (p.contract_value ?? 0) > 0 ? Math.round((profit / p.contract_value) * 100) : 0;
        const cust = (Array.isArray(p.customers) ? p.customers[0] : p.customers) as {
          name: string;
          id: string;
        } | null;
        const days = p.start_date
          ? Math.round(
              (new Date().getTime() - new Date(p.start_date).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null;
        return {
          ...p,
          customerName: cust?.name ?? '—',
          costs: Math.round(costs),
          profit: Math.round(profit),
          margin,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [filteredProjects, projExpByProject]);

  const handleExportPL = () => {
    exportToCSV(
      plTable.map((r) => ({
        Month: r.month,
        Revenue: r.revenue,
        Expenses: r.expenses,
        'Gross Profit': r.profit,
        'Margin %': r.margin + '%',
      })),
      `SkyGlobal-PL-${format(dateStart, 'yyyy')}`
    );
  };

  if (loading)
    return (
      <div className="p-4 md:p-6 space-y-6">
        <TableSkeleton />
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('reports.title')}</h1>
          <p className="text-[var(--sg-text-2)] text-sm">{t('reports.insights')}</p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-lg p-1">
          {(
            [
              ['this_month', t('expenses.thisMonth')],
              ['last_month', t('period.lastMonth')],
              ['this_year', t('reports.thisYear')],
              ['all_time', t('period.allTime')],
            ] as [Timeframe, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTimeframe(val)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${timeframe === val ? 'bg-[var(--sg-sky)] text-[var(--sg-base)]' : 'text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('reports.revenue'), value: formatCurrency(kpi.revenue), color: '#e6ab35' },
          { label: t('reports.expenses'), value: formatCurrency(kpi.totalExp), color: '#ef4444' },
          {
            label: t('reports.profit'),
            value: formatCurrency(kpi.profit),
            color: kpi.profit >= 0 ? '#22c55e' : '#ef4444',
          },
          {
            label: t('reports.profitMargin'),
            value: `${kpi.margin.toFixed(1)}%`,
            color: kpi.margin >= 20 ? '#22c55e' : kpi.margin < 0 ? '#ef4444' : '#e6ab35',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-5"
          >
            <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-1">
              {card.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue vs Expenses Bar Chart */}
      <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--sg-text-1)] mb-4">{t('reports.revenueVsExpenses')}</h3>
        <div className="chart-scroll-container">
        <div className="chart-min-width">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--sg-border)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--c-text-4)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--c-text-4)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCurrencyCompact(Number(v))}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--c-card)',
                border: '1px solid var(--c-border-mid)',
                borderRadius: 8,
              }}
              labelStyle={{ color: 'var(--c-text-1)', fontWeight: 600 }}
              formatter={(v: unknown, name: unknown) => [
                formatCurrency(Number(v)),
                String(name).charAt(0).toUpperCase() + String(name).slice(1),
              ]}
            />
            <Bar dataKey="revenue" name="revenue" fill="#e6ab35" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
        </div>
        <div className="flex items-center gap-6 mt-2 justify-center">
          {[
            [t('reports.revenue'), '#e6ab35'],
            [t('reports.expenses'), '#ef4444'],
            [t('reports.profit'), '#22c55e'],
          ].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
              <span className="text-xs text-[var(--sg-text-2)]">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources Donut */}
        <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--sg-text-1)] mb-4">Lead Sources</h3>
          {sourceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {sourceData.map((entry, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[entry.name] ?? '#475569'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--sg-elevated)',
                      border: '1px solid var(--sg-border-md)',
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {sourceData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: SOURCE_COLORS[s.name] ?? '#475569' }}
                    />
                    <span className="text-xs text-[var(--sg-text-2)]">
                      {s.name}: {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-[var(--sg-text-2)] text-sm">
              No leads yet
            </div>
          )}
        </div>

        {/* Lead Stage Funnel */}
        <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--sg-text-1)] mb-4">Lead Stage Funnel</h3>
          <div className="space-y-3 mt-2">
            {stageData.map((s) => {
              const maxCount = Math.max(...stageData.map((x) => x.count), 1);
              const pct = (s.count / maxCount) * 100;
              const color =
                s.stage === 'Won' ? '#22c55e' : s.stage === 'Lost' ? '#ef4444' : '#3583b3';
              return (
                <div key={s.stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--sg-text-2)]">{s.stage}</span>
                    <span className="text-[var(--sg-text-1)] font-medium">{s.count}</span>
                  </div>
                  <div className="h-2 bg-[var(--sg-base)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expenses Breakdown Donut */}
      <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--sg-text-1)] mb-4">Expenses by Category</h3>
        {expBreakdown.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={240} height={240}>
                <PieChart>
                  <Pie
                    data={expBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {expBreakdown.map((_, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--sg-elevated)',
                      border: '1px solid var(--sg-border-md)',
                      borderRadius: 8,
                    }}
                    formatter={(v: any) => [formatCurrency(Number(v)), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {expBreakdown.map((cat, i) => {
                const total = expBreakdown.reduce((s, c) => s + c.value, 0);
                const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}
                    />
                    <span className="text-sm text-[var(--sg-text-2)] flex-1">{cat.name}</span>
                    <span className="text-sm text-[var(--sg-text-1)]">
                      {formatCurrency(cat.value)}
                    </span>
                    <span className="text-xs text-[var(--sg-text-2)] w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[180px] text-[var(--sg-text-2)] text-sm">
            No expenses recorded
          </div>
        )}
      </div>

      {/* Monthly P&L Table */}
      <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--sg-text-1)]">Monthly P&L</h3>
          <Button variant="ghost" size="sm" onClick={handleExportPL}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--sg-elevated)] border-b border-[var(--sg-border-md)]">
                {['Month', 'Revenue', 'Expenses', 'Gross Profit', 'Margin %'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2 text-xs font-medium text-[var(--sg-text-1)] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plTable.map((row, i) => (
                <tr
                  key={row.month}
                  className="data-table border-b border-[var(--sg-border)] bg-[var(--sg-surface)]"
                >
                  <td className="px-4 py-3 text-sm text-[var(--sg-text-1)] font-medium">
                    {row.month}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--sg-gold)]">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--sg-danger)]">
                    {formatCurrency(row.expenses)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-medium ${row.profit >= 0 ? 'text-[var(--sg-success)]' : 'text-[var(--sg-danger)]'}`}
                  >
                    {formatCurrency(row.profit)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm ${row.margin >= 20 ? 'text-[var(--sg-success)]' : row.margin < 0 ? 'text-[var(--sg-danger)]' : 'text-[var(--sg-gold)]'}`}
                  >
                    {row.margin}%
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-[var(--sg-elevated)] border-t border-[var(--sg-border-md)]">
                <td className="px-4 py-3 text-sm font-bold text-[var(--sg-text-1)]">TOTALS</td>
                <td className="px-4 py-3 text-sm font-bold text-[var(--sg-gold)]">
                  {formatCurrency(plTotals.revenue)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-[var(--sg-danger)]">
                  {formatCurrency(plTotals.expenses)}
                </td>
                <td
                  className={`px-4 py-3 text-sm font-bold ${plTotals.profit >= 0 ? 'text-[var(--sg-success)]' : 'text-[var(--sg-danger)]'}`}
                >
                  {formatCurrency(plTotals.profit)}
                </td>
                <td
                  className={`px-4 py-3 text-sm font-bold ${plTotals.margin >= 20 ? 'text-[var(--sg-success)]' : plTotals.margin < 0 ? 'text-[var(--sg-danger)]' : 'text-[var(--sg-gold)]'}`}
                >
                  {plTotals.margin}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--sg-text-1)] mb-4">
          Top Customers by Revenue
        </h3>
        {topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--sg-elevated)] border-b border-[var(--sg-border-md)]">
                  {['#', 'Customer', 'Projects', 'Revenue', 'Avg Project', 'Last Project'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2 text-xs font-medium text-[var(--sg-text-1)] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="data-table border-b border-[var(--sg-border)] cursor-pointer transition-colors bg-[var(--sg-surface)] hover:bg-[var(--sg-elevated)]"
                  >
                    <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">{i + 1}</td>
                    <td className="px-4 py-3 text-sm text-[var(--sg-text-1)] font-medium">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">{c.projects}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--sg-gold)]">
                      {formatCurrency(c.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">
                      {c.projects > 0 ? formatCurrency(c.revenue / c.projects) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">
                      {c.lastProject || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[var(--sg-text-2)] text-sm text-center py-8">No project data yet</p>
        )}
      </div>

      {/* Project Performance Table */}
      <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--sg-text-1)] mb-4">Project Performance</h3>
        {projectPerf.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--sg-elevated)] border-b border-[var(--sg-border-md)]">
                  {['Project', 'Customer', 'Status', 'Contract', 'Costs', 'Profit', 'Margin'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2 text-xs font-medium text-[var(--sg-text-1)] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {projectPerf.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/customers/${p.customer_id}/projects/${p.id}`)}
                    className="data-table border-b border-[var(--sg-border)] cursor-pointer transition-colors bg-[var(--sg-surface)] hover:bg-[var(--sg-elevated)]"
                  >
                    <td className="px-4 py-3 text-sm text-[var(--sg-text-1)] font-medium max-w-[180px] truncate">
                      {p.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">{p.customerName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.status === 'Completed'
                            ? 'bg-[rgba(74,103,65,0.12)] text-[var(--sg-success)]'
                            : p.status === 'In Progress'
                              ? 'bg-[rgba(139,105,20,0.12)] text-[var(--sg-gold)]'
                              : p.status === 'Cancelled'
                                ? 'bg-[rgba(185,74,58,0.12)] text-[var(--sg-danger)]'
                                : 'bg-[rgba(122,158,126,0.10)] text-[var(--sg-sky)]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--sg-gold)]">
                      {formatCurrency(p.contract_value ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--sg-danger)]">
                      {formatCurrency(p.costs)}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-medium ${p.profit >= 0 ? 'text-[var(--sg-success)]' : 'text-[var(--sg-danger)]'}`}
                    >
                      {formatCurrency(p.profit)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const { grade, color } = getProfitGrade(p.margin)
                        return (
                          <span style={{ color }}>
                            {p.margin}% <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>({grade})</span>
                          </span>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[var(--sg-text-2)] text-sm text-center py-8">No projects yet</p>
        )}
      </div>
    </div>
  );
}
