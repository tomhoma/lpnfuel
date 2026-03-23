/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-light': '#EFF6FF',
        'fuel-available': '#16A34A',
        'fuel-empty': '#DC2626',
        'fuel-incoming': '#CA8A04',
        'fuel-na': '#9CA3AF',
        'bg-card': '#F7F8FA',
        'text-main': '#1A1A2E',
        'text-secondary': '#6B7280',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
