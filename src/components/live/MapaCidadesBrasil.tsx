import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { malhaCidadesQuery, mapaCidadesQuery } from '@/lib/live/consultas'
import { corPartido } from '@/lib/live/coresPartidos'
import { fmtHora, fmtNum, fmtPct } from '@/lib/live/formato'
import type { MalhaCidades, MapaCidades } from '@/lib/live/tipos'
import { nomeUf } from '@/lib/votely'
import { Carregando } from './Carregando'
import { Cartao } from './partes'

/** Mapa do Brasil com todas as cidades, pintadas pelo partido do 1º colocado */
export function MapaCidadesBrasil() {
  const malha = useQuery(malhaCidadesQuery())
  const mapa = useQuery(mapaCidadesQuery())
  const [escolhida, setEscolhida] = useState<string | null>(null)

  const d = mapa.data?.estado === 'ok' ? mapa.data.dados : null

  if ((!malha.data && malha.isPending) || (!mapa.data && mapa.isPending)) {
    return <Carregando />
  }
  if (!malha.data || mapa.data?.estado === 'erro') {
    return (
      <Cartao role="alert" className="text-[17px]">
        Não foi possível carregar o mapa agora. Tentamos de novo a cada minuto.
      </Cartao>
    )
  }
  if (!d) {
    return (
      <Cartao className="text-[17px] text-muted-foreground">
        O mapa por cidade aparece assim que o primeiro retrato da apuração ficar
        pronto.
      </Cartao>
    )
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Cartao className="p-2 sm:p-3">
        <Desenho
          malha={malha.data}
          d={d}
          escolhida={escolhida}
          onEscolher={setEscolhida}
        />
      </Cartao>
      <div className="flex flex-col gap-4">
        <Resumo d={d} />
        <Cidade malha={malha.data} d={d} cd={escolhida} />
        <Legenda d={d} />
      </div>
    </div>
  )
}

function Desenho({
  malha,
  d,
  escolhida,
  onEscolher,
}: {
  malha: MalhaCidades
  d: MapaCidades
  escolhida: string | null
  onEscolher: (cd: string) => void
}) {
  // 5.570 caminhos: só redesenha quando o retrato muda, não a cada toque
  const cidades = useMemo(
    () =>
      malha.cidades.map(([cd, , , caminho]) => {
        const c = d.cidades[cd]
        const venc = c && c[0] >= 0 ? d.candidatos[c[0]] : null
        return (
          <path
            key={cd}
            d={caminho}
            data-cd={cd}
            fill={venc ? corPartido(venc.partido, c[0]) : 'var(--track)'}
          />
        )
      }),
    [malha, d],
  )

  const escolher = (e: React.SyntheticEvent) => {
    const cd = (e.target as Element).getAttribute('data-cd')
    if (cd) onEscolher(cd)
  }

  return (
    <svg
      viewBox={`0 0 ${malha.largura} ${malha.altura}`}
      role="img"
      aria-label="Mapa do Brasil com o partido do candidato a presidente mais votado em cada cidade"
      className="block h-auto w-full"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a lista de cidades acessível fica ao lado */}
      <g
        onClick={escolher}
        onPointerMove={(e) => e.pointerType === 'mouse' && escolher(e)}
        className="cursor-pointer stroke-card"
        strokeWidth={0.15}
      >
        {cidades}
      </g>
      <g
        fill="none"
        className="pointer-events-none stroke-foreground"
        strokeWidth={1.2}
        strokeLinejoin="round"
      >
        {malha.estados.map(([uf, caminho]) => (
          <path key={uf} d={caminho} />
        ))}
      </g>
      {escolhida && (
        <path
          d={malha.cidades.find(([c]) => c === escolhida)?.[3]}
          fill="none"
          className="pointer-events-none stroke-foreground"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

function Resumo({ d }: { d: MapaCidades }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <div className="text-[30px] leading-none font-extrabold tabular-nums">
        {fmtPct(d.pctBrasil)}
      </div>
      <div className="text-[16px] text-muted-foreground">
        das seções apuradas no Brasil · totalização das{' '}
        {fmtHora(d.totalizadoEm)}
      </div>
      <div className="text-[14px] text-muted-foreground">
        Mapa por cidade montado às {fmtHora(d.geradoEm)}; atualiza a cada ~10
        minutos.
        {d.simulado && ' Dados do SIMULADO do TSE (candidatos fictícios).'}
      </div>
    </Cartao>
  )
}

function Cidade({
  malha,
  d,
  cd,
}: {
  malha: MalhaCidades
  d: MapaCidades
  cd: string | null
}) {
  if (!cd) {
    return (
      <Cartao className="text-[16px] text-muted-foreground">
        Toque numa cidade para ver o resultado dela.
      </Cartao>
    )
  }
  const info = malha.cidades.find(([c]) => c === cd)
  const c = d.cidades[cd]
  const linha = (i: number, pct: number) => {
    const cand = d.candidatos[i]
    if (!cand) return null
    return (
      <div className="flex items-center gap-2.5 border-t border-border py-2">
        <span
          className="size-3.5 flex-none rounded-sm"
          style={{ background: corPartido(cand.partido, i) }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-extrabold break-words">
            {cand.nome}
          </div>
          <div className="text-[14px] text-muted-foreground">
            {cand.partido}
          </div>
        </div>
        <strong className="text-[19px] tabular-nums">{fmtPct(pct)}</strong>
      </div>
    )
  }
  return (
    <Cartao className="flex flex-col gap-1">
      <h2 className="text-[21px] font-extrabold">
        {info?.[1] ?? cd}{' '}
        <span className="text-[16px] font-bold text-muted-foreground">
          · {info ? nomeUf(info[2]) : ''}
        </span>
      </h2>
      {!c || c[0] < 0 ? (
        <p className="text-[16px] text-muted-foreground">
          Ainda sem votos apurados nesta cidade.
        </p>
      ) : (
        <>
          <p className="text-[15px] text-muted-foreground">
            {fmtPct(c[4])} das seções apuradas · % dos votos válidos
          </p>
          {linha(c[0], c[1])}
          {c[2] >= 0 && linha(c[2], c[3])}
        </>
      )}
    </Cartao>
  )
}

function Legenda({ d }: { d: MapaCidades }) {
  const vitorias = new Map<number, number>()
  let semDados = 0
  for (const c of Object.values(d.cidades)) {
    if (c[0] < 0) semDados++
    else vitorias.set(c[0], (vitorias.get(c[0]) ?? 0) + 1)
  }
  const itens = [...vitorias.entries()].sort((a, b) => b[1] - a[1])
  return (
    <Cartao className="flex flex-col">
      <h2 className="mb-1 text-[19px] font-extrabold">Cidades vencidas</h2>
      {itens.map(([i, n]) => {
        const cand = d.candidatos[i]
        return (
          <div
            key={cand.sq}
            className="flex items-center gap-2.5 border-t border-border py-2"
          >
            <span
              className="size-3.5 flex-none rounded-sm"
              style={{ background: corPartido(cand.partido, i) }}
            />
            <div className="min-w-0 flex-1 text-[16px]">
              <strong className="font-extrabold">{cand.nome}</strong>{' '}
              <span className="text-muted-foreground">{cand.partido}</span>
            </div>
            <strong className="tabular-nums">{fmtNum(n)}</strong>
          </div>
        )
      })}
      {semDados > 0 && (
        <div className="flex items-center gap-2.5 border-t border-border py-2 text-[16px] text-muted-foreground">
          <span className="size-3.5 flex-none rounded-sm bg-track" />
          <span className="flex-1">Sem votos apurados</span>
          <strong className="tabular-nums">{fmtNum(semDados)}</strong>
        </div>
      )}
    </Cartao>
  )
}
