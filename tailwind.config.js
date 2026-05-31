/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        kid: ['"Nunito"', 'sans-serif'],
        teen: ['"Inter"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        // KID THEME — Vibrant
        kid: {
          primary: '#FF6B35',
          secondary: '#F7C59F',
          accent: '#4ECDC4',
          bg: '#FFF9F0',
          surface: '#FFFFFF',
          text: '#2D2D2D',
          purple: '#9B5DE5',
          yellow: '#FFE66D',
          pink: '#F72585',
          green: '#06D6A0',
        },
        // TEEN THEME — Dark mode
        teen: {
          primary: '#7C3AED',
          secondary: '#4F46E5',
          accent: '#06B6D4',
          bg: '#0A0A0F',
          surface: '#111827',
          card: '#1F2937',
          border: '#374151',
          text: '#F9FAFB',
          muted: '#9CA3AF',
          neon: '#A78BFA',
        },
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 4s linear infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'gradient': 'gradient 6s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(124,58,237,0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(124,58,237,0.9), 0 0 40px rgba(124,58,237,0.4)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundSize: {
        '300%': '300%',
      },
    },
  },
  plugins: [],
}
