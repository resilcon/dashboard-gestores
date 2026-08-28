/**
 * Dia abonado (férias, folga de banco de horas, atestado...) sai do cálculo
 * inteiro -- mesmo princípio já aplicado a sábado/domingo (ver
 * filterDiasUteis), só que aqui o critério vem de uma justificativa marcada
 * como `abonado=true` em vez da data cair num fim de semana.
 */
export function chaveDia(colaboradorId: string, data: string): string {
  return `${colaboradorId}|${data}`
}

export function criarSetDiasAbonados(justificativas: Array<{ colaborador_id: string; data: string }>): Set<string> {
  return new Set(justificativas.map((j) => chaveDia(j.colaborador_id, j.data)))
}

export function ehDiaAbonado(diasAbonados: Set<string>, colaboradorId: string, data: string): boolean {
  return diasAbonados.has(chaveDia(colaboradorId, data))
}

/** Remove do array qualquer linha cujo (colaborador_id, data) esteja no conjunto de dias abonados. */
export function filterNaoAbonados<T extends { colaborador_id: string; data: string }>(rows: T[], diasAbonados: Set<string>): T[] {
  if (!diasAbonados.size) return rows
  return rows.filter((r) => !ehDiaAbonado(diasAbonados, r.colaborador_id, r.data))
}
