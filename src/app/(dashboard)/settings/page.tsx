'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

const profileSchema = z.object({
  email: z.string().email(),
})

const passwordSchema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  const { register: profileReg, handleSubmit: profileSubmit, reset: profileReset, formState: { errors: profileErrors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  const { register: passReg, handleSubmit: passSubmit, reset: passReset, formState: { errors: passErrors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (user?.email) profileReset({ email: user.email })
  }, [user, profileReset])

  const onProfileSubmit = async (data: ProfileForm) => {
    setLoadingProfile(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email: data.email })
      if (error) throw new Error(error.message)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoadingProfile(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    setLoadingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw new Error(error.message)
      toast.success('Password updated')
      passReset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoadingPassword(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#9a9585] text-sm">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
        <h2 className="text-base font-semibold text-[#efeae2] mb-4">Profile</h2>
        <form onSubmit={profileSubmit(onProfileSubmit)} className="space-y-4">
          <Input label="Email" type="email" {...profileReg('email')} error={profileErrors.email?.message} required />
          <div className="text-xs text-[#9a9585]">
            User ID: <span className="font-mono">{user?.id}</span>
          </div>
          <Button type="submit" loading={loadingProfile}>Save Profile</Button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
        <h2 className="text-base font-semibold text-[#efeae2] mb-4">Change Password</h2>
        <form onSubmit={passSubmit(onPasswordSubmit)} className="space-y-4">
          <Input label="New Password" type="password" {...passReg('password')} error={passErrors.password?.message} required />
          <Input label="Confirm Password" type="password" {...passReg('confirmPassword')} error={passErrors.confirmPassword?.message} required />
          <Button type="submit" loading={loadingPassword}>Update Password</Button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
        <h2 className="text-base font-semibold text-[#efeae2] mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-[#2e2d26]">
            <span className="text-[#9a9585]">Plan</span>
            <span className="text-[#efeae2]">Single-user</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#2e2d26]">
            <span className="text-[#9a9585]">Business</span>
            <span className="text-[#efeae2]">SkyGlobal Renovations</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[#9a9585]">Version</span>
            <span className="text-[#efeae2]">1.0.0</span>
          </div>
        </div>
      </div>

      {/* Webhook info */}
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
    </div>
  )
}
