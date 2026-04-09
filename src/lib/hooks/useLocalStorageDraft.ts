'use client'
import { useEffect, useCallback } from 'react'
import { UseFormWatch, UseFormReset, FieldValues, DefaultValues } from 'react-hook-form'

interface UseLocalStorageDraftOptions<T extends FieldValues> {
  key: string
  watch: UseFormWatch<T>
  reset: UseFormReset<T>
  defaultValues: DefaultValues<T>
  exclude?: (keyof T)[]
}

export function useLocalStorageDraft<T extends FieldValues>({
  key, watch, reset, defaultValues, exclude = []
}: UseLocalStorageDraftOptions<T>) {
  // Restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`draft:${key}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        exclude.forEach(field => { delete parsed[field as string] })
        reset({ ...defaultValues, ...parsed } as T)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Save on change
  useEffect(() => {
    const subscription = watch((values) => {
      try {
        const toSave = { ...values }
        exclude.forEach(field => { delete toSave[field as string] })
        localStorage.setItem(`draft:${key}`, JSON.stringify(toSave))
      } catch {}
    })
    return () => subscription.unsubscribe()
  }, [watch, key, exclude])

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(`draft:${key}`) } catch {}
  }, [key])

  return { clearDraft }
}
