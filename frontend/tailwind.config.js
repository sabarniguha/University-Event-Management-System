/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#141F38",
          soft: "#4B5266",
        },
        paper: "#EFF1EC",
        brass: {
          DEFAULT: "#B3872E",
          light: "#D7AE5E",
          dark: "#8A6621",
        },
        line: "#D7D3C6",
        maroon: "#7A2E2E",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Libre Franklin", "sans-serif"],
      },
      borderRadius: {
        sharp: "2px",
      },
    },
  },
  plugins: [],
};
