import { useAgendamentosDoCliente } from "../hooks/useAgendamentosDoCliente";
import { Card } from "../../../componentes/Card";
import { Badge } from "../../../componentes/Badge";
import { Skeleton } from "../../../componentes/Skeleton";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import type { Cliente } from "../tipos";

const RESUMO_STATUS: Record<string, string> = { confirmado: "Confirmado", cancelado: "Cancelado", concluido: "Concluído" };

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(horarioLocal: string): string {
  const [data, hora] = horarioLocal.split(/[ T]/);
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} ${hora.slice(0, 5)}`;
}

export function HistoricoCliente({ cliente }: { cliente: Cliente }) {
  const { data: agendamentos, isLoading } = useAgendamentosDoCliente(cliente.id);

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="font-semibold">{cliente.nome}</p>
        <p className="text-sm text-base-300">{cliente.telefone}</p>
        <p className="text-xs text-base-300">{cliente.telefoneVerificado ? "Telefone verificado" : "Telefone não verificado"}</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-base-700 pt-3">
        {isLoading && <Skeleton className="h-12 w-full" />}
        {!isLoading && agendamentos && agendamentos.length === 0 && (
          <EstadoVazio
            titulo="Nenhum agendamento vinculado a este cliente."
            descricao="Só aparecem aqui agendamentos criados já vinculados ao cadastro (clienteId), não contatos avulsos."
          />
        )}
        {!isLoading &&
          agendamentos?.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span>{formatarDataHora(a.inicio)}</span>
              <span className="text-base-300">{formatarReais(a.valorCobradoCentavos)}</span>
              <Badge status={a.status}>{RESUMO_STATUS[a.status]}</Badge>
            </div>
          ))}
      </div>
    </Card>
  );
}
