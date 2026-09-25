import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MessageCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { AntesDaApuracao } from '@/components/live/AntesDaApuracao'
import { CabecalhoLive } from '@/components/live/CabecalhoLive'
import { Carregando } from '@/components/live/Carregando'
import {
  abrirWhatsApp,
  textoCompartilhar,
} from '@/components/live/compartilhar'
import { Deputados } from '@/components/live/Deputados'
import {
  BrancosNulos,
  Confronto,
  ListaCandidatos,
  NotaFinal,
  SemSegundoTurno,
} from '@/components/live/Majoritarios'
import { MapaPresidente } from '@/components/live/MapaPresidente'
import { Cartao } from '@/components/live/partes'
import { type AbaLive, SeusCandidatos } from '@/components/live/SeusCandidatos'
import { StatusApuracao } from '@/components/live/StatusApuracao'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ELEICAO } from '@/config/election'
import { type ColinhaSalva, lerColinha } from '@/lib/colinha'
import { mapaQuery, resultadoQuery } from '@/lib/live/consultas'
import type { CargoLive, ResultadoCargo } from '@/lib/live/tipos'
import { isUf, nomeUf, type UF, UFS } from '@/lib/votely'
import type { EstadoLive, UfNoMapa } from '@/server/live'

const busca = z.object({
  aba: z.enum(['pres', 'gov', 'sen', 'dep']).optional().catch(undefined),
  uf: z
    .string()
    .optional()
    .transform((v) =>
      v && isUf(v.toUpperCase()) ? (v.toUpperCase() as UF) : undefined,
    )
    .catch(undefined),
  dep: z.enum(['fed', 'est']).optional().catch(undefined),
})

export const Route = createFileRoute('/live')({
  validateSearch: busca,
  head: () => ({
    meta: [
      { title: 'Votely Live · Resultados das Eleições 2026' },
      {
        name: 'description',
        content:
          'Acompanhe a apuração das Eleições 2026 em tempo real, com dados oficiais do TSE: presidente, governador, senado e deputados.',
      },
      {
        property: 'og:title',
        content: 'Votely Live · Resultados das Eleições 2026',
      },
      { property: 'og:url', content: 'https://votely.akanyane.dev/live' },
    ],
    links: [{ rel: 'canonical', href: 'https://votely.akanyane.dev/live' }],
  }),
  component: Live,
})

const ABAS: { id: AbaLive; rotulo: string }[] = [
  { id: 'pres', rotulo: 'Presidente' },
  { id: 'gov', rotulo: 'Governador' },
  { id: 'sen', rotulo: 'Senado' },
  { id: 'dep', rotulo: 'Deputados' },
]

const ITENS_UF = UFS.map(([sigla, nome]) => ({
  value: sigla,
  label: `${nome} (${sigla})`,
}))

function Live() {
  const s = Route.useSearch()
  const navigate = Route.useNavigate()
  const turno2 = ELEICAO.turno === 2

  const [colinha, setColinha] = useState<ColinhaSalva | null>(null)
  const [mapaUf, setMapaUf] = useState<UF | null>(null)
  useEffect(() => setColinha(lerColinha()), [])

  const uf: UF = s.uf ?? colinha?.uf ?? 'SP'
  const abas = turno2
    ? ABAS.filter((a) => a.id === 'pres' || a.id === 'gov')
    : ABAS
  const aba: AbaLive = abas.some((a) => a.id === s.aba)
    ? (s.aba as AbaLive)
    : 'pres'
  const dep = s.dep ?? 'fed'
  const cargo: CargoLive =
    aba === 'dep' ? (dep === 'fed' ? 'depfed' : 'depest') : aba

  const ir = (mudanca: { aba?: AbaLive; uf?: UF; dep?: 'fed' | 'est' }) =>
    navigate({
      search: (atual) => ({ ...atual, ...mudanca }),
      replace: true,
      resetScroll: false,
    })

  const pres = useQuery(resultadoQuery('pres', null))
  const atual = useQuery(resultadoQuery(cargo, uf))
  const mapa = useQuery({ ...mapaQuery(), enabled: aba === 'pres' && !turno2 })
  const semT2 = atual.data?.estado === 'sem_segundo_turno'
  const gov1 = useQuery({
    ...resultadoQuery('gov', uf, 1),
    enabled: turno2 && aba === 'gov' && semT2,
  })

  const presOk = pres.data?.estado === 'ok' ? pres.data.dados : null
  const atualOk = atual.data?.estado === 'ok' ? atual.data : null
  const cabecalhoDados = atualOk?.dados ?? presOk

  // ---------- fases da página ----------
  let conteudo: React.ReactNode
  if (!pres.data && pres.isPending) {
    conteudo = <Carregando />
  } else if (
    pres.data?.estado === 'aguardando' ||
    (presOk &&
      presOk.andamento === 'nao_iniciada' &&
      presOk.secoes.pct === 0 &&
      !presOk.final)
  ) {
    conteudo = <AntesDaApuracao />
  } else if (!cabecalhoDados) {
    conteudo = (
      <ErroGeral tentando={pres.isFetching} onTentar={() => pres.refetch()} />
    )
  } else {
    const desatualizado =
      !!atualOk?.desatualizado ||
      (atual.isError && !!atual.data) ||
      pres.data?.estado === 'erro'
    conteudo = (
      <>
        <StatusApuracao
          resultado={cabecalhoDados}
          desatualizado={desatualizado}
          tentando={atual.isFetching}
          onTentarDeNovo={() => {
            atual.refetch()
            pres.refetch()
          }}
        />

        <div className="mb-5 flex items-center gap-3">
          <label
            id="uf-live-rotulo"
            htmlFor="uf-live"
            className="flex-none text-[18px] font-extrabold"
          >
            Estado
          </label>
          <Select
            items={ITENS_UF}
            value={uf}
            onValueChange={(v) => {
              if (isUf(v)) {
                ir({ uf: v })
                setMapaUf(v)
              }
            }}
          >
            <SelectTrigger
              id="uf-live"
              aria-labelledby="uf-live-rotulo"
              className="h-[52px]! w-full max-w-[420px] rounded-lg border-2 border-input bg-field px-3.5 text-[18px] dark:bg-field dark:hover:bg-field [&_svg:not([class*='size-'])]:size-[22px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className="max-h-[min(420px,var(--available-height))] rounded-lg p-1"
            >
              {ITENS_UF.map((i) => (
                <SelectItem
                  key={i.value}
                  value={i.value}
                  className="min-h-12 rounded-md px-3 text-[18px]"
                >
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={`grid items-start gap-6 ${turno2 ? '' : 'lg:grid-cols-[minmax(0,1fr)_380px]'}`}
        >
          {!turno2 && (
            <aside className="min-w-0 lg:sticky lg:top-[250px] lg:col-start-2 lg:row-start-1">
              <SeusCandidatos
                colinha={colinha?.turno === ELEICAO.turno ? colinha : null}
                onIr={(a, t) =>
                  ir({ aba: a, uf: colinha?.uf, ...(t ? { dep: t } : {}) })
                }
              />
            </aside>
          )}

          <main className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
            <Tabs
              value={aba}
              onValueChange={(v) => ir({ aba: v as AbaLive })}
              className="gap-4"
            >
              <TabsList
                aria-label="Cargos"
                className={`grid h-auto! w-full gap-1.5 rounded-xl bg-track p-1.5 ${turno2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}
              >
                {abas.map((a) => (
                  <TabsTrigger
                    key={a.id}
                    value={a.id}
                    className="h-[52px] rounded-lg text-[17px] font-extrabold text-muted-foreground data-active:bg-card data-active:text-foreground data-active:shadow-[0_1px_3px_rgba(0,0,0,.12)] dark:data-active:border-transparent dark:data-active:bg-card"
                  >
                    {a.rotulo}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent
                value={aba}
                className="flex flex-col gap-4 text-[18px]"
              >
                <ConteudoAba
                  aba={aba}
                  uf={uf}
                  dep={dep}
                  consulta={atual}
                  mapa={mapa.data}
                  presOk={presOk}
                  mapaUf={mapaUf ?? uf}
                  onMapaUf={setMapaUf}
                  gov1={gov1.data?.estado === 'ok' ? gov1.data.dados : null}
                  onIr={ir}
                />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </>
    )
  }

  return (
    <div className="mx-auto max-w-[560px] px-4 pt-3 lg:max-w-[1200px] lg:px-10 lg:pt-6">
      <CabecalhoLive />
      {conteudo}
      <footer className="mt-10 border-t border-border px-1 pt-6 pb-9 text-[16px] text-muted-foreground">
        <p>
          Dados oficiais do TSE. O Votely não é um serviço oficial da Justiça
          Eleitoral.
        </p>
      </footer>
    </div>
  )
}

function ErroGeral({
  onTentar,
  tentando,
}: {
  onTentar: () => void
  tentando: boolean
}) {
  return (
    <Cartao
      role="alert"
      className="mx-auto flex max-w-[560px] flex-col gap-3 text-center"
    >
      <h1 className="text-[24px] font-extrabold">
        Não conseguimos carregar os resultados
      </h1>
      <p className="text-[17px] text-pretty text-muted-foreground">
        O servidor do TSE pode estar sobrecarregado. A página tenta de novo
        sozinha a cada 30 segundos.
      </p>
      <Button
        onClick={onTentar}
        disabled={tentando}
        className="h-14 rounded-lg text-[19px] font-extrabold"
      >
        {tentando ? 'Tentando…' : 'Tentar agora'}
      </Button>
    </Cartao>
  )
}

function ConteudoAba({
  aba,
  uf,
  dep,
  consulta,
  mapa,
  presOk,
  mapaUf,
  onMapaUf,
  gov1,
  onIr,
}: {
  aba: AbaLive
  uf: UF
  dep: 'fed' | 'est'
  consulta: UseQueryResult<EstadoLive<ResultadoCargo>>
  mapa: EstadoLive<UfNoMapa[]> | undefined
  presOk: ResultadoCargo | null
  mapaUf: UF
  onMapaUf: (uf: UF) => void
  gov1: ResultadoCargo | null
  onIr: (m: { aba?: AbaLive; uf?: UF; dep?: 'fed' | 'est' }) => void
}) {
  const ufNome = nomeUf(uf)
  const turno2 = ELEICAO.turno === 2
  const d = consulta.data

  const titulo =
    aba === 'pres'
      ? 'Presidente · Brasil'
      : aba === 'gov'
        ? `Governador · ${ufNome}`
        : aba === 'sen'
          ? `Senado · ${ufNome}`
          : `Deputados · ${ufNome}`

  const r = d?.estado === 'ok' ? d.dados : null
  const subtitulo =
    aba === 'dep'
      ? 'Eleição proporcional'
      : aba === 'sen' && r
        ? `${r.vagas} ${r.vagas === 1 ? 'vaga' : 'vagas'} em 2026 · % dos votos válidos`
        : d?.estado === 'sem_segundo_turno'
          ? 'Decidido no 1º turno'
          : turno2
            ? '2º turno · % dos votos válidos'
            : aba === 'pres'
              ? '% dos votos válidos · resultado nacional'
              : '% dos votos válidos'

  const compartilhar = () => {
    if (!r) return
    const nomeCargo =
      aba === 'dep'
        ? `${dep === 'fed' ? 'Deputado Federal' : uf === 'DF' ? 'Deputado Distrital' : 'Deputado Estadual'} – ${ufNome}`
        : titulo.replace(' · ', ' – ')
    abrirWhatsApp(textoCompartilhar(nomeCargo, r))
    toast.success('Abrindo o WhatsApp com o resumo e o horário da apuração.')
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div className="min-w-0">
          <h2 className="text-[26px] leading-[1.2] font-extrabold">{titulo}</h2>
          <div className="text-[16px] text-muted-foreground">{subtitulo}</div>
        </div>
        {r?.votacaoLiberada && (
          <Button
            variant="outline"
            onClick={compartilhar}
            className="h-12 gap-2 rounded-lg border-2 border-input bg-card px-4 text-[17px] font-bold dark:border-input dark:bg-card [&_svg:not([class*='size-'])]:size-5"
          >
            <MessageCircleIcon />
            Compartilhar no WhatsApp
          </Button>
        )}
      </div>

      {!d && consulta.isPending && <Carregando />}

      {d?.estado === 'erro' && (
        <Cartao role="alert" className="text-[17px]">
          Não foi possível carregar este cargo agora. Tentamos de novo a cada 30
          segundos.
        </Cartao>
      )}

      {d?.estado === 'aguardando' && (
        <Cartao className="text-[17px] text-muted-foreground">
          O TSE ainda não publicou resultados para este cargo.
        </Cartao>
      )}

      {d?.estado === 'sem_segundo_turno' && (
        <SemSegundoTurno
          ufNome={ufNome}
          eleito={gov1?.candidatos.find((c) => c.status === 'eleito') ?? null}
          onVerPresidente={() => onIr({ aba: 'pres' })}
        />
      )}

      {r && !r.votacaoLiberada && (
        <Cartao className="text-[17px]">
          <strong className="block text-[19px] font-extrabold">
            A votação para presidente é liberada às 17h (horário de Brasília)
          </strong>
          <span className="text-muted-foreground">
            É a regra da Justiça Eleitoral para todo o país. Os números aparecem
            aqui sozinhos assim que forem liberados.
          </span>
        </Cartao>
      )}

      {r?.votacaoLiberada && (
        <>
          <NotaFinal r={r} ufNome={ufNome} />
          {aba === 'dep' ? (
            <Deputados
              r={r}
              tipo={dep}
              onTipo={(t) => onIr({ dep: t })}
              uf={uf}
              ufNome={ufNome}
            />
          ) : turno2 ? (
            <Confronto r={r} />
          ) : (
            <ListaCandidatos r={r} />
          )}
          {aba !== 'dep' && <BrancosNulos r={r} />}
          {aba === 'pres' && !turno2 && mapa?.estado === 'ok' && presOk && (
            <MapaPresidente
              ufs={mapa.dados}
              ordemNacional={presOk.candidatos}
              selecionada={mapaUf}
              onSelecionar={onMapaUf}
            />
          )}
        </>
      )}
    </>
  )
}
