import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Variacao } from "../periodo.util";

/** Cor nunca é a única pista (item 6): sempre ícone + sinal + texto junto. */
export function LinhaComparacao({ variacao, rotulo, tamanho = "sm" }: { variacao: Variacao; rotulo: string; tamanho?: "sm" | "xs" }) {
  const cor = variacao.direcao === "alta" ? "text-success" : variacao.direcao === "queda" ? "text-danger" : "text-text-muted";
  const Icone = variacao.direcao === "alta" ? TrendingUp : variacao.direcao === "queda" ? TrendingDown : Minus;
  const classeTexto = tamanho === "sm" ? "text-sm" : "text-[13px]";

  return (
    <p className={`flex items-center gap-1 ${classeTexto} ${cor}`}>
      <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="font-medium">{variacao.percentualTexto}</span>
      <span className="text-text-muted">{rotulo}</span>
    </p>
  );
}
