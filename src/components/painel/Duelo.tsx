import { CandidatoAvatar } from '@/components/votely/CandidatoAvatar'
import type { CandidatoLive, ResultadoCargo } from '@/lib/live/tipos'
import {
  type Duelo as DueloT,
  type Lado,
  nomeCurto,
  type PontoSerie,
  type UfPainel,
} from '@/lib/painel/dados'
import { cn } from '@/lib/utils'
import { Animado, Celula, mi, num, pct, pp1 } from './partes'

const ESTILO = {
  a: {
    anel: 'conic-gradient(from 200deg,#3B82F6,#06B6D4,#3B82F6)',
    brilho: '0 0 36px rgba(59,130,246,0.35)',
    selo: 'bg-[rgba(59,130,246,0.15)] text-[#93C5FD]',
    lidera: 'bg-[#3B82F6] text-white shadow-[0_0_14px_rgba(59,130,246,0.6)]',
    numero:
      'bg-[linear-gradient(160deg,#BFDBFE,#3B82F6_45%,#06B6D4)] drop-shadow-[0_0_24px_rgba(59,130,246,0.25)]',
    linha: '#22D3EE',
  },
  b: {
    anel: 'conic-gradient(from 20deg,#10B981,#6EE7B7,#10B981)',
    brilho: '0 0 36px rgba(16,185,129,0.3)',
    selo: 'bg-[rgba(16,185,129,0.15)] text-[#6EE7B7]',
    lidera:
      'bg-[#10B981] text-[#04140E] shadow-[0_0_14px_rgba(16,185,129,0.6)]',
    numero:
      'bg-[linear-gradient(160deg,#D1FAE5,#34D399_45%,#10B981)] drop-shadow-[0_0_24px_rgba(16,185,129,0.22)]',
    linha: '#34D399',
  },
}

/** 02 · Duelo presidencial */
export function Duelo({
  r,
  d,
  ufs,
  pontos,
}: {
  r: ResultadoCargo
  d: DueloT
  ufs: UfPainel[]
  pontos: PontoSerie[]
}) {
  const lider: Lado = d.a.votos >= d.b.votos ? 'a' : 'b'
  const diff = Math.abs(d.a.pct - d.b.pct)
  const eleito = r.candidatos.find((c) => c.status === 'eleito')
  const turno2 = r.turno === 2
  const maior = Math.max(d.a.pct, d.b.pct)

  const selo = r.final
    ? 'RESULTADO FINAL'
    : turno2
      ? '2º TURNO · PARCIAL'
      : maior > 50
        ? 'TENDÊNCIA: DEFINIÇÃO NO 1º TURNO'
        : 'TENDÊNCIA: 2º TURNO'

  const vaoAoSegundo = r.candidatos.filter((c) => c.status === 'segundo_turno')
  const frase = eleito
    ? `Resultado definido pelo TSE: ${nomeCurto(eleito)} vence a eleição.`
    : vaoAoSegundo.length === 2
      ? `Nenhum candidato superou 50% dos votos válidos: ${nomeCurto(vaoAoSegundo[0])} e ${nomeCurto(vaoAoSegundo[1])} disputam o 2º turno.`
      : turno2
        ? `${nomeCurto(d[lider])} lidera por ${pct(diff).replace('%', '')} p.p. Faltam ${pct(100 - r.secoes.pct)} das urnas.`
        : maior > 50
          ? `${nomeCurto(d[lider])} supera 50% dos votos válidos.`
          : `Nenhum candidato supera 50% dos votos válidos. Faltam ${pct(50 - maior).replace('%', '')} p.p. para o líder.`

  return (
    <section
      className="relative rounded-[24px] p-px"
      style={{
        background:
          'linear-gradient(90deg, rgba(59,130,246,0.55), rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.08) 65%, rgba(16,185,129,0.55))',
      }}
    >
      <div
        className="relative flex flex-col gap-7 overflow-hidden rounded-[23px] p-[clamp(20px,3vw,34px)]"
        style={{
          background:
            'linear-gradient(90deg, rgba(59,130,246,0.08), #0C0E16 35%, #0C0E16 65%, rgba(16,185,129,0.08)), #0C0E16',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="painel-rotulo">02 / DUELO PRESIDENCIAL</span>
          <span className="f-mono rounded-full border border-white/[0.12] px-2.5 py-1 text-[11px] tracking-[0.08em] whitespace-nowrap text-[#CBD5E1]">
            {selo}
          </span>
        </div>

        <div className="flex flex-wrap items-stretch justify-between gap-7">
          {(['a', 'b'] as const).map((lado) => (
            <Candidato
              key={lado}
              lado={lado}
              c={d[lado]}
              lidera={lider === lado}
              ufs={ufs}
              pontos={pontos}
              ordem={lado === 'a' ? 1 : 3}
            />
          ))}
          <div className="order-2 flex flex-[0_1_auto] flex-col items-center justify-center gap-2.5 px-2 max-[860px]:w-full max-[860px]:flex-row">
            <div className="h-10 w-px bg-[linear-gradient(transparent,rgba(255,255,255,0.2))] max-[860px]:hidden" />
            <div className="f-display grid size-16 place-items-center rounded-full border border-white/[0.14] bg-white/[0.03] text-[18px] font-light tracking-[0.18em] text-[#CBD5E1] [font-stretch:70%]">
              VS
            </div>
            <span className="f-mono text-[12px] whitespace-nowrap">
              {pct(diff).replace('%', '')} p.p.
            </span>
            <span className="f-mono text-[11px] whitespace-nowrap text-[#8B90A3]">
              {mi(Math.abs(d.a.votos - d.b.votos))} votos
            </span>
            <div className="h-10 w-px bg-[linear-gradient(rgba(255,255,255,0.2),transparent)] max-[860px]:hidden" />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div
            role="img"
            aria-label={`${nomeCurto(d.a)} ${pct(d.a.pct)}, ${nomeCurto(d.b)} ${pct(d.b.pct)}`}
            className="relative h-[22px] rounded-full border border-white/[0.06] bg-white/[0.04]"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-l-full shadow-[0_0_22px_rgba(6,182,212,0.5)] transition-[width] duration-1000 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{
                width: `${d.a.pct}%`,
                background:
                  'linear-gradient(90deg,#1D4ED8,#3B82F6 60%,#06B6D4)',
              }}
            >
              <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.25),transparent_55%)]" />
            </div>
            <div
              className="absolute inset-y-0 right-0 rounded-r-full shadow-[0_0_22px_rgba(16,185,129,0.45)] transition-[width] duration-1000 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{
                width: `${d.b.pct}%`,
                background:
                  'linear-gradient(270deg,#047857,#10B981 60%,#34D399)',
              }}
            >
              <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.25),transparent_55%)]" />
            </div>
            <div className="absolute inset-y-0.5 left-1/4 w-px bg-white/[0.18]" />
            <div className="absolute inset-y-0.5 left-3/4 w-px bg-white/[0.18]" />
            <div className="absolute -inset-y-2.5 left-1/2 -ml-px w-0.5 rounded-sm bg-[#F4F5F8] shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <span className="f-mono text-[12px] text-[#93C5FD]">
              {pct(d.a.pct)}
            </span>
            <span className="f-mono rounded-full bg-[#F4F5F8] px-2.5 py-[3px] text-[11px] tracking-[0.06em] whitespace-nowrap text-[#090A0F]">
              50% + 1 VOTO
            </span>
            <span className="f-mono text-right text-[12px] text-[#6EE7B7]">
              {pct(d.b.pct)}
            </span>
          </div>
          <p className="text-center text-[13px] text-pretty text-[#8B90A3]">
            {frase}
          </p>
        </div>
      </div>
    </section>
  )
}

function Candidato({
  lado,
  c,
  lidera,
  ufs,
  pontos,
  ordem,
}: {
  lado: Lado
  c: CandidatoLive
  lidera: boolean
  ufs: UfPainel[]
  pontos: PontoSerie[]
  ordem: number
}) {
  const e = ESTILO[lado]
  const dir = lado === 'b'
  const outro: Lado = lado === 'a' ? 'b' : 'a'

  // Variação desde a totalização anterior do TSE
  const [ant, ult] = pontos.slice(-2)
  const delta = ant && ult ? ult[lado] - ant[lado] : null

  const meus = ufs.filter((u) => u.lider === lado)
  const melhor = meus.reduce<UfPainel | null>(
    (m, u) =>
      !m ||
      u[`${lado}Pct`] - u[`${outro}Pct`] > m[`${lado}Pct`] - m[`${outro}Pct`]
        ? u
        : m,
    null,
  )

  const celulas = [
    { rotulo: 'Votos', valor: num(c.votos) },
    {
      rotulo: 'Estados liderados',
      valor: ufs.length ? `${meus.length} de 27` : '—',
    },
    {
      rotulo: 'Maior vantagem',
      valor: melhor
        ? `${melhor.uf} ${pp1(melhor[`${lado}Pct`] - melhor[`${outro}Pct`])}`
        : '—',
    },
  ]

  return (
    <div
      className="flex flex-[1_1_320px] flex-col gap-[18px]"
      style={{ order: ordem }}
    >
      <div
        className={cn(
          'flex items-center gap-[18px]',
          dir && 'flex-row-reverse text-right',
        )}
      >
        <div
          className="size-24 flex-none rounded-full p-0.5"
          style={{ background: e.anel, boxShadow: e.brilho }}
        >
          <div className="size-full overflow-hidden rounded-full border-[3px] border-[#0C0E16] bg-[#11131F]">
            <CandidatoAvatar
              candidato={c}
              className="size-full *:text-[24px]"
            />
          </div>
        </div>
        <div
          className={cn('flex min-w-0 flex-col gap-1.5', dir && 'items-end')}
        >
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              dir && 'flex-row-reverse',
            )}
          >
            <span
              className={cn(
                'f-mono rounded-md px-2 py-[3px] text-[11px] tracking-[0.08em]',
                e.selo,
              )}
            >
              {c.partido} · {c.numero}
            </span>
            {lidera && (
              <span
                className={cn(
                  'f-mono rounded-md px-2 py-[3px] text-[11px] tracking-[0.08em]',
                  e.lidera,
                )}
              >
                {c.status === 'eleito' ? 'ELEITO' : 'LIDERANDO'}
              </span>
            )}
          </div>
          <div className="f-display text-[24px] leading-[1.1] font-semibold tracking-[-0.01em] [font-stretch:85%]">
            {nomeCurto(c)}
          </div>
          <span className="text-[13px] text-[#8B90A3]">{c.partidoNome}</span>
        </div>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-end gap-4',
          dir && 'flex-row-reverse',
        )}
      >
        <div
          className={cn(
            'f-display bg-clip-text text-[clamp(64px,8vw,112px)] leading-[0.85] font-extrabold tracking-[-0.035em] text-transparent tabular-nums [font-stretch:62%]',
            e.numero,
          )}
        >
          <Animado valor={c.pct} formato={(n) => pct(n)} />
        </div>
        <div className={cn('flex flex-col gap-1.5 pb-1.5', dir && 'items-end')}>
          <span
            className="f-mono text-[12px]"
            style={{
              color:
                delta === null ? '#8B90A3' : delta >= 0 ? '#6EE7B7' : '#FCA5A5',
            }}
          >
            {delta === null
              ? 'aguardando'
              : `${delta >= 0 ? '▲ +' : '▼ '}${pct(delta).replace('%', '')} p.p.`}
          </span>
          <Faisca valores={pontos.map((p) => p[lado])} cor={e.linha} />
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/[0.07]',
          dir && 'text-right',
        )}
      >
        {(dir ? [...celulas].reverse() : celulas).map((x) => (
          <Celula key={x.rotulo} rotulo={x.rotulo} valor={x.valor} />
        ))}
      </div>
    </div>
  )
}

function Faisca({ valores, cor }: { valores: number[]; cor: string }) {
  if (valores.length < 2) return <svg aria-hidden width="120" height="32" />
  const mn = Math.min(...valores)
  const r = Math.max(...valores) - mn || 1
  const d = `M${valores
    .map(
      (y, i) =>
        `${((i / (valores.length - 1)) * 100).toFixed(1)} ${(28 - ((y - mn) / r) * 26).toFixed(1)}`,
    )
    .join(' L')}`
  return (
    <svg
      aria-hidden
      width="120"
      height="32"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <path
        d={d}
        fill="none"
        stroke={cor}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
