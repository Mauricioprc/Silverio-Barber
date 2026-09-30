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
          600: "#242424", // borda sutil sobre superfície escura (telas dark, ex.: Barbeiros)
          700: "#ffffff", // superfície (cards, inputs, modais)
          800: "#171717", // superfície elevada sobre fundo escuro (cards em telas dark)
          900: "#0a0a0a", // chrome preto (header, botão primário, trilho do menu) / fundo de telas dark
        },
        destaque: {
          400: "#e3ba5c", // uso apenas sobre fundo escuro (chrome preto)
          500: "#c9982e", // preenchimento de acento (pílula ativa, ring de foco)
          600: "#a67a1e", // texto dourado sobre fundo claro (contraste)
        },
        // Redesenho "claro, quente e sofisticado" (ver front-redesign-fase0-agenda.md).
        // Tokens novos, aditivos — não removem os acima, usados pelas telas fora do
        // escopo do redesenho (Barbeiros, Serviços, Clientes, Financeiro, Bloqueios)
        // até elas ganharem seu próprio prompt de redesign.
        bg: "#F6F4EF",
        surface: "#FFFFFF",
        "surface-2": "#F0EDE6",
        border: "#E4DFD5",
        text: "#171512",
        "text-muted": "#6B655A",
        gold: "#C8963E",
        "gold-strong": "#8A6420",
        "gold-soft": "#F7ECD4",
        "on-gold": "#1A1206",
        success: "#2E7D55",
        warning: "#9A6A10",
        danger: "#C0392B",
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
        chip: "999px",
        sheet: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 20px -12px rgba(0,0,0,0.15)",
        premium: "0 24px 60px -16px rgba(0,0,0,0.35)",
        soft: "0 1px 2px rgb(23 21 18 / 0.06), 0 4px 16px rgb(23 21 18 / 0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
