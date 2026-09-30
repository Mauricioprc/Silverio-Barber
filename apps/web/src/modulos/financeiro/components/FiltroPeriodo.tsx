import { Chip } from "../../../componentes/Chip";
import { Segmentado } from "../../../componentes/Segmentado";
import type { BarbeiroInterno } from "../../agenda/tipos";
import type { Periodo } from "../tipos";

// Mesmas opções que já existiam no select (rótulos e valores preservados) — o mockup
// mostra Hoje/Semana/Mês só como exemplo, isso aqui é o que a tela já tinha.
const OPCOES: { valor: Periodo; rotulo: string }[] = [
  { valor: "dia", rotulo: "Hoje" },
  { valor: "semana", rotulo: "Últimos 7 dias" },
  { valor: "mes", rotulo: "Este mês" },
];

type Props = {
  periodo: Periodo;
  onMudarPeriodo: (periodo: Periodo) => void;
  barbeiroId: number | null;
  onMudarBarbeiro: (id: number | null) => void;
  barbeiros: BarbeiroInterno[];
};

export function FiltroPeriodo({ periodo, onMudarPeriodo, barbeiroId, onMudarBarbeiro, barbeiros }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Segmentado
        rotulo="Período"
        valor={periodo}
        onSelecionar={onMudarPeriodo}
        opcoes={OPCOES.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
      />

      {/* Sócio não-admin só enxerga o próprio registro (`GET /barbeiros` já vem escopado
          do back-end) — "Todos" seria enganoso aqui, já que o dado mostrado já é só o
          dele mesmo. Mostra um rótulo fixo em vez de um filtro sem escolha real. */}
      {barbeiros.length <= 1 ? (
        barbeiros[0] && <p className="text-sm text-text-muted">Faturamento de {barbeiros[0].nome}</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip ativo={barbeiroId === null} onClick={() => onMudarBarbeiro(null)}>
            Todos
          </Chip>
          {barbeiros.map((b) => (
            <Chip key={b.id} ativo={b.id === barbeiroId} onClick={() => onMudarBarbeiro(b.id)}>
              {b.nome}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
