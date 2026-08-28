/** Centraliza as query keys do TanStack Query — evita string solta espalhada pelos hooks/componentes. */
export const queryKeys = {
  dashboardRecent: (maxRows: number) => ['dashboard', 'recent', maxRows] as const,
  dashboardRange: (start: string, end: string, colaboradorId?: string) =>
    ['dashboard', 'range', start, end, colaboradorId ?? 'todos'] as const,
  employeeDetail: (colaboradorId: string, date: string) => ['employee', colaboradorId, date] as const,
  colaboradores: () => ['colaboradores'] as const,
  gestores: () => ['gestores'] as const,
  gestoresAtivos: () => ['gestores', 'ativos'] as const,
}
