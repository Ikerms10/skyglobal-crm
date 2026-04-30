'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SignupFlow, type SignupData } from '@/components/signup/SignupFlow'

export default function SignupPage() {
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

      // 2. Upload logo if provided (uses auth session established by signUp)
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

      // 3. Create tenant + tenant_users via service-role API route
      //    (RLS on brand-new users blocks direct client inserts)
      const res = await fetch('/api/tenant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          business_name: businessName,
          business_email: email,
          business_phone: businessPhone || null,
          industry: industry || null,
          business_logo_url: logoUrl,
          business_logo_path: logoPath,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create business account')
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
    <div style={{
      minHeight: '100dvh',
      background: 'var(--c-canvas)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      {/* Platform brand */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <p style={{ fontSize: 30, fontWeight: 900, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.04em', margin: 0 }}>
          Iker's
        </p>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>
          Professional CRM
        </p>
        <p style={{ fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", margin: '10px 0 0' }}>
          Create your business account — free to start
        </p>
      </div>

      <SignupFlow onFinish={handleFinish} loading={loading} />

      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--c-gold)', textDecoration: 'none', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
