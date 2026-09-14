/**
 * Cálculo puro de horários livres — sem acesso a banco, só aritmética sobre strings
 * `"YYYY-MM-DD HH:MM:SS"` (mesmo formato "naive" das colunas de horário — ver
 * comentário em `db/schema.ts`). Testável isoladamente, sem precisar de banco.
 * Comparação lexicográfica de string equivale à ordem cronológica aqui porque todo
 * horário nesse formato tem largura fixa e é zero-padded.
 */
export type Intervalo = { inicio: string; fim: string };

/**
 * Subtrai `ocupados` de `janela`, devolvendo os sub-intervalos livres restantes dentro
 * da janela, em ordem. `ocupados` não precisa vir ordenado nem sem sobreposição entre si
 * (a função não assume isso).
 */
export function subtrairIntervalos(janela: Intervalo, ocupados: Intervalo[]): Intervalo[] {
  const relevantes = ocupados
    .filter((ocupado) => ocupado.fim > janela.inicio && ocupado.inicio < janela.fim)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const livres: Intervalo[] = [];
  let cursor = janela.inicio;

  for (const ocupado of relevantes) {
    const inicioOcupado = ocupado.inicio > cursor ? ocupado.inicio : cursor;
    if (inicioOcupado > cursor) {
      livres.push({ inicio: cursor, fim: inicioOcupado });
    }
    if (ocupado.fim > cursor) {
      cursor = ocupado.fim;
    }
    if (cursor >= janela.fim) break;
  }

  if (cursor < janela.fim) {
    livres.push({ inicio: cursor, fim: janela.fim });
  }

  return livres;
}
