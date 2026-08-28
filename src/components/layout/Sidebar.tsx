import { NavLink } from 'react-router-dom'
import { FileText, LayoutGrid, ShieldCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIdentity } from '@/context/IdentityContext'

const NAV_ITEMS = [
  { to: '/', label: 'Visão geral', icon: LayoutGrid, end: true },
  { to: '/equipe', label: 'Minha equipe', icon: Users, end: false },
  { to: '/justificativas', label: 'Justificativas', icon: FileText, end: false },
]

const ADMIN_ITEM = { to: '/administracao', label: 'Administração', icon: ShieldCheck }

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { identidade } = useIdentity()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-5">
        <img src={`${import.meta.env.BASE_URL}logo-resilcon.png`} alt="Resilcon" className="h-6 w-6 object-contain" />
        <span className="text-sm font-semibold tracking-tight">Dashboard Gestores</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} onClick={onNavigate} />
        ))}

        <div className="my-3 border-t border-sidebar-border" />
        <span className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Administração</span>
        <SidebarLink to={ADMIN_ITEM.to} label={ADMIN_ITEM.label} icon={ADMIN_ITEM.icon} end={false} onClick={onNavigate} />
      </nav>

      <div className="flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
          {identidade ? initials(identidade.nome) : '—'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{identidade?.nome ?? 'Não identificado'}</p>
          <p className="truncate text-xs text-muted-foreground">{identidade?.isDiretor ? 'Diretoria' : 'Gestor'}</p>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <SidebarContent />
    </aside>
  )
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
  onClick,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}
