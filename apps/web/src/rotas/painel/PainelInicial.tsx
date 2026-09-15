import { useState } from "react";
import { useAuthSocio } from "../../contextos/auth-socio-context";
import { Botao } from "../../componentes/Botao";

/** Placeholder da Fase 1 — só confirma que o guard de rota e a sessão funcionam. */
export default function PainelInicial() {
  const { socio, logout } = useAuthSocio();
  const [saindo, setSaindo] = useState(false);

  async function aoSair() {
    setSaindo(true);
    try {
      await logout();
    } finally {
      setSaindo(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Painel — {socio?.nome}</h1>
      <p className="text-base-300">Agenda, financeiro e clientes chegam nas próximas fases.</p>
      <Botao variante="secundaria" carregando={saindo} onClick={aoSair}>
        Sair
      </Botao>
    </div>
  );
}
