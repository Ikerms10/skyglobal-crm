'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, Lock, Building2, Calendar, Database, ExternalLink, Check } from 'lucide-react'

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--sg-surface)', border: '1px solid var(--sg-border)',
      borderRadius: 'var(--r-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--sg-gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: 'var(--sg-gold)' }} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--sg-text-1)', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

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

  // Google Calendar
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  // Backup
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)

  // Handle Google Calendar OAuth callback
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setDisplayName(user.user_metadata?.display_name ?? '')
      setBusinessName(user.user_metadata?.business_name ?? 'SkyGlobal')
      setBusinessPhone(user.user_metadata?.business_phone ?? '')
      setBusinessEmail(user.user_metadata?.business_email ?? '')
      setBusinessAddress(user.user_metadata?.business_address ?? '')
      setCalendarConnected(user.user_metadata?.google_calendar_connected ?? false)
      setCalendarEmail(user.user_metadata?.google_calendar_email ?? null)
      setLastBackup(user.user_metadata?.last_backup ?? null)
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
      setNewPassword(''); setConfirmPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const saveBusiness = async () => {
    setBusinessLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { business_name: businessName, business_phone: businessPhone, business_email: businessEmail, business_address: businessAddress },
      })
      if (error) throw new Error(error.message)
      toast.success('Business settings saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusinessLoading(false)
    }
  }

  const connectCalendar = () => {
    window.location.href = '/api/calendar/auth'
  }

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

  const sectionGap = 16

  return (
    <div style={{ padding: '32px', maxWidth: 680, margin: '0 auto' }} className="p-4 md:p-8">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>Manage your account and preferences</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: sectionGap }}>
        {/* Profile */}
        <Section icon={User} title="Profile">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Display Name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email Address</label>
              <input
                value={email}
                disabled
                style={{
                  width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 15,
                  color: 'var(--text-tertiary)', cursor: 'not-allowed',
                }}
              />
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Email cannot be changed for security reasons</p>
            </div>
            <div>
              <Button onClick={saveProfile} loading={profileLoading}>Save Profile</Button>
            </div>
          </div>
        </Section>

        {/* Password */}
        <Section icon={Lock} title="Change Password">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              hint="Use a strong, unique password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
            <div>
              <Button onClick={changePassword} loading={passwordLoading}>Update Password</Button>
            </div>
          </div>
        </Section>

        {/* Business Settings */}
        <Section icon={Building2} title="Business Settings">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Business Name" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business name" />
            <Input label="Business Phone" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            <Input label="Business Email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="business@example.com" />
            <Input label="Business Address" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="123 Main St, City, State" />
            <div>
              <Button onClick={saveBusiness} loading={businessLoading}>Save Business Info</Button>
            </div>
          </div>
        </Section>

        {/* Google Calendar */}
        <Section icon={Calendar} title="Integrations">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Google Calendar icon */}
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
                <Calendar size={18} style={{ color: '#4285f4' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Google Calendar</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {calendarConnected ? calendarEmail ?? 'Connected' : 'Sync projects with your Google Calendar'}
                </p>
              </div>
            </div>
            {calendarConnected ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>
                  <Check size={12} /> Connected
                </div>
                <Button variant="secondary" size="sm" loading={calendarLoading} onClick={disconnectCalendar}>Disconnect</Button>
              </div>
            ) : (
              <Button size="sm" onClick={connectCalendar}>
                Connect <ExternalLink size={12} />
              </Button>
            )}
          </div>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Thumbtack Webhook URL</p>
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              fontSize: 12, fontFamily: 'monospace', color: 'var(--blue)', wordBreak: 'break-all',
            }}>
              {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}/api/webhooks/thumbtack
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              Set header: <code style={{ fontFamily: 'monospace' }}>x-webhook-secret: {'<THUMBTACK_WEBHOOK_SECRET>'}</code>
            </p>
          </div>
        </Section>

        {/* Data & Backups */}
        <Section icon={Database} title="Data & Backups">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Automated Backups</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {lastBackup
                    ? `Last backup: ${new Date(lastBackup).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                    : 'Daily backups run at 2:00 AM UTC'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={downloadBackup}>Download</Button>
                <Button size="sm" loading={backupLoading} onClick={triggerBackup}>Backup Now</Button>
              </div>
            </div>
          </div>
        </Section>

        {/* Danger zone */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--error-light)',
          borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--error)', margin: '0 0 8px' }}>Sign Out</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Sign out of your account on this device.</p>
          <Button variant="danger" size="sm" onClick={signOut}>Sign Out</Button>
        </div>
      </div>
    </div>
  )
}
