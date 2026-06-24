/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "moca-red": "#E52217",
        "moca-red-dark": "#C41D13",
        "moca-red-light": "#FFE7E6",
        "moca-black": "#191919",
        "moca-gray": "#8A8A8A",
        "moca-bg": "#F3F4F6",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        figtree: ["Figtree", "sans-serif"],
        sans: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
