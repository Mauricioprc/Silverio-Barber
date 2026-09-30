import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { ativo?: boolean };

/**
 * Chip do redesenho claro (ver front-redesign-fase0-agenda.md) — filtros e
 * horários. Ativo: fundo `gold-soft` + borda `gold` + texto `gold-strong`.
 * Inativo: `surface` + borda `border`, sempre com borda visível pra parecer
 * tocável.
 */
export function Chip({ ativo = false, className = "", children, ...resto }: Props) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      className={`inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-chip border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50 ${
        ativo ? "border-gold bg-gold-soft text-gold-strong" : "border-border bg-surface text-text-muted hover:bg-surface-2"
      } ${className}`}
      {...resto}
    >
      {children}
    </button>
  );
}
