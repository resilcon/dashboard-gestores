import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { criarJustificativa } from '@/services/supabase/mutations'
import { useIdentity } from '@/context/IdentityContext'
import { todayIso } from '@/utils/date'
import type { Colaborador } from '@/types/domain'

/**
 * Criação avulsa de justificativa (fora do contexto de uma linha específica
 * da tabela) -- pra quando o gestor lembra de justificar algo sem estar
 * olhando pro dia/período daquele colaborador na Visão geral.
 */
export function NovaJustificativaDialog({ colaboradores }: { colaboradores: Colaborador[] }) {
  const { identidade } = useIdentity()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [colaboradorId, setColaboradorId] = useState('')
  const [data, setData] = useState(todayIso())
  const [texto, setTexto] = useState('')
  const [abonado, setAbonado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      criarJustificativa({
        colaboradorId,
        data,
        texto: texto.trim(),
        gestor: identidade?.nome ?? '—',
        abonado,
      }),
    onSuccess: () => {
      toast.success(abonado ? 'Justificativa registrada — dia abonado, fora dos cálculos' : 'Justificativa registrada')
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['justificativas'] })
      handleClose()
    },
    onError: (err: Error) => toast.error('Não foi possível registrar a justificativa', { description: err.message }),
  })

  function handleClose() {
    setOpen(false)
    setColaboradorId('')
    setData(todayIso())
    setTexto('')
    setAbonado(false)
    setErro(null)
  }

  function handleSubmit() {
    if (!colaboradorId) return setErro('Selecione o colaborador.')
    if (!data) return setErro('Selecione a data.')
    if (!texto.trim()) return setErro('Descreva o motivo da justificativa.')
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nova justificativa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova justificativa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nova-just-colaborador">Colaborador</Label>
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger id="nova-just-colaborador" className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nova-just-data">Data</Label>
              <Input id="nova-just-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nova-just-texto">Justificativa</Label>
            <Textarea
              id="nova-just-texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex: Colaborador estava de férias / folga do banco de horas / atestado médico."
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-md border border-border-subtle bg-surface-muted px-3 py-2.5">
            <Switch id="nova-just-abonado" checked={abonado} onCheckedChange={setAbonado} className="mt-0.5" />
            <div>
              <Label htmlFor="nova-just-abonado" className="font-medium">
                Marcar como dia abonado
              </Label>
              <p className="text-xs text-muted-foreground">Exclui esse dia de todos os cálculos (KPIs, médias de % Ponto, totais do período).</p>
            </div>
          </div>

          {erro && <p className="text-xs text-danger">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
