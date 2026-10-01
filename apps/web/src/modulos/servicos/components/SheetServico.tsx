import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { Chip } from "../../../componentes/Chip";
import { Skeleton } from "../../../componentes/Skeleton";
import { ModalConfirmacao } from "../../../componentes/ModalConfirmacao";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useAuthSocio } from "../../../contextos/auth-socio-context";
import { useBarbeirosCatalogo } from "../hooks/useBarbeirosCatalogo";
import { useCriarServico, useEditarServico, useDesativarServico, useAlternarVinculoServico } from "../hooks/useMutacoesServico";
import { useBarbeirosDoServico } from "../hooks/useBarbeirosDoServico";
import { useBarbeirosInternos } from "../../agenda/hooks/useBarbeirosInternos";
import type { ServicoInterno } from "../tipos";

type Props = { aberto: boolean; onFechar: () => void; servico?: ServicoInterno | null };

/** Preço sempre em centavos — mesmo formato que a API já espera (ver `tipos.ts`,
 * `schema.ts` do back-end). Máscara "calculadora": cada dígito entra pela direita. */
function formatarReaisInput(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const OPCOES_DURACAO = Array.from({ length: 11 }, (_, i) => 10 + i * 5); // 10, 15, ..., 60

/** Serviço existente com duração fora de 10–60/5 (improvável, mas não some do select sem avisar). */
function opcoesDuracao(duracaoAtual: number | null): number[] {
  if (duracaoAtual && !OPCOES_DURACAO.includes(duracaoAtual)) {
    return [duracaoAtual, ...OPCOES_DURACAO].sort((a, b) => a - b);
  }
  return OPCOES_DURACAO;
}

export function SheetServico({ aberto, onFechar, servico }: Props) {
  const editando = servico != null;
  const [nome, setNome] = useState("");
  const [valorCentavos, setValorCentavos] = useState(0);
  const [duracaoMinutos, setDuracaoMinutos] = useState<number | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarDesativar, setConfirmarDesativar] = useState(false);
  const [barbeirosMarcados, setBarbeirosMarcados] = useState<Set<number>>(new Set());

  const { socio } = useAuthSocio();
  const souAdmin = socio?.admin ?? false;
  // Não-admin: `GET /barbeiros` já vem auto-escopado pro próprio registro (ver
  // `barbeiros.routes.ts`) — é assim que sabemos qual chip é "o meu" sem mais uma rota.
  const { data: meuRegistro } = useBarbeirosInternos();
  const meuBarbeiroId = souAdmin ? null : (meuRegistro?.[0]?.id ?? null);

  const { data: todosBarbeiros, isLoading: carregandoBarbeiros } = useBarbeirosCatalogo();
  const { data: barbeirosVinculados, isLoading: carregandoVinculo } = useBarbeirosDoServico(servico?.id);
  const barbeirosAtivos = todosBarbeiros ?? [];

  /** Admin mexe no vínculo de qualquer barbeiro; sócio comum só no próprio (regra
   * aprovada na Fase D, item 6 — o back-end já recusa com 403 se tentar mandar outro). */
  function podeAlternar(barbeiroId: number) {
    return souAdmin || barbeiroId === meuBarbeiroId;
  }

  const criar = useCriarServico();
  const editar = useEditarServico();
  const desativar = useDesativarServico();
  const alternarVinculo = useAlternarVinculoServico();
  const { mostrarToast } = useToast();
  const salvando = criar.isPending || editar.isPending || alternarVinculo.isPending;

  useEffect(() => {
    if (!aberto) return;
    setNome(servico?.nome ?? "");
    setValorCentavos(servico?.valorCentavos ?? 0);
    setDuracaoMinutos(servico ? servico.duracaoMinutos : "");
    setErro(null);
    setConfirmarDesativar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, servico?.id]);

  // Novo serviço: admin vincula todo mundo de cara (mesma regra do back-end, ver
  // `servicos.service.ts`, `criarServico`); sócio comum só vincula a si mesmo — vincular
  // o colega sem ele saber/concordar não é uma decisão que quem está criando devia tomar
  // sozinho (ele nem escolhe isso aqui: o chip do colega já nasce desmarcado e travado).
  // Editando: espera o vínculo real carregar antes de marcar, senão um instante com
  // "ninguém marcado" piscaria antes do fetch resolver.
  useEffect(() => {
    if (!aberto || !todosBarbeiros) return;
    if (!editando) {
      setBarbeirosMarcados(
        new Set(souAdmin ? barbeirosAtivos.map((b) => b.id) : meuBarbeiroId !== null ? [meuBarbeiroId] : [])
      );
    } else if (barbeirosVinculados) {
      setBarbeirosMarcados(new Set(barbeirosVinculados.map((b) => b.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, editando, todosBarbeiros, barbeirosVinculados, souAdmin, meuBarbeiroId]);

  const duracao = duracaoMinutos === "" ? NaN : duracaoMinutos;
  const valido = nome.trim().length >= 2 && valorCentavos > 0 && Number.isFinite(duracao) && duracao > 0;

  function aoAlternarBarbeiro(barbeiroId: number) {
    if (!podeAlternar(barbeiroId)) return;
    setBarbeirosMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(barbeiroId)) novo.delete(barbeiroId);
      else novo.add(barbeiroId);
      return novo;
    });
  }

  /**
   * Aplica só as diferenças entre o que estava marcado antes de abrir e o que o sócio
   * deixou marcado agora — evita mandar um PUT por barbeiro toda vez que o nome/preço
   * muda sem mexer em ninguém.
   */
  async function aplicarVinculos(servicoId: number, marcadosAntes: Set<number>) {
    const alteracoes = barbeirosAtivos.filter(
      (b) => podeAlternar(b.id) && barbeirosMarcados.has(b.id) !== marcadosAntes.has(b.id)
    );
    await Promise.all(
      alteracoes.map((b) =>
        alternarVinculo.mutateAsync({ barbeiroId: b.id, servicoId, ativo: barbeirosMarcados.has(b.id) })
      )
    );
  }

  async function aoSalvar() {
    if (!valido) return;
    setErro(null);
    const dados = { nome: nome.trim(), valorCentavos, duracaoMinutos: duracao };

    try {
      if (editando) {
        const marcadosAntes = new Set(barbeirosVinculados?.map((b) => b.id) ?? []);
        await editar.mutateAsync({ id: servico.id, ...dados });
        await aplicarVinculos(servico.id, marcadosAntes);
        mostrarToast("Serviço atualizado.");
      } else {
        // Back-end já vincula sozinho: todo mundo se for admin criando, só o próprio se
        // for sócio comum (ver `servicos.service.ts`, `criarServico`) — só precisa
        // aplicar o que diverge desse padrão (ex.: admin desmarcou alguém na hora de criar).
        const vinculadosPeloBackend = souAdmin ? barbeirosAtivos.map((b) => b.id) : meuBarbeiroId !== null ? [meuBarbeiroId] : [];
        const novoServico = await criar.mutateAsync(dados);
        await aplicarVinculos(novoServico.id, new Set(vinculadosPeloBackend));
        mostrarToast("Serviço criado.");
      }
      onFechar();
    } catch (erroCapturado) {
      setErro(mensagemHumana(erroCapturado));
    }
  }

  /**
   * "Desativar serviço" é uma ação global (desativa no catálogo pra todo mundo, não só
   * o vínculo de quem clicou) — se outro barbeiro além de quem está vendo a tela também
   * faz esse serviço, o diálogo avisa quem mais é afetado, pra não ser uma surpresa.
   */
  function textoConfirmarDesativar(): string {
    const outros = (barbeirosVinculados ?? []).filter((b) => b.id !== meuBarbeiroId);
    const consequenciaPadrao =
      "Quem já tem horário marcado com esse serviço não é afetado — o preço e a duração já ficaram gravados no agendamento. Você pode reativar quando quiser.";

    if (outros.length === 0) {
      return `Ele some do agendamento online e da Agenda para novos agendamentos. ${consequenciaPadrao}`;
    }

    const nomes = outros.map((b) => b.nome).join(" e ");
    const avisoPessoal = souAdmin ? "" : ", não só pra você";
    return `Esse serviço também está vinculado a ${nomes} — desativar tira ele da Agenda e do agendamento online pra todo mundo${avisoPessoal}. ${consequenciaPadrao}`;
  }

  function aoConfirmarDesativar() {
    if (!servico) return;
    desativar.mutate(servico.id, {
      onSuccess: () => {
        mostrarToast("Serviço desativado.");
        setConfirmarDesativar(false);
        onFechar();
      },
      onError: (erroCapturado) => {
        setConfirmarDesativar(false);
        mostrarToast(mensagemHumana(erroCapturado), "erro");
      },
    });
  }

  function aoAtivar() {
    if (!servico) return;
    editar.mutate(
      { id: servico.id, ativo: true },
      {
        onSuccess: () => {
          mostrarToast("Serviço reativado.");
          onFechar();
        },
        onError: (erroCapturado) => mostrarToast(mensagemHumana(erroCapturado), "erro"),
      }
    );
  }

  return (
    <FolhaInferior
      titulo={editando ? "Editar serviço" : "Novo serviço"}
      aberto={aberto}
      onFechar={onFechar}
      rodape={
        <div className="flex flex-col gap-2">
          {erro && (
            <p role="alert" className="text-sm text-danger">
              {erro}
            </p>
          )}
          <Botao variante="dourada" tamanho="lg" onClick={aoSalvar} carregando={salvando} disabled={!valido}>
            Salvar serviço
          </Botao>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pb-4 pt-1">
        <Input variante="clara" rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input
          variante="clara"
          rotulo="Preço"
          type="text"
          inputMode="numeric"
          value={formatarReaisInput(valorCentavos)}
          onChange={(e) => setValorCentavos(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
        />
        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Duração
          <select
            value={duracaoMinutos}
            onChange={(e) => setDuracaoMinutos(e.target.value ? Number(e.target.value) : "")}
            className="h-11 rounded-lg border border-border bg-surface px-3 text-base text-text outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
          >
            <option value="" disabled>
              Selecione
            </option>
            {opcoesDuracao(servico?.duracaoMinutos ?? null).map((minutos) => (
              <option key={minutos} value={minutos}>
                {minutos} min
              </option>
            ))}
          </select>
        </label>

        <div className="mt-1">
          <p className="mb-2 text-sm font-medium text-text-muted">Quem faz este serviço</p>
          {carregandoBarbeiros || (editando && carregandoVinculo) ? (
            <div className="flex gap-2">
              <Skeleton className="h-11 w-24 rounded-chip" />
              <Skeleton className="h-11 w-24 rounded-chip" />
            </div>
          ) : barbeirosAtivos.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum barbeiro cadastrado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {barbeirosAtivos.map((barbeiro) => {
                const marcado = barbeirosMarcados.has(barbeiro.id);
                const editavel = podeAlternar(barbeiro.id);
                return (
                  <Chip
                    key={barbeiro.id}
                    ativo={marcado}
                    onClick={() => aoAlternarBarbeiro(barbeiro.id)}
                    disabled={!editavel}
                    title={editavel ? undefined : "Só um admin pode alterar o vínculo de outro barbeiro."}
                  >
                    {marcado && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {barbeiro.nome}
                  </Chip>
                );
              })}
            </div>
          )}
          <p className="mt-1.5 text-xs text-text-muted">
            Barbeiros desmarcados não aparecem pra esse serviço no agendamento online nem na Agenda.
            {!souAdmin && " Você só pode alterar o seu próprio vínculo."}
          </p>
        </div>

        {editando && servico.ativo && (
          <button
            type="button"
            onClick={() => setConfirmarDesativar(true)}
            className="mt-2 flex h-11 items-center self-start rounded-lg text-sm font-medium text-danger hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            Desativar serviço
          </button>
        )}
        {editando && !servico.ativo && (
          <button
            type="button"
            onClick={aoAtivar}
            disabled={editar.isPending}
            className="mt-2 flex h-11 items-center self-start rounded-lg text-sm font-medium text-gold-strong hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
          >
            {editar.isPending ? "Reativando…" : "Reativar serviço"}
          </button>
        )}
      </div>

      {servico && (
        <ModalConfirmacao
          titulo={`Desativar ${servico.nome}?`}
          texto={textoConfirmarDesativar()}
          aberto={confirmarDesativar}
          onFechar={() => setConfirmarDesativar(false)}
          onConfirmar={aoConfirmarDesativar}
          rotuloConfirmar="Desativar"
          confirmando={desativar.isPending}
        />
      )}
    </FolhaInferior>
  );
}
