/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0D0D1A',
        cardBg: '#1A1A2E',
        cardHover: '#23233D',
        borderDark: '#2E2E48',
        accentCyan: '#00F2FE',
        accentGreen: '#00E676',
        accentYellow: '#FFA502',
        accentRed: '#FF4757'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
