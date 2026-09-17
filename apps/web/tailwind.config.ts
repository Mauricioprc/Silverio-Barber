import type { Config } from "tailwindcss";

/**
 * Identidade visual definitiva — light content + dark chrome, dourado como acento
 * pontual (não cor de botão principal). Header/pílula de navegação/botão primário em
 * preto; área de conteúdo (cards) em branco/cinza claro. Ver `frontend-silverio.md`.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          50: "#111111", // texto principal (escuro, sobre superfícies claras)
          100: "#f4f4f5", // fundo da página (cinza claro, atrás dos cards)
          300: "#6b7280", // texto secundário/muted sobre superfícies claras
          500: "#d4d4d8", // bordas/divisores neutros
          700: "#ffffff", // superfície (cards, inputs, modais)
          900: "#0a0a0a", // chrome preto (header, botão primário, trilho do menu)
        },
        destaque: {
          400: "#e3ba5c", // uso apenas sobre fundo escuro (chrome preto)
          500: "#c9982e", // preenchimento de acento (pílula ativa, ring de foco)
          600: "#a67a1e", // texto dourado sobre fundo claro (contraste)
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.625rem",
        lg: "1rem",
        xl: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 20px -12px rgba(0,0,0,0.15)",
        premium: "0 24px 60px -16px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
