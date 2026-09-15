import { useState } from "react";
import { useDebounce } from "../../lib/useDebounce";
import { useClientes } from "./hooks/useClientes";
import { FormularioNovoCliente } from "./components/FormularioNovoCliente";
import { HistoricoCliente } from "./components/HistoricoCliente";
import { Input } from "../../componentes/Input";
import { Botao } from "../../componentes/Botao";
import { Card } from "../../componentes/Card";
import { Skeleton } from "../../componentes/Skeleton";
import { EstadoVazio } from "../../componentes/EstadoVazio";
import type { Cliente } from "./tipos";

export default function ClientesPage() {
  const [busca, setBusca] = useState("");
  const buscaComDebounce = useDebounce(busca);
  const { data: clientes, isLoading } = useClientes(buscaComDebounce);
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Botao onClick={() => setNovoClienteAberto(true)}>Novo cliente</Botao>
      </div>

      <Input rotulo="Buscar por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />

      {buscaComDebounce.trim().length === 0 && (
        <EstadoVazio titulo="Digite para buscar um cliente." descricao="Por nome ou telefone." />
      )}

      {buscaComDebounce.trim().length > 0 && isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {buscaComDebounce.trim().length > 0 && !isLoading && clientes && clientes.length === 0 && (
        <EstadoVazio titulo="Nenhum cliente encontrado." descricao="Cadastre um novo cliente com esse telefone." />
      )}

      {!isLoading && clientes && clientes.length > 0 && (
        <div className="flex flex-col gap-2">
          {clientes.map((cliente) => (
            <Card
              key={cliente.id}
              onClick={() => setClienteSelecionado(cliente)}
              className="cursor-pointer p-3 transition-colors hover:border-destaque-500"
            >
              <p className="font-medium">{cliente.nome}</p>
              <p className="text-sm text-base-300">{cliente.telefone}</p>
            </Card>
          ))}
        </div>
      )}

      {clienteSelecionado && <HistoricoCliente cliente={clienteSelecionado} />}

      <FormularioNovoCliente
        aberto={novoClienteAberto}
        telefoneInicial={buscaComDebounce}
        onFechar={() => setNovoClienteAberto(false)}
        onCriado={(cliente) => {
          setNovoClienteAberto(false);
          setClienteSelecionado(cliente);
        }}
      />
    </div>
  );
}
