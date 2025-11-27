/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Teams Dark Mode
        'dark-bg': '#1f1f1f',
        'dark-bg-secondary': '#2d2d2d',
        'dark-bg-tertiary': '#161616',
        'teams-blue': '#0078d4',
        'teams-blue-hover': '#005a9e',
        'teams-green': '#107c10',
        'teams-red': '#d83b01',
        'teams-orange': '#ffb900',
        'teams-gray': '#d1d1d1',
        'teams-gray-dark': '#999999',
        'teams-gray-border': '#3d3d3d',
      },
      backgroundColor: {
        'dark': '#1f1f1f',
        'dark-secondary': '#2d2d2d',
        'dark-tertiary': '#161616',
      },
      textColor: {
        'dark-primary': '#ffffff',
        'dark-secondary': '#d1d1d1',
        'dark-tertiary': '#999999',
      },
      borderColor: {
        'dark': '#3d3d3d',
      },
      boxShadow: {
        'teams-sm': '0 1px 2px rgba(0, 0, 0, 0.2)',
        'teams-md': '0 4px 8px rgba(0, 0, 0, 0.3)',
        'teams-lg': '0 8px 16px rgba(0, 0, 0, 0.4)',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}
