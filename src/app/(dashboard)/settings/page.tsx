'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  User, Languages, Building2, Calendar, Database,
  ExternalLink, Check, Sun, Moon, Monitor, Palette,
  Bell, Shield, TrendingUp, ChevronRight, Upload, Loader2,
} from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTenant } from '@/contexts/TenantContext'

// ─── Sidebar nav ─────────────────────────────────────────────────────────────

type Section = 'profile' | 'appearance' | 'language' | 'business' | 'notifications' | 'revenue' | 'integrations' | 'data' | 'security'

interface NavItem { id: Section; icon: React.ElementType; labelKey: string }

const NAV_ITEM_DEFS: NavItem[] = [
  { id: 'profile',       icon: User,       labelKey: 'settings.sections.profile' },
  { id: 'appearance',    icon: Palette,    labelKey: 'settings.sections.appearance' },
  { id: 'language',      icon: Languages,  labelKey: 'settings.sections.language' },
  { id: 'business',      icon: Building2,  labelKey: 'settings.sections.business' },
  { id: 'notifications', icon: Bell,       labelKey: 'settings.sections.notifications' },
  { id: 'revenue',       icon: TrendingUp, labelKey: 'settings.sections.revenue' },
  { id: 'integrations',  icon: Calendar,   labelKey: 'settings.sections.integrations' },
  { id: 'data',          icon: Database,   labelKey: 'settings.sections.data' },
  { id: 'security',      icon: Shield,     labelKey: 'settings.sections.security' },
]

// ─── Appearance cards ─────────────────────────────────────────────────────────

type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeCardProps {
  label: string
  icon: React.ElementType
  preview: React.ReactNode
  active: boolean
  onClick: () => void
}

function ThemeCard({ label, icon: Icon, preview, active, onClick }: ThemeCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        padding: '16px 12px 12px',
        borderRadius: 12,
        border: active ? '2px solid var(--c-gold)' : '2px solid var(--c-border-mid)',
        background: active ? 'var(--c-gold-bg)' : 'var(--c-nested)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        width: '100%',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 18, height: 18, borderRadius: '50%', background: 'var(--c-gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={11} color="#1d1c17" strokeWidth={3} />
        </div>
      )}
      <div style={{ width: '100%', height: 52, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
        {preview}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={13} style={{ color: active ? 'var(--c-gold)' : 'var(--c-text-4)' }} />
        <span style={{
          fontSize: 12, fontWeight: active ? 600 : 500,
          color: active ? 'var(--c-gold)' : 'var(--c-text-3)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {label}
        </span>
      </div>
    </button>
  )
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--c-text-3)', marginBottom: 7, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHead({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--c-border)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {title}
      </h2>
      {description && (
        <p style={{ fontSize: 14, color: 'var(--c-text-3)', margin: '4px 0 0', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--c-nested)',
  border: '1px solid var(--c-border)',
  color: 'var(--c-text-1)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 15,
  outline: 'none',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  boxSizing: 'border-box',
  transition: 'border-color 150ms',
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { preference, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { tenant, tenantId, updateTenant } = useTenant()
  const [langSwitching, setLangSwitching] = useState(false)

  const [activeSection, setActiveSection] = useState<Section>('profile')
  const NAV_ITEMS = NAV_ITEM_DEFS.map(d => ({ ...d, label: t(d.labelKey) }))

  // Profile
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Business
  const [businessName, setBusinessName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessLoading, setBusinessLoading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  // Notifications
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)
  const [notifyProposalViewed, setNotifyProposalViewed] = useState(true)
  const [notifyRainAlert, setNotifyRainAlert] = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)

  // Revenue goals
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [annualGoal, setAnnualGoal] = useState('')
  const [revenueLoading, setRevenueLoading] = useState(false)

  // Google Calendar
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  // Backup
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)

  useEffect(() => {
    const cal = searchParams.get('calendar')
    if (cal === 'connected') {
      toast.success('✓ Google Calendar connected!')
      setCalendarConnected(true)
      router.replace('/settings')
    } else if (cal === 'error') {
      const reason = searchParams.get('reason')
      toast.error(reason ? `Failed to connect: ${reason}` : 'Failed to connect Google Calendar')
      router.replace('/settings')
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setDisplayName(user.user_metadata?.display_name ?? '')
      setCalendarConnected(user.user_metadata?.google_calendar_connected ?? false)
      setCalendarEmail(user.user_metadata?.google_calendar_email ?? null)
      setLastBackup(user.user_metadata?.last_backup ?? null)

      const { data: rows } = await supabase
        .from('business_settings')
        .select('key, value')
        .eq('user_id', user.id)

      if (rows?.length) {
        const biz = rows.reduce((acc: Record<string, string>, r: { key: string; value: string }) => {
          acc[r.key] = r.value
          return acc
        }, {})
        setBusinessName(biz.business_name ?? 'SkyGlobal')
        setBusinessPhone(biz.business_phone ?? '')
        setBusinessEmail(biz.business_email ?? '')
        setBusinessAddress(biz.business_address ?? '')
        // KV values are strings; treat absence of 'false' as true for toggles that default on
        setNotifyWeeklyReport(biz.notify_weekly_report !== 'false')
        setNotifyProposalViewed(biz.notify_proposal_viewed !== 'false')
        setNotifyRainAlert(biz.notify_rain_alert === 'true')
        setMonthlyGoal(biz.monthly_revenue_goal ?? '')
        setAnnualGoal(biz.annual_revenue_goal ?? '')
      } else {
        // Fall back to legacy user_metadata values
        setBusinessName(user.user_metadata?.business_name ?? 'SkyGlobal')
        setBusinessPhone(user.user_metadata?.business_phone ?? '')
        setBusinessEmail(user.user_metadata?.business_email ?? '')
        setBusinessAddress(user.user_metadata?.business_address ?? '')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async () => {
    setProfileLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } })
      if (error) throw new Error(error.message)
      toast.success('Profile updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const uploadLogo = async (): Promise<{ url: string; path: string } | null> => {
    if (!logoFile || !tenantId) return null
    setLogoUploading(true)
    try {
      const ext = logoFile.name.split('.').pop()
      const path = `${tenantId}/logo.${ext}`
      const { error } = await supabase.storage.from('business-logos').upload(path, logoFile, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(path)
      return { url: urlData.publicUrl, path }
    } finally {
      setLogoUploading(false)
    }
  }

  const saveBusiness = async () => {
    setBusinessLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Save to business_settings kv table (used by reports/proposals)
      const { error } = await supabase.from('business_settings').upsert([
        { user_id: user.id, key: 'business_name',    value: businessName },
        { user_id: user.id, key: 'business_phone',   value: businessPhone },
        { user_id: user.id, key: 'business_email',   value: businessEmail },
        { user_id: user.id, key: 'business_address', value: businessAddress },
      ], { onConflict: 'user_id,key' })
      if (error) throw new Error(error.message)

      // Upload logo if a new one was selected
      let logoUpdate: Record<string, string> = {}
      if (logoFile) {
        const uploaded = await uploadLogo()
        if (uploaded) {
          logoUpdate = { business_logo_url: uploaded.url, business_logo_path: uploaded.path }
          setLogoFile(null)
        }
      }

      // Also sync to tenants table so sidebar/header shows current name/logo
      if (tenantId) {
        await supabase.from('tenants').update({
          business_name: businessName,
          business_email: businessEmail || null,
          business_phone: businessPhone || null,
          business_address: businessAddress || null,
          ...logoUpdate,
        }).eq('id', tenantId)
        updateTenant({ business_name: businessName, business_email: businessEmail || null, business_phone: businessPhone || null, business_address: businessAddress || null, ...logoUpdate })
      }

      toast.success('Business info saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusinessLoading(false)
    }
  }

  const saveNotifications = async () => {
    setNotifyLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('business_settings').upsert([
        { user_id: user.id, key: 'notify_weekly_report',   value: String(notifyWeeklyReport) },
        { user_id: user.id, key: 'notify_proposal_viewed', value: String(notifyProposalViewed) },
        { user_id: user.id, key: 'notify_rain_alert',      value: String(notifyRainAlert) },
      ], { onConflict: 'user_id,key' })
      if (error) throw new Error(error.message)
      toast.success('Notification preferences saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setNotifyLoading(false)
    }
  }

  const saveRevenue = async () => {
    setRevenueLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('business_settings').upsert([
        { user_id: user.id, key: 'monthly_revenue_goal', value: monthlyGoal },
        { user_id: user.id, key: 'annual_revenue_goal',  value: annualGoal },
      ], { onConflict: 'user_id,key' })
      if (error) throw new Error(error.message)
      toast.success('Revenue goals saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setRevenueLoading(false)
    }
  }

  const connectCalendar = () => { window.location.href = '/api/calendar/auth' }

  const disconnectCalendar = async () => {
    setCalendarLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { google_calendar_connected: false, google_calendar_email: null, google_calendar_tokens: null },
      })
      if (error) throw new Error(error.message)
      setCalendarConnected(false)
      setCalendarEmail(null)
      toast.success('Google Calendar disconnected')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setCalendarLoading(false)
    }
  }

  const triggerBackup = async () => {
    setBackupLoading(true)
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      if (!res.ok) throw new Error('Backup failed')
      const json = await res.json()
      const ts = new Date().toISOString()
      await supabase.auth.updateUser({ data: { last_backup: ts } })
      setLastBackup(ts)
      toast.success(`Backup complete — ${json.records_backed_up ?? 0} records saved`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Backup failed')
    } finally {
      setBackupLoading(false)
    }
  }

  const downloadBackup = async () => {
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) throw new Error('Failed to fetch backup')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `skyglobal-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const signOutAllDevices = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' })
      router.push('/login')
    } catch {
      toast.error('Failed to sign out all devices')
    }
  }

  const handleLangChange = async (lang: 'en' | 'es') => {
    setLangSwitching(true)
    await setLanguage(lang)
    setTimeout(() => setLangSwitching(false), 400)
    toast.success(lang === 'es' ? '¡Idioma actualizado!' : 'Language updated!')
  }

  // ─── Panels ─────────────────────────────────────────────────────────────────

  const panels: Record<Section, React.ReactNode> = {
    profile: (
      <>
        <SectionHead title="Profile" description="Manage your display name and account email." />
        <FieldRow label="Display Name">
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }} />
        </FieldRow>
        <FieldRow label="Email Address">
          <input value={email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          <p style={{ fontSize: 12, color: 'var(--c-text-4)', marginTop: 4 }}>Email cannot be changed for security reasons.</p>
        </FieldRow>
        <Button onClick={saveProfile} loading={profileLoading}>Save Profile</Button>
      </>
    ),

    appearance: (
      <>
        <SectionHead title="Appearance" description="Choose how SkyGlobal CRM looks. System follows your OS setting." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <ThemeCard label="Light" icon={Sun} active={preference === 'light'} onClick={() => setTheme('light')}
            preview={
              <div style={{ width: '100%', height: '100%', background: '#f5f0e8', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: '#e0d5c0' }} />
                  <div style={{ width: 40, height: 6, borderRadius: 3, background: '#5c5240', opacity: 0.7 }} />
                </div>
                <div style={{ width: '80%', height: 5, borderRadius: 3, background: '#8a7a60', opacity: 0.5 }} />
                <div style={{ width: '60%', height: 5, borderRadius: 3, background: '#8a7a60', opacity: 0.35 }} />
                <div style={{ marginTop: 4, width: 36, height: 12, borderRadius: 4, background: '#e6ab35' }} />
              </div>
            }
          />
          <ThemeCard label="Dark" icon={Moon} active={preference === 'dark'} onClick={() => setTheme('dark')}
            preview={
              <div style={{ width: '100%', height: '100%', background: '#1d1c17', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: '#3a3830' }} />
                  <div style={{ width: 40, height: 6, borderRadius: 3, background: '#efeae2', opacity: 0.8 }} />
                </div>
                <div style={{ width: '80%', height: 5, borderRadius: 3, background: '#bfb9ae', opacity: 0.5 }} />
                <div style={{ width: '60%', height: 5, borderRadius: 3, background: '#bfb9ae', opacity: 0.35 }} />
                <div style={{ marginTop: 4, width: 36, height: 12, borderRadius: 4, background: '#e6ab35' }} />
              </div>
            }
          />
          <ThemeCard label="System" icon={Monitor} active={preference === 'system'} onClick={() => setTheme('system')}
            preview={
              <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                <div style={{ flex: 1, background: '#f5f0e8', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ width: '100%', height: 6, borderRadius: 2, background: '#5c5240', opacity: 0.6 }} />
                  <div style={{ width: '80%', height: 4, borderRadius: 2, background: '#8a7a60', opacity: 0.4 }} />
                  <div style={{ marginTop: 6, width: 28, height: 8, borderRadius: 3, background: '#e6ab35' }} />
                </div>
                <div style={{ flex: 1, background: '#1d1c17', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ width: '100%', height: 6, borderRadius: 2, background: '#efeae2', opacity: 0.7 }} />
                  <div style={{ width: '80%', height: 4, borderRadius: 2, background: '#bfb9ae', opacity: 0.4 }} />
                  <div style={{ marginTop: 6, width: 28, height: 8, borderRadius: 3, background: '#e6ab35' }} />
                </div>
              </div>
            }
          />
        </div>
      </>
    ),

    language: (
      <>
        <SectionHead title={t('settings.language.title')} description={t('settings.language.description')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 440 }}>
          {([
            { lang: 'en' as const, flag: '🇺🇸', label: t('settings.language.english') },
            { lang: 'es' as const, flag: '🇪🇸', label: t('settings.language.spanish') },
          ]).map(({ lang, flag, label }) => {
            const isActive = language === lang
            return (
              <button
                key={lang}
                onClick={() => handleLangChange(lang)}
                disabled={langSwitching}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: '24px 16px 18px',
                  borderRadius: 14,
                  border: isActive ? '2px solid var(--c-gold)' : '2px solid var(--c-border-mid)',
                  background: isActive ? 'var(--c-gold-bg)' : 'var(--c-nested)',
                  cursor: langSwitching ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: langSwitching ? 0.7 : 1,
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 20, height: 20, borderRadius: '50%', background: 'var(--c-gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={12} color="#1d1c17" strokeWidth={3} />
                  </div>
                )}
                <span style={{ fontSize: 44, lineHeight: 1 }}>{flag}</span>
                <span style={{
                  fontSize: 15, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--c-gold)' : 'var(--c-text-2)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
        {langSwitching && (
          <p style={{ fontSize: 13, color: 'var(--c-text-4)', marginTop: 14 }}>
            {t('settings.language.switching')}
          </p>
        )}
      </>
    ),

    business: (
      <>
        <SectionHead title="Business Info" description="This information is used on proposals, invoices, and the sidebar." />

        {/* Logo upload */}
        <FieldRow label="Business Logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 10, background: '#fff', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {(logoPreview || tenant?.business_logo_url) ? (
                <img src={logoPreview ?? tenant?.business_logo_url ?? ''} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Building2 size={28} style={{ color: 'var(--c-text-4)' }} />
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c-border)', cursor: 'pointer', background: 'var(--c-nested)', transition: 'border-color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-gold-border)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}
            >
              {logoUploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} style={{ color: 'var(--c-text-4)' }} />}
              <span style={{ fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {logoFile ? logoFile.name : 'Upload logo'}
              </span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
            </label>
            {logoFile && (
              <button onClick={() => { setLogoFile(null); setLogoPreview(null) }} style={{ fontSize: 11, color: 'var(--c-danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
                Remove
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 6, fontFamily: "'DM Mono', monospace" }}>
            PNG, JPG, or SVG — appears in the sidebar, proposals, and invoices.
          </p>
        </FieldRow>

        <FieldRow label="Business Name">
          <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="SkyGlobal Renovations LLC" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }} />
        </FieldRow>
        <FieldRow label="Business Phone">
          <input value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="+1 (352) 000-0000" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }} />
        </FieldRow>
        <FieldRow label="Business Email">
          <input value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="business@example.com" type="email" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }} />
        </FieldRow>
        <FieldRow label="Business Address">
          <input value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="123 Main St, Orlando, FL" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }} />
        </FieldRow>
        <Button onClick={saveBusiness} loading={businessLoading || logoUploading}>Save Business Info</Button>
      </>
    ),

    notifications: (
      <>
        <SectionHead title="Notifications" description="Choose which alerts and reports you receive." />
        {([
          { key: 'weekly', label: 'Weekly Summary Report', desc: 'Receive a weekly digest of revenue, leads, and projects.', value: notifyWeeklyReport, set: setNotifyWeeklyReport },
          { key: 'proposal', label: 'Proposal Viewed', desc: 'Get notified when a client opens your proposal.', value: notifyProposalViewed, set: setNotifyProposalViewed },
          { key: 'rain', label: 'Rain Alert', desc: 'Weather alert when rain is forecast on a scheduled job day.', value: notifyRainAlert, set: setNotifyRainAlert },
        ] as const).map(({ key, label, desc, value, set }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--c-border)' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 12, color: 'var(--c-text-4)', marginTop: 3 }}>{desc}</p>
            </div>
            <button
              onClick={() => set(!value)}
              style={{
                width: 42, height: 24, borderRadius: 12,
                background: value ? 'var(--c-sage)' : 'var(--c-border-mid)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 200ms', flexShrink: 0,
              }}
              aria-checked={value}
              role="switch"
            >
              <span style={{
                position: 'absolute', top: 3, left: value ? 21 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 200ms',
              }} />
            </button>
          </div>
        ))}
        <div style={{ marginTop: 20 }}>
          <Button onClick={saveNotifications} loading={notifyLoading}>Save Preferences</Button>
        </div>
      </>
    ),

    revenue: (
      <>
        <SectionHead title="Revenue Goals" description="Set monthly and annual targets to track your progress on the dashboard." />
        <FieldRow label="Monthly Revenue Goal ($)">
          <input
            type="number" min="0" step="100"
            value={monthlyGoal}
            onChange={e => setMonthlyGoal(e.target.value)}
            placeholder="e.g. 25000"
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
          />
        </FieldRow>
        <FieldRow label="Annual Revenue Goal ($)">
          <input
            type="number" min="0" step="1000"
            value={annualGoal}
            onChange={e => setAnnualGoal(e.target.value)}
            placeholder="e.g. 300000"
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
          />
        </FieldRow>
        <Button onClick={saveRevenue} loading={revenueLoading}>Save Goals</Button>
      </>
    ),

    integrations: (
      <>
        <SectionHead title="Integrations" description="Connect third-party services to your CRM." />

        {/* Google Calendar */}
        <div style={{ background: 'var(--c-nested)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--c-card)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={20} style={{ color: '#4285f4' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)', margin: 0 }}>Google Calendar</p>
              <p style={{ fontSize: 12, color: 'var(--c-text-4)', marginTop: 2 }}>
                {calendarConnected ? (calendarEmail ?? 'Connected') : 'Sync projects with Google Calendar'}
              </p>
            </div>
            {calendarConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--c-sage)', fontWeight: 600 }}>
                  <Check size={12} /> Connected
                </span>
                <Button variant="secondary" size="sm" loading={calendarLoading} onClick={disconnectCalendar}>Disconnect</Button>
              </div>
            ) : (
              <Button size="sm" onClick={connectCalendar} style={{ flexShrink: 0 }}>
                Connect <ExternalLink size={12} />
              </Button>
            )}
          </div>
        </div>

        {/* Thumbtack / lead webhook */}
        <div style={{ background: 'var(--c-nested)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-2)', marginBottom: 10 }}>Lead Webhook URL (Thumbtack / Zapier)</p>
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 8,
            padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', color: '#3583b3', wordBreak: 'break-all',
          }}>
            {(typeof window !== 'undefined' ? window.location.origin : 'https://crm.skyglobalsvcs.com')}
            {tenantId ? `/api/webhooks/leads/${tenantId}` : '/api/webhooks/leads/<your-tenant-id>'}
          </div>
          <p style={{ fontSize: 12, color: 'var(--c-text-4)', marginTop: 8 }}>
            Set header: <code style={{ fontFamily: 'monospace', color: 'var(--c-gold)' }}>x-webhook-secret: {'<THUMBTACK_WEBHOOK_SECRET>'}</code>
          </p>
        </div>
      </>
    ),

    data: (
      <>
        <SectionHead title="Data & Backups" description="Export and download your CRM data." />
        <div style={{ background: 'var(--c-nested)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)', margin: 0 }}>Export All Data</p>
              <p style={{ fontSize: 12, color: 'var(--c-text-4)', marginTop: 3 }}>
                {lastBackup
                  ? `Last backup: ${new Date(lastBackup).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                  : 'Download all customers, leads, projects, and expenses as JSON.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button variant="secondary" size="sm" onClick={downloadBackup}>Download</Button>
              <Button size="sm" loading={backupLoading} onClick={triggerBackup}>Backup Now</Button>
            </div>
          </div>
        </div>
      </>
    ),

    security: (
      <>
        <SectionHead title="Security" description="Manage your password and active sessions." />

        {/* Change password */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-1)', margin: '0 0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Change Password
          </h3>
          <FieldRow label="New Password">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }} />
          </FieldRow>
          <FieldRow label="Confirm New Password">
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }} />
          </FieldRow>
          <Button onClick={changePassword} loading={passwordLoading}>Update Password</Button>
        </div>

        {/* Sign out */}
        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-1)', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Sessions
          </h3>
          <p style={{ fontSize: 13, color: 'var(--c-text-4)', marginBottom: 16, lineHeight: 1.5 }}>
            Sign out of this device or all devices at once.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={signOut}>Sign Out This Device</Button>
            <Button variant="danger" size="sm" onClick={signOutAllDevices}>Sign Out All Devices</Button>
          </div>
        </div>
      </>
    ),
  }

  // ─── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100%', maxWidth: 1000, margin: '0 auto' }}>
      {/* Mobile: horizontal scroll chip nav */}
      <nav className="settings-accordion-nav" aria-label="Settings sections">
        {NAV_ITEMS.map(item => {
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`settings-accordion-btn${isActive ? ' active' : ''}`}
            >
              <item.icon size={14} aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div
        style={{ display: 'flex' }}
        className="p-4 md:p-6 md:gap-6 flex-col md:flex-row"
      >
        {/* Desktop sidebar nav */}
        <aside
          style={{
            background: 'var(--c-card)',
            border: '1px solid var(--c-border)',
            borderRadius: 14,
            padding: '8px',
            alignSelf: 'flex-start',
            boxShadow: 'var(--s-card)',
          }}
          className="settings-sidebar shrink-0 mb-4 md:mb-0 sticky top-6 hidden md:block"
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 12px 6px', fontFamily: "'DM Mono', monospace" }}>
            {t('settings.title')}
          </p>
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: isActive ? 'var(--c-gold-bg)' : 'transparent',
                  color: isActive ? 'var(--c-gold)' : 'var(--c-text-3)',
                  transition: 'background 150ms, color 150ms',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'var(--c-nested)'
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <item.icon size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={13} aria-hidden="true" />}
              </button>
            )
          })}
        </aside>

        {/* Panel */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              background: 'var(--c-card)',
              border: '1px solid var(--c-border)',
              borderRadius: 14,
              boxShadow: 'var(--s-card)',
            }}
            className="settings-content p-4 md:p-7"
          >
            {panels[activeSection]}
          </div>
        </main>
      </div>
    </div>
  )
}
