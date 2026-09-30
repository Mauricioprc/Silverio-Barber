import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { useCliente } from "./hooks/useCliente";
import { useAgendamentosDoClienteInfinito } from "./hooks/useAgendamentosDoClienteInfinito";
import { useBarbeirosInternos } from "../agenda/hooks/useBarbeirosInternos";
import { useServicosInternos } from "../agenda/hooks/useServicosInternos";
import { formatPhoneBR } from "../../lib/formatPhoneBR";
import { linkWhatsapp } from "../../lib/linkWhatsapp";
import { AvatarClaro } from "../../componentes/AvatarClaro";
import { Botao } from "../../componentes/Botao";
import { Card } from "../../componentes/Card";
import { Badge } from "../../componentes/Badge";
import { Skeleton } from "../../componentes/Skeleton";
import { EstadoVazio } from "../../componentes/EstadoVazio";
import { ErroEstado } from "../../componentes/ErroEstado";
import type { AgendamentoDoCliente } from "./tipos";

const RESUMO_STATUS: Record<AgendamentoDoCliente["status"], string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluído",
};
const BADGE_STATUS: Record<AgendamentoDoCliente["status"], string> = {
  confirmado: "confirmado-novo",
  cancelado: "cancelado-novo",
  concluido: "concluido-novo",
};

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(horarioLocal: string): string {
  const [data, hora] = horarioLocal.split(/[ T]/);
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
}

function formatarDataCadastro(isoUtc: string): string {
  return new Date(isoUtc).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Tela de detalhe do cliente — antes era um card (`HistoricoCliente`) que aparecia
 * embaixo da lista; virou rota própria (`/painel/clientes/:id`) a pedido explícito
 * (fica melhor quando o cliente já tem muitos atendimentos). Usa o endpoint novo
 * `GET /clientes/:id` (ver clientes.service.ts) pra a URL funcionar de verdade —
 * recarregar a página não perde os dados.
 */
export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clienteId = id ? Number(id) : null;

  const { data: cliente, isLoading, isError, refetch } = useCliente(clienteId);
  const {
    data: paginas,
    isLoading: carregandoAgendamentos,
    isError: erroAgendamentos,
    refetch: recarregarAgendamentos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAgendamentosDoClienteInfinito(clienteId);
  const { data: barbeiros } = useBarbeirosInternos();
  const { data: servicos } = useServicosInternos();

  const agendamentos = paginas?.pages.flatMap((p) => p.agendamentos) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <button
        onClick={() => navigate("/painel/clientes")}
        className="flex h-11 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Clientes
      </button>

      {isLoading && (
        <Card className="flex items-center gap-3 border-border bg-surface p-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </Card>
      )}

      {isError && <ErroEstado mensagem="Não foi possível carregar o cliente." onTentarNovamente={() => refetch()} />}

      {!isLoading && !isError && !cliente && (
        <EstadoVazio titulo="Cliente não encontrado." descricao="Volte para a lista e tente novamente." />
      )}

      {cliente && (
        <>
          <Card className="flex flex-col gap-4 border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <AvatarClaro nome={cliente.nome} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-text">{cliente.nome}</p>
                <p className="text-sm text-text-muted">{formatPhoneBR(cliente.telefone)}</p>
              </div>
              <a
                href={linkWhatsapp(cliente.telefone)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir WhatsApp com ${cliente.nome}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
              <p className="text-text-muted">
                Telefone:{" "}
                <span className={cliente.telefoneVerificado ? "font-medium text-success" : "font-medium text-text-muted"}>
                  {cliente.telefoneVerificado ? "Verificado" : "Não verificado"}
                </span>
              </p>
              <p className="text-text-muted">
                Cliente desde: <span className="font-medium text-text">{formatarDataCadastro(cliente.criadoEm)}</span>
              </p>
            </div>
          </Card>

          <div>
            <h2 className="mb-2 text-sm font-medium text-text-muted">Histórico de agendamentos</h2>

            {carregandoAgendamentos && (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}

            {erroAgendamentos && (
              <ErroEstado mensagem="Não foi possível carregar o histórico." onTentarNovamente={() => recarregarAgendamentos()} />
            )}

            {!carregandoAgendamentos && !erroAgendamentos && agendamentos.length === 0 && (
              <EstadoVazio
                titulo="Nenhum agendamento vinculado a este cliente."
                descricao="Só aparecem aqui agendamentos criados já vinculados ao cadastro, não contatos avulsos."
              />
            )}

            {!carregandoAgendamentos && !erroAgendamentos && agendamentos.length > 0 && (
              <div className="flex flex-col gap-3">
                <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
                  {agendamentos.map((agendamento) => (
                    <div key={agendamento.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text">{formatarDataHora(agendamento.inicio)}</p>
                        <p className="truncate text-sm text-text-muted">
                          {servicos?.find((s) => s.id === agendamento.servicoId)?.nome ?? "Serviço"} ·{" "}
                          {barbeiros?.find((b) => b.id === agendamento.barbeiroId)?.nome ?? "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-medium text-text">{formatarReais(agendamento.valorCobradoCentavos)}</span>
                        <Badge status={BADGE_STATUS[agendamento.status]}>{RESUMO_STATUS[agendamento.status]}</Badge>
                      </div>
                    </div>
                  ))}
                </Card>

                {hasNextPage && (
                  <Botao variante="contorno-novo" tamanho="lg" onClick={() => fetchNextPage()} carregando={isFetchingNextPage}>
                    Carregar mais
                  </Botao>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
