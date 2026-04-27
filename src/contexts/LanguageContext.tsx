'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { translate, type Language } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'sg-lang'

interface LanguageCtx {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string, vars?: Record<string, string>) => string
}

const Ctx = createContext<LanguageCtx>({
  language: 'en',
  setLanguage: async () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null
    if (saved === 'en' || saved === 'es') {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)

    // Best-effort sync to Supabase business_settings for cross-device persistence
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('business_settings')
          .upsert({ user_id: user.id, key: 'ui_language', value: lang }, { onConflict: 'user_id,key' })
      }
    } catch {
      // Non-critical — localStorage is the source of truth
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => translate(language, key, vars),
    [language],
  )

  return <Ctx.Provider value={{ language, setLanguage, t }}>{children}</Ctx.Provider>
}

export function useLanguage() {
  return useContext(Ctx)
}
