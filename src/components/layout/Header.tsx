import type { ReactNode } from 'react'
import { ChevronDown, Download, LogOut, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIdentity } from '@/context/IdentityContext'
import { MobileNav } from '@/components/layout/MobileNav'

interface HeaderProps {
  title: string
  lastUpdated?: Date | null
  onRefresh?: () => void
  isRefreshing?: boolean
  onExport?: () => void
  isExporting?: boolean
  children?: ReactNode
}

export function Header({ title, lastUpdated, onRefresh, isRefreshing, onExport, isExporting, children }: HeaderProps) {
  const { identidade, sair } = useIdentity()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold text-foreground">{title}</h1>
          {lastUpdated && (
            <p className="truncate text-xs text-muted-foreground">
              Atualizado {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {children}

        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{isExporting ? 'Gerando…' : 'Exportar'}</span>
          </Button>
        )}

        {onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing} aria-label="Atualizar dados">
            <RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 pl-2 sm:flex">
              <span className="max-w-[140px] truncate">{identidade?.nome ?? 'Conta'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{identidade?.nome}</p>
              <p className="text-xs text-muted-foreground">{identidade?.isDiretor ? 'Diretoria' : 'Gestor'}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={sair} variant="destructive">
              <LogOut className="h-4 w-4" />
              Trocar identidade
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
