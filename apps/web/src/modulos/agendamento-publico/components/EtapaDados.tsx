import { useState, type FormEvent } from "react";
import { useAuthCliente } from "../../../contextos/auth-cliente-context";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";

type Props = { onIdentificado: (jaVerificado: boolean) => void };

/**
 * Identifica o cliente via `/publico/clientes/cadastro` — o back-end decide sozinho se
 * cria conta nova ou vincula a um telefone já cadastrado pelo balcão (ver comentário em
 * `auth-cliente-context.tsx`). Por isso não há distinção de "sou novo"/"já tenho conta"
 * aqui: o mesmo formulário serve para os dois casos.
 */
export function EtapaDados({ onIdentificado }: Props) {
  const { identificar } = useAuthCliente();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const cliente = await identificar(nome, telefone, senha);
      onIdentificado(cliente.telefoneVerificado);
    } catch (erroCapturado) {
      setErro(mensagemHumana(erroCapturado));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-4">
      <Input rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
      <Input
        rotulo="Telefone (com DDD)"
        type="tel"
        inputMode="numeric"
        placeholder="11999999999"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        required
      />
      <Input
        rotulo="Crie uma senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
        minLength={8}
        erro={erro ?? undefined}
      />
      <p className="text-xs text-base-300">
        A senha permite acessar seus agendamentos depois — usamos o mesmo telefone e senha
        se você já marcou horário aqui antes.
      </p>
      <Botao type="submit" carregando={enviando}>
        Continuar
      </Botao>
    </form>
  );
}
