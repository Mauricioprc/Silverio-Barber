import type { ReactNode } from "react";

const CORES: Record<string, string> = {
  confirmado: "bg-destaque-500/15 text-destaque-600 ring-1 ring-inset ring-destaque-500/30",
  cancelado: "bg-red-500/10 text-red-600 ring-1 ring-inset ring-red-500/30",
  concluido: "bg-base-500/25 text-base-300 ring-1 ring-inset ring-base-500/50",
};

export function Badge({ status, children }: { status: keyof typeof CORES; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES[status]}`}>
      {children}
    </span>
  );
}
