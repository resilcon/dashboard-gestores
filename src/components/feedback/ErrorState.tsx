import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <CircleAlert className="h-8 w-8 text-danger" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-foreground">Não foi possível carregar os dados.</p>
        {message && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
