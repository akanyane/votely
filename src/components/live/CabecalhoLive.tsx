import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { Pilula, Selo } from '@/components/votely/Marca'

/** Cabeçalho das páginas com todos os cargos (/live/classico e 1º turno) */
export function CabecalhoLive({
  voltar,
}: {
  /** Painel ao qual esta página pertence */
  voltar: '/live' | '/live/1-turno'
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-4">
      <Link
        to={voltar}
        className="flex min-h-12 items-center gap-0.5 pr-2 text-[17px] font-bold text-accent-foreground no-underline hover:opacity-80"
      >
        <ChevronLeftIcon className="size-[22px]" strokeWidth={2.6} />
        Painel
      </Link>
      <div className="flex items-center gap-3">
        <Selo />
        <div className="text-[22px] font-bold [font-family:var(--font-heading)] [font-stretch:85%]">
          Votely <span className="text-primary">Live</span>
        </div>
      </div>
      <Pilula to="/">Colinha</Pilula>
    </header>
  )
}
