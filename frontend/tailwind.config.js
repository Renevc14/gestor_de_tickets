/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Binance dark palette ──────────────────────────────
        'dark-bg':           '#0B0E11',   // Fondo principal
        'dark-bg-secondary': '#1E2329',   // Cards / surfaces
        'dark-bg-tertiary':  '#151A20',   // Nivel intermedio

        // ── Acento dorado Binance ─────────────────────────────
        'teams-blue':       '#F0B90B',   // Gold primary
        'teams-blue-hover': '#c8980a',   // Gold hover (más oscuro)

        // ── Semánticos ────────────────────────────────────────
        'teams-green':      '#03A66D',   // Binance green
        'teams-red':        '#CF304A',   // Binance red
        'teams-orange':     '#F0B90B',   // Igual al gold

        // ── Neutros ───────────────────────────────────────────
        'teams-gray':       '#EAECEF',   // Texto principal
        'teams-gray-dark':  '#848E9C',   // Texto secundario
        'teams-gray-border':'#2B3139',   // Bordes
      },
      textColor: {
        'dark-primary':   '#EAECEF',
        'dark-secondary': '#848E9C',
      },
      borderColor: {
        'dark': '#2B3139',
      },
      boxShadow: {
        'teams-sm':  '0 1px 4px rgba(0,0,0,0.6)',
        'teams-md':  '0 4px 16px rgba(0,0,0,0.5)',
        'teams-lg':  '0 8px 32px rgba(0,0,0,0.6)',
        'gold':      '0 0 20px rgba(240,185,11,0.25), 0 0 40px rgba(240,185,11,0.1)',
        'gold-sm':   '0 0 10px rgba(240,185,11,0.2)',
        'glow':      '0 0 16px rgba(240,185,11,0.3)',
        'card-hover':'0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(240,185,11,0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin':         'spin 1s linear infinite',
        'fade-up':      'fadeUp 0.3s ease-out',
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-in':     'slideIn 0.25s ease-out',
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
        'shimmer':      'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(240,185,11,0)' },
          '50%':      { boxShadow: '0 0 12px 3px rgba(240,185,11,0.2)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
