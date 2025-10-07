/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#047857"
        }
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(15, 118, 110, 0.3)"
      }
    }
  },
  plugins: []
};
