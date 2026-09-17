import { Inbox } from "lucide-react";

export function EstadoVazio({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-base-500 py-10 text-center text-base-300">
      <Inbox className="h-6 w-6 text-base-500" aria-hidden="true" />
      <p className="font-medium text-base-50">{titulo}</p>
      {descricao && <p className="text-sm">{descricao}</p>}
    </div>
  );
}
