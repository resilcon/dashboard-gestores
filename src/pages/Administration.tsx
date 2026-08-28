import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/feedback/EmptyState'
import { TableSkeleton } from '@/components/feedback/Skeletons'
import { useDefinirGestorDiretor, useDefinirStatusGestor, useCriarGestor, useGestores } from '@/hooks/useTeamData'
import type { Gestor } from '@/types/domain'

const novoGestorSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo.'),
  isDiretor: z.boolean(),
})
type NovoGestorForm = z.infer<typeof novoGestorSchema>

export default function AdministrationPage() {
  const gestores = useGestores()
  const [mostrarInativos, setMostrarInativos] = useState(false)

  const ativos = (gestores.data ?? []).filter((g) => g.status === 'ativo')
  const inativos = (gestores.data ?? []).filter((g) => g.status !== 'ativo')

  return (
    <>
      <Header title="Administração">
        <NovoGestorDialog />
      </Header>

      <div className="flex-1 overflow-auto p-5">
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          A lista de gestores é fixa — cadastre aqui pra que eles apareçam no login e no menu de gestor de cada colaborador. Marcar
          "Diretor" faz essa pessoa ver todos os colaboradores ao entrar no dashboard, sem ficar restrita à própria equipe.
        </p>

        {gestores.isLoading ? (
          <TableSkeleton cols={3} />
        ) : !ativos.length ? (
          <EmptyState icon={ShieldCheck} title="Nenhum gestor cadastrado" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Diretoria</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ativos.map((g) => (
                  <GestorRow key={g.id} gestor={g} />
                ))}
              </TableBody>
            </Table>

            {inativos.length > 0 && (
              <div className="border-t border-border p-3">
                <Button variant="ghost" size="sm" onClick={() => setMostrarInativos((v) => !v)}>
                  {mostrarInativos ? 'Ocultar' : 'Mostrar'} gestores removidos ({inativos.length})
                </Button>
                {mostrarInativos && (
                  <Table>
                    <TableBody>
                      {inativos.map((g) => (
                        <GestorRow key={g.id} gestor={g} />
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

function GestorRow({ gestor }: { gestor: Gestor }) {
  const definirDiretor = useDefinirGestorDiretor()
  const definirStatus = useDefinirStatusGestor()

  function alternarStatus() {
    const novoStatus = gestor.status === 'ativo' ? 'inativo' : 'ativo'
    definirStatus.mutate(
      { id: gestor.id, status: novoStatus },
      {
        onSuccess: () => toast.success(novoStatus === 'ativo' ? 'Gestor reativado' : 'Gestor removido'),
        onError: (err) => toast.error('Não foi possível atualizar', { description: err.message }),
      },
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {gestor.nome}
        {gestor.status !== 'ativo' && <span className="ml-2 text-xs text-muted-foreground">(removido)</span>}
      </TableCell>
      <TableCell>
        <Switch
          checked={gestor.is_diretor}
          onCheckedChange={(checked) =>
            definirDiretor.mutate(
              { id: gestor.id, isDiretor: checked },
              { onError: (err) => toast.error('Não foi possível atualizar', { description: err.message }) },
            )
          }
          disabled={gestor.status !== 'ativo'}
        />
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="ghost" onClick={alternarStatus} disabled={definirStatus.isPending}>
          {gestor.status === 'ativo' ? 'Remover' : 'Reativar'}
        </Button>
      </TableCell>
    </TableRow>
  )
}

function NovoGestorDialog() {
  const [open, setOpen] = useState(false)
  const criar = useCriarGestor()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NovoGestorForm>({ resolver: zodResolver(novoGestorSchema), defaultValues: { isDiretor: false } })

  const isDiretor = useMemo(() => watch('isDiretor'), [watch])

  function onSubmit(values: NovoGestorForm) {
    criar.mutate(
      { nome: values.nome, isDiretor: values.isDiretor },
      {
        onSuccess: () => {
          toast.success('Gestor adicionado')
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
          Novo gestor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo gestor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="novo-gestor-nome">Nome</Label>
            <Input id="novo-gestor-nome" {...register('nome')} placeholder="Nome completo" />
            {errors.nome && <p className="text-xs text-danger">{errors.nome.message}</p>}
          </div>
          <div className="flex items-center gap-2.5">
            <Switch id="novo-gestor-diretor" checked={isDiretor} onCheckedChange={(checked) => setValue('isDiretor', checked)} />
            <Label htmlFor="novo-gestor-diretor" className="font-normal">
              Diretor (vê todos os colaboradores)
            </Label>
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
