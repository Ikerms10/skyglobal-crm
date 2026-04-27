// Centralized React Query key factory.
// All query keys live here so invalidation is consistent across the app.
// Broader keys are prefixes of narrower keys — invalidating ['leads'] busts
// every query whose key starts with 'leads'.

export const keys = {
  leads: {
    all: () => ['leads'] as const,
    activities: () => ['lead-last-activities'] as const,
  },
  projects: {
    all: () => ['projects'] as const,
    active: () => ['projects-active'] as const,
  },
  customers: {
    all: () => ['customers'] as const,
    lifetimeValues: () => ['customer-lifetime-values'] as const,
    lastJobDates: () => ['customer-last-job-dates'] as const,
  },
  expenses: {
    all: () => ['expenses-all'] as const,
    budgets: () => ['expense-budgets'] as const,
  },
  invoices: {
    all: () => ['invoices'] as const,
  },
  proposals: {
    all: () => ['proposals'] as const,
    values: () => ['proposal-values'] as const,
  },
  dashboard: {
    all: () => ['dashboard'] as const,
  },
  analytics: {
    all: () => ['analytics'] as const,
  },
  reports: {
    all: () => ['reports'] as const,
  },
  focus: {
    all: () => ['focus'] as const,
  },
  schedule: {
    all: () => ['schedule'] as const,
    events: () => ['calendar-events'] as const,
  },
} as const

// Convenience helper — given a table name, returns all query keys that depend on it.
// Used by useRealtimeSync to mass-invalidate on any Supabase change event.
export function getKeysForTable(table: string): ReadonlyArray<readonly string[]> {
  switch (table) {
    case 'leads':
      return [keys.leads.all(), keys.leads.activities(), keys.dashboard.all(), keys.analytics.all(), keys.reports.all(), keys.focus.all()]
    case 'projects':
      return [
        keys.projects.all(), keys.projects.active(),
        keys.dashboard.all(), keys.analytics.all(), keys.reports.all(), keys.focus.all(),
        keys.customers.lifetimeValues(), keys.customers.lastJobDates(),
      ]
    case 'expenses':
    case 'project_expenses':
      return [keys.expenses.all(), keys.dashboard.all(), keys.analytics.all(), keys.reports.all()]
    case 'invoices':
      return [keys.invoices.all(), keys.dashboard.all(), keys.analytics.all(), keys.focus.all()]
    case 'proposals':
      return [keys.proposals.all(), keys.proposals.values(), keys.dashboard.all()]
    case 'customers':
      return [
        keys.customers.all(), keys.customers.lifetimeValues(), keys.customers.lastJobDates(),
      ]
    case 'schedule_events':
      return [keys.schedule.all(), keys.schedule.events()]
    default:
      return []
  }
}
