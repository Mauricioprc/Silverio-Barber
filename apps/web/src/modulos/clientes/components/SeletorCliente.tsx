import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { useDebounce } from "../../../lib/useDebounce";
import { useClientes } from "../hooks/useClientes";
import { FormularioNovoCliente } from "./FormularioNovoCliente";
import { Input } from "../../../componentes/Input";
import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import { formatPhoneBR } from "../../../lib/formatPhoneBR";
import type { Cliente } from "../tipos";

type Props = { clienteId: number | null; onSelecionar: (cliente: Cliente | null) => void };

/**
 * Seletor de cliente cadastrado, usado no agendamento de balcão (Fase de melhoria pós-Fase 3):
 * agendamento de balcão passou a exigir cliente cadastrado, nunca mais nome/telefone avulsos
 * (decisão de produto). Reaproveita `useClientes`/`FormularioNovoCliente` sem modificá-los.
 */
export function SeletorCliente({ clienteId, onSelecionar }: Props) {
  const [busca, setBusca] = useState("");
  const buscaComDebounce = useDebounce(busca);
  const { data: clientes, isLoading } = useClientes(buscaComDebounce);
  const [cadastroAberto, setCadastroAberto] = useState(false);

  // Guardamos o objeto selecionado localmente só pra exibir nome/telefone no "chip" sem
  // precisar buscar de novo — o pai é a fonte da verdade via `clienteId`/`onSelecionar`.
  const [clienteExibido, setClienteExibido] = useState<Cliente | null>(null);

  if (clienteId !== null && clienteExibido) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
        <div>
          <p className="font-medium text-text">{clienteExibido.nome}</p>
          <p className="text-sm text-text-muted">{formatPhoneBR(clienteExibido.telefone)}</p>
        </div>
        <button
          onClick={() => {
            setClienteExibido(null);
            onSelecionar(null);
          }}
          className="flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        variante="clara"
        rotulo="Buscar cliente por nome ou telefone"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {buscaComDebounce.trim().length > 0 && isLoading && <Skeleton className="h-12 w-full" />}

      {buscaComDebounce.trim().length > 0 && !isLoading && clientes && clientes.length > 0 && (
        <div className="flex flex-col gap-2">
          {clientes.map((cliente) => (
            <Card
              key={cliente.id}
              onClick={() => {
                setClienteExibido(cliente);
                onSelecionar(cliente);
              }}
              className="cursor-pointer border-border bg-surface p-3 transition-colors hover:border-gold"
            >
              <p className="font-medium text-text">{cliente.nome}</p>
              <p className="text-sm text-text-muted">{formatPhoneBR(cliente.telefone)}</p>
            </Card>
          ))}
        </div>
      )}

      {buscaComDebounce.trim().length > 0 && !isLoading && clientes && clientes.length === 0 && (
        <EstadoVazio titulo="Nenhum cliente encontrado." descricao="Cadastre um novo cliente com esse telefone." />
      )}

      <button
        type="button"
        onClick={() => setCadastroAberto(true)}
        className="flex h-11 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-medium text-gold-strong transition-colors hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Cliente novo? Cadastrar
      </button>

      {/* Só monta quando aberto: `FormularioNovoCliente` só lê `telefoneInicial` na primeira montagem. */}
      {cadastroAberto && (
        <FormularioNovoCliente
          aberto={cadastroAberto}
          telefoneInicial={busca}
          onFechar={() => setCadastroAberto(false)}
          onCriado={(cliente) => {
            setCadastroAberto(false);
            setClienteExibido(cliente);
            onSelecionar(cliente);
          }}
        />
      )}
    </div>
  );
}
