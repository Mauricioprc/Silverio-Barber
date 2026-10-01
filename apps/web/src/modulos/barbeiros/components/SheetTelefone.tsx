import { useEffect, useState } from "react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import { ApiError } from "../../../lib/api-client";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useAtualizarPerfil } from "../hooks/useAtualizarPerfil";

type Props = { telefoneAtual: string; aberto: boolean; onFechar: () => void };

/** Máscara visual (00) 00000-0000 — só exibição; o valor enviado continua em dígitos, o
 * mesmo formato que a API já espera (ver `FormularioNovoCliente.tsx`). */
function mascararTelefone(digitos: string): string {
  const d = digitos.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Telefone de contato — não exige senha atual (diferente de usuário), regra de hoje.
 * 409 aqui é telefone já cadastrado por outro barbeiro, sem relação com horário — mesmo
 * tratamento de `erro.message` direto do `SheetUsuario.tsx`.
 */
export function SheetTelefone({ telefoneAtual, aberto, onFechar }: Props) {
  const atualizar = useAtualizarPerfil();
  const { mostrarToast } = useToast();
  const [telefone, setTelefone] = useState(apenasDigitos(telefoneAtual));
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      setTelefone(apenasDigitos(telefoneAtual));
      setErro(null);
    }
  }, [aberto, telefoneAtual]);

  const valido = (telefone.length === 10 || telefone.length === 11) && telefone !== apenasDigitos(telefoneAtual);

  function aoSalvar() {
    if (!valido) return;
    setErro(null);
    atualizar.mutate(
      { telefone },
      {
        onSuccess: () => {
          mostrarToast("Telefone atualizado.");
          onFechar();
        },
        onError: (erroCapturado) => {
          const mensagem =
            erroCapturado instanceof ApiError && erroCapturado.status === 409
              ? erroCapturado.message
              : mensagemHumana(erroCapturado);
          setErro(mensagem);
        },
      }
    );
  }

  return (
    <FolhaInferior
      titulo="Telefone de contato"
      aberto={aberto}
      onFechar={onFechar}
      rodape={
        <div className="flex flex-col gap-2">
          {erro && (
            <p role="alert" className="text-sm text-danger">
              {erro}
            </p>
          )}
          <Botao variante="dourada" tamanho="lg" onClick={aoSalvar} carregando={atualizar.isPending} disabled={!valido}>
            Salvar telefone
          </Botao>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pb-4 pt-1">
        <Input
          variante="clara"
          rotulo="Telefone"
          type="tel"
          inputMode="tel"
          placeholder="(11) 99999-0001"
          value={mascararTelefone(telefone)}
          onChange={(e) => setTelefone(apenasDigitos(e.target.value))}
        />
      </div>
    </FolhaInferior>
  );
}
