import { useEffect, useState } from "react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useCriarCliente, telefoneJaCadastrado } from "../hooks/useCriarCliente";
import type { Cliente } from "../tipos";

type Props = {
  aberto: boolean;
  nomeInicial?: string;
  telefoneInicial: string;
  onFechar: () => void;
  onCriado: (cliente: Cliente) => void;
};

/** Máscara visual (00) 00000-0000 — só exibição, o valor enviado é sempre `apenasDigitos`. */
function mascararTelefone(digitos: string): string {
  const d = digitos.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function FormularioNovoCliente({ aberto, nomeInicial = "", telefoneInicial, onFechar, onCriado }: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [telefoneDigitos, setTelefoneDigitos] = useState(apenasDigitos(telefoneInicial));
  const [erro, setErro] = useState<string | null>(null);
  const criar = useCriarCliente();
  const { mostrarToast } = useToast();

  // O componente fica montado o tempo todo (só o sheet abre/fecha) — sem isso, o
  // pré-preenchimento vindo da busca de Clientes (nomeInicial/telefoneInicial) só
  // valeria na primeira vez que o sheet abrisse na sessão.
  useEffect(() => {
    if (aberto) {
      setNome(nomeInicial);
      setTelefoneDigitos(apenasDigitos(telefoneInicial));
      setErro(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  // Válido = mesma regra que a API já exige (nome não vazio, telefone com 10 ou 11
  // dígitos — fixo/celular BR); não há validação de front pronta pra reaproveitar aqui.
  const valido = nome.trim().length > 0 && (telefoneDigitos.length === 10 || telefoneDigitos.length === 11);

  function aoConfirmar() {
    if (!valido) return;
    setErro(null);
    criar.mutate(
      { nome: nome.trim(), telefone: telefoneDigitos },
      {
        onSuccess: (cliente) => {
          mostrarToast("Cliente cadastrado.");
          setNome("");
          setTelefoneDigitos("");
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
    <FolhaInferior
      titulo="Novo cliente"
      aberto={aberto}
      onFechar={onFechar}
      rodape={
        <div className="flex flex-col gap-2">
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <Botao variante="dourada" tamanho="lg" onClick={aoConfirmar} carregando={criar.isPending} disabled={!valido}>
            Cadastrar cliente
          </Botao>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pb-4 pt-1">
        <Input
          variante="clara"
          rotulo="Nome"
          placeholder="Nome do cliente"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Input
          variante="clara"
          rotulo="Telefone (com DDD)"
          type="tel"
          inputMode="tel"
          placeholder="(35) 98809-9800"
          value={mascararTelefone(telefoneDigitos)}
          onChange={(e) => setTelefoneDigitos(apenasDigitos(e.target.value))}
        />
      </div>
    </FolhaInferior>
  );
}
