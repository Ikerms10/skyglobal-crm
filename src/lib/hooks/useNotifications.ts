'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/types'
import { format } from 'date-fns'

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<Notification[]> => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const today = format(new Date(), 'yyyy-MM-dd')
      const notifications: Notification[] = []

      // Overdue follow-ups
      const { data: leads } = await supabase
        .from('leads')
        .select('id, title, follow_up_date, customer_id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .lte('follow_up_date', today)
        .not('stage', 'in', '("Won","Lost")')
        .not('follow_up_date', 'is', null)
        .limit(10)

      leads?.forEach(lead => {
        notifications.push({
          id: `fu-${lead.id}`,
          type: 'follow_up',
          title: 'Follow-up due',
          description: lead.title,
          href: `/leads`,
        })
      })

      // Overdue payments
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, customer_id, payment_status, end_date')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .in('payment_status', ['Unpaid', 'Partial', 'Overdue'])
        .not('status', 'eq', 'Cancelled')
        .limit(10)

      projects?.forEach(p => {
        if (p.end_date && p.end_date < today) {
          notifications.push({
            id: `pay-${p.id}`,
            type: 'overdue_payment',
            title: 'Overdue payment',
            description: p.title,
            href: `/customers/${p.customer_id}/projects/${p.id}`,
          })
        }
      })

      // Late projects
      const { data: lateProjects } = await supabase
        .from('projects')
        .select('id, title, customer_id, end_date, status')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .lt('end_date', today)
        .not('status', 'in', '("Completed","Cancelled")')
        .limit(5)

      lateProjects?.forEach(p => {
        if (!notifications.find(n => n.id === `pay-${p.id}`)) {
          notifications.push({
            id: `late-${p.id}`,
            type: 'late_project',
            title: 'Project past end date',
            description: p.title,
            href: `/customers/${p.customer_id}/projects/${p.id}`,
          })
        }
      })

      return notifications
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  })
}
