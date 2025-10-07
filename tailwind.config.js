/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1f7aec',
          foreground: '#ffffff'
        },
        slate: {
          950: '#0b1526'
        }
      }
    }
  },
  plugins: []
};
