import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuthSocio } from "../../contextos/auth-socio-context";
import { mensagemHumana } from "../../lib/mensagens-erro";
import { ApiError } from "../../lib/api-client";
import { Botao } from "../../componentes/Botao";
import { Input } from "../../componentes/Input";
import { useToast } from "../../componentes/Toast";

export default function LoginSocioPage() {
  const { login } = useAuthSocio();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // /painel/login não deve ser indexado — evita anunciar a existência da área de sócio.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(usuario, senha);
      navigate("/painel", { replace: true });
    } catch (erroCapturado) {
      // 401 aqui é credencial errada, não sessão expirada — `mensagemHumana` mapeia
      // 401 genericamente para "sua sessão expirou", que não faz sentido numa tentativa
      // de login (não havia sessão ainda). O back-end já devolve a mensagem certa
      // ("Usuário ou senha inválidos.", regra 3 do documento de convenções: não
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="text-3xl font-bold tracking-tight text-text">Silvério</span>
          <p className="mt-1 text-sm text-text-muted">Painel da barbearia</p>
        </div>

        <form onSubmit={aoEnviar} className="flex flex-col gap-4">
          <Input
            variante="clara"
            rotulo="Usuário"
            type="text"
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              variante="clara"
              rotulo="Senha"
              type={senhaVisivel ? "text" : "password"}
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setSenhaVisivel((atual) => !atual)}
              aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={senhaVisivel}
              className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center text-text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {senhaVisivel ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>

          {erro && (
            <p role="alert" className="text-sm text-danger">
              {erro}
            </p>
          )}

          <Botao type="submit" variante="dourada" tamanho="lg" carregando={enviando} className="w-full">
            Entrar
          </Botao>
        </form>
      </div>
    </div>
  );
}
