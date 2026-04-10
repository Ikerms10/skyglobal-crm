'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, Lock, Building2, LogOut } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Business state
  const [businessName, setBusinessName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessLoading, setBusinessLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? '')
        setDisplayName(user.user_metadata?.display_name ?? '')
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
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      })
      if (error) throw new Error(error.message ?? 'Unknown error')
      toast.success('Profile updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message ?? 'Unknown error')
      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
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
        data: {
          business_name: businessName,
          business_phone: businessPhone,
          business_email: businessEmail,
          business_address: businessAddress,
        },
      })
      if (error) throw new Error(error.message ?? 'Unknown error')
      toast.success('Business settings saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save business settings')
    } finally {
      setBusinessLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#9a9585] text-sm">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-5 w-5 text-[#e6ab35]" />
          <h2 className="text-base font-semibold text-white">Profile</h2>
        </div>
        <div className="space-y-3">
          <Input
            label="Display Name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <div>
            <label className="text-sm font-medium text-[#efeae2] block mb-1.5">Email Address</label>
            <input
              value={email}
              disabled
              className="w-full bg-[#1d1c17] border border-[#2e2d26] text-[#9a9585] rounded-lg px-3 py-2 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-[#9a9585] mt-1">Email cannot be changed for security reasons</p>
          </div>
        </div>
        <Button onClick={saveProfile} loading={profileLoading}>Save Profile</Button>
      </div>

      {/* Password */}
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="h-5 w-5 text-[#e6ab35]" />
          <h2 className="text-base font-semibold text-white">Change Password</h2>
        </div>
        <div className="space-y-3">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
          />
        </div>
        <Button onClick={changePassword} loading={passwordLoading}>Update Password</Button>
      </div>

      {/* Business */}
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-5 w-5 text-[#e6ab35]" />
          <h2 className="text-base font-semibold text-white">Business Settings</h2>
        </div>
        <div className="space-y-3">
          <Input
            label="Business Name"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="Your business name"
          />
          <Input
            label="Business Phone"
            value={businessPhone}
            onChange={e => setBusinessPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
          <Input
            label="Business Email"
            value={businessEmail}
            onChange={e => setBusinessEmail(e.target.value)}
            placeholder="business@example.com"
          />
          <Input
            label="Business Address"
            value={businessAddress}
            onChange={e => setBusinessAddress(e.target.value)}
            placeholder="123 Main St, City, State"
          />
        </div>
        <Button onClick={saveBusiness} loading={businessLoading}>Save Business Info</Button>
      </div>

      {/* Thumbtack Integration */}
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
        <h2 className="text-base font-semibold text-[#efeae2] mb-2">Thumbtack Integration</h2>
        <p className="text-sm text-[#9a9585] mb-3">
          Use this webhook URL in Thumbtack + Zapier to auto-import leads:
        </p>
        <div className="bg-[#1d1c17] border border-[#2e2d26] rounded-lg px-3 py-2 text-xs font-mono text-[#3583b3] break-all">
          {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}/api/webhooks/thumbtack
        </div>
        <p className="text-xs text-[#9a9585] mt-2">
          Set header: <span className="font-mono">x-webhook-secret: {'<your THUMBTACK_WEBHOOK_SECRET>'}</span>
        </p>
      </div>

      {/* Sign Out */}
      <div className="bg-[#252419] border border-[#ef4444]/30 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#ef4444]">Sign Out</h2>
        <p className="text-sm text-[#9a9585]">Sign out of your account on this device.</p>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] rounded-lg text-sm hover:bg-[#ef4444]/20 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
