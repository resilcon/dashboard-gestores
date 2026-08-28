import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Search, Users } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/feedback/EmptyState'
import { TableSkeleton } from '@/components/feedback/Skeletons'
import {
  useAtualizarColaborador,
  useColaboradores,
  useCriarColaborador,
  useDefinirStatusColaborador,
  useGestores,
} from '@/hooks/useTeamData'
import type { Colaborador } from '@/types/domain'

const novoColaboradorSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo.'),
  supervisor: z.string().optional(),
})
type NovoColaboradorForm = z.infer<typeof novoColaboradorSchema>

export default function TeamPage() {
  const colaboradores = useColaboradores()
  const gestores = useGestores()
  const [busca, setBusca] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)

  const gestoresAtivos = useMemo(() => (gestores.data ?? []).filter((g) => g.status === 'ativo'), [gestores.data])

  const filtrados = useMemo(() => {
    const lista = colaboradores.data ?? []
    return lista.filter((c) => (busca ? c.nome.toLowerCase().includes(busca.toLowerCase()) : true))
  }, [colaboradores.data, busca])

  const ativos = filtrados.filter((c) => c.status === 'ativo')
  const inativos = filtrados.filter((c) => c.status !== 'ativo')

  return (
    <>
      <Header title="Minha equipe">
        <NovoColaboradorDialog gestorOptions={gestoresAtivos.map((g) => g.nome)} />
      </Header>

      <div className="flex-1 overflow-auto p-5">
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{colaboradores.data?.length ?? 0}</strong> colaborador(es)
          </span>
          <span>
            <strong className="text-foreground">{colaboradores.data?.filter((c) => c.status === 'ativo').length ?? 0}</strong> ativos
          </span>
          <span>
            <strong className="text-foreground">{colaboradores.data?.filter((c) => c.status !== 'ativo').length ?? 0}</strong> inativos
          </span>
        </div>

        <div className="relative mb-3 max-w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador..." className="h-8 pl-8" />
        </div>

        {colaboradores.isLoading ? (
          <TableSkeleton cols={4} />
        ) : !ativos.length && !inativos.length ? (
          <EmptyState icon={Users} title="Nenhum colaborador encontrado" description="Tente alterar a busca." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Apelidos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ativos.map((c) => (
                  <ColaboradorRow key={c.id} colaborador={c} gestorOptions={gestoresAtivos.map((g) => g.nome)} />
                ))}
              </TableBody>
            </Table>

            {inativos.length > 0 && (
              <div className="border-t border-border p-3">
                <Button variant="ghost" size="sm" onClick={() => setMostrarInativos((v) => !v)}>
                  {mostrarInativos ? 'Ocultar' : 'Mostrar'} removidos ({inativos.length})
                </Button>
                {mostrarInativos && (
                  <Table>
                    <TableBody>
                      {inativos.map((c) => (
                        <ColaboradorRow key={c.id} colaborador={c} gestorOptions={gestoresAtivos.map((g) => g.nome)} />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function ColaboradorRow({ colaborador, gestorOptions }: { colaborador: Colaborador; gestorOptions: string[] }) {
  const [supervisor, setSupervisor] = useState(colaborador.supervisor ?? '')
  const [apelidos, setApelidos] = useState((colaborador.apelidos ?? []).join(', '))
  const atualizar = useAtualizarColaborador()
  const definirStatus = useDefinirStatusColaborador()

  const opcoes = supervisor && !gestorOptions.includes(supervisor) ? [supervisor, ...gestorOptions] : gestorOptions

  function salvar() {
    atualizar.mutate(
      {
        id: colaborador.id,
        supervisor: supervisor || null,
        apelidos: apelidos
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => toast.success('Colaborador atualizado'),
        onError: (err) => toast.error('Não foi possível salvar', { description: err.message }),
      },
    )
  }

  function alternarStatus() {
    const novoStatus = colaborador.status === 'ativo' ? 'inativo' : 'ativo'
    definirStatus.mutate(
      { id: colaborador.id, status: novoStatus },
      {
        onSuccess: () => toast.success(novoStatus === 'ativo' ? 'Colaborador reativado' : 'Colaborador removido'),
        onError: (err) => toast.error('Não foi possível atualizar o status', { description: err.message }),
      },
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {colaborador.nome}
        {colaborador.status !== 'ativo' && <span className="ml-2 text-xs text-muted-foreground">(removido)</span>}
      </TableCell>
      <TableCell>
        <Select value={supervisor || 'nenhum'} onValueChange={(v) => setSupervisor(v === 'nenhum' ? '' : v)}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="— sem gestor —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">— sem gestor —</SelectItem>
            {opcoes.map((nome) => (
              <SelectItem key={nome} value={nome}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input value={apelidos} onChange={(e) => setApelidos(e.target.value)} placeholder="Apelidos (separados por vírgula)" className="h-8" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={salvar} disabled={atualizar.isPending}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={alternarStatus} disabled={definirStatus.isPending}>
            {colaborador.status === 'ativo' ? 'Remover' : 'Reativar'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function NovoColaboradorDialog({ gestorOptions }: { gestorOptions: string[] }) {
  const [open, setOpen] = useState(false)
  const criar = useCriarColaborador()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NovoColaboradorForm>({ resolver: zodResolver(novoColaboradorSchema) })

  function onSubmit(values: NovoColaboradorForm) {
    criar.mutate(
      { nome: values.nome, supervisor: values.supervisor || null },
      {
        onSuccess: () => {
          toast.success('Colaborador adicionado')
          reset()
          setOpen(false)
        },
        onError: (err) => toast.error('Não foi possível adicionar', { description: err.message }),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Novo colaborador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo colaborador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="novo-colab-nome">Nome</Label>
            <Input id="novo-colab-nome" {...register('nome')} placeholder="Nome completo" />
            {errors.nome && <p className="text-xs text-danger">{errors.nome.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novo-colab-gestor">Gestor</Label>
            <Select value={watch('supervisor') || 'nenhum'} onValueChange={(v) => setValue('supervisor', v === 'nenhum' ? '' : v)}>
              <SelectTrigger id="novo-colab-gestor" className="w-full">
                <SelectValue placeholder="— sem gestor —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">— sem gestor —</SelectItem>
                {gestorOptions.map((nome) => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? 'Adicionando…' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
