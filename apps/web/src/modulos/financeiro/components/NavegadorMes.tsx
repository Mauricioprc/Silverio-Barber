import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { eMesFuturo, formatarMesAno, mesAnterior } from "../periodo.util";

const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function mesSeguinte(ano: number, mes: number): { ano: number; mes: number } {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

type Props = {
  ano: number;
  mes: number;
  onMudar: (ano: number, mes: number) => void;
};

export function NavegadorMes({ ano, mes, onMudar }: Props) {
  const [sheetAberto, setSheetAberto] = useState(false);
  const [anoNoSheet, setAnoNoSheet] = useState(ano);

  const anterior = mesAnterior(ano, mes);
  const seguinte = mesSeguinte(ano, mes);
  const podeAvancar = !eMesFuturo(seguinte.ano, seguinte.mes);

  function abrirSheet() {
    setAnoNoSheet(ano);
    setSheetAberto(true);
  }

  function escolherMes(mesEscolhido: number) {
    if (eMesFuturo(anoNoSheet, mesEscolhido)) return;
    onMudar(anoNoSheet, mesEscolhido);
    setSheetAberto(false);
  }

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onMudar(anterior.ano, anterior.mes)}
          aria-label="Mês anterior"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={abrirSheet}
          className="flex h-11 items-center gap-1 rounded-xl px-3 text-base font-semibold text-text transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {formatarMesAno(ano, mes)}
          <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
        </button>
        <button
          onClick={() => podeAvancar && onMudar(seguinte.ano, seguinte.mes)}
          disabled={!podeAvancar}
          aria-label="Próximo mês"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <FolhaInferior titulo="Escolher mês" aberto={sheetAberto} onFechar={() => setSheetAberto(false)}>
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setAnoNoSheet((a) => a - 1)}
              aria-label="Ano anterior"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-[4rem] text-center text-base font-semibold text-text">{anoNoSheet}</span>
            <button
              onClick={() => setAnoNoSheet((a) => a + 1)}
              disabled={eMesFuturo(anoNoSheet + 1, 1)}
              aria-label="Próximo ano"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MESES_CURTO.map((rotulo, indice) => {
              const numeroMes = indice + 1;
              const desabilitado = eMesFuturo(anoNoSheet, numeroMes);
              const selecionado = anoNoSheet === ano && numeroMes === mes;
              return (
                <button
                  key={rotulo}
                  onClick={() => escolherMes(numeroMes)}
                  disabled={desabilitado}
                  className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40 ${
                    selecionado ? "border-gold bg-gold-soft text-gold-strong" : "border-border bg-surface text-text hover:bg-surface-2"
                  }`}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>
        </div>
      </FolhaInferior>
    </>
  );
}
