import { ETAPAS, type Etapa } from "../tipos";

const RESUMO: Record<Etapa, string> = {
  servico: "Serviço",
  barbeiro: "Barbeiro",
  horario: "Data e horário",
  dados: "Seus dados",
  verificacao: "Verificação",
  revisao: "Revisão",
  confirmacao: "Confirmado",
};

/** Indicador simples de etapa atual — "passo 2 de 6", não uma barra elaborada (ver escopo da Fase 2). */
export function IndicadorEtapa({ etapa }: { etapa: Etapa }) {
  const indice = ETAPAS.indexOf(etapa);
  const total = ETAPAS.length - 1; // confirmação não conta como "passo restante"

  if (etapa === "confirmacao") return null;

  return (
    <div className="mb-6 text-center text-sm text-base-300">
      Passo {indice + 1} de {total} — {RESUMO[etapa]}
    </div>
  );
}
