/**
 * O PostgREST devolve no máximo 1000 linhas por resposta, mesmo pedindo um
 * `limit` maior (achado real nesta migração: a visão "Semana" do dashboard
 * antigo vinha truncando silenciosamente o histórico há meses sem ninguém
 * perceber). Qualquer consulta que possa passar de 1000 linhas -- período
 * livre com "todos os colaboradores", por exemplo -- precisa paginar de
 * verdade em vez de confiar num único `limit`.
 */
const PAGE_SIZE = 1000

export async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  maxRows = Number.POSITIVE_INFINITY,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  while (from < maxRows) {
    const to = Math.min(from + PAGE_SIZE - 1, maxRows - 1)
    const { data, error } = await build(from, to)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < to - from + 1) break // veio menos que o pedido -- acabaram as linhas
    from += PAGE_SIZE
  }
  return all
}
