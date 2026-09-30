import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBarbeirosInternos } from "./hooks/useBarbeirosInternos";
import { PainelBloqueios } from "./components/PainelBloqueios";
import { Segmentado } from "../../componentes/Segmentado";
import { Skeleton } from "../../componentes/Skeleton";

/**
 * Rota /painel/bloqueios — acesso movido do topo da Agenda pra página "Mais"
 * (ver front-redesign-fase0-agenda.md, etapa Navegação inferior). Reusa o
 * `PainelBloqueios` como está (mesma lógica/mutations), só muda o container:
 * antes um sheet aberto por dentro da Agenda, agora uma rota própria — fecha
 * voltando pra "Mais".
 */
export default function BloqueiosPage() {
  const navigate = useNavigate();
  const { data: barbeiros, isLoading } = useBarbeirosInternos();
  const [barbeiroId, setBarbeiroId] = useState<number | null>(null);

  useEffect(() => {
    if (barbeiroId === null && barbeiros && barbeiros.length > 0) {
      setBarbeiroId(barbeiros[0].id);
    }
  }, [barbeiros, barbeiroId]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      {isLoading && <Skeleton className="h-11 w-full" />}
      {!isLoading && barbeiros && barbeiros.length > 1 && (
        <Segmentado
          rotulo="Barbeiro"
          valor={barbeiroId !== null ? String(barbeiroId) : null}
          onSelecionar={(valor) => setBarbeiroId(Number(valor))}
          opcoes={barbeiros.map((b) => ({ valor: String(b.id), rotulo: b.nome }))}
        />
      )}

      <PainelBloqueios aberto onFechar={() => navigate("/painel/mais")} barbeiroId={barbeiroId} />
    </div>
  );
}
