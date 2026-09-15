import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  carregando?: boolean;
  variante?: "primaria" | "secundaria";
};

export function Botao({ carregando = false, variante = "primaria", disabled, children, className = "", ...resto }: Props) {
  const base = "rounded px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const variantes = {
    primaria: "bg-destaque-500 text-base-900 hover:bg-destaque-400",
    secundaria: "bg-base-700 text-base-50 hover:bg-base-500",
  };

  return (
    <button className={`${base} ${variantes[variante]} ${className}`} disabled={disabled || carregando} {...resto}>
      {carregando ? "Carregando..." : children}
    </button>
  );
}
