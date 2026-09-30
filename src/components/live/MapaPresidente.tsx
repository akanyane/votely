import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { malhaQuery } from '@/lib/live/consultas'
import { fmtPct, ordinal } from '@/lib/live/formato'
import { nomeUf, type UF } from '@/lib/votely'
import type { UfNoMapa } from '@/server/live'
import { Barra, Cartao } from './partes'

/** [coluna, linha] de cada UF na grade 7×7 (posição aproximada no mapa) */
const GRADE: Record<UF, [number, number]> = {
  RR: [3, 1],
  AP: [5, 1],
  AM: [2, 2],
  PA: [4, 2],
  MA: [5, 2],
  CE: [6, 2],
  RN: [7, 2],
  AC: [1, 3],
  RO: [2, 3],
  MT: [3, 3],
  TO: [4, 3],
  PI: [5, 3],
  PE: [6, 3],
  PB: [7, 3],
  MS: [3, 4],
  GO: [4, 4],
  DF: [5, 4],
  BA: [6, 4],
  AL: [7, 4],
  PR: [3, 5],
  SP: [4, 5],
  MG: [5, 5],
  ES: [6, 5],
  SE: [7, 5],
  SC: [3, 6],
  RJ: [5, 6],
  RS: [3, 7],
}

// Cor pela POSIÇÃO NACIONAL do líder no estado; do 3º em diante, a mesma cor
const COR = [
  'bg-r1 text-r1-foreground',
  'bg-r2 text-r2-foreground',
  'bg-r3 text-r3-foreground',
]

// As mesmas cores, para o SVG (fill não usa as classes bg-*)
const PREENCHIMENTO = ['var(--r1)', 'var(--r2)', 'var(--r3)']
const TEXTO = ['var(--r1-fg)', 'var(--r2-fg)', 'var(--r3-fg)']
/** Estados pequenos demais para a sigla caber dentro do contorno */
const SEM_SIGLA = new Set<UF>(['DF', 'SE', 'AL', 'PB', 'RN'])

type Props = {
  ufs: UfNoMapa[]
  /** sq na ordem nacional (para colorir pela posição nacional) */
  ordemNacional: { sq: string; nome: string }[]
  selecionada: UF
  onSelecionar: (uf: UF) => void
}

export function MapaPresidente({
  ufs,
  ordemNacional,
  selecionada,
  onSelecionar,
}: Props) {
  const posNacional = (sq: string) => {
    const i = ordemNacional.findIndex((c) => c.sq === sq)
    return i < 0 ? 2 : Math.min(i, 2)
  }
  const porUf = new Map(ufs.map((u) => [u.uf, u]))
  const contagem = [0, 0, 0]
  for (const u of ufs)
    if (u.top[0] && u.top[0].pct > 0) contagem[posNacional(u.top[0].sq)]++

  const sel = porUf.get(selecionada)
  const malha = useQuery(malhaQuery('BR'))

  return (
    <Cartao className="flex flex-col gap-3.5">
      <div>
        <h3 className="text-[21px] font-extrabold">
          Mais votado em cada estado
        </h3>
        <p className="mt-0.5 text-[16px] text-muted-foreground">
          Toque em um estado para ver o resultado dele.
        </p>
      </div>
      {malha.data ? (
        <svg
          viewBox={`0 0 ${malha.data.largura} ${malha.data.altura}`}
          className="mx-auto max-h-[460px] w-full"
          aria-label="Mapa do Brasil com o mais votado em cada estado"
        >
          {malha.data.municipios.map(([sigla, nome, , d]) => {
            const uf = sigla as UF
            const lider = porUf.get(uf)?.top[0]
            const semVotos = !lider || lider.pct === 0
            const pos = semVotos ? -1 : posNacional(lider.sq)
            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG não tem <button>; o contorno do estado é o alvo
              <g
                key={uf}
                role="button"
                tabIndex={0}
                aria-pressed={uf === selecionada}
                aria-label={`${nome}: ${semVotos ? 'sem votos apurados' : `mais votado ${lider.nome}`}`}
                onClick={() => onSelecionar(uf)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelecionar(uf)
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>path]:stroke-foreground [&:focus-visible>path]:stroke-[3px] hover:opacity-85"
              >
                <title>{nome}</title>
                <path
                  d={d}
                  fill={pos < 0 ? 'var(--track)' : PREENCHIMENTO[pos]}
                  className="stroke-card"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}
          {/* Siglas numa camada própria: um estado desenhado depois não as cobre */}
          {malha.data.municipios.map(([sigla, , , , rotulo]) => {
            const uf = sigla as UF
            if (!rotulo || SEM_SIGLA.has(uf)) return null
            const lider = porUf.get(uf)?.top[0]
            const pos = !lider || lider.pct === 0 ? -1 : posNacional(lider.sq)
            return (
              <text
                key={uf}
                x={rotulo[0]}
                y={rotulo[1]}
                dy="0.35em"
                textAnchor="middle"
                aria-hidden
                fill={pos < 0 ? 'var(--muted-foreground)' : TEXTO[pos]}
                className="pointer-events-none text-[30px] font-extrabold"
              >
                {uf}
              </text>
            )
          })}
          {/* Contorno do estado escolhido por cima dos vizinhos */}
          {malha.data.municipios
            .filter(([sigla]) => sigla === selecionada)
            .map(([sigla, , , d]) => (
              <path
                key={sigla}
                d={d}
                fill="none"
                className="pointer-events-none stroke-foreground"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </svg>
      ) : malha.isError ? (
        // Sem o desenho do mapa: a grade antiga, que não depende de arquivo
        <div className="grid grid-cols-[repeat(7,40px)] auto-rows-[40px] justify-center gap-1 lg:grid-cols-[repeat(7,52px)] lg:auto-rows-[52px]">
          {(Object.keys(GRADE) as UF[]).map((uf) => {
            const d = porUf.get(uf)
            const lider = d?.top[0]
            const semVotos = !lider || lider.pct === 0
            const [col, lin] = GRADE[uf]
            return (
              <button
                key={uf}
                type="button"
                onClick={() => onSelecionar(uf)}
                aria-pressed={uf === selecionada}
                aria-label={`${nomeUf(uf)}: ${semVotos ? 'sem votos apurados' : `mais votado ${lider.nome}`}`}
                style={{ gridColumn: col, gridRow: lin }}
                className={cn(
                  'rounded-md text-[14px] font-extrabold outline-offset-2 focus-visible:ring-4 focus-visible:ring-focus-glow',
                  semVotos
                    ? 'bg-track text-muted-foreground'
                    : COR[posNacional(lider.sq)],
                  uf === selecionada && 'outline-3 outline-foreground',
                )}
              >
                {uf}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="aspect-square max-h-[460px] w-full" />
      )}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[15px]">
        {ordemNacional.slice(0, 3).map((c, i) => (
          <span key={c.sq} className="flex items-center gap-1.5">
            <span className={cn('size-3.5 rounded-sm', COR[i].split(' ')[0])} />
            {i === 2 ? `${c.nome} e demais` : c.nome} · {contagem[i]}{' '}
            {contagem[i] === 1 ? 'estado' : 'estados'}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
        <div className="text-[18px] font-extrabold">
          Resultado em {nomeUf(selecionada)}
        </div>
        {sel?.top.map((c, i) => (
          <div
            key={c.sq}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1"
          >
            <span className="text-[17px] font-bold">
              {ordinal(i + 1)} {c.nome}{' '}
              <span className="font-normal text-muted-foreground">
                · {c.partido}
              </span>
            </span>
            <span className="text-[20px] font-bold tracking-[-0.01em] tabular-nums">
              {fmtPct(c.pct)}
            </span>
            <Barra
              valor={c.pct}
              rotulo={`${c.nome} em ${nomeUf(selecionada)}`}
              className="col-span-full"
            />
          </div>
        ))}
        <p className="text-[14px] text-muted-foreground">
          {sel
            ? `${fmtPct(sel.pctSecoes)} das seções apuradas em ${nomeUf(selecionada)}.`
            : 'Sem dados deste estado ainda.'}
        </p>
      </div>
    </Cartao>
  )
}
