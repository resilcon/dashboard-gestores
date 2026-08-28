import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useIdentity } from '@/context/IdentityContext'

export default function LoginPage() {
  const { identidade, gestoresAtivos, carregandoGestores, selecionarGestor } = useIdentity()
  const [nomeSelecionado, setNomeSelecionado] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  if (identidade) return <Navigate to="/" replace />

  function handleEntrar() {
    if (!nomeSelecionado) {
      setErro('Selecione seu nome para continuar.')
      return
    }
    selecionarGestor(nomeSelecionado)
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}logo-resilcon.png`} alt="Resilcon" className="h-8 w-8 rounded-md bg-white/90 object-contain p-1" />
          <span className="text-sm font-semibold tracking-tight">Resilcon Contabilidade</span>
        </div>
        <div className="max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Painel de gestão de produtividade</h2>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Acompanhe G-Click, Tangerino e WorkMonitor da sua equipe em um único lugar, com uma visão clara de quem
            está dentro do esperado e quem precisa de atenção.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Resilcon Contabilidade Consultiva</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <img src={`${import.meta.env.BASE_URL}logo-resilcon.png`} alt="Resilcon" className="h-10 w-10 object-contain" />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-foreground">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse o painel de gestão da Resilcon.</p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="gestor-select" className="text-sm font-medium text-foreground">
                Seu nome
              </label>
              {carregandoGestores ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={nomeSelecionado}
                  onValueChange={(value) => {
                    setNomeSelecionado(value)
                    setErro(null)
                  }}
                >
                  <SelectTrigger id="gestor-select" className="w-full">
                    <SelectValue placeholder="Selecione seu nome..." />
                  </SelectTrigger>
                  <SelectContent>
                    {gestoresAtivos.map((g) => (
                      <SelectItem key={g.nome} value={g.nome}>
                        {g.nome}
                        {g.is_diretor ? ' (Diretoria)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {erro && <p className="text-xs text-danger">{erro}</p>}
            </div>

            <Button className="w-full" onClick={handleEntrar} disabled={carregandoGestores}>
              Entrar
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Não encontrou seu nome? Peça para um administrador cadastrá-lo em Administração → Gestores.
          </p>
        </div>
      </div>
    </div>
  )
}
