/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ab-green':   '#006A52',
        'ab-gold':    '#D6A02A',
        'ab-beige':   '#D3BC8D',
        'ab-neon':    '#00FF1F',
        'rich-black': '#0A0A09',
        charcoal:     '#0A0A09',
        lightblack:   '#141A16',
      },
      fontFamily: {
        display: ['"ABC Camera Plain"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        sans:    ['"ABC Camera Plain"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
