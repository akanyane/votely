import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'
import { historicoQuery } from '@/lib/live/consultas'
import { fmtHora, fmtPct } from '@/lib/live/formato'
import type { ResultadoCargo } from '@/lib/live/tipos'
import type { UF } from '@/lib/votely'
import type { Snapshot } from '@/server/historico'
import { Cartao } from './partes'

/** Mais que 3 linhas que se cruzam deixam de ser distinguíveis (dataviz) */
const SERIES = 3
const COR = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)']
const ALTURA = 240
const M = { topo: 12, dir: 16, base: 30, esq: 48 }

/**
 * O TSE não guarda o parcial; o Votely grava um snapshot por versão do
 * arquivo. No simulado, os testes de dias diferentes caem na mesma chave:
 * quando o % apurado volta para trás, começou uma nova rodada; fica a última.
 */
export function ultimaRodada(snaps: Snapshot[]): Snapshot[] {
  const ordenados = [...snaps].sort((a, b) => Date.parse(a.t) - Date.parse(b.t))
  let inicio = 0
  for (let i = 1; i < ordenados.length; i++)
    if (ordenados[i].p < ordenados[i - 1].p) inicio = i
  return ordenados.slice(inicio)
}

/** Largura do elemento; ref de callback porque ele só aparece com os dados */
function useLargura<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [largura, setLargura] = useState(0)
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, largura] as const
}

/** Marcas "redondas" do eixo Y para o intervalo [min, max] */
function marcasY(min: number, max: number) {
  const passos = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25]
  const passo = passos.find((p) => (max - min) / p <= 4) ?? 25
  const ini = Math.floor(min / passo) * passo
  const fim = Math.ceil(max / passo) * passo
  const marcas: number[] = []
  for (let v = ini; v <= fim + 1e-9; v += passo)
    marcas.push(Number(v.toFixed(2)))
  return marcas
}

type Props = {
  r: ResultadoCargo
  uf: UF
}

export function GraficoEvolucao({ r, uf }: Props) {
  const historico = useQuery(historicoQuery(r.cargo, uf))
  const [caixa, largura] = useLargura<HTMLDivElement>()
  const [foco, setFoco] = useState<number | null>(null)
  const idTabela = useId()

  const snaps = ultimaRodada(historico.data ?? [])
  if (snaps.length < 2) return null

  // Séries: os 3 primeiros no resultado atual. A cor segue o candidato (ordem
  // pelo número de urna), não a posição: uma virada não troca as cores.
  const nomes = new Map(r.candidatos.map((c) => [c.sq, c]))
  const series = r.candidatos
    .slice(0, SERIES)
    .map((c) => c.sq)
    .sort((a, b) =>
      (nomes.get(a)?.numero ?? '').localeCompare(nomes.get(b)?.numero ?? ''),
    )
    .map((sq, i) => ({ sq, nome: nomes.get(sq)?.nome ?? sq, cor: COR[i] }))

  const valor = (s: Snapshot, sq: string) =>
    s.c.find((c) => c[0] === sq)?.[2] ?? 0

  const todos = snaps.flatMap((s) => series.map((x) => valor(s, x.sq)))
  const marcas = marcasY(Math.min(...todos), Math.max(...todos))
  const [y0, y1] = [marcas[0], marcas[marcas.length - 1]]

  const w = Math.max(largura, 280)
  const plotW = w - M.esq - M.dir
  const plotH = ALTURA - M.topo - M.base
  const px = (p: number) => M.esq + (p / 100) * plotW
  const py = (v: number) => M.topo + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH

  const ultimo = snaps.length - 1
  const i = foco ?? ultimo
  const atual = snaps[i]

  const indicePorX = (x: number) => {
    let melhor = 0
    for (let k = 1; k < snaps.length; k++)
      if (Math.abs(px(snaps[k].p) - x) < Math.abs(px(snaps[melhor].p) - x))
        melhor = k
    return melhor
  }

  const nomeCargo = r.cargo === 'pres' ? 'presidente' : 'governador'

  return (
    <Cartao className="flex flex-col gap-3">
      <div>
        <h3 className="text-[21px] font-extrabold">Evolução da apuração</h3>
        <p className="mt-0.5 text-[16px] text-muted-foreground">
          % dos votos válidos dos 3 primeiros para {nomeCargo}, conforme as
          seções são apuradas.
        </p>
      </div>

      {/* Legenda com o valor do ponto em foco (o último, sem interação) */}
      <ul className="flex flex-col gap-1.5 text-[16px]">
        {series
          .map((x) => ({ ...x, v: valor(atual, x.sq) }))
          .sort((a, b) => b.v - a.v)
          .map((x) => (
            <li
              key={x.sq}
              className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2"
            >
              <span
                className="h-[3px] w-3.5 rounded-full"
                style={{ background: x.cor }}
              />
              <span className="truncate font-bold">{x.nome}</span>
              <span className="font-bold tabular-nums">{fmtPct(x.v)}</span>
            </li>
          ))}
      </ul>
      <p className="-mt-1 text-[14px] text-muted-foreground" aria-live="polite">
        Com {fmtPct(atual.p)} das seções apuradas · {fmtHora(atual.t)}
        {foco === null ? ' (mais recente)' : ''}
      </p>

      <div
        ref={caixa}
        role="slider"
        aria-label={`Evolução da apuração de ${nomeCargo}: use as setas para percorrer os pontos`}
        aria-valuemin={0}
        aria-valuemax={ultimo}
        aria-valuenow={i}
        aria-valuetext={`${fmtPct(atual.p)} apurado: ${[...series]
          .sort((a, b) => valor(atual, b.sq) - valor(atual, a.sq))
          .map((x) => `${x.nome} ${fmtPct(valor(atual, x.sq))}`)
          .join(', ')}`}
        tabIndex={0}
        className="touch-pan-y rounded-md outline-offset-2 focus-visible:ring-4 focus-visible:ring-focus-glow"
        onPointerMove={(e) => {
          const x = e.clientX - e.currentTarget.getBoundingClientRect().left
          setFoco(indicePorX(x))
        }}
        onPointerLeave={() => setFoco(null)}
        onBlur={() => setFoco(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setFoco(Math.max(0, i - 1))
          else if (e.key === 'ArrowRight') setFoco(Math.min(ultimo, i + 1))
          else if (e.key === 'Home') setFoco(0)
          else if (e.key === 'End') setFoco(ultimo)
          else return
          e.preventDefault()
        }}
      >
        <svg width={w} height={ALTURA} aria-hidden className="block">
          {/* Grade e eixos: linhas finas, sólidas, discretas */}
          {marcas.map((v) => (
            <g key={v}>
              <line
                x1={M.esq}
                x2={w - M.dir}
                y1={py(v)}
                y2={py(v)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={M.esq - 8}
                y={py(v)}
                dy="0.35em"
                textAnchor="end"
                className="fill-muted-foreground text-[13px] tabular-nums"
              >
                {fmtPct(v)}
              </text>
            </g>
          ))}
          {(plotW < 360 ? [0, 50, 100] : [0, 25, 50, 75, 100]).map((p) => (
            <text
              key={p}
              x={px(p)}
              y={ALTURA - 8}
              textAnchor={p === 0 ? 'start' : p === 100 ? 'end' : 'middle'}
              className="fill-muted-foreground text-[13px] tabular-nums"
            >
              {p}%
            </text>
          ))}

          {/* Mira vertical no ponto em foco */}
          {foco !== null && (
            <line
              x1={px(atual.p)}
              x2={px(atual.p)}
              y1={M.topo}
              y2={M.topo + plotH}
              className="stroke-muted-foreground"
              strokeWidth={1}
            />
          )}

          {series.map((x) => (
            <g key={x.sq}>
              <polyline
                points={snaps
                  .map((s) => `${px(s.p)},${py(valor(s, x.sq))}`)
                  .join(' ')}
                fill="none"
                stroke={x.cor}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={px(atual.p)}
                cy={py(valor(atual, x.sq))}
                r={4.5}
                fill={x.cor}
                className="stroke-card"
                strokeWidth={2}
              />
            </g>
          ))}
        </svg>
      </div>

      <details className="text-[15px]">
        <summary className="cursor-pointer font-bold">Ver em tabela</summary>
        <div className="mt-2 max-h-[280px] overflow-auto">
          <table
            aria-describedby={idTabela}
            className="w-full text-left tabular-nums"
          >
            <caption id={idTabela} className="sr-only">
              Evolução do percentual dos votos válidos por % de seções apuradas
            </caption>
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 font-bold">Apurado</th>
                {series.map((x) => (
                  <th key={x.sq} className="py-1 pr-3 font-bold">
                    {x.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snaps.map((s) => (
                <tr key={s.t} className="border-t border-border">
                  <td className="py-1 pr-3">
                    {fmtPct(s.p)} · {fmtHora(s.t)}
                  </td>
                  {series.map((x) => (
                    <td key={x.sq} className="py-1 pr-3">
                      {fmtPct(valor(s, x.sq))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Cartao>
  )
}
