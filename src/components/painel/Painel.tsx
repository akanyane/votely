import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ultimaRodada } from '@/components/live/GraficoEvolucao'
import { ELEICAO, type Turno, turnoAtual } from '@/config/election'
import { historicoQuery, mapaQuery, resultadoQuery } from '@/lib/live/consultas'
import {
  duelo,
  type Evento,
  eventosDoHistorico,
  eventosEntre,
  type Regiao,
  serie,
  type UfPainel,
  ufsPainel,
} from '@/lib/painel/dados'
import { cn } from '@/lib/utils'
import type { UF } from '@/lib/votely'
import { Apuracao } from './Apuracao'
import { Apertados, Demais, Evolucao } from './Detalhes'
import { Duelo } from './Duelo'
import { Feed, Letreiro } from './Feed'
import { Mapa } from './Mapa'

/** Virada no estado fica marcada por 3 minutos */
const VIRADA_MS = 3 * 60_000

/** Painel da apuração de presidente (/live e, para o 1º turno, /live/1-turno) */
export function Painel({ turno = ELEICAO.turno }: { turno?: Turno }) {
  const [pausado, setPausado] = useState(false)
  const [visao, setVisao] = useState<'geral' | 'regiao'>('geral')
  const [regiao, setRegiao] = useState<Regiao | null>(null)
  const [escolhida, setEscolhida] = useState<UF | null>(null)
  const [agora, setAgora] = useState<number | null>(null)

  const ritmo = pausado ? { refetchInterval: false as const } : {}
  const pres = useQuery({ ...resultadoQuery('pres', null, turno), ...ritmo })
  const mapa = useQuery({ ...mapaQuery(turno), ...ritmo })
  const hist = useQuery({ ...historicoQuery('pres', null, turno), ...ritmo })

  // Relógio só no navegador, para o "sync há Xs"
  useEffect(() => {
    setAgora(Date.now())
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const r = pres.data?.estado === 'ok' ? pres.data.dados : null
  const d = useMemo(() => (r ? duelo(r) : null), [r])
  const ufs = useMemo<UfPainel[]>(
    () =>
      d && mapa.data?.estado === 'ok' ? ufsPainel(mapa.data.dados, d) : [],
    [d, mapa.data],
  )
  const pontos = useMemo(
    () => (d ? serie(ultimaRodada(hist.data ?? []), d) : []),
    [d, hist.data],
  )

  // Eventos dos estados: só os que mudaram enquanto a página está aberta
  const [sessao, setSessao] = useState<Evento[]>([])
  const [viradas, setViradas] = useState<Map<UF, number>>(new Map())
  const anterior = useRef<UfPainel[] | null>(null)
  useEffect(() => {
    if (!d || ufs.length === 0) return
    const antes = anterior.current
    anterior.current = ufs
    if (!antes) return
    const t = Date.now()
    const novos = eventosEntre(antes, ufs, d, t)
    if (novos.length === 0) return
    setSessao((s) => [...novos, ...s].slice(0, 40))
    const vir = novos.filter((e) => e.tag === 'VIRADA')
    if (vir.length) {
      setViradas((m) => {
        const n = new Map(m)
        for (const u of ufs) {
          const a = antes.find((x) => x.uf === u.uf)
          if (a?.lider && u.lider && a.lider !== u.lider) n.set(u.uf, t)
        }
        return n
      })
    }
  }, [ufs, d])

  const eventos = useMemo(() => {
    const todos = d ? [...sessao, ...eventosDoHistorico(pontos, d)] : sessao
    return todos.sort((x, y) => y.t - x.t).slice(0, 18)
  }, [sessao, pontos, d])

  const recentes = useMemo(
    () =>
      new Set(
        [...viradas]
          .filter(([, t]) => agora !== null && agora - t < VIRADA_MS)
          .map(([uf]) => uf),
      ),
    [viradas, agora],
  )

  // Estado em destaque: o escolhido ou o mais apertado ainda em apuração
  const sel =
    ufs.find((u) => u.uf === escolhida) ??
    [...ufs]
      .filter((u) => u.lider && !u.final)
      .sort((x, y) => x.margemPct - y.margemPct)[0] ??
    ufs[0] ??
    null

  const atualizar = () => {
    pres.refetch()
    mapa.refetch()
    hist.refetch()
  }
  const segundos =
    agora && pres.dataUpdatedAt
      ? Math.max(0, Math.floor((agora - pres.dataUpdatedAt) / 1000))
      : null

  let conteudo: React.ReactNode
  if (!pres.data && pres.isPending) {
    conteudo = <Aviso>Carregando os dados do TSE…</Aviso>
  } else if (pres.data?.estado === 'aguardando' || (r && !r.votacaoLiberada)) {
    conteudo = (
      <Aviso>
        A votação para presidente é liberada às 17h (horário de Brasília). O
        painel começa sozinho quando o TSE publicar os primeiros números.
      </Aviso>
    )
  } else if (!r || !d) {
    conteudo = (
      <Aviso>
        Não conseguimos carregar os resultados agora. O painel tenta de novo a
        cada 30 segundos.
      </Aviso>
    )
  } else {
    conteudo = (
      <>
        <Apuracao r={r} pontos={pontos} />
        <Duelo r={r} d={d} ufs={ufs} pontos={pontos} />
        <div className="flex flex-wrap items-stretch gap-4">
          <Mapa
            visao={visao}
            d={d}
            ufs={ufs}
            sel={sel}
            onSel={setEscolhida}
            regiao={regiao}
            onRegiao={setRegiao}
            viradas={recentes}
          />
          <Feed eventos={eventos} />
        </div>
        <div className="flex flex-wrap items-stretch gap-4">
          <Evolucao d={d} pontos={pontos} />
          <Apertados
            d={d}
            ufs={ufs}
            onSel={(uf) => {
              setEscolhida(uf)
              setVisao('geral')
              setRegiao(null)
            }}
          />
        </div>
        <Demais
          outros={r.candidatos.filter(
            (c) => c.sq !== d.a.sq && c.sq !== d.b.sq,
          )}
        />
      </>
    )
  }

  const final = !!r?.final
  return (
    <div className="painel relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(1000px 520px at 6% -12%, rgba(59,130,246,0.13), transparent 60%), radial-gradient(1000px 520px at 94% -12%, rgba(16,185,129,0.10), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_30%,transparent_100%)]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="relative z-[1]">
        <Letreiro eventos={eventos} />
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-[clamp(16px,3vw,36px)] pt-[22px] pb-12">
          <header className="flex flex-wrap items-center justify-between gap-4 pb-1.5">
            <Link
              to="/"
              aria-label="Votely: voltar à colinha"
              className="flex items-center gap-3.5 text-inherit no-underline"
            >
              <div className="relative size-[42px] rounded-xl bg-[linear-gradient(135deg,#3B82F6,#06B6D4_50%,#10B981)] p-px shadow-[0_0_24px_rgba(6,182,212,0.25)]">
                <div className="f-display grid size-full place-items-center rounded-[11px] bg-[#0E1019] text-[18px] font-extrabold [font-stretch:70%]">
                  26
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <h1 className="f-display m-0 text-[20px] font-bold tracking-[-0.01em] [font-stretch:80%]">
                  Eleições 2026
                </h1>
                <span className="text-[13px] text-[#8B90A3]">
                  Presidente da República · {turnoAtual(turno).extenso}
                </span>
              </div>
            </Link>

            <div
              className={cn(
                'flex items-center gap-3 rounded-full border py-2 pr-3.5 pl-3',
                final
                  ? 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.07)]'
                  : 'border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.07)]',
              )}
            >
              <span
                className={cn(
                  'inline-block size-2 flex-none rounded-full',
                  final
                    ? 'bg-[#10B981]'
                    : 'animate-[painel-pulso_1.6s_infinite] bg-[#EF4444]',
                )}
              />
              <span
                className={cn(
                  'f-mono text-[12px] font-medium tracking-[0.08em] whitespace-nowrap',
                  final
                    ? 'text-[#6EE7B7]'
                    : 'animate-[painel-brilho_3.5s_linear_infinite] bg-[linear-gradient(110deg,#FCA5A5_40%,#FFFFFF_50%,#FCA5A5_60%)] bg-[length:200%_100%] bg-clip-text text-transparent',
                )}
              >
                {final ? 'TOTALIZAÇÃO CONCLUÍDA' : 'APURAÇÃO EM TEMPO REAL'}
              </span>
              <span className="h-3.5 w-px bg-white/15" />
              <span className="f-mono text-[12px] whitespace-nowrap text-[#8B90A3]">
                sync{' '}
                {segundos === null
                  ? '—'
                  : segundos < 2
                    ? 'agora'
                    : `há ${segundos}s`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-[11px] border border-white/[0.08] bg-white/[0.04] p-[3px]">
                {(
                  [
                    ['geral', 'Visão Geral'],
                    ['regiao', 'Por Região'],
                  ] as const
                ).map(([v, rotulo]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={visao === v}
                    onClick={() => setVisao(v)}
                    className={cn(
                      'flex-none cursor-pointer rounded-lg px-3.5 py-[7px] text-[13px] font-medium whitespace-nowrap transition-all duration-250',
                      visao === v
                        ? 'bg-[#F4F5F8] text-[#090A0F] shadow-[0_2px_10px_rgba(255,255,255,0.15)]'
                        : 'text-[#8B90A3]',
                    )}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPausado((p) => !p)}
                className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors hover:bg-white/[0.08]"
              >
                {pausado ? (
                  <svg
                    aria-hidden
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  >
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                )}
                {pausado ? 'Ao vivo' : 'Pausar'}
              </button>
              <button
                type="button"
                onClick={atualizar}
                className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.14)] px-3 py-2 text-[13px] font-medium whitespace-nowrap text-[#BFDBFE] transition-all hover:bg-[rgba(59,130,246,0.26)] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]"
              >
                <svg
                  aria-hidden
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(pres.isFetching && 'animate-spin')}
                >
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Atualizar
              </button>
            </div>
          </header>

          <nav
            aria-label="Outras páginas do Live"
            className="-mt-1 flex flex-wrap gap-2"
          >
            {turno === 1 && ELEICAO.turno === 2 ? (
              <>
                <Atalho to="/live">Ir para o 2º turno</Atalho>
                <Atalho to="/live/1-turno/classico">
                  Governador, senado, deputados e mapa por município
                </Atalho>
                <Atalho to="/live/map" search={{ turno: 1 }}>
                  Mapa por cidade do 1º turno
                </Atalho>
              </>
            ) : (
              <>
                <Atalho to="/live/classico">
                  {turno === 2
                    ? 'Governador e mapa por município'
                    : 'Governador, senado, deputados e mapa por município'}
                </Atalho>
                {turno === 2 && (
                  <Atalho to="/live/1-turno">Resultados do 1º turno</Atalho>
                )}
                <Atalho to="/live/map">Mapa por cidade</Atalho>
              </>
            )}
          </nav>

          {conteudo}

          <footer className="f-mono flex flex-wrap justify-between gap-2 pt-1 text-[11px] text-[#7A8096]">
            <span>
              Dados oficiais do TSE. O Votely não é um serviço oficial da
              Justiça Eleitoral.
            </span>
            <span>
              {pausado ? 'Atualização pausada' : 'Atualização a cada 30 s'}
            </span>
          </footer>
        </div>
      </div>
    </div>
  )
}

function Atalho({
  to,
  search,
  children,
}: {
  to:
    | '/live'
    | '/live/classico'
    | '/live/1-turno'
    | '/live/1-turno/classico'
    | '/live/map'
  search?: { turno: 1 }
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="flex min-h-10 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pr-2.5 pl-3.5 text-[13px] font-medium text-[#CBD5E1] no-underline transition-colors hover:bg-white/[0.08] hover:text-[#F4F5F8]"
    >
      {children}
      <ChevronRightIcon aria-hidden className="size-4" strokeWidth={2.4} />
    </Link>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="painel-cartao mx-auto max-w-[620px] p-6 text-center text-[15px] leading-relaxed text-pretty text-[#CBD5E1]">
      {children}
    </div>
  )
}
