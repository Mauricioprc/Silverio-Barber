import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useBarbeirosInternos } from "./hooks/useBarbeirosInternos";
import { useServicosInternos } from "./hooks/useServicosInternos";
import { useAgendamentosDoDia } from "./hooks/useAgendamentosDoDia";
import { SeletorData, hojeISO } from "./components/SeletorData";
import { ItemAgendamento } from "./components/ItemAgendamento";
import { ModalCancelarAgendamento } from "./components/ModalCancelarAgendamento";
import { ModalReagendar } from "./components/ModalReagendar";
import { FormularioAgendamentoBalcao } from "./components/FormularioAgendamentoBalcao";
import { Chip } from "../../componentes/Chip";
import { Skeleton } from "../../componentes/Skeleton";
import { EstadoVazio } from "../../componentes/EstadoVazio";
import { ErroEstado } from "../../componentes/ErroEstado";
import type { AgendamentoDoDia } from "./tipos";

export default function AgendaPage() {
  const { data: barbeiros, isLoading: carregandoBarbeiros } = useBarbeirosInternos();
  const { data: servicos } = useServicosInternos();

  const [barbeiroId, setBarbeiroId] = useState<number | null>(null);
  const [data, setData] = useState(hojeISO());
  const [novoAgendamentoAberto, setNovoAgendamentoAberto] = useState(false);
  const [paraCancelar, setParaCancelar] = useState<AgendamentoDoDia | null>(null);
  const [paraReagendar, setParaReagendar] = useState<AgendamentoDoDia | null>(null);

  useEffect(() => {
    if (barbeiroId === null && barbeiros && barbeiros.length > 0) {
      setBarbeiroId(barbeiros[0].id);
    }
  }, [barbeiros, barbeiroId]);

  const {
    data: agendamentos,
    isLoading: carregandoAgendamentos,
    isError,
    refetch,
  } = useAgendamentosDoDia(barbeiroId, data);

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <SeletorData data={data} onMudar={setData} />

      {carregandoBarbeiros ? (
        <Skeleton className="h-11 w-40" />
      ) : barbeiros && barbeiros.length <= 1 ? (
        // Sócio não-admin só tem a própria agenda pra ver — nada pra escolher (ver
        // `useBarbeirosInternos`, já escopado do back-end). Sem "Todos": a API exige
        // um barbeiro por vez (ver `useAgendamentosDoDia`), então o filtro continua
        // de um só — só o controle visual virou Chip.
        <p className="text-sm text-text-muted">Agenda de {barbeiros[0]?.nome ?? "—"}</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {barbeiros?.map((b) => (
            <Chip key={b.id} ativo={b.id === barbeiroId} onClick={() => setBarbeiroId(b.id)}>
              {b.nome}
            </Chip>
          ))}
        </div>
      )}

      {carregandoAgendamentos && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {isError && <ErroEstado mensagem="Não foi possível carregar a agenda." onTentarNovamente={() => refetch()} />}

      {!carregandoAgendamentos && !isError && agendamentos && agendamentos.length === 0 && (
        <EstadoVazio
          titulo="Nenhum agendamento neste dia."
          acao={{ rotulo: "Novo agendamento", onClick: () => setNovoAgendamentoAberto(true) }}
        />
      )}

      {!carregandoAgendamentos && !isError && agendamentos && agendamentos.length > 0 && (
        <div className="flex flex-col gap-3 pb-20">
          {agendamentos.map((agendamento) => (
            <ItemAgendamento
              key={agendamento.id}
              agendamento={agendamento}
              servicos={servicos ?? []}
              onCancelar={setParaCancelar}
              onReagendar={setParaReagendar}
            />
          ))}
        </div>
      )}

      {/* Botão flutuante — único destaque dourado da tela além do item ativo da navegação. */}
      <button
        onClick={() => setNovoAgendamentoAberto(true)}
        disabled={!barbeiroId}
        aria-label="Novo agendamento"
        className="fixed bottom-24 right-4 z-20 flex h-14 items-center gap-2 rounded-chip bg-gold px-5 font-semibold text-on-gold shadow-soft transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        Novo agendamento
      </button>

      {barbeiroId && (
        <FormularioAgendamentoBalcao
          aberto={novoAgendamentoAberto}
          onFechar={() => setNovoAgendamentoAberto(false)}
          barbeiros={barbeiros ?? []}
          servicos={servicos ?? []}
          barbeiroInicial={barbeiroId}
          dataInicial={data}
        />
      )}

      <ModalCancelarAgendamento
        agendamento={paraCancelar}
        servicos={servicos ?? []}
        barbeiros={barbeiros ?? []}
        onFechar={() => setParaCancelar(null)}
      />

      <ModalReagendar
        agendamento={paraReagendar}
        barbeiros={barbeiros ?? []}
        servicos={servicos ?? []}
        onFechar={() => setParaReagendar(null)}
      />
    </div>
  );
}
