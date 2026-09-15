import type { ReactNode } from "react";

const CORES: Record<string, string> = {
  confirmado: "bg-destaque-500/20 text-destaque-400",
  cancelado: "bg-red-500/20 text-red-400",
  concluido: "bg-base-500/30 text-base-300",
};

export function Badge({ status, children }: { status: keyof typeof CORES; children: ReactNode }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${CORES[status]}`}>{children}</span>;
}
