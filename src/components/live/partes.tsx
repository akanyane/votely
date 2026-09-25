import { cn } from 'cn'
import type { ReactNode } from 'react'
import { Progress } from '@/components/ui/progress'
import { ROTULO_STATUS } from '@/lib/live/formato'
import type { StatusCandidato } from '@/lib/live/tipos'

const ESTILO_SELO: Record<StatusCandidato, string> = {
  eleito: 'bg-primary text-primary-foreground border-primary',
  segundo_turno: 'bg-accent text-accent-foreground border-primary',
  nao_eleito: 'bg-transparent text-muted-foreground border-input',
  suplente: 'bg-muted text-foreground border-input',
}

/** Selo de situação: só renderizado quando o TSE informou o status */
export function Selo({
  status,
  className,
}: {
  status: StatusCandidato
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full border px-2.5 text-[14px] font-extrabold whitespace-nowrap',
        ESTILO_SELO[status],
        className,
      )}
    >
      {ROTULO_STATUS[status]}
    </span>
  )
}

export function Chip({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full bg-accent px-3 text-[14px] font-extrabold whitespace-nowrap text-accent-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Barra de progresso (Base UI) com a largura igual ao percentual real */
export function Barra({
  valor,
  rotulo,
  alta = false,
  className,
}: {
  valor: number
  rotulo: string
  alta?: boolean
  className?: string
}) {
  return (
    <Progress
      value={Math.max(0, Math.min(100, valor))}
      aria-label={rotulo}
      className={cn(
        'gap-0 **:data-[slot=progress-indicator]:rounded-full **:data-[slot=progress-track]:bg-track',
        alta
          ? '**:data-[slot=progress-track]:h-3'
          : '**:data-[slot=progress-track]:h-2.5',
        className,
      )}
    />
  )
}

export function Cartao({
  children,
  className,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card p-[18px]',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}
