/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#070d1f',
        'bg-card': 'rgba(255,255,255,0.04)',
        'accent-cyan': '#00e5ff',
        'accent-magenta': '#e91e8c',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
