import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0F1E',
        card:       '#111827',
        border:     'rgba(148,163,184,0.08)',
        muted:      '#94A3B8',
        sg: {
          base:      '#0A0F1E',
          surface:   '#111827',
          elevated:  '#1C2537',
          gold:      '#F59E0B',
          sky:       '#38BDF8',
          success:   '#10B981',
          danger:    '#F87171',
          warning:   '#FBBF24',
          'text-1':  '#F0F4FF',
          'text-2':  '#94A3B8',
          'text-3':  '#475569',
        },
      },
      fontFamily: {
        sans:    ["'Plus Jakarta Sans'", 'sans-serif'],
        display: ["'Plus Jakarta Sans'", 'sans-serif'],
        mono:    ["'DM Mono'", 'monospace'],
        // Legacy aliases — kept so old code using font-ui doesn't break
        ui:      ["'Plus Jakarta Sans'", 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
