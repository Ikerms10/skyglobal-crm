import { en } from './en'
import { es } from './es'

export type Language = 'en' | 'es'

const dictionaries: Record<Language, Record<string, string>> = { en, es }

export function translate(lang: Language, key: string, vars?: Record<string, string>): string {
  const dict = dictionaries[lang]
  let text = dict[key] ?? en[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v)
    }
  }
  return text
}

export function getSMSTemplates(lang: Language) {
  const es = lang === 'es'
  return {
    initialOutreach: es
      ? `¡Hola {name}! Soy Iker de SkyGlobal Renovaciones. Vi tu solicitud y quería comunicarme personalmente. Me encantaría darte un estimado gratis — ¿tienes disponibilidad para una llamada rápida o visita esta semana? 📞 352-782-2460`
      : `Hi {name}! This is Iker from SkyGlobal Renovations. I saw your request and wanted to personally reach out. I'd love to give you a free estimate — are you available for a quick call or site visit this week? 📞 352-782-2460`,

    proposalFollowUp: es
      ? `¡Hola {name}! Solo haciendo seguimiento sobre la propuesta que envié para {address}. Con gusto respondo cualquier pregunta o ajusto lo que necesites. ¡Espero trabajar contigo! — Iker, SkyGlobal Renovaciones 🎨`
      : `Hi {name}, just following up on the proposal I sent over for {address}. Happy to answer any questions or adjust anything. Looking forward to working with you! — Iker, SkyGlobal Renovations 🎨`,

    checkIn: es
      ? `¡Hola {name}! Quería hacer seguimiento — ¿tuviste oportunidad de revisar la propuesta? Sin presión, solo quiero asegurarme de que tengas todo lo que necesitas. Llámame cuando quieras: 352-782-2460 — Iker`
      : `Hi {name}! Wanted to check in — did you get a chance to review the proposal? No pressure at all, just want to make sure you have everything you need. Give me a call anytime: 352-782-2460 — Iker`,

    jobConfirmation: es
      ? `¡Hola {name}! Con gusto confirmo que estamos listos para tu proyecto en {address}. Estaremos allí el {date}. No dudes en contactarme con cualquier pregunta. ¡Nos vemos pronto! — SkyGlobal Renovaciones 🏠✨`
      : `Hi {name}! Excited to confirm we're all set for your project at {address}. We'll be there on {date}. Please don't hesitate to reach out with any questions. See you soon! — SkyGlobal Renovations 🏠✨`,

    reEngagement: es
      ? `¡Hola {name}! Soy Iker de SkyGlobal Renovaciones — ¡espero que estés muy bien! Ha pasado un tiempo y quería saludarte. Si tienes alguna necesidad de pintura o renovación próximamente, con mucho gusto te ayudo de nuevo. ¡Llámame cuando quieras! 352-782-2460 🎨`
      : `Hi {name}! It's Iker from SkyGlobal Renovations — hope you're doing great! It's been a while and I wanted to reach out. If you have any painting or renovation needs coming up, I'd love to help again. Give me a call anytime! 352-782-2460 🎨`,
  }
}
