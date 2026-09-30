import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import { ErroEstado } from "../../../componentes/ErroEstado";
import { formatarDataCurta, hojeISO, somarDias } from "../periodo.util";
import type { BarbeiroInterno } from "../../agenda/tipos";
import type { Lancamento } from "../tipos";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarHora(isoUtc: string): string {
  return new Date(isoUtc).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dataLocal(isoUtc: string): string {
  // `criadoEm` é timestamp com fuso; agrupar por dia precisa do dia local (America/Sao_Paulo,
  // único fuso do sistema — ver `fuso.util.ts` no back-end), não do dia UTC.
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).formatToParts(new Date(isoUtc));
  const mapa = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  return `${mapa.year}-${mapa.month}-${mapa.day}`;
}

function rotuloDoDia(data: string, dentroDoMesAtual: boolean): string {
  if (!dentroDoMesAtual) return formatarDataCurta(data);
  const hoje = hojeISO();
  if (data === hoje) return `Hoje · ${formatarDataCurta(data)}`;
  if (data === somarDias(hoje, -1)) return `Ontem · ${formatarDataCurta(data)}`;
  return formatarDataCurta(data);
}

type Props = {
  lancamentos: Lancamento[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onTentarNovamente: () => void;
  barbeiros: BarbeiroInterno[];
  rotuloVazio: string;
  /** "Hoje"/"Ontem" só fazem sentido quando o recorte inclui o dia de hoje. */
  incluiHoje: boolean;
};

export function ListaLancamentos({ lancamentos, isLoading, isError, onTentarNovamente, barbeiros, rotuloVazio, incluiHoje }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErroEstado mensagem="Não foi possível carregar os lançamentos." onTentarNovamente={onTentarNovamente} />;
  }

  if (!lancamentos || lancamentos.length === 0) {
    return <EstadoVazio titulo={rotuloVazio} />;
  }

  const porDia = new Map<string, Lancamento[]>();
  for (const lancamento of lancamentos) {
    const dia = dataLocal(lancamento.criadoEm);
    const grupo = porDia.get(dia) ?? [];
    grupo.push(lancamento);
    porDia.set(dia, grupo);
  }

  // Mais recente primeiro (dias e, dentro do dia, lançamentos) — item 9 do prompt.
  const dias = [...porDia.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-4">
      {dias.map((dia) => {
        const itensDoDia = [...porDia.get(dia)!].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
        const subtotal = itensDoDia.reduce((soma, item) => soma + item.valorCentavos, 0);

        return (
          <div key={dia}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-sm font-medium text-text-muted">{rotuloDoDia(dia, incluiHoje)}</p>
              <p className="text-sm font-medium text-text-muted">{formatarReais(subtotal)}</p>
            </div>
            <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
              {itensDoDia.map((lancamento) => (
                <div key={lancamento.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-base font-semibold text-text">
                      {barbeiros.find((b) => b.id === lancamento.barbeiroId)?.nome ?? "—"}
                    </p>
                    <p className="text-sm text-text-muted">{formatarHora(lancamento.criadoEm)}</p>
                  </div>
                  <span className="font-medium text-text">{formatarReais(lancamento.valorCentavos)}</span>
                </div>
              ))}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
