import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { useCandidatos } from '@/lib/candidatos'
import type { ColinhaSalva } from '@/lib/colinha'
import { resultadoQuery } from '@/lib/live/consultas'
import { fmtPct, fmtVotos, ordinal } from '@/lib/live/formato'
import type { CargoLive, StatusCandidato } from '@/lib/live/tipos'
import { CARGOS, type CargoId, nomeUf, tituloCompleto } from '@/lib/votely'
import { Selo } from './partes'

export type AbaLive = 'pres' | 'gov' | 'sen' | 'dep'

const CARGO_LIVE: Record<CargoId, CargoLive> = {
  pres: 'pres',
  gov: 'gov',
  sen1: 'sen',
  sen2: 'sen',
  depfed: 'depfed',
  depest: 'depest',
}

type Linha = {
  id: CargoId
  cargo: string
  nome: string
  sub: string
  pos: string
  stat: string
  status: StatusCandidato | null
  aba: AbaLive
  tipoDep?: 'fed' | 'est'
}

type Props = {
  colinha: ColinhaSalva | null
  onIr: (aba: AbaLive, tipoDep?: 'fed' | 'est') => void
}

export function SeusCandidatos({ colinha, onIr }: Props) {
  const uf = colinha?.uf ?? null
  const estaticos = useCandidatos(uf ?? '')
  const cargos: CargoLive[] = ['pres', 'gov', 'sen', 'depfed', 'depest']
  const consultas = useQueries({
    queries: cargos.map((c) => ({
      ...resultadoQuery(c, uf),
      enabled: !!colinha,
    })),
  })

  if (!colinha || !uf) {
    return (
      <section className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-input p-[18px]">
        <h2 className="text-[20px] font-extrabold">Seus candidatos</h2>
        <p className="text-[16px] text-pretty text-muted-foreground">
          Monte sua colinha no Votely e acompanhe aqui como estão os candidatos
          que você escolheu.
        </p>
        <Link
          to="/"
          className="flex min-h-11 items-center gap-1 self-start text-[17px] font-extrabold text-accent-foreground no-underline hover:opacity-80"
        >
          Montar minha colinha
          <ChevronRightIcon className="size-5" strokeWidth={2.6} />
        </Link>
      </section>
    )
  }

  const resultado = (cl: CargoLive) => {
    const q = consultas[cargos.indexOf(cl)]
    return q.data?.estado === 'ok' ? q.data.dados : null
  }

  const linhas: Linha[] = [...CARGOS].reverse().map((cargo) => {
    const voto = colinha.v[cargo.id]
    const cl = CARGO_LIVE[cargo.id]
    const base = {
      id: cargo.id,
      cargo: tituloCompleto(cargo, uf),
      aba: (cl === 'depfed' || cl === 'depest' ? 'dep' : cl) as AbaLive,
      tipoDep:
        cl === 'depfed'
          ? ('fed' as const)
          : cl === 'depest'
            ? ('est' as const)
            : undefined,
    }
    if (voto.branco) {
      return {
        ...base,
        nome: 'Voto em branco',
        sub: 'Sem candidato',
        pos: '—',
        stat: 'Em branco',
        status: null,
      }
    }
    if (voto.digits.length < cargo.digitos) {
      return {
        ...base,
        nome: 'Não preenchido',
        sub: 'Sem número na colinha',
        pos: '—',
        stat: '',
        status: null,
      }
    }
    const r = resultado(cl)
    const estatico = estaticos?.dados?.[cargo.pool].find(
      (c) => c.numero === voto.digits,
    )
    const nomeBase = estatico?.nome ?? `Nº ${voto.digits}`
    if (!r) {
      return {
        ...base,
        nome: nomeBase,
        sub: `Nº ${voto.digits}`,
        pos: '…',
        stat: '',
        status: null,
      }
    }
    const i = r.candidatos.findIndex((c) => c.numero === voto.digits)
    const c = i >= 0 ? r.candidatos[i] : null
    if (r.ranking) {
      const j = r.ranking.findIndex(([n]) => n === voto.digits)
      if (j < 0) {
        return {
          ...base,
          nome: nomeBase,
          sub: `Nº ${voto.digits}`,
          pos: '—',
          stat: 'Não encontrado',
          status: null,
        }
      }
      const [, votos] = r.ranking[j]
      return {
        ...base,
        nome: c?.nome ?? nomeBase,
        sub: [`Nº ${voto.digits}`, c?.partido ?? estatico?.sigla]
          .filter(Boolean)
          .join(' · '),
        pos: ordinal(j + 1),
        stat: fmtVotos(votos),
        status: c?.status ?? null,
      }
    }
    if (!c) {
      return {
        ...base,
        nome: nomeBase,
        sub: `Nº ${voto.digits}`,
        pos: '—',
        stat: 'Não encontrado',
        status: null,
      }
    }
    return {
      ...base,
      nome: c.nome,
      sub: `Nº ${c.numero} · ${c.partido}`,
      pos: ordinal(i + 1),
      stat: fmtPct(c.pct),
      status: c.status,
    }
  })

  return (
    <section className="rounded-xl border-2 border-primary bg-card px-[18px] pt-[18px] pb-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[22px] font-extrabold">Seus candidatos</h2>
        <span className="text-[15px] text-muted-foreground">
          Da sua colinha · {uf}
        </span>
      </div>
      <p className="mt-0.5 mb-2 text-[15px] text-muted-foreground">
        Toque para ver o cargo completo.
      </p>
      {linhas.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onIr(l.aba, l.tipoDep)}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-border py-3 text-left focus-visible:ring-4 focus-visible:ring-focus-glow focus-visible:outline-none"
        >
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold tracking-[0.05em] text-muted-foreground uppercase">
              {l.cargo}
            </div>
            <div className="text-[18px] leading-[1.25] font-extrabold break-words">
              {l.nome}
            </div>
            <div className="text-[15px] text-muted-foreground">{l.sub}</div>
          </div>
          <div className="text-right">
            <div className="text-[24px] leading-[1.1] font-bold tracking-[-0.01em] tabular-nums">
              {l.pos}
            </div>
            <div className="text-[15px] whitespace-nowrap text-muted-foreground">
              {l.stat}
            </div>
          </div>
          {l.status && (
            <div className="col-span-full">
              <Selo status={l.status} />
            </div>
          )}
        </button>
      ))}
      <p className="sr-only">Estado da colinha: {nomeUf(uf)}</p>
    </section>
  )
}
