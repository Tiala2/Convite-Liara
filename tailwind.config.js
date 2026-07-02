/** @type {import("tailwindcss").Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        babyPink: "#F8D7E4",
        lightPink: "#F4C7D7",
        softBeige: "#F7EFE8",
      },
    },
  },
  plugins: [],
}

