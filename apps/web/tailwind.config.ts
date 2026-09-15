import type { Config } from "tailwindcss";

/**
 * Paleta placeholder (grafite + âmbar queimado) — ver
 * `desenvolvimentoFront-end/00-arquitetura-e-convencoes-frontend.md`, seção "Design
 * system". Substituir por identidade visual real quando existir; não decisão final.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          50: "#f7f7f6",
          100: "#e6e5e2",
          300: "#a8a6a0",
          500: "#5c5a55",
          700: "#332f2b",
          900: "#1c1a18",
        },
        destaque: {
          400: "#d9a441",
          500: "#c08a2c",
          600: "#9c6f21",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
