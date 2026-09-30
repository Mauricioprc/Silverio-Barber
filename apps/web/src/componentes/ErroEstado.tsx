import { AlertTriangle } from "lucide-react";
import { Botao } from "./Botao";

/**
 * Estado de erro do redesenho claro (ver front-redesign-fase0-agenda.md).
 * Componente novo, ainda não usado em nenhuma tela — passa a ser adotado
 * conforme cada tela é migrada.
 */
export function ErroEstado({ mensagem, onTentarNovamente }: { mensagem: string; onTentarNovamente: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      <p className="font-medium text-text">{mensagem}</p>
      <Botao variante="contorno-novo" tamanho="md" className="mt-2" onClick={onTentarNovamente}>
        Tentar de novo
      </Botao>
    </div>
  );
}
