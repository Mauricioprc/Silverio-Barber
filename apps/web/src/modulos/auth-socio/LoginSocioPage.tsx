import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSocio } from "../../contextos/auth-socio-context";
import { mensagemHumana } from "../../lib/mensagens-erro";
import { ApiError } from "../../lib/api-client";
import { Botao } from "../../componentes/Botao";
import { Input } from "../../componentes/Input";
import { Card } from "../../componentes/Card";
import { useToast } from "../../componentes/Toast";

export default function LoginSocioPage() {
  const { login } = useAuthSocio();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(telefone, senha);
      navigate("/painel", { replace: true });
    } catch (erroCapturado) {
      // 401 aqui é credencial errada, não sessão expirada — `mensagemHumana` mapeia
      // 401 genericamente para "sua sessão expirou", que não faz sentido numa tentativa
      // de login (não havia sessão ainda). O back-end já devolve a mensagem certa
      // ("Telefone ou senha inválidos.", regra 3 do documento de convenções: não
      // diferenciar usuário inexistente de senha errada) — usar ela direto só neste caso.
      const mensagem =
        erroCapturado instanceof ApiError && erroCapturado.status === 401
          ? erroCapturado.message
          : mensagemHumana(erroCapturado);
      setErro(mensagem);
      mostrarToast(mensagem, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="mb-4 text-xl font-semibold">Entrar</h1>
        <form onSubmit={aoEnviar} className="flex flex-col gap-4">
          <Input
            rotulo="Telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
          />
          <Input
            rotulo="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            erro={erro ?? undefined}
          />
          <Botao type="submit" carregando={enviando}>
            Entrar
          </Botao>
        </form>
      </Card>
    </div>
  );
}
