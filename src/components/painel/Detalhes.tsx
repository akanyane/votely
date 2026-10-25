import type { CandidatoLive } from '@/lib/live/tipos'
import {
  type Duelo,
  nomeCurto,
  type PontoSerie,
  type UfPainel,
} from '@/lib/painel/dados'
import { iniciais, type UF } from '@/lib/votely'
import { Cabeca, Cartao, mi, num, pct, pp1 } from './partes'

/** 05 · Votos válidos ao longo da apuração */
export function Evolucao({ d, pontos }: { d: Duelo; pontos: PontoSerie[] }) {
  const vals = pontos.flatMap((x) => [x.a, x.b]).concat(50)
  const lo = Math.floor(Math.min(...vals) - 1)
  const hi = Math.ceil(Math.max(...vals) + 1)
  const X = (p: number) => p * 10
  const Y = (v: number) => (1 - (v - lo) / (hi - lo)) * 300
  const ult = pontos.at(-1)
  const linha = (k: 'a' | 'b') =>
    `M${pontos.map((x) => `${X(x.p).toFixed(1)} ${Y(x[k]).toFixed(1)}`).join(' L')}`
  const area = (k: 'a' | 'b') =>
    ult
      ? `${linha(k)} L${X(ult.p).toFixed(1)} 300 L${X(pontos[0].p).toFixed(1)} 300 Z`
      : ''
  const passo = hi - lo > 10 ? 4 : 2
  const grade: number[] = []
  for (let v = Math.ceil(lo / passo) * passo; v <= hi; v += passo)
    if (v !== 50) grade.push(v)
  const topo = (v: number) => `${(Y(v) / 3).toFixed(2)}%`

  return (
    <Cartao className="flex min-w-0 flex-[3_1_560px] flex-col gap-[18px] p-6">
      <Cabeca
        numero="05"
        rotulo="EVOLUÇÃO"
        titulo="Votos válidos ao longo da apuração"
      >
        <div className="flex gap-3.5 text-[12px] text-[#8B90A3]">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 bg-[#22D3EE]" />
            {nomeCurto(d.a)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 bg-[#34D399]" />
            {nomeCurto(d.b)}
          </span>
        </div>
      </Cabeca>
      {pontos.length < 2 || !ult ? (
        <p className="text-[14px] text-[#8B90A3]">
          O gráfico aparece a partir da segunda atualização do TSE.
        </p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Com ${pct(ult.p)} apurado: ${nomeCurto(d.a)} ${pct(ult.a)}, ${nomeCurto(d.b)} ${pct(ult.b)}`}
            className="relative ml-9 h-[260px]"
          >
            {grade.map((v) => (
              <div
                key={v}
                className="absolute inset-x-0 border-t border-dashed border-white/[0.06]"
                style={{ top: topo(v) }}
              >
                <span className="f-mono absolute right-full mr-2 -translate-y-1/2 text-[10px] whitespace-nowrap text-[#7A8096]">
                  {v}%
                </span>
              </div>
            ))}
            <div
              className="absolute inset-x-0 border-t border-dashed border-white/40"
              style={{ top: topo(50) }}
            >
              <span className="f-mono absolute right-full mr-2 -translate-y-1/2 text-[10px] text-[#F4F5F8]">
                50%
              </span>
            </div>
            <div
              className="absolute inset-y-0 w-px bg-[linear-gradient(transparent,rgba(255,255,255,0.35),transparent)]"
              style={{ left: `${ult.p}%` }}
            />
            <svg
              aria-hidden
              viewBox="0 0 1000 300"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full overflow-visible"
            >
              <defs>
                <linearGradient id="painel-gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#3B82F6" stopOpacity="0.12" />
                  <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="painel-gB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#10B981" stopOpacity="0.1" />
                  <stop offset="1" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area('a')} fill="url(#painel-gA)" />
              <path d={area('b')} fill="url(#painel-gB)" />
              {(['a', 'b'] as const).map((k) => (
                <path
                  key={k}
                  d={linha(k)}
                  fill="none"
                  stroke={k === 'a' ? '#22D3EE' : '#34D399'}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {(['a', 'b'] as const).map((k) => (
              <div
                key={k}
                className="absolute -mt-[5px] -ml-[5px] size-2.5 rounded-full transition-all duration-800"
                style={{
                  left: `${ult.p}%`,
                  top: topo(ult[k]),
                  background: k === 'a' ? '#22D3EE' : '#34D399',
                  boxShadow:
                    k === 'a'
                      ? '0 0 0 4px rgba(34,211,238,0.2), 0 0 14px #22D3EE'
                      : '0 0 0 4px rgba(52,211,153,0.2), 0 0 14px #34D399',
                }}
              />
            ))}
            <div className="f-mono absolute inset-x-0 top-full mt-2 flex justify-between text-[10px] text-[#7A8096]">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% apurado</span>
            </div>
          </div>
          <div className="h-2.5" />
        </>
      )}
    </Cartao>
  )
}

/** 06 · UFs com a menor margem entre os dois */
export function Apertados({
  d,
  ufs,
  onSel,
}: {
  d: Duelo
  ufs: UfPainel[]
  onSel: (uf: UF) => void
}) {
  const lista = ufs
    .filter((u) => u.lider)
    .sort((x, y) => x.margemPct - y.margemPct)
    .slice(0, 7)
  return (
    <Cartao className="flex min-w-0 flex-[2_1_380px] flex-col gap-3.5 p-6">
      <Cabeca numero="06" rotulo="EM DISPUTA" titulo="Estados mais apertados" />
      {lista.length === 0 ? (
        <p className="text-[14px] text-[#8B90A3]">
          Aguardando votos nos estados.
        </p>
      ) : (
        <div className="flex flex-col">
          {lista.map((u) => {
            const w = `${(Math.min(u.margemPct / 12, 1) * 50).toFixed(1)}%`
            const status = u.final
              ? ['CONCLUÍDO', '#6EE7B7']
              : u.viradaPossivel
                ? ['VIRADA POSSÍVEL', '#F5B54A']
                : ['EM APURAÇÃO', '#8B90A3']
            return (
              <button
                key={u.uf}
                type="button"
                onClick={() => onSel(u.uf)}
                className="-mx-2 grid cursor-pointer grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border-b border-white/[0.05] px-2 py-[11px] text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="f-display text-[15px] font-bold [font-stretch:75%]">
                  {u.uf}
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="relative h-1.5 rounded-full bg-white/[0.05]">
                    <div
                      className="absolute inset-y-0 right-1/2 rounded-l-full bg-[linear-gradient(270deg,#3B82F6,#06B6D4)] transition-[width] duration-800"
                      style={{ width: u.lider === 'a' ? w : '0%' }}
                    />
                    <div
                      className="absolute inset-y-0 left-1/2 rounded-r-full bg-[linear-gradient(90deg,#10B981,#34D399)] transition-[width] duration-800"
                      style={{ width: u.lider === 'b' ? w : '0%' }}
                    />
                    <div className="absolute -inset-y-[3px] left-1/2 w-px bg-white/60" />
                  </div>
                  <span className="f-mono text-[11px] text-[#8B90A3]">
                    {pct(u.p * 100, 0)} apurado · restam{' '}
                    {u.final
                      ? '0'
                      : u.restam === null
                        ? '—'
                        : `~${mi(u.restam)}`}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="f-mono text-[12px] whitespace-nowrap"
                    style={{ color: u.lider === 'a' ? '#93C5FD' : '#6EE7B7' }}
                  >
                    {u.lider && nomeCurto(d[u.lider]).split(' ')[0]}{' '}
                    {pp1(u.margemPct)}
                  </span>
                  <span
                    className="f-mono text-[9px] tracking-[0.08em] whitespace-nowrap"
                    style={{ color: status[1] }}
                  >
                    {status[0]}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Cartao>
  )
}

/** 07 · Demais candidatos (só no 1º turno) */
export function Demais({ outros }: { outros: CandidatoLive[] }) {
  if (outros.length === 0) return null
  const soma = outros.reduce((s, c) => s + c.pct, 0)
  const maior = Math.max(...outros.map((c) => c.pct)) || 1
  const colunas =
    'grid grid-cols-[36px_minmax(140px,1.4fr)_100px_minmax(60px,1fr)_110px_70px] gap-4'
  return (
    <Cartao className="flex flex-col gap-3 p-6">
      <Cabeca numero="07" rotulo="DEMAIS CANDIDATOS" titulo="Outros colocados">
        <span className="text-[13px] text-[#8B90A3]">
          Somados: {pct(soma)} dos votos válidos
        </span>
      </Cabeca>
      <div className="overflow-x-auto overflow-y-hidden">
        <table className="flex min-w-[640px] flex-col">
          <thead>
            <tr
              className={`${colunas} border-b border-white/[0.08] py-2 text-left text-[11px] tracking-[0.06em] text-[#8B90A3] uppercase`}
            >
              <th className="font-normal">#</th>
              <th className="font-normal">Candidato</th>
              <th className="font-normal">Partido</th>
              <th className="font-normal">Participação</th>
              <th className="text-right font-normal">Votos</th>
              <th className="text-right font-normal">%</th>
            </tr>
          </thead>
          <tbody>
            {outros.map((c, i) => (
              <tr
                key={c.sq || c.numero}
                className={`${colunas} items-center border-b border-white/[0.05] py-[13px] transition-colors hover:bg-white/[0.025]`}
              >
                <td className="f-mono text-[13px] text-[#8B90A3]">{i + 3}º</td>
                <td className="flex min-w-0 items-center gap-2.5">
                  <span className="f-display grid size-7 flex-none place-items-center rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-bold text-[#CBD5E1] [font-stretch:75%]">
                    {iniciais(c.nome)}
                  </span>
                  <span className="text-[14px]">{nomeCurto(c)}</span>
                </td>
                <td className="f-mono text-[12px] text-[#8B90A3]">
                  {c.partido} · {c.numero}
                </td>
                <td>
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(203,213,225,0.35),rgba(203,213,225,0.8))]"
                      style={{ width: `${(c.pct / maior) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="f-mono text-right text-[13px] text-[#CBD5E1]">
                  {num(c.votos)}
                </td>
                <td className="f-display text-right text-[18px] font-semibold tabular-nums [font-stretch:70%]">
                  {pct(c.pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Cartao>
  )
}
