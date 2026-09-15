import { useState } from "react";
import { Modal } from "../../../componentes/Modal";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useCriarCliente, telefoneJaCadastrado } from "../hooks/useCriarCliente";
import type { Cliente } from "../tipos";

type Props = { aberto: boolean; telefoneInicial: string; onFechar: () => void; onCriado: (cliente: Cliente) => void };

export function FormularioNovoCliente({ aberto, telefoneInicial, onFechar, onCriado }: Props) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [erro, setErro] = useState<string | null>(null);
  const criar = useCriarCliente();
  const { mostrarToast } = useToast();

  function aoConfirmar() {
    if (!nome || !telefone) return;
    setErro(null);
    criar.mutate(
      { nome, telefone },
      {
        onSuccess: (cliente) => {
          mostrarToast("Cliente cadastrado.");
          setNome("");
          onCriado(cliente);
        },
        onError: (erroCapturado) => {
          if (telefoneJaCadastrado(erroCapturado)) {
            setErro("Esse telefone já está cadastrado — busque por ele na lista.");
            return;
          }
          setErro(mensagemHumana(erroCapturado));
        },
      }
    );
  }

  return (
    <Modal titulo="Novo cliente" aberto={aberto} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <Input rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
        <Input
          rotulo="Telefone (com DDD)"
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          required
          erro={erro ?? undefined}
        />
        <Botao onClick={aoConfirmar} carregando={criar.isPending} disabled={!nome || !telefone}>
          Cadastrar
        </Botao>
      </div>
    </Modal>
  );
}
