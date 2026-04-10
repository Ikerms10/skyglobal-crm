'use client'
import { useState, useRef, useEffect } from 'react'
import { Search, User, Briefcase, Target, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useRouter } from 'next/navigation'

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const q = `%${debouncedQuery}%`

      const [customers, leads, projects] = await Promise.all([
        supabase.from('customers').select('id, name, email, phone, type').eq('user_id', user.id).is('deleted_at', null).or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`).limit(5),
        supabase.from('leads').select('id, title, stage').eq('user_id', user.id).is('deleted_at', null).ilike('title', q).limit(5),
        supabase.from('projects').select('id, title, customer_id, status').eq('user_id', user.id).is('deleted_at', null).ilike('title', q).limit(5),
      ])

      return {
        customers: customers.data ?? [],
        leads: leads.data ?? [],
        projects: projects.data ?? [],
      }
    },
    enabled: debouncedQuery.length >= 2,
  })

  const hasResults = data && (data.customers.length + data.leads.length + data.projects.length) > 0

  const clearSearch = () => {
    setQuery('')
    setOpen(false)
  }

  const navigate = (href: string) => {
    router.push(href)
    clearSearch()
  }

  return (
    <div ref={ref} className="relative max-w-md w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9585] pointer-events-none" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (query.length >= 2) setOpen(true) }}
          onKeyDown={e => { if (e.key === 'Escape') clearSearch() }}
          placeholder="Search customers, leads, projects..."
          className="w-full bg-[#252419] border border-[#2e2d26] text-[#efeae2] placeholder-[#9a9585] rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9585] hover:text-[#efeae2] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#252419] border border-[#2e2d26] rounded-xl shadow-2xl overflow-hidden z-50">
          {!hasResults ? (
            <p className="text-[#9a9585] text-sm px-4 py-3">No results for &quot;{debouncedQuery}&quot;</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {data?.customers && data.customers.length > 0 && (
                <div>
                  <p className="text-xs text-[#9a9585] font-medium px-4 py-2 uppercase tracking-wider bg-[#1d1c17]">
                    Customers ({data.customers.length})
                  </p>
                  {data.customers.map((c: { id: string; name: string; email: string | null; phone: string | null; type: string }) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2e2d26] transition-colors text-left"
                    >
                      <User className="h-4 w-4 text-[#9a9585] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-[#efeae2] truncate">{c.name}</p>
                        <p className="text-xs text-[#9a9585] truncate">{c.email || c.phone || c.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {data?.leads && data.leads.length > 0 && (
                <div>
                  <p className="text-xs text-[#9a9585] font-medium px-4 py-2 uppercase tracking-wider bg-[#1d1c17]">
                    Leads ({data.leads.length})
                  </p>
                  {data.leads.map((l: { id: string; title: string; stage: string }) => (
                    <button
                      key={l.id}
                      onClick={() => navigate('/leads')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2e2d26] transition-colors text-left"
                    >
                      <Target className="h-4 w-4 text-[#9a9585] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-[#efeae2] truncate">{l.title}</p>
                        <p className="text-xs text-[#9a9585] truncate">{l.stage}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {data?.projects && data.projects.length > 0 && (
                <div>
                  <p className="text-xs text-[#9a9585] font-medium px-4 py-2 uppercase tracking-wider bg-[#1d1c17]">
                    Projects ({data.projects.length})
                  </p>
                  {data.projects.map((p: { id: string; title: string; customer_id: string; status: string }) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/customers/${p.customer_id}/projects/${p.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2e2d26] transition-colors text-left"
                    >
                      <Briefcase className="h-4 w-4 text-[#9a9585] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-[#efeae2] truncate">{p.title}</p>
                        <p className="text-xs text-[#9a9585] truncate">{p.status}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
