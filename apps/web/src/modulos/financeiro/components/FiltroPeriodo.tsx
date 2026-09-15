import { Select } from "../../../componentes/Select";
import type { BarbeiroInterno } from "../../agenda/tipos";
import type { Periodo } from "../tipos";

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
    <div className="flex flex-wrap gap-3">
      <Select rotulo="Período" value={periodo} onChange={(e) => onMudarPeriodo(e.target.value as Periodo)}>
        {OPCOES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </Select>

      <Select
        rotulo="Sócio"
        value={barbeiroId ?? ""}
        onChange={(e) => onMudarBarbeiro(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Todos (consolidado)</option>
        {barbeiros.map((b) => (
          <option key={b.id} value={b.id}>
            {b.nome}
          </option>
        ))}
      </Select>
    </div>
  );
}
