import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { criarJustificativa } from '@/services/supabase/mutations'
import { useIdentity } from '@/context/IdentityContext'
import { formatDateBr } from '@/utils/date'
import type { JustifyTarget } from '@/types/domain'

export function JustifyDialog({ target, onOpenChange }: { target: JustifyTarget | null; onOpenChange: (open: boolean) => void }) {
  const { identidade } = useIdentity()
  const queryClient = useQueryClient()
  const [texto, setTexto] = useState('')
  const [abonado, setAbonado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      criarJustificativa({
        colaboradorId: target!.colaboradorId,
        data: target!.data,
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
    onError: (err: Error) => {
      toast.error('Não foi possível registrar a justificativa', { description: err.message })
    },
  })

  function handleClose() {
    setTexto('')
    setAbonado(false)
    setErro(null)
    onOpenChange(false)
  }

  function handleSubmit() {
    if (!texto.trim()) {
      setErro('Descreva o motivo da justificativa.')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justificar lançamento</DialogTitle>
          <DialogDescription>
            {target?.nome} — {target ? formatDateBr(target.data) : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="justificativa-texto">Justificativa</Label>
          <Textarea
            id="justificativa-texto"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setErro(null)
            }}
            placeholder="Ex: Colaborador estava de férias / folga do banco de horas / atestado médico."
          />
          {erro && <p className="text-xs text-danger">{erro}</p>}
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-border-subtle bg-surface-muted px-3 py-2.5">
          <Switch id="justificativa-abonado" checked={abonado} onCheckedChange={setAbonado} className="mt-0.5" />
          <div>
            <Label htmlFor="justificativa-abonado" className="font-medium">
              Marcar como dia abonado
            </Label>
            <p className="text-xs text-muted-foreground">
              Exclui esse dia de todos os cálculos (KPIs, médias de % Ponto, totais do período) — use pra férias, folga do banco de
              horas, atestado etc.
            </p>
          </div>
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
