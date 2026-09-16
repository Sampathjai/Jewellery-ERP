/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        gold: {
          50: '#faf8ee',
          100: '#f3ebd4',
          200: '#e7d6a7',
          300: '#d8bd75',
          400: '#cfa54f',
          500: '#d4af37', // Metallic Gold
          600: '#b8860b', // Dark Goldenrod
          700: '#966a0a',
          800: '#795310',
          900: '#644412',
          950: '#392305',
        },
        charcoal: {
          50: '#f6f6f7',
          100: '#e3e4e8',
          200: '#c7c9d1',
          300: '#a1a5b3',
          400: '#797d8f',
          500: '#5e6173',
          600: '#4a4d5c',
          700: '#3c3e4a',
          800: '#272830', // Charcoal dark
          900: '#1e1f26',
          950: '#121217',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      boxShadow: {
        gold: '0 4px 14px 0 rgba(212, 175, 55, 0.15)',
        'gold-lg': '0 10px 25px -5px rgba(212, 175, 55, 0.25)',
      }
    },
  },
  plugins: [],
};

