import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.ts",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "oklch(0.97 0.02 260)",
          100: "oklch(0.93 0.03 260)",
          200: "oklch(0.85 0.05 260)",
          500: "oklch(0.37 0.08 260)",
          700: "oklch(0.3 0.08 260)",
          800: "oklch(0.25 0.08 260)",
          900: "oklch(0.2 0.08 260)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
