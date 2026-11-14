/** @type {import('tailwindcss').Config} */
// Colours are CSS variables (see src/index.css) so the whole UI, including the "slate" greys,
// flips cleanly between light and dark mode.
const scale = (prefix, steps) =>
  Object.fromEntries(steps.map((s) => [s, `rgb(var(--${prefix}-${s}) / <alpha-value>)`]));

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: scale('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        slate: scale('slate', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.06)',
        lift: '0 8px 30px rgb(15 23 42 / 0.12)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
    },
  },
  plugins: [],
};
