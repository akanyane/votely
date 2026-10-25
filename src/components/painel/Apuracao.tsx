import type { ResultadoCargo } from '@/lib/live/tipos'
import type { PontoSerie } from '@/lib/painel/dados'
import { Animado, Cartao, mi, num, Placas, pct } from './partes'

/** 01 · Votos apurados: contador, barra de seções e brancos/nulos/abstenção */
export function Apuracao({
  r,
  pontos,
}: {
  r: ResultadoCargo
  pontos: PontoSerie[]
}) {
  const { validos, brancos, nulos, abstencao } = r.totais
  const comparecimento = validos + brancos.votos + nulos.votos
  const fracao = r.secoes.pct / 100

  // Ritmo entre as duas últimas totalizações do TSE
  const [ant, ult] = pontos.slice(-2)
  const segundos = ant && ult ? (ult.t - ant.t) / 1000 : 0
  const ritmo = segundos > 0 ? (ult.votos - ant.votos) / segundos : 0

  const pctValidos = comparecimento ? (validos / comparecimento) * 100 : 0
  const quadros = [
    {
      rotulo: 'Votos válidos',
      pct: pct(pctValidos, 1),
      abs: num(validos),
      largura: pctValidos,
      cor: '#E2E8F0',
    },
    {
      rotulo: 'Abstenção',
      pct: pct(abstencao.pct, 1),
      abs: mi(abstencao.votos),
      largura: abstencao.pct,
      cor: '#94A3B8',
    },
    {
      rotulo: 'Brancos',
      pct: pct(brancos.pct),
      abs: mi(brancos.votos),
      largura: brancos.pct * 10,
      cor: '#CBD5E1',
    },
    {
      rotulo: 'Nulos',
      pct: pct(nulos.pct),
      abs: mi(nulos.votos),
      largura: nulos.pct * 10,
      cor: '#F5B54A',
    },
  ]

  return (
    <Cartao className="flex flex-wrap overflow-hidden">
      <div className="flex min-w-0 flex-[3_1_540px] flex-col gap-[18px] p-[clamp(20px,2.6vw,28px)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="painel-rotulo">01 / VOTOS APURADOS</span>
          {ritmo > 0 && !r.final && (
            <span className="f-mono flex items-center gap-1.5 text-[12px] whitespace-nowrap text-[#6EE7B7]">
              <span className="size-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
              +{num(ritmo)} votos/s
            </span>
          )}
        </div>
        <Placas valor={comparecimento} />
        <div className="flex flex-col gap-2.5">
          <div
            aria-hidden
            className="grid h-[22px] grid-cols-[repeat(60,minmax(0,1fr))] gap-[3px]"
          >
            {Array.from({ length: 60 }, (_, i) => {
              const f = fracao * 60 - i
              const t = i / 59
              const rgb = `${Math.round(59 - 53 * t)},${Math.round(130 + 52 * t)},${Math.round(246 - 34 * t)}`
              const aceso = f >= 1
              const borda = f > 0 && f < 1
              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: segmentos fixos
                  key={i}
                  className="rounded-[2px] transition-[background,box-shadow] duration-600"
                  style={{
                    background: aceso
                      ? `rgb(${rgb})`
                      : borda
                        ? `rgba(${rgb},${(0.25 + f * 0.6).toFixed(2)})`
                        : 'rgba(255,255,255,0.05)',
                    boxShadow:
                      aceso && i > fracao * 60 - 6
                        ? `0 0 10px rgba(${rgb},0.7)`
                        : 'none',
                  }}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="f-display text-[30px] leading-none font-bold tracking-[-0.01em] [font-stretch:65%]">
                <Animado valor={r.secoes.pct} formato={(n) => pct(n)} />
              </span>
              <span className="text-[13px] text-[#8B90A3]">
                das urnas apuradas
              </span>
            </div>
            <span className="f-mono text-[12px] text-[#8B90A3]">
              {num(r.secoes.totalizadas)} / {num(r.secoes.total)} seções
            </span>
          </div>
        </div>
      </div>
      <div className="grid min-w-0 flex-[2_1_340px] grid-cols-2 border-white/[0.07] sm:border-l">
        {quadros.map((q) => (
          <div
            key={q.rotulo}
            className="flex flex-col justify-center gap-2 border-r border-b border-white/[0.06] px-[22px] py-5"
          >
            <span className="text-[11px] tracking-[0.08em] text-[#8B90A3] uppercase">
              {q.rotulo}
            </span>
            <span
              className="f-display text-[28px] leading-none font-bold tabular-nums [font-stretch:68%]"
              style={{ color: q.cor }}
            >
              {q.pct}
            </span>
            <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full opacity-80"
                style={{
                  width: `${Math.min(q.largura, 100)}%`,
                  background: q.cor,
                }}
              />
            </div>
            <span className="f-mono text-[12px] text-[#8B90A3]">{q.abs}</span>
          </div>
        ))}
      </div>
    </Cartao>
  )
}
