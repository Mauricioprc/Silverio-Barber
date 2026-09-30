import { Inbox, type LucideIcon } from "lucide-react";
import { Botao } from "./Botao";

type Props = {
  titulo: string;
  descricao?: string;
  icone?: LucideIcon;
  acao?: { rotulo: string; onClick: () => void };
};

export function EstadoVazio({ titulo, descricao, icone: Icone = Inbox, acao }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-base-500 py-10 text-center text-base-300">
      <Icone className="h-6 w-6 text-base-500" aria-hidden="true" />
      <p className="font-medium text-base-50">{titulo}</p>
      {descricao && <p className="text-sm">{descricao}</p>}
      {acao && (
        <Botao variante="dourada" tamanho="md" className="mt-2" onClick={acao.onClick}>
          {acao.rotulo}
        </Botao>
      )}
    </div>
  );
}
