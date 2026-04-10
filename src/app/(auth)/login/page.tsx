'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  // Restore draft (email only, not password)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('draft:login')
      if (saved) {
        const { email } = JSON.parse(saved)
        if (email) reset({ email, password: '' })
      }
    } catch {}
  }, [reset])

  // Save draft on change (email only)
  useEffect(() => {
    const sub = watch((vals) => {
      try { localStorage.setItem('draft:login', JSON.stringify({ email: vals.email })) } catch {}
    })
    return () => sub.unsubscribe()
  }, [watch])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
      if (error) throw new Error(error.message)
      localStorage.removeItem('draft:login')
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
        <p className="text-[#9a9585] text-sm">Access your CRM dashboard</p>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-[#efeae2]">Email</label>
        <input
          {...register('email')}
          type="email"
          placeholder="you@example.com"
          className="w-full bg-[#1d1c17] border border-[#2e2d26] text-[#efeae2] placeholder-[#9a9585] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]"
        />
        {errors.email && <p className="text-xs text-[#ef4444]">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-[#efeae2]">Password</label>
        <input
          {...register('password')}
          type="password"
          placeholder="••••••••"
          className="w-full bg-[#1d1c17] border border-[#2e2d26] text-[#efeae2] placeholder-[#9a9585] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]"
        />
        {errors.password && <p className="text-xs text-[#ef4444]">{errors.password.message}</p>}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#e6ab35] hover:bg-[#d4982e] disabled:opacity-50 text-[#1d1c17] font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Signing in...</>
        ) : 'Sign in'}
      </button>
      <p className="text-center text-xs text-[#9a9585]">
        SkyGlobal Renovations — Internal Access Only
      </p>
    </form>
  )
}
