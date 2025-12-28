/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Jira Dark Theme Palette
        'jira-bg': '#1D2125',
        'jira-bg-card': '#22272B',
        'jira-bg-elevated': '#282E33',
        'jira-bg-input': '#22272B',
        'jira-bg-hover': '#A6C5E229',
        'jira-bg-selected': '#1C3D5C',

        // Jira Brand Colors
        'jira-blue': '#579DFF',
        'jira-blue-bold': '#85B8FF',
        'jira-blue-subtle': '#09326C',
        'jira-purple': '#9F8FEF',
        'jira-purple-bold': '#B8ACF6',
        'jira-teal': '#6CC3E0',

        // Status Colors
        'jira-green': '#4BCE97',
        'jira-green-bold': '#7EE2B8',
        'jira-green-subtle': '#164B35',
        'jira-yellow': '#F5CD47',
        'jira-yellow-bold': '#F8E6A0',
        'jira-yellow-subtle': '#533F04',
        'jira-orange': '#FAA53D',
        'jira-orange-bold': '#FEC57B',
        'jira-orange-subtle': '#5F3811',
        'jira-red': '#F87168',
        'jira-red-bold': '#FD9891',
        'jira-red-subtle': '#5D1F1A',

        // Text Colors
        'jira-text': '#B6C2CF',
        'jira-text-subtle': '#8C9BAB',
        'jira-text-subtlest': '#626F86',
        'jira-text-inverse': '#1D2125',

        // Border Colors
        'jira-border': '#A1BDD914',
        'jira-border-bold': '#A6C5E229',
      },
      backgroundColor: {
        'dark': '#1D2125',
        'dark-secondary': '#22272B',
        'dark-tertiary': '#282E33',
      },
      textColor: {
        'dark-primary': '#B6C2CF',
        'dark-secondary': '#8C9BAB',
        'dark-tertiary': '#626F86',
      },
      borderColor: {
        'dark': '#A1BDD914',
        'dark-bold': '#A6C5E229',
      },
      boxShadow: {
        'jira-sm': '0 1px 1px #03040480, 0 0 1px #03040480',
        'jira-md': '0 8px 12px #0304044D, 0 0 1px #03040480',
        'jira-lg': '0 12px 24px #0304044D, 0 0 1px #03040480',
        'jira-xl': '0 20px 32px #0304044D, 0 0 1px #03040480',
        'jira-glow': '0 0 20px rgba(87, 157, 255, 0.3)',
        'jira-glow-green': '0 0 20px rgba(76, 206, 151, 0.3)',
        'jira-glow-red': '0 0 20px rgba(248, 113, 104, 0.3)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
      },
      fontSize: {
        'xxs': '0.625rem',
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        'jira': '3px',
        'jira-md': '8px',
        'jira-lg': '12px',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(87, 157, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(87, 157, 255, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      transitionTimingFunction: {
        'jira': 'cubic-bezier(0.15, 1.0, 0.3, 1.0)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [],
}
