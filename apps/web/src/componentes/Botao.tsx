import { type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  carregando?: boolean;
  variante?: "primaria" | "secundaria" | "fantasma";
};

export function Botao({
  carregando = false,
  variante = "primaria",
  disabled,
  children,
  className = "",
  ...resto
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium tracking-wide transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  const variantes = {
    primaria: "bg-base-900 text-white shadow-card hover:bg-neutral-800",
    secundaria: "border border-base-500 bg-base-700 text-base-50 hover:border-base-900/30 hover:bg-neutral-50",
    fantasma: "text-base-300 hover:text-base-50",
  };

  return (
    <button className={`${base} ${variantes[variante]} ${className}`} disabled={disabled || carregando} {...resto}>
      {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
