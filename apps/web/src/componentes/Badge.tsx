import type { ReactNode } from "react";

const CORES: Record<string, string> = {
  confirmado: "bg-destaque-500/15 text-destaque-600 ring-1 ring-inset ring-destaque-500/30",
  cancelado: "bg-red-500/10 text-red-600 ring-1 ring-inset ring-red-500/30",
  concluido: "bg-base-500/25 text-base-300 ring-1 ring-inset ring-base-500/50",
  // Variantes do redesenho claro (ver front-redesign-fase0-agenda.md) — só usadas
  // nas telas já migradas (chaves com sufixo -novo, aditivas).
  "confirmado-novo": "bg-gold-soft text-gold-strong ring-1 ring-inset ring-gold/40",
  "cancelado-novo": "bg-danger/10 text-danger ring-1 ring-inset ring-danger/30",
  "concluido-novo": "bg-success/10 text-success ring-1 ring-inset ring-success/30",
  "pendente-novo": "bg-warning/10 text-warning ring-1 ring-inset ring-warning/30",
};

export function Badge({ status, children }: { status: keyof typeof CORES; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES[status]}`}>
      {children}
    </span>
  );
}
