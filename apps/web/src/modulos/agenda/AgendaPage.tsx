import { useEffect, useState } from "react";
import { useBarbeirosInternos } from "./hooks/useBarbeirosInternos";
import { useServicosInternos } from "./hooks/useServicosInternos";
import { useAgendamentosDoDia } from "./hooks/useAgendamentosDoDia";
import { SeletorData, hojeISO } from "./components/SeletorData";
import { ItemAgendamento } from "./components/ItemAgendamento";
import { ModalCancelarAgendamento } from "./components/ModalCancelarAgendamento";
import { ModalReagendar } from "./components/ModalReagendar";
import { FormularioAgendamentoBalcao } from "./components/FormularioAgendamentoBalcao";
import { PainelBloqueios } from "./components/PainelBloqueios";
import { Select } from "../../componentes/Select";
import { Botao } from "../../componentes/Botao";
import { Skeleton } from "../../componentes/Skeleton";
import { EstadoVazio } from "../../componentes/EstadoVazio";
import type { AgendamentoDoDia } from "./tipos";

export default function AgendaPage() {
  const { data: barbeiros, isLoading: carregandoBarbeiros } = useBarbeirosInternos();
  const { data: servicos } = useServicosInternos();

  const [barbeiroId, setBarbeiroId] = useState<number | null>(null);
  const [data, setData] = useState(hojeISO());
  const [novoAgendamentoAberto, setNovoAgendamentoAberto] = useState(false);
  const [bloqueiosAberto, setBloqueiosAberto] = useState(false);
  const [paraCancelar, setParaCancelar] = useState<AgendamentoDoDia | null>(null);
  const [paraReagendar, setParaReagendar] = useState<AgendamentoDoDia | null>(null);

  useEffect(() => {
    if (barbeiroId === null && barbeiros && barbeiros.length > 0) {
      setBarbeiroId(barbeiros[0].id);
    }
  }, [barbeiros, barbeiroId]);

  const { data: agendamentos, isLoading: carregandoAgendamentos, isError } = useAgendamentosDoDia(barbeiroId, data);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Agenda</h1>
        <div className="flex gap-2">
          <Botao variante="secundaria" onClick={() => setBloqueiosAberto(true)}>
            Bloqueios
          </Botao>
          <Botao onClick={() => setNovoAgendamentoAberto(true)} disabled={!barbeiroId}>
            Novo agendamento
          </Botao>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SeletorData data={data} onMudar={setData} />
        {carregandoBarbeiros ? (
          <Skeleton className="h-10 w-40" />
        ) : (
          <Select
            rotulo="Barbeiro"
            className="min-w-[10rem]"
            value={barbeiroId ?? ""}
            onChange={(e) => setBarbeiroId(Number(e.target.value) || null)}
          >
            {barbeiros?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </Select>
        )}
      </div>

      {carregandoAgendamentos && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {isError && <EstadoVazio titulo="Não foi possível carregar a agenda." descricao="Tente novamente em instantes." />}

      {!carregandoAgendamentos && !isError && agendamentos && agendamentos.length === 0 && (
        <EstadoVazio titulo="Nenhum agendamento hoje." descricao="Crie um agendamento de balcão para começar." />
      )}

      {!carregandoAgendamentos && !isError && agendamentos && agendamentos.length > 0 && (
        <div className="flex flex-col gap-3">
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

      <PainelBloqueios aberto={bloqueiosAberto} onFechar={() => setBloqueiosAberto(false)} barbeiroId={barbeiroId} />

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
