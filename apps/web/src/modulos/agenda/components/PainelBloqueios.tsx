import { useState } from "react";
import { Modal } from "../../../componentes/Modal";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { Card } from "../../../componentes/Card";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import { Skeleton } from "../../../componentes/Skeleton";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useBloqueios, useCriarBloqueio, useRemoverBloqueio, conflitoDeHorarioBloqueio } from "../hooks/useBloqueios";

function formatarDataHora(horarioLocal: string): string {
  const [data, hora] = horarioLocal.split(/[ T]/);
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} ${hora.slice(0, 5)}`;
}

export function PainelBloqueios({ aberto, onFechar, barbeiroId }: { aberto: boolean; onFechar: () => void; barbeiroId: number | null }) {
  const { data: bloqueios, isLoading } = useBloqueios(barbeiroId);
  const criar = useCriarBloqueio();
  const remover = useRemoverBloqueio();
  const { mostrarToast } = useToast();

  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<number | null>(null);

  function aoCriar() {
    if (!barbeiroId || !inicio || !fim) return;
    setErro(null);
    criar.mutate(
      { barbeiroId, inicio, fim, motivo: motivo || undefined },
      {
        onSuccess: () => {
          mostrarToast("Bloqueio criado.");
          setInicio("");
          setFim("");
          setMotivo("");
        },
        onError: (erroCapturado) => {
          if (conflitoDeHorarioBloqueio(erroCapturado)) {
            setErro("Já existe agendamento ou bloqueio nesse período.");
            return;
          }
          setErro(mensagemHumana(erroCapturado));
        },
      }
    );
  }

  function aoRemover(id: number) {
    setRemovendoId(id);
    remover.mutate(id, {
      onSuccess: () => mostrarToast("Bloqueio removido."),
      onError: (erroCapturado) => mostrarToast(mensagemHumana(erroCapturado), "erro"),
      onSettled: () => setRemovendoId(null),
    });
  }

  return (
    <Modal titulo="Bloqueios de agenda" aberto={aberto} onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input rotulo="Início" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <Input rotulo="Fim" type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
          <Input rotulo="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} erro={erro ?? undefined} />
          <Botao onClick={aoCriar} carregando={criar.isPending} disabled={!inicio || !fim}>
            Criar bloqueio
          </Botao>
        </div>

        <div className="flex flex-col gap-2">
          {isLoading && <Skeleton className="h-16 w-full" />}
          {!isLoading && bloqueios && bloqueios.length === 0 && <EstadoVazio titulo="Nenhum bloqueio para este barbeiro." />}
          {!isLoading &&
            bloqueios?.map((bloqueio) => (
              <Card key={bloqueio.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p>
                    {formatarDataHora(bloqueio.inicio)} — {formatarDataHora(bloqueio.fim)}
                  </p>
                  {bloqueio.motivo && <p className="text-base-300">{bloqueio.motivo}</p>}
                </div>
                <button
                  onClick={() => aoRemover(bloqueio.id)}
                  disabled={removendoId !== null}
                  className="text-red-400 underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removendoId === bloqueio.id ? "Removendo..." : "Remover"}
                </button>
              </Card>
            ))}
        </div>
      </div>
    </Modal>
  );
}
