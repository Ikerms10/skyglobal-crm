'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SignupFlow, type SignupData } from '@/components/signup/SignupFlow'

interface Props {
  inviteId: string
  tenantId: string
  prefillEmail: string
  role: string
}

export function InviteSignupForm({ inviteId, tenantId, prefillEmail, role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleFinish = async ({ email, password, businessName, businessPhone, industry, logoFile }: SignupData) => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (!authData.user) throw new Error('Signup failed — please try again.')

      const userId = authData.user.id

      // 2. Upload logo if provided
      let logoUrl: string | null = null
      let logoPath: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() ?? 'png'
        const path = `${userId}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('business-logos')
          .upload(path, logoFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(path)
          logoUrl = urlData.publicUrl
          logoPath = path
        }
      }

      // 3. Accept invite — service-role route adds user to tenant and finalizes it
      const res = await fetch('/api/tenant/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_id: inviteId,
          user_id: userId,
          tenant_id: tenantId,
          role,
          business_name: businessName,
          business_phone: businessPhone || null,
          industry: industry || null,
          business_logo_url: logoUrl,
          business_logo_path: logoPath,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to accept invite')
      }

      toast.success('Welcome! Your account is ready.')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SignupFlow
      prefillEmail={prefillEmail}
      onFinish={handleFinish}
      loading={loading}
    />
  )
}
