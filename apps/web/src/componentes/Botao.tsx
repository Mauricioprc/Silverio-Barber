import { type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  carregando?: boolean;
  /**
   * "dourada"/"contorno-novo"/"fantasma-novo"/"perigo" pertencem ao redesenho claro
   * (ver front-redesign-fase0-agenda.md) e só devem ser usadas nas telas já
   * migradas — as variantes antigas continuam intactas para as telas que ainda não
   * foram redesenhadas.
   */
  variante?: "primaria" | "secundaria" | "fantasma" | "dourada" | "contorno-novo" | "fantasma-novo" | "perigo";
  tamanho?: "md" | "lg";
};

export function Botao({
  carregando = false,
  variante = "primaria",
  tamanho = "md",
  disabled,
  children,
  className = "",
  ...resto
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded font-medium tracking-wide transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  const variantes = {
    primaria: "px-4 py-2 text-sm bg-base-900 text-white shadow-card hover:bg-neutral-800",
    secundaria: "px-4 py-2 text-sm border border-base-500 bg-base-700 text-base-50 hover:border-base-900/30 hover:bg-neutral-50",
    fantasma: "px-4 py-2 text-sm text-base-300 hover:text-base-50",
    dourada:
      "bg-gold text-on-gold shadow-soft hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    "contorno-novo":
      "border border-border bg-surface text-text hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    "fantasma-novo":
      "text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    perigo:
      "border border-danger/30 bg-surface text-danger hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger",
  };
  const tamanhosNovos = { md: "h-11 px-4 text-sm", lg: "h-[52px] px-5 text-base" };
  const usaVarianteNova = ["dourada", "contorno-novo", "fantasma-novo", "perigo"].includes(variante);

  return (
    <button
      className={`${base} ${variantes[variante]} ${usaVarianteNova ? `${tamanhosNovos[tamanho]} rounded-xl font-semibold` : ""} ${className}`}
      disabled={disabled || carregando}
      {...resto}
    >
      {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
