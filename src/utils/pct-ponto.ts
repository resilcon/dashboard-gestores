/**
 * % Ponto = quanto do G-Click bate com o Tangerino (Tangerino é sempre a
 * base/100%). Abaixo de 85% (o mesmo limiar do "LM" da classificação
 * principal) é destacado -- fórmula idêntica em todas as visões (Dia,
 * Semana, Período), portada 1:1 do dashboard antigo (pctSobrePonto).
 */
export const LIMIAR_PCT_PONTO_BAIXO = 85

export function calcularPctPonto(gclickMin: number | null, tangerinoMin: number | null): number | null {
  if (gclickMin === null || gclickMin === undefined || !tangerinoMin) return null
  return (gclickMin / tangerinoMin) * 100
}

export function formatarPctPonto(pct: number | null): string {
  if (pct === null) return '—'
  return `${pct.toFixed(2).replace('.', ',')}%`
}

export function pctPontoEhBaixo(pct: number | null): boolean {
  return pct !== null && pct < LIMIAR_PCT_PONTO_BAIXO
}

/**
 * Média do % Ponto -- dia sem % calculável (sem Tangerino, por exemplo)
 * ENTRA na média como 0%, não é descartado do cálculo. Motivo (feedback
 * real, 2026-08): excluir esses dias inflava a média de quem só tinha
 * Tangerino batido nos dias "bons" -- um colaborador com 2 dias OK e 3 dias
 * sem nenhum ponto batido não pode aparecer com a mesma média de quem
 * trabalhou os 5 dias direitinho. `comDado`/`total` continuam informativos
 * (quantos dias realmente tinham dado), mas o divisor da média é sempre
 * `total`.
 */
export function mediaPctPonto(valores: Array<number | null>): { media: number | null; comDado: number; total: number } {
  const total = valores.length
  if (!total) return { media: null, comDado: 0, total }
  const comDado = valores.filter((v) => v !== null && v !== undefined).length
  const soma = valores.reduce((acc: number, v) => acc + (v ?? 0), 0)
  return { media: soma / total, comDado, total }
}
