'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, User, Briefcase, Target, X, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatCurrency } from '@/lib/utils'
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

const TYPE_ICON_MAP = {
  customer: <User size={13} aria-hidden="true" />,
  lead:     <Target size={13} aria-hidden="true" />,
  project:  <Briefcase size={13} aria-hidden="true" />,
}

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

  const allResults: { href: string; label: string; sub: string; type: 'customer' | 'lead' | 'project'; id: string }[] = []
  if (data) {
    data.customers.forEach((c: any) => allResults.push({ href: `/customers/${c.id}`, label: c.name, sub: c.phone || c.email || c.type, type: 'customer', id: c.id }))
    data.leads.forEach((l: any) => allResults.push({ href: '/leads', label: l.title, sub: `${l.stage}${l.estimated_value ? ` · ${formatCurrency(l.estimated_value)}` : ''}`, type: 'lead', id: l.id }))
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

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--c-text-3)',
    padding: '8px 14px 4px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontFamily: "'DM Mono', monospace",
    background: 'var(--c-nested)',
    display: 'block',
  }

  return (
    <div ref={ref} className="relative max-w-md w-full">
      <div style={{ position: 'relative' }}>
        <Search
          style={{
            position: 'absolute',
            left: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--c-text-4)',
            pointerEvents: 'none',
          }}
          size={14}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(-1) }}
          onFocus={() => { setOpen(true); setRecent(getRecent()) }}
          onKeyDown={handleKeyDown}
          placeholder="Search... (⌘K)"
          aria-label="Global search"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          style={{
            width: '100%',
            background: 'var(--c-nested)',
            border: '1px solid var(--c-border)',
            color: 'var(--c-text-2)',
            borderRadius: 'var(--r-sm)',
            paddingLeft: 34,
            paddingRight: 32,
            paddingTop: 7,
            paddingBottom: 7,
            fontSize: 13,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            outline: 'none',
            transition: 'border-color 150ms, box-shadow 150ms',
          }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = 'var(--c-sage-soft)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(122,158,126,0.18)'
            e.currentTarget.style.background = 'var(--c-card)'
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = 'var(--c-border)'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.background = 'var(--c-nested)'
          }}
        />
        {isFetching && query.length >= 2 ? (
          <Loader2
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-sage-soft)' }}
            size={13}
            className="animate-spin"
            aria-label="Searching..."
          />
        ) : query ? (
          <button
            onClick={clearSearch}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            aria-label="Clear search"
          >
            <X size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--c-card)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--s-modal)',
            zIndex: 50,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {/* Recent */}
          {query.length < 2 && recent.length > 0 && (
            <div>
              <span style={sectionHeaderStyle}>Recent</span>
              {recent.map((r, i) => (
                <button
                  key={r.href}
                  role="option"
                  aria-selected={highlight === i}
                  onClick={() => navigate(r.href, r.name, r.type, r.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    textAlign: 'left',
                    background: highlight === i ? 'var(--c-nested)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--c-text-1)',
                    transition: 'background 100ms',
                  }}
                >
                  <span style={{ color: 'var(--c-text-4)' }}>{TYPE_ICON_MAP[r.type]}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--c-text-3)', margin: 0, textTransform: 'capitalize', fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>{r.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search results */}
          {query.length >= 2 && (
            <>
              {!hasResults && !isFetching && (
                <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--c-text-1)', marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    No results for &quot;{debouncedQuery}&quot;
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>Try a different search term</p>
                </div>
              )}

              {data?.customers && data.customers.length > 0 && (
                <div>
                  <span style={sectionHeaderStyle}>Customers ({data.customers.length})</span>
                  {data.customers.map((c: any, idx: number) => (
                    <button
                      key={c.id}
                      role="option"
                      aria-selected={highlight === idx}
                      onClick={() => navigate(`/customers/${c.id}`, c.name, 'customer', c.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 14px',
                        textAlign: 'left',
                        background: highlight === idx ? 'var(--c-nested)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--c-text-1)',
                        transition: 'background 100ms',
                      }}
                    >
                      <User size={13} style={{ color: 'var(--c-text-4)', flexShrink: 0 }} aria-hidden="true" />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: 0, fontFamily: "'DM Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.phone || c.email || c.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {data?.leads && data.leads.length > 0 && (
                <div>
                  <span style={sectionHeaderStyle}>Leads ({data.leads.length})</span>
                  {data.leads.map((l: any, idx: number) => {
                    const globalIdx = (data.customers?.length ?? 0) + idx
                    const custName = Array.isArray(l.customers) ? l.customers[0]?.name : l.customers?.name
                    return (
                      <button
                        key={l.id}
                        role="option"
                        aria-selected={highlight === globalIdx}
                        onClick={() => navigate('/leads', l.title, 'lead', l.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 14px',
                          textAlign: 'left',
                          background: highlight === globalIdx ? 'var(--c-nested)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 100ms',
                        }}
                      >
                        <Target size={13} style={{ color: 'var(--c-gold)', flexShrink: 0 }} aria-hidden="true" />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
                          <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: 0, fontFamily: "'DM Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.stage}{l.estimated_value ? ` · ${formatCurrency(l.estimated_value)}` : ''}
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
                  <span style={sectionHeaderStyle}>Projects ({data.projects.length})</span>
                  {data.projects.map((p: any, idx: number) => {
                    const globalIdx = (data.customers?.length ?? 0) + (data.leads?.length ?? 0) + idx
                    const custName = Array.isArray(p.customers) ? p.customers[0]?.name : p.customers?.name
                    return (
                      <button
                        key={p.id}
                        role="option"
                        aria-selected={highlight === globalIdx}
                        onClick={() => navigate(`/customers/${p.customer_id}/projects/${p.id}`, p.title, 'project', p.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 14px',
                          textAlign: 'left',
                          background: highlight === globalIdx ? 'var(--c-nested)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 100ms',
                        }}
                      >
                        <Briefcase size={13} style={{ color: 'var(--c-sage)', flexShrink: 0 }} aria-hidden="true" />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                          <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: 0, fontFamily: "'DM Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.status}{p.contract_value ? ` · ${formatCurrency(p.contract_value)}` : ''}
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
