module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,jsx,js}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          500: '#10b981',
          600: '#059669'
        },
        slate: {
          700: '#334155',
          800: '#1e293b'
        }
      }
    }
  },
  plugins: []
};
