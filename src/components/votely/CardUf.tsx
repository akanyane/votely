import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isUf, type UF, UFS } from '@/lib/votely'

const ITEMS = UFS.map(([sigla, nome]) => ({
  value: sigla,
  label: `${nome} (${sigla})`,
}))

type Props = {
  uf: UF | ''
  onChange: (uf: UF) => void
}

export function CardUf({ uf, onChange }: Props) {
  return (
    <Card className="gap-3 rounded-xl p-5 text-[18px] ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          id="uf-label"
          htmlFor="uf"
          className="text-[22px] font-extrabold"
        >
          Onde você vota?
        </label>
        <span className="inline-flex h-[30px] items-center rounded-full bg-accent px-3 text-[15px] font-bold text-accent-foreground">
          1º turno · 4 de outubro
        </span>
      </div>

      <Select
        items={ITEMS}
        value={uf || null}
        onValueChange={(v) => isUf(v) && onChange(v)}
      >
        <SelectTrigger
          id="uf"
          aria-labelledby="uf-label"
          className="h-[60px]! w-full rounded-lg border-2 border-input bg-field pr-4 pl-4 text-[19px] dark:bg-field dark:hover:bg-field [&_svg:not([class*='size-'])]:size-6"
        >
          <SelectValue placeholder="Escolha seu estado" />
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className="max-h-[min(420px,var(--available-height))] rounded-lg p-1"
        >
          {ITEMS.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="min-h-12 rounded-md px-3 text-[18px]"
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!uf && (
        <p className="text-[17px] text-pretty text-muted-foreground">
          Escolha o estado do seu título de eleitor para ver os cargos e montar
          sua colinha.
        </p>
      )}
    </Card>
  )
}
