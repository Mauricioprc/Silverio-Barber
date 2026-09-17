import { useState } from "react";
import { Modal } from "../../../componentes/Modal";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useCriarServico, useEditarServico } from "../hooks/useMutacoesServico";
import type { ServicoInterno } from "../tipos";

type Props = { aberto: boolean; onFechar: () => void; servico?: ServicoInterno | null };

export function FormularioServico({ aberto, onFechar, servico }: Props) {
  return (
    <Modal titulo={servico ? "Editar serviço" : "Novo serviço"} aberto={aberto} onFechar={onFechar}>
      <ConteudoFormulario key={servico?.id ?? "novo"} onFechar={onFechar} servico={servico} />
    </Modal>
  );
}

function ConteudoFormulario({ onFechar, servico }: { onFechar: () => void; servico?: ServicoInterno | null }) {
  const editando = servico != null;
  const [nome, setNome] = useState(servico?.nome ?? "");
  const [descricao, setDescricao] = useState(servico?.descricao ?? "");
  const [valor, setValor] = useState(servico ? (servico.valorCentavos / 100).toFixed(2) : "");
  const [duracaoMinutos, setDuracaoMinutos] = useState(servico ? String(servico.duracaoMinutos) : "");
  const [erro, setErro] = useState<string | null>(null);

  const criar = useCriarServico();
  const editar = useEditarServico();
  const { mostrarToast } = useToast();
  const salvando = criar.isPending || editar.isPending;

  function aoConfirmar() {
    const valorCentavos = Math.round(parseFloat(valor.replace(",", ".")) * 100);
    const duracao = parseInt(duracaoMinutos, 10);
    if (!nome || !Number.isFinite(valorCentavos) || valorCentavos <= 0 || !Number.isFinite(duracao) || duracao <= 0) return;

    setErro(null);
    const dados = { nome, descricao: descricao || undefined, valorCentavos, duracaoMinutos: duracao };
    const opcoes = {
      onSuccess: () => {
        mostrarToast(editando ? "Serviço atualizado." : "Serviço criado.");
        onFechar();
      },
      onError: (erroCapturado: unknown) => setErro(mensagemHumana(erroCapturado)),
    };

    if (editando) {
      editar.mutate({ id: servico.id, ...dados }, opcoes);
    } else {
      criar.mutate(dados, opcoes);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Input rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
      <Input rotulo="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <Input
        rotulo="Valor (R$)"
        type="text"
        inputMode="decimal"
        placeholder="50,00"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        erro={erro ?? undefined}
      />
      <Input
        rotulo="Duração (minutos)"
        type="number"
        inputMode="numeric"
        min={1}
        value={duracaoMinutos}
        onChange={(e) => setDuracaoMinutos(e.target.value)}
      />
      <Botao onClick={aoConfirmar} carregando={salvando} disabled={!nome || !valor || !duracaoMinutos}>
        {editando ? "Salvar alterações" : "Criar serviço"}
      </Botao>
    </div>
  );
}
