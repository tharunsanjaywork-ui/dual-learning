/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0d0e11',
        surface: {
          DEFAULT: '#0d0e11',
          'container-low': '#121317',
          container: '#181a1e',
          'container-high': '#1e2024',
          'container-highest': '#24262b',
          bright: '#2a2c32',
        },
        primary: {
          DEFAULT: '#a68cff',
          dim: '#7e51ff',
          container: '#7c4dff',
          fixed: '#c8b7ff',
          'fixed-dim': '#bba6ff',
        },
        'on-primary': '#25006b',
        secondary: {
          DEFAULT: '#00e475',
          dim: '#00d46c',
          container: '#002d12',
        },
        'on-secondary': '#004b22',
        tertiary: {
          DEFAULT: '#81ecff',
          container: '#00e3fd',
        },
        error: {
          DEFAULT: '#fd6f85',
          container: '#8a1632',
        },
        'on-surface': '#e4e5ec',
        'on-surface-variant': '#aaabb2',
        outline: {
          DEFAULT: '#74757c',
          variant: '#46484e',
        },
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'default': '1rem',
        'lg': '2rem',
        'xl': '3rem',
        'full': '9999px',
      },
      animation: {
        'bounce-slow': 'bounce-slow 2s infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s infinite',
        'progress': 'progress 1.5s ease-in-out',
        'dots': 'dots 1.5s infinite',
        'shake': 'shake 0.5s ease-in-out',
        'waveform': 'waveform 1s ease-in-out infinite',
        'page-enter': 'page-enter 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'bottom-sheet': 'bottom-sheet 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(166,140,255,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(166,140,255,0.6)' },
        },
        'progress': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'dots': {
          '0%, 20%': { opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
        'waveform': {
          '0%, 100%': { height: '4px' },
          '50%': { height: '20px' },
        },
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'bottom-sheet': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
