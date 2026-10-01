import { useState } from "react";
import { ChevronRight, Phone, User } from "lucide-react";
import { Card } from "../../../componentes/Card";
import { formatPhoneBR } from "../../../lib/formatPhoneBR";
import { SheetUsuarioSenha } from "./SheetUsuarioSenha";
import { SheetTelefone } from "./SheetTelefone";

type SheetId = "usuarioSenha" | "telefone";
type Props = { usuario: string; telefone: string };

/**
 * "Conta e acesso" (item B do redesenho) — 2 linhas tocáveis, cada uma abre o sheet do
 * respectivo formulário; nunca há formulário aberto direto na tela. Sempre a própria
 * conta (PUT /auth/me, PUT /auth/senha) — só aparece no próprio perfil, nunca no de
 * outro barbeiro (gate em `PerfilBarbeiro.tsx`, `modo === "proprio"`). Usuário e senha
 * ficam juntos num só sheet (ambos exigem a mesma senha atual pra confirmar).
 */
export function CartaoContaAcesso({ usuario, telefone }: Props) {
  const [sheetAberto, setSheetAberto] = useState<SheetId | null>(null);

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Conta e acesso</p>
      <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
        <button
          onClick={() => setSheetAberto("usuarioSenha")}
          className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          <User className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-muted">Usuário e senha</p>
            <p className="truncate text-sm text-text">{usuario}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        </button>

        <button
          onClick={() => setSheetAberto("telefone")}
          className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          <Phone className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-muted">Telefone de contato</p>
            <p className="truncate text-sm text-text">{formatPhoneBR(telefone)}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        </button>
      </Card>

      <SheetUsuarioSenha usuarioAtual={usuario} aberto={sheetAberto === "usuarioSenha"} onFechar={() => setSheetAberto(null)} />
      <SheetTelefone telefoneAtual={telefone} aberto={sheetAberto === "telefone"} onFechar={() => setSheetAberto(null)} />
    </div>
  );
}
