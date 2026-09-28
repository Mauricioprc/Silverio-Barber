import { useState } from "react";
import { KeyRound, Phone, User } from "lucide-react";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useAlterarSenha } from "../hooks/useAlterarSenha";
import { useAtualizarPerfil } from "../hooks/useAtualizarPerfil";

const classeCampo =
  "w-full rounded border border-base-600 bg-base-800 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-destaque-500 focus:ring-1 focus:ring-destaque-500";

function CampoSenha({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-white/60">
      {rotulo}
      <input type="password" value={valor} onChange={(e) => onChange(e.target.value)} className={classeCampo} />
    </label>
  );
}

/**
 * Usuário (login), telefone (contato) e senha — sempre a própria conta (`PUT /auth/me` /
 * `PUT /auth/senha`), nunca de outro barbeiro. Trocar usuário exige senha atual (é o
 * login); telefone é só contato, não exige.
 */
export function FormularioAcesso({ usuarioAtual, telefoneAtual }: { usuarioAtual: string; telefoneAtual: string }) {
  const { mostrarToast } = useToast();
  const atualizarPerfil = useAtualizarPerfil();
  const alterarSenha = useAlterarSenha();

  const [usuario, setUsuario] = useState(usuarioAtual);
  const [senhaAtualUsuario, setSenhaAtualUsuario] = useState("");
  const [erroUsuario, setErroUsuario] = useState<string | null>(null);

  const [telefone, setTelefone] = useState(telefoneAtual);
  const [erroTelefone, setErroTelefone] = useState<string | null>(null);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirmar, setSenhaConfirmar] = useState("");
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  function aoSalvarUsuario() {
    setErroUsuario(null);
    atualizarPerfil.mutate(
      { usuario, senhaAtual: senhaAtualUsuario },
      {
        onSuccess: () => {
          mostrarToast("Usuário atualizado. Outras sessões abertas foram encerradas.");
          setSenhaAtualUsuario("");
        },
        onError: (erro) => setErroUsuario(mensagemHumana(erro)),
      }
    );
  }

  function aoSalvarTelefone() {
    setErroTelefone(null);
    atualizarPerfil.mutate(
      { telefone },
      {
        onSuccess: () => mostrarToast("Telefone atualizado."),
        onError: (erro) => setErroTelefone(mensagemHumana(erro)),
      }
    );
  }

  function aoSalvarSenha() {
    setErroSenha(null);
    if (senhaNova !== senhaConfirmar) {
      setErroSenha("As senhas novas não coincidem.");
      return;
    }
    alterarSenha.mutate(
      { senhaAtual, senhaNova },
      {
        onSuccess: () => {
          mostrarToast("Senha atualizada. Outras sessões abertas foram encerradas.");
          setSenhaAtual("");
          setSenhaNova("");
          setSenhaConfirmar("");
        },
        onError: (erro) => setErroSenha(mensagemHumana(erro)),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/40">
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          Usuário de acesso
        </p>
        <div className="flex flex-col gap-2 rounded-lg border border-base-600 bg-base-800 p-4">
          <label className="flex flex-col gap-1 text-sm text-white/60">
            Usuário
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} className={classeCampo} />
          </label>
          <CampoSenha rotulo="Senha atual (pra confirmar)" valor={senhaAtualUsuario} onChange={setSenhaAtualUsuario} />
          {erroUsuario && <p className="text-sm text-red-400">{erroUsuario}</p>}
          <button
            onClick={aoSalvarUsuario}
            disabled={atualizarPerfil.isPending || usuario === usuarioAtual || !senhaAtualUsuario}
            className="self-start rounded border border-base-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-destaque-500 disabled:opacity-40"
          >
            {atualizarPerfil.isPending ? "Salvando…" : "Salvar usuário"}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/40">
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          Telefone de contato
        </p>
        <div className="flex flex-col gap-2 rounded-lg border border-base-600 bg-base-800 p-4">
          <label className="flex flex-col gap-1 text-sm text-white/60">
            Telefone
            <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} className={classeCampo} />
          </label>
          {erroTelefone && <p className="text-sm text-red-400">{erroTelefone}</p>}
          <button
            onClick={aoSalvarTelefone}
            disabled={atualizarPerfil.isPending || telefone === telefoneAtual}
            className="self-start rounded border border-base-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-destaque-500 disabled:opacity-40"
          >
            {atualizarPerfil.isPending ? "Salvando…" : "Salvar telefone"}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/40">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          Trocar senha
        </p>
        <div className="flex flex-col gap-2 rounded-lg border border-base-600 bg-base-800 p-4">
          <CampoSenha rotulo="Senha atual" valor={senhaAtual} onChange={setSenhaAtual} />
          <CampoSenha rotulo="Nova senha (mínimo 8 caracteres)" valor={senhaNova} onChange={setSenhaNova} />
          <CampoSenha rotulo="Confirmar nova senha" valor={senhaConfirmar} onChange={setSenhaConfirmar} />
          {erroSenha && <p className="text-sm text-red-400">{erroSenha}</p>}
          <button
            onClick={aoSalvarSenha}
            disabled={alterarSenha.isPending || !senhaAtual || senhaNova.length < 8 || !senhaConfirmar}
            className="self-start rounded border border-base-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-destaque-500 disabled:opacity-40"
          >
            {alterarSenha.isPending ? "Salvando…" : "Salvar nova senha"}
          </button>
        </div>
      </div>
    </div>
  );
}
