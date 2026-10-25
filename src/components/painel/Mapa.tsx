import {
  type Duelo,
  type Lado,
  nomeCurto,
  porRegiao,
  REGIOES,
  type Regiao,
  type UfPainel,
} from '@/lib/painel/dados'
import { cn } from '@/lib/utils'
import type { UF } from '@/lib/votely'
import { AZUL, Cabeca, Cartao, Celula, num, pct, pp1, VERDE } from './partes'

type Props = {
  visao: 'geral' | 'regiao'
  d: Duelo
  ufs: UfPainel[]
  sel: UfPainel | null
  onSel: (uf: UF) => void
  regiao: Regiao | null
  onRegiao: (r: Regiao | null) => void
  /** UFs que viraram há pouco (nesta sessão) */
  viradas: Set<UF>
}

/** 03 · Mapa em ladrilhos (Visão Geral) ou resultado por região */
export function Mapa({
  visao,
  d,
  ufs,
  sel,
  onSel,
  regiao,
  onRegiao,
  viradas,
}: Props) {
  const nomeA = nomeCurto(d.a)
  const nomeB = nomeCurto(d.b)
  return (
    <Cartao className="flex min-w-0 flex-[2_1_640px] flex-col gap-5 p-6">
      <Cabeca
        numero="03"
        rotulo={visao === 'geral' ? 'MAPA' : 'REGIÕES'}
        titulo={visao === 'geral' ? 'Mapa da apuração' : 'Resultado por região'}
      >
        {visao === 'geral' && (
          <div className="flex flex-wrap gap-1.5">
            {[null, ...REGIOES].map((r) => {
              const on = regiao === r
              return (
                <button
                  key={r ?? 'todas'}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onRegiao(r)}
                  className={cn(
                    'cursor-pointer rounded-full border px-[11px] py-[5px] text-[12px] font-medium whitespace-nowrap transition-all hover:border-white/30',
                    on
                      ? 'border-white/30 bg-white/[0.12] text-[#F4F5F8]'
                      : 'border-white/[0.08] text-[#8B90A3]',
                  )}
                >
                  {r ?? 'Todas'}
                </button>
              )
            })}
          </div>
        )}
      </Cabeca>
      <span className="-mt-3.5 text-[13px] text-[#8B90A3]">
        {visao === 'geral'
          ? 'Cor indica quem lidera; intensidade, a margem.'
          : 'Votos válidos somados por região.'}
      </span>

      {visao === 'geral' ? (
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex max-w-[470px] flex-[1_1_340px] flex-col gap-3.5">
            <div className="grid grid-cols-7 gap-[5px]">
              {ufs.map((u) => (
                <Ladrilho
                  key={u.uf}
                  u={u}
                  selecionado={sel?.uf === u.uf}
                  apagado={!!regiao && regiao !== u.regiao}
                  virou={viradas.has(u.uf)}
                  onClick={() => onSel(u.uf)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3.5 text-[12px] text-[#8B90A3]">
              <Legenda cor="#3B82F6">{nomeA}</Legenda>
              <Legenda cor="#10B981">{nomeB}</Legenda>
              <span className="flex items-center gap-1.5">
                <span className="size-[7px] rounded-full bg-[#F5B54A]" />
                Virada recente
              </span>
              <span>✓ Apuração concluída</span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 bg-white/85" />
                Apurado
              </span>
            </div>
          </div>
          {sel && <Detalhe u={sel} d={d} virou={viradas.has(sel.uf)} />}
        </div>
      ) : (
        <Regioes d={d} ufs={ufs} />
      )}
    </Cartao>
  )
}

function Legenda({
  cor,
  children,
}: {
  cor: string
  children: React.ReactNode
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-[3px]" style={{ background: cor }} />
      {children}
    </span>
  )
}

function Ladrilho({
  u,
  selecionado,
  apagado,
  virou,
  onClick,
}: {
  u: UfPainel
  selecionado: boolean
  apagado: boolean
  virou: boolean
  onClick: () => void
}) {
  const rgb = u.lider === 'a' ? AZUL : VERDE
  const fundo = u.lider
    ? `rgba(${rgb},${(0.2 + Math.min(u.margemPct / 30, 1) * 0.65).toFixed(2)})`
    : 'rgba(255,255,255,0.04)'
  return (
    <button
      type="button"
      onClick={onClick}
      title={u.nome}
      aria-label={`${u.nome}: ${u.lider ? `margem de ${pct(u.margemPct, 1)}` : 'sem votos'}, ${pct(u.p * 100, 0)} apurado`}
      aria-pressed={selecionado}
      className="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[9px] border p-0 text-[#F4F5F8] transition-all duration-350 hover:z-[2] hover:-translate-y-0.5 hover:scale-[1.06]"
      style={{
        gridColumn: u.col,
        gridRow: u.row,
        background: fundo,
        opacity: apagado ? 0.18 : 1,
        borderColor: selecionado
          ? 'rgba(255,255,255,0.9)'
          : 'rgba(255,255,255,0.08)',
        boxShadow: selecionado ? `0 0 22px rgba(${rgb},0.7)` : 'none',
      }}
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_50%)]" />
      <span className="f-display text-[clamp(11px,1.4vw,15px)] leading-none font-bold [font-stretch:75%]">
        {u.uf}
      </span>
      <span className="f-mono text-[9px] leading-none text-white/80">
        {u.lider ? pp1(u.margemPct) : '—'}
      </span>
      <span className="absolute inset-x-[5px] bottom-1 h-0.5 overflow-hidden rounded-sm bg-black/35">
        <span
          className="block h-full bg-white/85 transition-[width] duration-800"
          style={{ width: `${(u.p * 100).toFixed(1)}%` }}
        />
      </span>
      {virou && (
        <span className="absolute top-1 right-1 size-1.5 animate-[painel-pisca_1s_infinite] rounded-full bg-[#F5B54A] shadow-[0_0_8px_#F5B54A]" />
      )}
      {u.final && (
        <span className="absolute top-[3px] left-[5px] text-[9px] leading-none text-white">
          ✓
        </span>
      )}
    </button>
  )
}

function Detalhe({ u, d, virou }: { u: UfPainel; d: Duelo; virou: boolean }) {
  const status = u.final
    ? 'CONCLUÍDO'
    : virou
      ? 'VIRADA'
      : u.lider && u.margemPct < 3
        ? 'DISPUTADO'
        : 'EM APURAÇÃO'
  const cores = {
    CONCLUÍDO: 'bg-[rgba(16,185,129,0.14)] text-[#6EE7B7]',
    VIRADA: 'bg-[rgba(245,181,74,0.14)] text-[#F5B54A]',
    DISPUTADO: 'bg-[rgba(239,68,68,0.12)] text-[#FCA5A5]',
    'EM APURAÇÃO': 'bg-[rgba(148,163,184,0.12)] text-[#CBD5E1]',
  }[status]
  const lider = u.lider ? nomeCurto(d[u.lider]) : null
  const nota = !lider
    ? 'Ainda não há votos apurados neste estado.'
    : u.final
      ? `${lider} vence no estado.`
      : u.viradaPossivel
        ? 'Pela estimativa de votos que faltam, o resultado no estado ainda pode mudar.'
        : 'A vantagem já é maior que a estimativa de votos válidos que faltam.'

  return (
    <div className="flex min-w-0 flex-[1_1_270px] flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,#11131F,#0C0E16)] p-5 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="f-mono text-[11px] tracking-[0.08em] text-[#8B90A3]">
            {u.uf} · {u.regiao}
          </span>
          <span className="f-display text-[26px] leading-[1.05] font-bold tracking-[-0.01em] [font-stretch:78%]">
            {u.nome}
          </span>
        </div>
        <span
          className={cn(
            'f-mono rounded-md px-2 py-1 text-[10px] tracking-[0.08em] whitespace-nowrap',
            cores,
          )}
        >
          {status}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[12px] text-[#8B90A3]">
          <span>Apurado</span>
          <span className="f-mono text-[#F4F5F8]">{pct(u.p * 100)}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[#E2E8F0] transition-[width] duration-800"
            style={{ width: `${u.p * 100}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {(['a', 'b'] as const).map((l) => (
          <BarraCandidato
            key={l}
            lado={l}
            nome={nomeCurto(d[l])}
            pctV={u[`${l}Pct`]}
            votos={u[`${l}V`]}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] bg-white/[0.07]">
        <Celula
          rotulo="Vantagem"
          valor={lider ? `${lider.split(' ')[0]} ${num(u.margemVotos)}` : '—'}
        />
        <Celula
          rotulo="A apurar (estimativa)"
          valor={u.final ? '0' : u.restam === null ? '—' : `~${num(u.restam)}`}
        />
      </div>
      <p className="text-[13px] leading-normal text-pretty text-[#8B90A3]">
        {nota}
      </p>
    </div>
  )
}

function BarraCandidato({
  lado,
  nome,
  pctV,
  votos,
}: {
  lado: Lado
  nome: string
  pctV: number
  votos: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[14px]">{nome}</span>
        <span
          className="f-display text-[28px] leading-none font-bold tabular-nums [font-stretch:65%]"
          style={{ color: lado === 'a' ? '#60A5FA' : '#34D399' }}
        >
          {pct(pctV)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-800"
          style={{
            width: `${pctV}%`,
            background:
              lado === 'a'
                ? 'linear-gradient(90deg,#3B82F6,#06B6D4)'
                : 'linear-gradient(90deg,#10B981,#34D399)',
            boxShadow:
              lado === 'a'
                ? '0 0 10px rgba(6,182,212,0.5)'
                : '0 0 10px rgba(16,185,129,0.5)',
          }}
        />
      </div>
      <span className="f-mono text-[12px] text-[#8B90A3]">
        {num(votos)} votos
      </span>
    </div>
  )
}

function Regioes({ d, ufs }: { d: Duelo; ufs: UfPainel[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {porRegiao(ufs).map((r) => (
        <div
          key={r.regiao}
          className="grid grid-cols-[minmax(120px,170px)_minmax(0,1fr)_auto] items-center gap-5 rounded-[14px] border border-white/[0.08] bg-[#0E1019] px-[18px] py-4 transition-all hover:translate-x-[3px] hover:border-white/[0.22] max-[640px]:grid-cols-1 max-[640px]:gap-3"
        >
          <div className="flex flex-col gap-[3px]">
            <span className="f-display text-[18px] font-bold [font-stretch:80%]">
              {r.regiao}
            </span>
            <span className="f-mono text-[11px] text-[#8B90A3]">
              {r.ufs.join(' · ')}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#3B82F6,#06B6D4)] transition-[width] duration-800"
                style={{ width: `${r.aPct}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-[linear-gradient(270deg,#10B981,#34D399)] transition-[width] duration-800"
                style={{ width: `${r.bPct}%` }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
            </div>
            <div className="f-mono flex justify-between gap-2 text-[12px]">
              <span className="text-[#93C5FD]">{pct(r.aPct)}</span>
              <span className="text-center text-[#8B90A3]">
                {pct(r.apurado, 1)} apurado · {pct(r.participacao, 1)} dos votos
                do país
              </span>
              <span className="text-[#6EE7B7]">{pct(r.bPct)}</span>
            </div>
          </div>
          <div className="flex min-w-[150px] flex-col items-end gap-[3px] max-[640px]:items-start">
            <span className="text-[11px] tracking-[0.06em] text-[#8B90A3] uppercase">
              Lidera
            </span>
            <span
              className="f-display text-[16px] font-bold [font-stretch:80%]"
              style={{
                color:
                  r.lider === 'a'
                    ? '#60A5FA'
                    : r.lider === 'b'
                      ? '#34D399'
                      : '#8B90A3',
              }}
            >
              {r.lider ? nomeCurto(d[r.lider]) : '—'}
            </span>
            <span className="f-mono text-[11px] text-[#8B90A3]">
              {r.liderados.a}–{r.liderados.b} estados
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
