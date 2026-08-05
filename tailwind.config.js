/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef0f5',
          100: '#d5d9e5',
          200: '#aeb5c9',
          300: '#8791ad',
          400: '#657196',
          500: '#455380',
          600: '#36426a',
          700: '#273154',
          800: '#18203e',
          900: '#0e1627',
        },
      },
    },
  },
  plugins: [],
};
