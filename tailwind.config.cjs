/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Deixa o modo escuro controlado por classes, não pelo sistema
  theme: {
    extend: {
      colors: {
        primary: '#10b981',
        title: '#374151',
        important: '#1f2937',
      },
    },
  },
  plugins: [],
} 