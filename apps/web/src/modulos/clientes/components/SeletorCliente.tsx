import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { useDebounce } from "../../../lib/useDebounce";
import { useClientes } from "../hooks/useClientes";
import { FormularioNovoCliente } from "./FormularioNovoCliente";
import { Input } from "../../../componentes/Input";
import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
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
      <div className="flex items-center justify-between gap-3 rounded border border-base-500 bg-base-700 p-3">
        <div>
          <p className="font-medium text-base-50">{clienteExibido.nome}</p>
          <p className="text-sm text-base-300">{clienteExibido.telefone}</p>
        </div>
        <button
          onClick={() => {
            setClienteExibido(null);
            onSelecionar(null);
          }}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-base-300 transition-colors hover:bg-base-500/30 hover:text-base-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input rotulo="Buscar cliente por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />

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
              className="cursor-pointer p-3 transition-colors hover:border-destaque-500"
            >
              <p className="font-medium text-base-50">{cliente.nome}</p>
              <p className="text-sm text-base-300">{cliente.telefone}</p>
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
        className="flex items-center gap-1.5 self-start rounded px-2 py-1 text-sm font-medium text-destaque-600 transition-colors hover:bg-destaque-500/10"
      >
        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
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
