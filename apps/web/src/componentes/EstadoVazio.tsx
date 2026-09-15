export function EstadoVazio({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-8 text-center text-base-300">
      <p className="font-medium text-base-50">{titulo}</p>
      {descricao && <p className="text-sm">{descricao}</p>}
    </div>
  );
}
