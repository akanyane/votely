import { Link } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Selo do Votely: moldura em degradê azul → verde, como no painel */
export function Selo({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative size-[42px] flex-none rounded-xl bg-[linear-gradient(135deg,#3B82F6,#06B6D4_50%,#10B981)] p-px shadow-[0_0_24px_rgba(6,182,212,0.25)]',
        className,
      )}
    >
      <div className="grid size-full place-items-center rounded-[11px] bg-[#0E1019] text-[18px] font-extrabold">
        {children ?? <CheckIcon className="size-[22px]" strokeWidth={3} />}
      </div>
    </div>
  )
}

/** Botão-pílula de navegação entre as páginas */
export function Pilula({
  to,
  aoVivo,
  children,
}: {
  to: '/' | '/live'
  aoVivo?: boolean
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-11 flex-none items-center gap-2 rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap no-underline transition-colors',
        aoVivo
          ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.07)] text-[#FCA5A5] hover:bg-[rgba(239,68,68,0.14)]'
          : 'border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.08]',
      )}
    >
      {aoVivo && (
        <span className="size-2 flex-none animate-[painel-pulso_1.6s_infinite] rounded-full bg-[#EF4444]" />
      )}
      {children}
    </Link>
  )
}
