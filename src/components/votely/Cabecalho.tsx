import { CheckIcon, MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTema } from '@/lib/tema'

export function Cabecalho() {
  const { dark, alternar } = useTema()

  return (
    <header className="flex items-center justify-between gap-3 pt-2 pb-5">
      <div className="flex items-center gap-3">
        <div className="grid size-12 flex-none place-items-center rounded-xl bg-primary text-primary-foreground">
          <CheckIcon className="size-7" strokeWidth={3} />
        </div>
        <div>
          <div className="text-[30px] leading-[1.05] font-extrabold tracking-[-0.02em]">
            Votely
          </div>
          <div className="text-[17px] text-muted-foreground">
            Sua colinha para 2026
          </div>
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
