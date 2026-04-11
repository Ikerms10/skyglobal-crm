'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, User, Briefcase, Target, X, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useRouter } from 'next/navigation'

const RECENT_KEY = 'sg_recent_search'
const MAX_RECENT = 3

type RecentItem = { type: 'customer' | 'lead' | 'project'; id: string; name: string; href: string; ts: number }

function saveRecent(item: Omit<RecentItem, 'ts'>) {
  try {
    const existing: RecentItem[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    const filtered = existing.filter(r => r.href !== item.href)
    const next = [{ ...item, ts: Date.now() }, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

function getRecent(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch { return [] }
}

const TYPE_ICONS = { customer: '👤', lead: '🎯', project: '📋' }

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const debouncedQuery = useDebounce(query, 300)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // CMD+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
        setRecent(getRecent())
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Click outside closes
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const q = `%${debouncedQuery}%`
      const [customers, leads, projects] = await Promise.all([
        supabase.from('customers').select('id, name, email, phone, type').eq('user_id', user.id).is('deleted_at', null).or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`).limit(5),
        supabase.from('leads').select('id, title, stage, estimated_value, customers(name)').eq('user_id', user.id).is('deleted_at', null).ilike('title', q).limit(5),
        supabase.from('projects').select('id, title, customer_id, status, contract_value, customers(name)').eq('user_id', user.id).is('deleted_at', null).ilike('title', q).limit(5),
      ])
      return {
        customers: customers.data ?? [],
        leads: leads.data ?? [],
        projects: projects.data ?? [],
      }
    },
    enabled: debouncedQuery.length >= 2,
  })

  // Flat list for keyboard navigation
  const allResults: { href: string; label: string; sub: string; type: 'customer' | 'lead' | 'project'; id: string }[] = []
  if (data) {
    data.customers.forEach((c: any) => allResults.push({ href: `/customers/${c.id}`, label: c.name, sub: c.phone || c.email || c.type, type: 'customer', id: c.id }))
    data.leads.forEach((l: any) => allResults.push({ href: '/leads', label: l.title, sub: `${l.stage}${l.estimated_value ? ` · $${l.estimated_value.toLocaleString()}` : ''}`, type: 'lead', id: l.id }))
    data.projects.forEach((p: any) => {
      const custName = Array.isArray(p.customers) ? p.customers[0]?.name : p.customers?.name
      allResults.push({ href: `/customers/${p.customer_id}/projects/${p.id}`, label: p.title, sub: `${p.status}${custName ? ` · ${custName}` : ''}`, type: 'project', id: p.id })
    })
  }

  const hasResults = allResults.length > 0
  const showDropdown = open && (query.length >= 2 || (query.length === 0 && recent.length > 0))

  const navigate = useCallback((href: string, name: string, type: 'customer' | 'lead' | 'project', id: string) => {
    saveRecent({ type, id, name, href })
    router.push(href)
    setQuery('')
    setOpen(false)
    setHighlight(-1)
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return
    const items = query.length >= 2 ? allResults : recent.map(r => ({ href: r.href, label: r.name, sub: '', type: r.type, id: r.id }))
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => (h + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h - 1 + items.length) % items.length)
    } else if (e.key === 'Enter' && highlight >= 0 && items[highlight]) {
      const item = items[highlight]
      navigate(item.href, item.label, item.type, item.id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      setHighlight(-1)
    }
  }

  const clearSearch = () => { setQuery(''); setOpen(false); setHighlight(-1) }

  return (
    <div ref={ref} className="relative max-w-md w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9585] pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(-1) }}
          onFocus={() => { setOpen(true); setRecent(getRecent()) }}
          onKeyDown={handleKeyDown}
          placeholder="Search... (⌘K)"
          className="w-full bg-[#252419] border border-[#2e2d26] text-[#efeae2] placeholder-[#9a9585] rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]"
          style={{ fontSize: 14 }}
        />
        {isFetching && query.length >= 2 ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9585] animate-spin" />
        ) : query ? (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9585] hover:text-[#efeae2]">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1d1c17] border border-[#2e2d26] rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {/* Show recent items when no query */}
          {query.length < 2 && recent.length > 0 && (
            <div>
              <p className="text-[10px] text-[#9a9585] font-semibold px-4 py-2 uppercase tracking-wider bg-[#252419]">Recent</p>
              {recent.map((r, i) => (
                <button key={r.href} onClick={() => navigate(r.href, r.name, r.type, r.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${highlight === i ? 'bg-[#3583b3]/20' : 'hover:bg-[#252419]'}`}>
                  <span className="text-sm">{TYPE_ICONS[r.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#efeae2] truncate">{r.name}</p>
                    <p className="text-xs text-[#9a9585] capitalize">{r.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search results */}
          {query.length >= 2 && (
            <>
              {!hasResults && !isFetching && (
                <div className="px-4 py-6 text-center">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-sm text-[#efeae2] mb-1">No results for &quot;{debouncedQuery}&quot;</p>
                  <p className="text-xs text-[#9a9585]">Try a different search term</p>
                </div>
              )}

              {data?.customers && data.customers.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#9a9585] font-semibold px-4 py-2 uppercase tracking-wider bg-[#252419]">
                    Customers ({data.customers.length})
                  </p>
                  {data.customers.map((c: any, idx: number) => {
                    const globalIdx = idx
                    return (
                      <button key={c.id} onClick={() => navigate(`/customers/${c.id}`, c.name, 'customer', c.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${highlight === globalIdx ? 'bg-[#3583b3]/20' : 'hover:bg-[#252419]'}`}>
                        <User className="h-4 w-4 text-[#9a9585] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-[#efeae2] truncate">{c.name}</p>
                          <p className="text-xs text-[#9a9585] truncate">{c.phone || c.email || c.type}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {data?.leads && data.leads.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#9a9585] font-semibold px-4 py-2 uppercase tracking-wider bg-[#252419]">
                    Leads ({data.leads.length})
                  </p>
                  {data.leads.map((l: any, idx: number) => {
                    const globalIdx = (data.customers?.length ?? 0) + idx
                    const custName = Array.isArray(l.customers) ? l.customers[0]?.name : l.customers?.name
                    return (
                      <button key={l.id} onClick={() => navigate('/leads', l.title, 'lead', l.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${highlight === globalIdx ? 'bg-[#3583b3]/20' : 'hover:bg-[#252419]'}`}>
                        <Target className="h-4 w-4 text-[#9a9585] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-[#efeae2] truncate">{l.title}</p>
                          <p className="text-xs text-[#9a9585] truncate">
                            {l.stage}{l.estimated_value ? ` · $${l.estimated_value.toLocaleString()}` : ''}
                            {custName ? ` · ${custName}` : ''}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {data?.projects && data.projects.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#9a9585] font-semibold px-4 py-2 uppercase tracking-wider bg-[#252419]">
                    Projects ({data.projects.length})
                  </p>
                  {data.projects.map((p: any, idx: number) => {
                    const globalIdx = (data.customers?.length ?? 0) + (data.leads?.length ?? 0) + idx
                    const custName = Array.isArray(p.customers) ? p.customers[0]?.name : p.customers?.name
                    return (
                      <button key={p.id} onClick={() => navigate(`/customers/${p.customer_id}/projects/${p.id}`, p.title, 'project', p.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${highlight === globalIdx ? 'bg-[#3583b3]/20' : 'hover:bg-[#252419]'}`}>
                        <Briefcase className="h-4 w-4 text-[#9a9585] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-[#efeae2] truncate">{p.title}</p>
                          <p className="text-xs text-[#9a9585] truncate">
                            {p.status}{p.contract_value ? ` · $${p.contract_value.toLocaleString()}` : ''}
                            {custName ? ` · ${custName}` : ''}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
