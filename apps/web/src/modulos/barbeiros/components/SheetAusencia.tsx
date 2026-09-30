import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { ModalConfirmacao } from "../../../componentes/ModalConfirmacao";
import { Chip } from "../../../componentes/Chip";
import { Switch } from "../../../componentes/Switch";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { ApiError } from "../../../lib/api-client";
import { hojeISO, somarDias } from "../../../lib/periodo";
import { useCriarAusencia, useEditarAusencia, useRemoverAusencia, useContarConflitos } from "../hooks/useAusencias";
import { ehDiaInteiro } from "../ausencias.util";
import type { Bloqueio } from "../../agenda/tipos";

type Quando = "hoje" | "amanha" | "escolher";

type Props = {
  barbeiroId: number;
  aberto: boolean;
  onFechar: () => void;
  /** Presente = modo edição (sheet preenchido + "Remover ausência"); ausente = nova. */
  ausenciaExistente: Bloqueio | null;
};

function ehConflitoDeHorario(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 409;
}

/**
 * Sheet "Nova ausência" / edição (item C do redesenho) — é só uma visão de Bloqueios
 * (mesmos endpoints, `barbeiroId` sempre fixo neste barbeiro). Sem `PUT` em bloqueios,
 * editar é remover+recriar (ver useAusencias.ts).
 */
export function SheetAusencia({ barbeiroId, aberto, onFechar, ausenciaExistente }: Props) {
  const [quando, setQuando] = useState<Quando>("hoje");
  const [dataDe, setDataDe] = useState(hojeISO());
  const [dataAte, setDataAte] = useState(hojeISO());
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [das, setDas] = useState("09:00");
  const [ate, setAte] = useState("18:00");
  const [motivo, setMotivo] = useState("");
  const [confirmarRemocaoAberto, setConfirmarRemocaoAberto] = useState(false);

  const { mostrarToast } = useToast();
  const criar = useCriarAusencia();
  const editar = useEditarAusencia();
  const remover = useRemoverAusencia();

  useEffect(() => {
    if (!aberto) return;
    if (ausenciaExistente) {
      const inteiro = ehDiaInteiro(ausenciaExistente);
      setQuando("escolher");
      setDataDe(ausenciaExistente.inicio.slice(0, 10));
      setDataAte(inteiro ? somarDias(ausenciaExistente.fim.slice(0, 10), -1) : ausenciaExistente.fim.slice(0, 10));
      setDiaInteiro(inteiro);
      setDas(inteiro ? "09:00" : ausenciaExistente.inicio.slice(11, 16));
      setAte(inteiro ? "18:00" : ausenciaExistente.fim.slice(11, 16));
      setMotivo(ausenciaExistente.motivo ?? "");
    } else {
      setQuando("hoje");
      setDataDe(hojeISO());
      setDataAte(hojeISO());
      setDiaInteiro(true);
      setDas("09:00");
      setAte("18:00");
      setMotivo("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, ausenciaExistente]);

  const dataInicioReal = quando === "amanha" ? somarDias(hojeISO(), 1) : quando === "hoje" ? hojeISO() : dataDe;
  const dataFinalReal = quando === "escolher" ? dataAte : dataInicioReal;

  const datasInvalidas = quando === "escolher" && dataAte < dataDe;

  const { inicio, fim } = useMemo(() => {
    if (diaInteiro) {
      return { inicio: `${dataInicioReal} 00:00:00`, fim: `${somarDias(dataFinalReal, 1)} 00:00:00` };
    }
    return { inicio: `${dataInicioReal} ${das}:00`, fim: `${dataFinalReal} ${ate}:00` };
  }, [dataInicioReal, dataFinalReal, diaInteiro, das, ate]);

  const horaInvalida = !diaInteiro && ate <= das && dataInicioReal === dataFinalReal;

  const { data: conflitos } = useContarConflitos(
    !datasInvalidas && !horaInvalida ? barbeiroId : null,
    !datasInvalidas && !horaInvalida ? inicio : null,
    !datasInvalidas && !horaInvalida ? fim : null
  );

  const valido = !datasInvalidas && !horaInvalida && !(conflitos && conflitos > 0);

  function aoSalvar() {
    if (!valido) return;
    const dados = { barbeiroId, inicio, fim, motivo: motivo.trim() || undefined };

    if (ausenciaExistente) {
      editar.mutate(
        { idAntigo: ausenciaExistente.id, dados },
        {
          onSuccess: () => {
            mostrarToast("Ausência atualizada.");
            onFechar();
          },
          onError: (erro) => mostrarToast(erro instanceof Error ? erro.message : mensagemHumana(erro), "erro"),
        }
      );
      return;
    }

    criar.mutate(dados, {
      onSuccess: () => {
        mostrarToast("Ausência criada.");
        onFechar();
      },
      onError: (erro) => {
        if (ehConflitoDeHorario(erro)) {
          mostrarToast("Já existe agendamento ou ausência nesse período — cancele os agendamentos antes de salvar.", "erro");
          return;
        }
        mostrarToast(mensagemHumana(erro), "erro");
      },
    });
  }

  function aoRemover() {
    if (!ausenciaExistente) return;
    remover.mutate(
      { id: ausenciaExistente.id, barbeiroId },
      {
        onSuccess: () => {
          mostrarToast("Ausência removida.");
          setConfirmarRemocaoAberto(false);
          onFechar();
        },
        onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
      }
    );
  }

  const salvando = criar.isPending || editar.isPending;

  return (
    <>
      <FolhaInferior
        titulo={ausenciaExistente ? "Editar ausência" : "Nova ausência"}
        aberto={aberto}
        onFechar={onFechar}
        rodape={
          <div className="flex flex-col gap-2">
            {conflitos !== undefined && conflitos > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {conflitos} agendamento{conflitos > 1 ? "s" : ""} confirmado{conflitos > 1 ? "s" : ""} neste período. A
                  ausência não pode ser salva enquanto eles existirem — cancele-os primeiro.
                </span>
              </div>
            )}
            <Botao variante="dourada" tamanho="lg" onClick={aoSalvar} carregando={salvando} disabled={!valido}>
              Salvar ausência
            </Botao>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pb-4 pt-1">
          <div>
            <p className="mb-2 text-sm font-medium text-text-muted">Quando</p>
            <div className="flex flex-wrap gap-2">
              <Chip ativo={quando === "hoje"} onClick={() => setQuando("hoje")}>
                Hoje
              </Chip>
              <Chip ativo={quando === "amanha"} onClick={() => setQuando("amanha")}>
                Amanhã
              </Chip>
              <Chip ativo={quando === "escolher"} onClick={() => setQuando("escolher")}>
                Escolher datas
              </Chip>
            </div>

            {quando === "escolher" && (
              <div className="mt-3 flex items-center gap-3">
                <Input
                  variante="clara"
                  rotulo="De"
                  type="date"
                  value={dataDe}
                  min={hojeISO()}
                  onChange={(e) => setDataDe(e.target.value)}
                />
                <Input
                  variante="clara"
                  rotulo="Até"
                  type="date"
                  value={dataAte}
                  min={dataDe}
                  onChange={(e) => setDataAte(e.target.value)}
                  erro={datasInvalidas ? "Até não pode ser antes de De." : undefined}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">Dia inteiro</p>
              <p className="text-xs text-text-muted">Desligado, escolha um horário parcial.</p>
            </div>
            <Switch ligado={diaInteiro} onMudar={setDiaInteiro} rotulo="Dia inteiro" />
          </div>

          {!diaInteiro && (
            <div className="flex items-center gap-3">
              <Input variante="clara" rotulo="Das" type="time" value={das} onChange={(e) => setDas(e.target.value)} />
              <Input
                variante="clara"
                rotulo="Até"
                type="time"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                erro={horaInvalida ? "Até precisa ser depois de Das." : undefined}
              />
            </div>
          )}

          <Input
            variante="clara"
            rotulo="Motivo (opcional)"
            placeholder="Ex.: Consulta médica"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          {ausenciaExistente && (
            <button
              onClick={() => setConfirmarRemocaoAberto(true)}
              className="flex h-11 items-center self-start rounded-lg text-sm font-medium text-danger hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              Remover ausência
            </button>
          )}
        </div>
      </FolhaInferior>

      <ModalConfirmacao
        titulo="Remover ausência"
        texto="Essa ausência deixa de bloquear a agenda. Essa ação não pode ser desfeita."
        aberto={confirmarRemocaoAberto}
        onFechar={() => setConfirmarRemocaoAberto(false)}
        onConfirmar={aoRemover}
        rotuloConfirmar="Remover"
        confirmando={remover.isPending}
      />
    </>
  );
}
