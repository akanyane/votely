import { Link } from '@tanstack/react-router'
import { CheckIcon, ChevronLeftIcon, MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTema } from '@/lib/tema'

export function CabecalhoLive() {
  const { dark, alternar } = useTema()
  return (
    <header className="flex items-center justify-between gap-2 pt-1 pb-4">
      <Link
        to="/"
        className="flex min-h-12 items-center gap-0.5 pr-2 text-[17px] font-bold text-accent-foreground no-underline hover:opacity-80"
      >
        <ChevronLeftIcon className="size-[22px]" strokeWidth={2.6} />
        Colinha
      </Link>
      <div className="flex items-center gap-2.5">
        <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <CheckIcon className="size-[22px]" strokeWidth={3} />
        </div>
        <div className="text-[24px] font-extrabold tracking-[-0.02em]">
          Votely <span className="text-primary">Live</span>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={alternar}
        aria-label={dark ? 'Usar modo claro' : 'Usar modo escuro'}
        className="size-12 flex-none rounded-lg border-border bg-card text-foreground dark:border-border dark:bg-card [&_svg:not([class*='size-'])]:size-[22px]"
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </Button>
    </header>
  )
}
