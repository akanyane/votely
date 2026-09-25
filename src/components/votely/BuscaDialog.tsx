import { Command as CommandPrimitive } from 'cmdk'
import { SearchIcon, XIcon } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type Candidato,
  type Cargo,
  normalizar,
  tituloCompleto,
} from '@/lib/votely'
import { CandidatoAvatar } from './CandidatoAvatar'

// SP tem ~1.400 candidatos a deputado estadual; renderizar todos trava o celular
const MAX_ITENS = 60

type Props = {
  cargo: Cargo | null
  uf: string
  ufNome: string
  candidatos: Candidato[] | undefined
  onClose: () => void
  onPick: (numero: string) => void
}

export function BuscaDialog({
  cargo,
  uf,
  ufNome,
  candidatos,
  onClose,
  onPick,
}: Props) {
  // Mantém o conteúdo durante a animação de saída
  const ultimo = useRef(cargo)
  if (cargo) ultimo.current = cargo
  const atual = cargo ?? ultimo.current

  return (
    <Dialog open={!!cargo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-3 w-[calc(100%-24px)] max-w-none translate-y-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 text-[18px] text-card-foreground shadow-[0_30px_80px_rgba(0,0,0,.35)] ring-0 sm:top-[8vh] sm:max-w-[580px]"
      >
        {/* key: busca e lista recomeçam do zero a cada abertura */}
        {atual && (
          <Busca
            key={atual.id}
            cargo={atual}
            uf={uf}
            ufNome={ufNome}
            candidatos={candidatos ?? []}
            onPick={onPick}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Busca({
  cargo,
  uf,
  ufNome,
  candidatos,
  onPick,
}: {
  cargo: Cargo
  uf: string
  ufNome: string
  candidatos: Candidato[]
  onPick: (numero: string) => void
}) {
  const [busca, setBusca] = useState('')

  const indice = useMemo(
    () =>
      candidatos.map((c) => ({
        c,
        texto: normalizar(`${c.nome} ${c.sigla} ${c.partido} ${c.numero}`),
      })),
    [candidatos],
  )

  const q = normalizar(busca.trim())
  const resultado = q ? indice.filter((i) => i.texto.includes(q)) : indice
  const visiveis = resultado.slice(0, MAX_ITENS)

  return (
    <>
      <div className="relative px-5 pt-5 pr-[72px] pb-3">
        <DialogTitle className="text-[23px] leading-[1.2] font-extrabold">
          Buscar {tituloCompleto(cargo, uf)}
        </DialogTitle>
        <DialogDescription className="text-[16px] text-muted-foreground">
          Candidatos em {ufNome}
        </DialogDescription>
        <DialogClose
          render={
            <Button
              variant="ghost"
              aria-label="Fechar"
              className="absolute top-3 right-3 size-12 rounded-lg [&_svg:not([class*='size-'])]:size-6"
            />
          }
        >
          <XIcon strokeWidth={2.4} />
        </DialogClose>
      </div>

      {/* Filtro próprio: ignora acentos e busca em nome, sigla, partido e número */}
      <Command
        shouldFilter={false}
        className="rounded-none! bg-transparent p-0"
      >
        <div className="relative mx-5">
          <SearchIcon
            className="pointer-events-none absolute top-[17px] left-4 size-[22px] text-muted-foreground"
            strokeWidth={2.4}
          />
          <CommandPrimitive.Input
            value={busca}
            onValueChange={setBusca}
            placeholder="Nome, partido ou número"
            aria-label="Buscar candidato"
            autoFocus
            className="h-14 w-full rounded-lg border-2 border-primary bg-field pr-4 pl-[50px] text-[19px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <CommandList className="max-h-[min(440px,60dvh)] px-3 pt-3 pb-2">
          <CommandEmpty className="m-2 px-2 py-6 text-center text-[17px] text-muted-foreground">
            Nenhum candidato encontrado para “{busca}”.
          </CommandEmpty>
          {resultado.length > 0 && (
            <CommandGroup
              heading={
                resultado.length === 1
                  ? '1 candidato'
                  : `${resultado.length} candidatos`
              }
              className="p-0 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-1 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:text-[14px] **:[[cmdk-group-heading]]:font-extrabold **:[[cmdk-group-heading]]:tracking-[0.05em] **:[[cmdk-group-heading]]:uppercase"
            >
              {visiveis.map(({ c }) => (
                <CommandItem
                  key={c.sq}
                  value={c.sq}
                  onSelect={() => onPick(c.numero)}
                  className="min-h-[76px] cursor-pointer gap-3.5 rounded-lg! px-3 py-2.5 text-[18px] data-selected:bg-accent [&>svg:last-child]:hidden"
                >
                  <CandidatoAvatar
                    candidato={c}
                    className="size-[50px] *:text-[18px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[19px] leading-[1.2] font-extrabold">
                      {c.nome}
                    </div>
                    <div className="text-[15px] text-muted-foreground">
                      {c.sigla} · {c.partido}
                    </div>
                    {c.sit === 'sub_judice' && (
                      <Badge className="mt-1 h-auto rounded-md border-warn-border bg-warn px-2 py-0.5 text-[13px] font-extrabold text-warn-foreground">
                        Sub judice
                      </Badge>
                    )}
                    {c.sit === 'indeferido' && (
                      <Badge className="mt-1 h-auto rounded-md border-danger-border bg-danger px-2 py-0.5 text-[13px] font-extrabold text-destructive">
                        Indeferida
                      </Badge>
                    )}
                  </div>
                  <div className="font-mono text-[24px] font-bold tracking-[0.06em]">
                    {c.numero}
                  </div>
                </CommandItem>
              ))}
              {resultado.length > visiveis.length && (
                <p className="px-2 py-3 text-center text-[15px] text-muted-foreground">
                  Mostrando {visiveis.length} de {resultado.length}. Digite o
                  nome ou o partido para achar mais rápido.
                </p>
              )}
            </CommandGroup>
          )}
        </CommandList>
      </Command>

      <div className="border-t border-border px-5 py-3.5 text-[15px] text-muted-foreground">
        Toque em um nome para preencher o número.
      </div>
    </>
  )
}
