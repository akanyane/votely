import { cn } from 'cn'
import { SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { CandidatoAvatar } from '@/components/votely/CandidatoAvatar'
import { fmtNum, fmtVotos, ordinal } from '@/lib/live/formato'
import type { ResultadoCargo } from '@/lib/live/tipos'
import { normalizar } from '@/lib/votely'
import { Cartao, Selo } from './partes'

// Cor pela POSIÇÃO em cadeiras; do 5º em diante, a mesma
const COR = ['bg-r1', 'bg-r2', 'bg-r3', 'bg-r4', 'bg-r5']
const cor = (i: number) => COR[Math.min(i, COR.length - 1)]

const PADRAO_LISTA = 10

type Props = {
  r: ResultadoCargo
  tipo: 'fed' | 'est'
  onTipo: (t: 'fed' | 'est') => void
  uf: string
  ufNome: string
}

export function Deputados({ r, tipo, onTipo, uf, ufNome }: Props) {
  const [busca, setBusca] = useState('')
  const [comoAberto, setComoAberto] = useState(false)
  const rotuloEst = uf === 'DF' ? 'Distrital' : 'Estadual'
  const cargoNome =
    tipo === 'fed' ? 'Deputado Federal' : `Deputado ${rotuloEst}`

  // Posição geral por votos, a partir do ranking completo do TSE
  const posicao = useMemo(
    () => new Map((r.ranking ?? []).map(([n], i) => [n, i + 1])),
    [r.ranking],
  )
  const eleitos = r.candidatos.filter(
    (c) => c.status === 'eleito' || c.emPosicao,
  )
  const q = normalizar(busca.trim())
  const lista = q
    ? eleitos.filter((c) =>
        normalizar(
          `${c.nome} ${c.partido} ${c.partidoNome} ${c.agremiacao ?? ''} ${c.numero}`,
        ).includes(q),
      )
    : eleitos.slice(0, PADRAO_LISTA)

  const pontos = r.cadeiras.flatMap((c, i) =>
    Array.from({ length: c.cadeiras }, (_, k) => ({
      chave: `${c.nome}-${k}`,
      cor: cor(i),
    })),
  )

  return (
    <>
      <fieldset className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-card p-1.5">
        <legend className="sr-only">Tipo de deputado</legend>
        {(
          [
            ['fed', 'Federal'],
            ['est', rotuloEst],
          ] as const
        ).map(([id, rotulo]) => (
          <label
            key={id}
            className={cn(
              'relative grid min-h-12 cursor-pointer place-items-center rounded-md text-[17px] font-extrabold has-focus-visible:ring-4 has-focus-visible:ring-focus-glow',
              tipo === id
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground',
            )}
          >
            <input
              type="radio"
              name="tipo-deputado"
              value={id}
              checked={tipo === id}
              onChange={() => {
                setBusca('')
                onTipo(id)
              }}
              className="sr-only"
            />
            {rotulo}
          </label>
        ))}
      </fieldset>

      <Cartao className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-[21px] font-extrabold">
              Cadeiras por partido ou federação
            </h3>
            <p className="mt-0.5 text-[16px] text-muted-foreground">
              {r.vagas} cadeiras de {cargoNome} em {ufNome}
            </p>
          </div>
          {!r.final && (
            <span className="inline-flex h-7 items-center rounded-full border border-input px-2.5 text-[14px] font-extrabold text-muted-foreground">
              Parcial
            </span>
          )}
        </div>
        {r.cadeiras.length === 0 ? (
          <p className="text-[16px] text-muted-foreground">
            O TSE ainda não distribuiu cadeiras nesta apuração.
          </p>
        ) : (
          <>
            <div aria-hidden className="flex flex-wrap gap-1">
              {pontos.map((p) => (
                <span
                  key={p.chave}
                  className={cn('size-3.5 rounded-full', p.cor)}
                />
              ))}
            </div>
            <div className="flex flex-col">
              {r.cadeiras.map((c, i) => (
                <div
                  key={c.nome}
                  className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border py-2.5"
                >
                  <span className={cn('size-3.5 rounded-sm', cor(i))} />
                  <div className="min-w-0">
                    <div className="text-[17px] font-extrabold break-words">
                      {c.nome}
                    </div>
                    <div className="text-[14px] text-muted-foreground">
                      {c.composicao ??
                        (c.tipo === 'federacao' ? 'Federação' : 'Partido')}{' '}
                      ·{' '}
                      {c.cadeiras === 1
                        ? '1 cadeira'
                        : `${c.cadeiras} cadeiras`}
                    </div>
                  </div>
                  <div className="text-[26px] font-bold tracking-[-0.01em] tabular-nums">
                    {c.cadeiras}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Cartao>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-accent px-4 py-3.5">
        <span className="min-w-[200px] flex-1 text-[17px] font-bold text-pretty">
          Nesta eleição, o mais votado nem sempre é eleito.
        </span>
        <Button
          onClick={() => setComoAberto(true)}
          className="h-12 rounded-lg px-4 text-[17px] font-extrabold"
        >
          Como funciona?
        </Button>
      </div>

      <Cartao className="flex flex-col gap-3">
        <div>
          <h3 className="text-[21px] font-extrabold">
            {r.final ? 'Eleitos' : 'Em posição de eleição'}
          </h3>
          <p className="mt-0.5 text-[16px] text-pretty text-muted-foreground">
            {r.final
              ? 'Ordenados por número de votos.'
              : 'Pela apuração até agora. A lista só é definitiva no fim da totalização.'}
          </p>
        </div>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-[15px] left-3.5 size-[22px] text-muted-foreground"
            strokeWidth={2.4}
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou partido"
            aria-label="Buscar deputado"
            className="h-[52px] w-full rounded-lg border-2 border-input bg-field pr-3.5 pl-[46px] text-[18px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-focus-glow"
          />
        </div>
        <div className="flex flex-col">
          {lista.map((c) => (
            <div
              key={c.sq || c.numero}
              className="grid grid-cols-[34px_44px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border py-2.5"
            >
              <span className="text-[16px] font-extrabold text-muted-foreground">
                {ordinal(posicao.get(c.numero) ?? 0)}
              </span>
              <CandidatoAvatar
                candidato={c}
                className="size-11 *:text-[15px]"
              />
              <div className="min-w-0">
                <div className="text-[17px] leading-[1.25] font-extrabold break-words">
                  {c.nome}
                </div>
                <div className="text-[14px] text-muted-foreground">
                  {c.partido} · Nº {c.numero}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[16px] font-bold whitespace-nowrap tabular-nums">
                  {fmtVotos(c.votos)}
                </div>
                {c.status && (
                  <Selo
                    status={c.status}
                    className="mt-0.5 h-6 px-2 text-[13px]"
                  />
                )}
              </div>
            </div>
          ))}
          {lista.length === 0 && (
            <p className="py-5 text-center text-[17px] text-muted-foreground">
              {q
                ? `Nenhum nome encontrado para “${busca}”.`
                : 'Ainda não há candidatos em posição de eleição.'}
            </p>
          )}
        </div>
        <div className="text-[15px] text-muted-foreground">
          {q
            ? `${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'}`
            : `Mostrando os ${Math.min(PADRAO_LISTA, eleitos.length)} mais votados de ${eleitos.length || r.vagas}`}
        </div>
      </Cartao>

      <ComoFunciona
        aberto={comoAberto}
        onFechar={() => setComoAberto(false)}
        quociente={r.quociente}
        cargoNome={cargoNome}
        ufNome={ufNome}
      />
    </>
  )
}

function ComoFunciona({
  aberto,
  onFechar,
  quociente,
  cargoNome,
  ufNome,
}: {
  aberto: boolean
  onFechar: () => void
  quociente: number | null
  cargoNome: string
  ufNome: string
}) {
  const passos = [
    [
      'Somam-se os votos de cada partido',
      'Contam os votos em todos os seus candidatos e os votos só no número do partido (voto de legenda). Federações contam como um único partido.',
    ],
    [
      'Calcula-se o quociente eleitoral',
      `É o total de votos válidos dividido pelo número de cadeiras. Cada vez que um partido alcança esse número, ganha uma cadeira.${
        quociente
          ? ` Em ${ufNome}, para ${cargoNome}, o TSE informa ${fmtNum(quociente)} votos.`
          : ''
      }`,
    ],
    [
      'As cadeiras vão para os mais votados de cada partido',
      'Por isso, alguém com muitos votos pode ficar de fora se o partido não conquistou cadeiras suficientes. Quem fica logo depois vira suplente.',
    ],
    [
      'Existe um mínimo individual',
      'Para ser eleito, o candidato precisa ter pelo menos 10% do quociente eleitoral. Cadeiras que sobram são distribuídas por um cálculo de médias.',
    ],
  ]
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="w-[calc(100%-24px)] max-w-none gap-0 rounded-2xl border border-border bg-card p-0 text-[18px] text-card-foreground shadow-[0_30px_80px_rgba(0,0,0,.35)] ring-0 sm:max-w-[620px]">
        <div className="px-5 pt-5 pr-[68px] pb-2">
          <DialogTitle className="text-[23px] leading-[1.25] font-extrabold">
            Como são eleitos os deputados?
          </DialogTitle>
          <DialogDescription className="mt-1 text-[16px] text-muted-foreground">
            A eleição é proporcional: primeiro se dividem as cadeiras entre os
            partidos, depois entre as pessoas.
          </DialogDescription>
        </div>
        <ol className="flex flex-col gap-3.5 px-5 pt-2 pb-1">
          {passos.map(([titulo, texto], i) => (
            <li
              key={titulo}
              className="grid grid-cols-[32px_minmax(0,1fr)] gap-3"
            >
              <span className="grid size-8 place-items-center rounded-full bg-accent text-[16px] font-extrabold text-accent-foreground">
                {i + 1}
              </span>
              <div>
                <div className="text-[18px] font-extrabold">{titulo}</div>
                <div className="text-[16px] text-pretty text-muted-foreground">
                  {texto}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="px-5 pt-4 pb-5">
          <DialogClose
            render={
              <Button className="h-[54px] w-full rounded-lg text-[18px] font-extrabold" />
            }
          >
            Entendi
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
