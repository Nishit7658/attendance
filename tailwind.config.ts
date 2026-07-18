import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.ts",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",
          active: "rgb(var(--color-primary-active) / <alpha-value>)",
        },
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          hover: "rgb(var(--color-surface-hover) / <alpha-value>)",
        },
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          bg: "rgb(var(--color-error-bg) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          bg: "rgb(var(--color-success-bg) / <alpha-value>)",
        },
        // Legacy color overrides for Pro Tool theme consistency
        slate: {
          50: "rgb(var(--color-surface-hover) / <alpha-value>)",
          100: "rgb(var(--color-surface) / <alpha-value>)",
          200: "rgb(var(--color-border) / <alpha-value>)",
          300: "rgb(var(--color-border) / <alpha-value>)",
          400: "rgb(var(--color-muted) / <alpha-value>)",
          500: "rgb(var(--color-muted) / <alpha-value>)",
          600: "rgb(var(--color-muted) / <alpha-value>)",
          700: "rgb(var(--color-ink) / <alpha-value>)",
          800: "rgb(var(--color-ink) / <alpha-value>)",
          900: "rgb(var(--color-ink) / <alpha-value>)",
        },
        navy: {
          50: "rgb(var(--color-surface-hover) / <alpha-value>)",
          100: "rgb(var(--color-surface) / <alpha-value>)",
          200: "rgb(var(--color-border) / <alpha-value>)",
          300: "rgb(var(--color-border) / <alpha-value>)",
          400: "rgb(var(--color-muted) / <alpha-value>)",
          500: "rgb(var(--color-muted) / <alpha-value>)",
          600: "rgb(var(--color-muted) / <alpha-value>)",
          700: "rgb(var(--color-ink) / <alpha-value>)",
          800: "rgb(var(--color-ink) / <alpha-value>)",
          900: "rgb(var(--color-ink) / <alpha-value>)",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        }
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out forwards",
      }
    },
  },
  plugins: [],
};

export default config;
