import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'slide-up': 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      colors: {
        background: 'var(--c-canvas)',
        card: 'var(--c-card)',
        border: 'var(--c-border)',
        muted: 'var(--c-text-4)',
        sg: {
          base: 'var(--c-canvas)',
          surface: 'var(--c-card)',
          elevated: 'var(--c-nested)',
          gold: 'var(--c-gold)',
          sky: 'var(--c-sage-soft)',
          success: 'var(--c-sage)',
          danger: 'var(--c-danger)',
          warning: 'var(--c-warning)',
          'text-1': 'var(--c-text-1)',
          'text-2': 'var(--c-text-3)',
          'text-3': 'var(--c-text-4)',
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'sans-serif'],
        display: ["'Plus Jakarta Sans'", 'sans-serif'],
        mono: ["'DM Mono'", 'monospace'],
        // Legacy aliases — kept so old code using font-ui doesn't break
        ui: ["'Plus Jakarta Sans'", 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
