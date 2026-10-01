import { useCallback, useEffect, useState } from "react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { Input } from "../../../componentes/Input";
import { CampoSenha } from "../../../componentes/CampoSenha";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import { ApiError } from "../../../lib/api-client";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useAtualizarPerfil } from "../hooks/useAtualizarPerfil";
import { useAlterarSenha } from "../hooks/useAlterarSenha";

type Props = { usuarioAtual: string; aberto: boolean; onFechar: () => void };

/**
 * "Usuário e senha" — um sheet só, já que os dois exigem a mesma senha atual pra
 * confirmar (regra de hoje, `PUT /auth/me` e `PUT /auth/senha`). "Trocar senha" começa
 * recolhido; expandir não dispensa a senha atual, só revela os campos da senha nova.
 * Usuário e senha podem mudar juntos ou separados num único "Salvar" — chama só o(s)
 * endpoint(s) necessário(s), em sequência, e usa `erro.message` direto no 409 (usuário
 * já em uso), que `mensagemHumana` mapearia erradamente pra conflito de horário.
 */
export function SheetUsuarioSenha({ usuarioAtual, aberto, onFechar }: Props) {
  const atualizarPerfil = useAtualizarPerfil();
  const alterarSenha = useAlterarSenha();
  const { mostrarToast } = useToast();

  const [usuario, setUsuario] = useState(usuarioAtual);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [trocarSenhaAberto, setTrocarSenhaAberto] = useState(false);
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirmar, setSenhaConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function limpar() {
    setUsuario(usuarioAtual);
    setSenhaAtual("");
    setTrocarSenhaAberto(false);
    setSenhaNova("");
    setSenhaConfirmar("");
    setErro(null);
  }

  useEffect(() => {
    if (aberto) limpar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, usuarioAtual]);

  // `FolhaInferior` refoca o próprio container sempre que `onFechar` muda de
  // identidade — sem `useCallback` aqui, cada tecla digitada recriava `fechar` e
  // chutava o foco pra fora do campo a cada caractere (achado reportado no teste).
  const fechar = useCallback(() => {
    setUsuario(usuarioAtual);
    setSenhaAtual("");
    setTrocarSenhaAberto(false);
    setSenhaNova("");
    setSenhaConfirmar("");
    setErro(null);
    onFechar();
  }, [usuarioAtual, onFechar]);

  const usuarioMudou = usuario.trim().length > 0 && usuario.trim() !== usuarioAtual;
  const trocaSenhaValida = trocarSenhaAberto && senhaNova.length >= 8 && senhaConfirmar.length > 0;
  const valido = (usuarioMudou || trocaSenhaValida) && senhaAtual.length > 0;

  async function aoSalvar() {
    if (!valido) return;
    setErro(null);

    if (trocarSenhaAberto && senhaNova !== senhaConfirmar) {
      setErro("As senhas novas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      if (usuarioMudou) {
        await atualizarPerfil.mutateAsync({ usuario: usuario.trim(), senhaAtual });
      }
      if (trocaSenhaValida) {
        await alterarSenha.mutateAsync({ senhaAtual, senhaNova });
      }
      const mensagem =
        usuarioMudou && trocaSenhaValida
          ? "Usuário e senha atualizados. Outras sessões abertas foram encerradas."
          : usuarioMudou
            ? "Usuário atualizado. Outras sessões abertas foram encerradas."
            : "Senha atualizada. Outras sessões abertas foram encerradas.";
      mostrarToast(mensagem);
      fechar();
    } catch (erroCapturado) {
      const mensagem =
        erroCapturado instanceof ApiError && erroCapturado.status === 409
          ? erroCapturado.message
          : mensagemHumana(erroCapturado);
      setErro(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FolhaInferior
      titulo="Usuário e senha"
      aberto={aberto}
      onFechar={fechar}
      rodape={
        <div className="flex flex-col gap-2">
          {erro && (
            <p role="alert" className="text-sm text-danger">
              {erro}
            </p>
          )}
          <Botao variante="dourada" tamanho="lg" onClick={aoSalvar} carregando={enviando} disabled={!valido}>
            Salvar
          </Botao>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pb-4 pt-1">
        <Input
          variante="clara"
          rotulo="Usuário"
          type="text"
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <CampoSenha
          rotulo="Senha atual (para confirmar)"
          autoComplete="current-password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
        />

        {!trocarSenhaAberto ? (
          <button
            type="button"
            onClick={() => setTrocarSenhaAberto(true)}
            className="flex h-11 items-center self-start rounded-lg text-sm font-medium text-gold-strong hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Trocar senha
          </button>
        ) : (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex flex-col gap-1">
              <CampoSenha
                rotulo="Nova senha"
                autoComplete="new-password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
              />
              <p className="text-xs text-text-muted">Mínimo de 8 caracteres.</p>
            </div>
            <CampoSenha
              rotulo="Confirmar nova senha"
              autoComplete="new-password"
              value={senhaConfirmar}
              onChange={(e) => setSenhaConfirmar(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setTrocarSenhaAberto(false);
                setSenhaNova("");
                setSenhaConfirmar("");
              }}
              className="flex h-11 items-center self-start rounded-lg text-sm font-medium text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Cancelar troca de senha
            </button>
          </div>
        )}
      </div>
    </FolhaInferior>
  );
}
