import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, DownloadIcon, MapPinIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AZUL,
  Cabeca,
  Cartao,
  num,
  pct,
  VERDE,
} from '@/components/painel/partes'
import { type Turno, turnoAtual } from '@/config/election'
import { nomeCurto } from '@/lib/painel/dados'
import type {
  AnaliseSecoes,
  Categoria,
  Marca,
  SecaoMarcada,
} from '@/lib/secoes'
import { cn } from '@/lib/utils'

const CATEGORIAS: Record<Categoria, string> = {
  indigena: 'Aldeia / escola indígena',
  prisional: 'Presídio / internação',
  exterior: 'Exterior',
  quilombola: 'Quilombo',
  assentamento: 'Assentamento',
  comum: 'Demais locais',
}

const MARCAS: Record<Marca, string> = {
  cem: '100% para um candidato',
  quase: '95% ou mais para um candidato',
  comparecimento: 'Comparecimento de 97%+',
  biometria: '25%+ liberados sem biometria',
  urna: 'Urna fora do normal',
}

/** Quantas linhas a lista mostra antes do "mostrar mais" */
const PAGINA = 100

const validos = (s: SecaoMarcada) => s.a + s.b + s.outros

const consulta = (turno: Turno) => ({
  queryKey: ['secoes', turno],
  queryFn: async (): Promise<AnaliseSecoes | null> => {
    const r = await fetch(`/data/secoes-t${turno}.json`)
    if (r.status === 404) return null
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  },
  staleTime: Number.POSITIVE_INFINITY,
})

/** /live/secoes: seções com resultado fora da curva, dos boletins de urna */
export function PaginaSecoes({ turno }: { turno: Turno }) {
  const q = useQuery(consulta(turno))
  const outro: Turno = turno === 1 ? 2 : 1

  let conteudo: React.ReactNode
  if (q.isPending) conteudo = <Aviso>Carregando os boletins de urna…</Aviso>
  else if (q.isError)
    conteudo = <Aviso>Não conseguimos carregar a análise agora.</Aviso>
  else if (!q.data)
    conteudo = (
      <Aviso>
        O TSE ainda não publicou os boletins de urna do {turno}º turno nos dados
        abertos (no 1º turno, saíram no dia seguinte à eleição). Esta página é
        atualizada assim que eles saírem.{' '}
        <Link
          to="/live/secoes"
          search={outro === 1 ? { turno: 1 } : {}}
          className="text-[#67E8F9] underline"
        >
          Ver o {outro}º turno
        </Link>
      </Aviso>
    )
  else conteudo = <Analise d={q.data} />

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
      <div className="relative z-[1] mx-auto flex max-w-[1240px] flex-col gap-4 px-[clamp(16px,3vw,36px)] pt-[22px] pb-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={turno === 1 ? '/live/1-turno' : '/live'}
            className="flex min-h-11 items-center gap-0.5 pr-2 text-[15px] font-semibold text-[#8B90A3] no-underline hover:text-[#F4F5F8]"
          >
            <ChevronLeftIcon className="size-5" strokeWidth={2.4} />
            Votely Live
          </Link>
          <div className="flex rounded-[11px] border border-white/[0.08] bg-white/[0.04] p-[3px]">
            {([2, 1] as const).map((t) => (
              <Link
                key={t}
                to="/live/secoes"
                search={t === 2 ? {} : { turno: 1 }}
                aria-current={t === turno ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3.5 py-[7px] text-[13px] font-medium whitespace-nowrap no-underline',
                  t === turno
                    ? 'bg-[#F4F5F8] text-[#090A0F]'
                    : 'text-[#8B90A3] hover:text-[#F4F5F8]',
                )}
              >
                {t}º turno
              </Link>
            ))}
          </div>
        </header>

        <div className="flex flex-col gap-1.5">
          <span className="painel-rotulo">
            PRESIDENTE · {turnoAtual(turno).rotulo.toUpperCase()}
          </span>
          <h1 className="f-display m-0 text-[clamp(26px,4vw,38px)] leading-[1.1] font-bold tracking-[-0.01em] [font-stretch:80%]">
            Seções fora da curva
          </h1>
          <p className="m-0 max-w-[760px] text-[15px] text-pretty text-[#B4B8C7]">
            Todas as seções do país com 100% (ou quase) dos votos para um só
            candidato, comparecimento quase total, muitos eleitores liberados
            sem biometria ou urna fora do normal. Os números são os dos boletins
            de urna publicados pelo TSE, seção por seção.
          </p>
        </div>

        {conteudo}

        <footer className="mt-6 border-t border-white/[0.08] pt-5 text-[13px] text-[#8B90A3]">
          Fonte: boletins de urna e cadastro de locais de votação do Portal de
          Dados Abertos do TSE (dadosabertos.tse.jus.br). O Votely não é um
          serviço oficial da Justiça Eleitoral.
        </footer>
      </div>
    </div>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <Cartao className="p-6 text-[15px] text-pretty text-[#B4B8C7]">
      {children}
    </Cartao>
  )
}

function Analise({ d }: { d: AnaliseSecoes }) {
  const nA = nomeCurto(d.a)
  const nB = nomeCurto(d.b)
  const conta = (m: Marca) => d.secoes.filter((s) => s.marcas.includes(m))
  const validosTotal = d.total.a + d.total.b + d.total.outros
  const atualizado = new Date(d.geradoEm).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  })

  return (
    <>
      {d.faltando.length > 0 && (
        <Aviso>
          Parcial: ainda faltam os boletins de {d.faltando.join(', ')}.
        </Aviso>
      )}
      <ComoLer />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo={`100% para ${nA}`} valor={d.total.cemA} cor={AZUL} />
        <Numero rotulo={`100% para ${nB}`} valor={d.total.cemB} cor={VERDE} />
        <Numero
          rotulo={`95%+ para ${nA}`}
          valor={d.total.quaseA}
          cor={AZUL}
          nota="com 50+ votos válidos"
        />
        <Numero
          rotulo={`95%+ para ${nB}`}
          valor={d.total.quaseB}
          cor={VERDE}
          nota="com 50+ votos válidos"
        />
        <Numero
          rotulo="Comparecimento de 97%+"
          valor={conta('comparecimento').length}
          nota="com 50+ aptos"
        />
        <Numero
          rotulo="25%+ sem biometria"
          valor={conta('biometria').length}
          nota="liberados pelo mesário"
        />
        <Numero
          rotulo="Urna fora do normal"
          valor={conta('urna').length}
          nota="não apurada normalmente"
        />
        <Numero
          rotulo="Seções no total"
          valor={d.total.secoes}
          nota={`${pct((100 * d.total.a) / validosTotal)} × ${pct((100 * d.total.b) / validosTotal)}`}
        />
      </div>

      <Locais d={d} nA={nA} nB={nB} />
      <Faixas d={d} nA={nA} nB={nB} />
      <Lista d={d} nA={nA} nB={nB} />
      <PorUf d={d} nA={nA} nB={nB} />

      <p className="m-0 text-[13px] text-[#8B90A3]">
        Boletins gerados pelo TSE em {d.dataTse}; análise feita em {atualizado}.
      </p>
    </>
  )
}

function ComoLer() {
  return (
    <Cartao className="flex flex-col gap-2 p-5 text-[14px] text-pretty text-[#B4B8C7]">
      <span className="painel-rotulo">COMO LER</span>
      <p className="m-0">
        Seção com 100% para um candidato acontece em toda eleição e para os dois
        lados. Quase sempre é um lugar pequeno e homogêneo: aldeia indígena,
        comunidade isolada, seção com poucos votantes. Por isso a página mostra
        o tamanho e o tipo de cada local, e conta os dois candidatos com a mesma
        régua.
      </p>
      <p className="m-0">
        Um número estranho aqui não é prova de fraude, mas é por onde começar a
        conferir. Cada boletim é impresso e afixado na porta da seção ao fim da
        votação, assinado pelos mesários e conferível pelos fiscais dos
        partidos; o mesmo boletim, com QR Code, está no site de resultados do
        TSE.
      </p>
    </Cartao>
  )
}

function Numero({
  rotulo,
  valor,
  cor,
  nota,
}: {
  rotulo: string
  valor: number
  cor?: string
  nota?: string
}) {
  return (
    <Cartao className="flex flex-col gap-1 p-4">
      <span className="flex items-center gap-2 text-[13px] text-[#B4B8C7]">
        {cor && (
          <span
            className="size-2.5 flex-none rounded-full"
            style={{ background: `rgb(${cor})` }}
          />
        )}
        {rotulo}
      </span>
      <span className="f-display text-[32px] leading-none font-bold tabular-nums [font-stretch:80%]">
        {num(valor)}
      </span>
      {nota && <span className="text-[12px] text-[#8B90A3]">{nota}</span>}
    </Cartao>
  )
}

/** Onde ficam as seções com 100% e 95%+, por tipo de local */
function Locais({ d, nA, nB }: { d: AnaliseSecoes; nA: string; nB: string }) {
  const linhas = useMemo(() => {
    const ext = d.secoes.filter((s) => s.lider === 'a' || s.lider === 'b')
    return (Object.keys(CATEGORIAS) as Categoria[])
      .map((c) => {
        const daqui = ext.filter((s) => s.categoria === c)
        const de = (lado: string, m: Marca) =>
          daqui.filter((s) => s.lider === lado && s.marcas.includes(m)).length
        return {
          c,
          cemA: de('a', 'cem'),
          cemB: de('b', 'cem'),
          quaseA: de('a', 'quase'),
          quaseB: de('b', 'quase'),
        }
      })
      .filter((l) => l.cemA + l.cemB + l.quaseA + l.quaseB > 0)
  }, [d])
  const pequenas = d.secoes.filter(
    (s) => s.marcas.includes('cem') && validos(s) < 10,
  ).length
  const cem = d.total.cemA + d.total.cemB
  // Votos que as seções com 100% deram ao candidato que levou tudo
  const votosCem = (lado: 'a' | 'b') =>
    d.secoes
      .filter((s) => s.marcas.includes('cem') && s.lider === lado)
      .reduce((t, s) => t + s[lado], 0)
  const cemA = votosCem('a')
  const cemB = votosCem('b')

  return (
    <Cartao className="flex flex-col gap-4 p-5">
      <Cabeca numero="01" rotulo="ONDE" titulo="Que lugares são esses" />
      <p className="m-0 text-[14px] text-[#B4B8C7]">
        Juntas, as seções com 100% somam{' '}
        <b className="text-[#F4F5F8]">{num(cemA)}</b> votos para {nA} (
        {pct((100 * cemA) / d.total.a, 3)} dos votos dele) e{' '}
        <b className="text-[#F4F5F8]">{num(cemB)}</b> para {nB} (
        {pct((100 * cemB) / d.total.b, 3)}). A diferença entre os dois no país
        foi de {num(Math.abs(d.total.a - d.total.b))} votos.
      </p>
      <p className="m-0 text-[14px] text-[#B4B8C7]">
        {num(pequenas)} das {num(cem)} seções com 100% tiveram menos de 10 votos
        válidos. O tipo do local vem do cadastro do TSE e do nome e endereço do
        local de votação.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-[#8B90A3]">
              <th className="py-2 pr-3 font-medium">Local</th>
              <th className="px-3 py-2 text-right font-medium">100% {nA}</th>
              <th className="px-3 py-2 text-right font-medium">100% {nB}</th>
              <th className="px-3 py-2 text-right font-medium">95%+ {nA}</th>
              <th className="py-2 pl-3 text-right font-medium">95%+ {nB}</th>
            </tr>
          </thead>
          <tbody className="f-mono tabular-nums">
            {linhas.map((l) => (
              <tr key={l.c} className="border-t border-white/[0.06]">
                <td className="py-2 pr-3 font-sans">{CATEGORIAS[l.c]}</td>
                <td className="px-3 py-2 text-right">{num(l.cemA)}</td>
                <td className="px-3 py-2 text-right">{num(l.cemB)}</td>
                <td className="px-3 py-2 text-right">{num(l.quaseA)}</td>
                <td className="py-2 pl-3 text-right">{num(l.quaseB)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Cartao>
  )
}

/** Histograma: quantas seções dão cada % para o candidato a */
function Faixas({ d, nA, nB }: { d: AnaliseSecoes; nA: string; nB: string }) {
  const [grandes, setGrandes] = useState(true)
  const [foco, setFoco] = useState<number | null>(null)
  const dados = grandes ? d.faixas.grandes : d.faixas.todas
  const max = Math.max(...dados, 1)
  const soma = dados.reduce((a, n) => a + n, 0)
  const W = 1010
  const H = 220
  const larg = W / 101

  return (
    <Cartao className="flex flex-col gap-4 p-5">
      <Cabeca numero="02" rotulo="DISTRIBUIÇÃO" titulo={`% de ${nA} por seção`}>
        <div className="flex rounded-[11px] border border-white/[0.08] bg-white/[0.04] p-[3px]">
          {(
            [
              [true, '100+ votos válidos'],
              [false, 'Todas as seções'],
            ] as const
          ).map(([v, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={grandes === v}
              onClick={() => setGrandes(v)}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-[6px] text-[13px] font-medium whitespace-nowrap',
                grandes === v
                  ? 'bg-[#F4F5F8] text-[#090A0F]'
                  : 'text-[#8B90A3]',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </Cabeca>
      <p className="m-0 min-h-[21px] text-[14px] text-[#B4B8C7]">
        {foco === null ? (
          <>
            Cada barra é uma faixa de 1 ponto: à direita, seções onde {nA}{' '}
            venceu; à esquerda, onde {nB} venceu. Passe o mouse ou toque numa
            barra.
          </>
        ) : (
          <>
            <b className="text-[#F4F5F8]">{num(dados[foco])}</b> seções (
            {pct((100 * dados[foco]) / soma, 1)}) com{' '}
            {foco === 100 ? '100%' : `${foco}% a ${foco}.9%`} dos válidos para{' '}
            {nA} ({foco === 100 ? '0%' : `~${100 - foco}%`} para {nB} e demais)
          </>
        )}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H + 22}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Histograma do percentual de ${nA} por seção`}
        onMouseLeave={() => setFoco(null)}
      >
        <line x1={0} x2={W} y1={H} y2={H} stroke="rgba(255,255,255,0.15)" />
        {dados.map((n, i) => {
          const h = n ? Math.max(1.5, (n / max) * (H - 4)) : 0
          const cor = i > 50 ? AZUL : i < 50 ? VERDE : '139,144,163'
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: faixa fixa de 0 a 100
            <g key={i}>
              <rect
                x={i * larg + 1}
                y={H - h}
                width={larg - 2}
                height={h}
                rx={2}
                fill={`rgba(${cor},${foco === null || foco === i ? 0.85 : 0.35})`}
              />
              {/* biome-ignore lint/a11y/noStaticElementInteractions: alvo do hover, o texto acima repete o valor */}
              <rect
                x={i * larg}
                y={0}
                width={larg}
                height={H}
                fill="transparent"
                onMouseEnter={() => setFoco(i)}
                onClick={() => setFoco(i)}
              />
            </g>
          )
        })}
        {[0, 25, 50, 75, 100].map((p) => (
          <text
            key={p}
            x={p * larg + larg / 2}
            y={H + 17}
            textAnchor={p === 0 ? 'start' : p === 100 ? 'end' : 'middle'}
            className="fill-[#8B90A3] text-[13px]"
          >
            {p}%
          </text>
        ))}
      </svg>
    </Cartao>
  )
}

function Lista({ d, nA, nB }: { d: AnaliseSecoes; nA: string; nB: string }) {
  const [marca, setMarca] = useState<Marca>('cem')
  const [lado, setLado] = useState<'todos' | 'a' | 'b'>('todos')
  const [uf, setUf] = useState('')
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [minimo, setMinimo] = useState(0)
  const [limite, setLimite] = useState(PAGINA)

  const filtradas = useMemo(
    () =>
      d.secoes
        .filter(
          (s) =>
            s.marcas.includes(marca) &&
            (lado === 'todos' || s.lider === lado) &&
            (!uf || s.uf === uf) &&
            (!categoria || s.categoria === categoria) &&
            validos(s) >= minimo,
        )
        .sort((x, y) => validos(y) - validos(x)),
    [d, marca, lado, uf, categoria, minimo],
  )
  const extremo = marca === 'cem' || marca === 'quase'

  const baixar = () => {
    const cab = [
      'uf',
      'municipio',
      'zona',
      'secao',
      'local',
      'tipo_local',
      'aptos',
      'comparecimento',
      nA,
      nB,
      'outros',
      'brancos',
      'nulos',
      'sem_biometria',
      'urna',
      'abertura',
      'encerramento',
      'latitude',
      'longitude',
    ]
    const q = (v: string | number | null) =>
      `"${String(v ?? '').replaceAll('"', '""')}"`
    const csv = [
      cab.map(q).join(';'),
      ...filtradas.map((s) =>
        [
          s.uf,
          s.municipio,
          s.zona,
          s.secao,
          s.local,
          CATEGORIAS[s.categoria],
          s.aptos,
          s.comparecimento,
          s.a,
          s.b,
          s.outros,
          s.brancos,
          s.nulos,
          s.biometria,
          s.urna,
          s.abertura,
          s.encerramento,
          s.lat,
          s.lon,
        ]
          .map(q)
          .join(';'),
      ),
    ].join('\n')
    const url = URL.createObjectURL(
      new Blob([`﻿${csv}\n`], { type: 'text/csv;charset=utf-8' }),
    )
    const el = document.createElement('a')
    el.href = url
    el.download = `secoes-t${d.turno}-${marca}.csv`
    el.click()
    URL.revokeObjectURL(url)
  }

  const campo =
    'min-h-10 rounded-[10px] border border-white/10 bg-[#0E1019] px-3 text-[14px] text-[#F4F5F8]'

  return (
    <Cartao className="flex flex-col gap-4 p-5">
      <Cabeca numero="03" rotulo="SEÇÕES" titulo="Seção por seção">
        <button
          type="button"
          onClick={baixar}
          className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 text-[13px] font-medium hover:bg-white/[0.08]"
        >
          <DownloadIcon className="size-4" />
          Baixar CSV
        </button>
      </Cabeca>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Critério"
          value={marca}
          onChange={(e) => {
            setMarca(e.target.value as Marca)
            setLimite(PAGINA)
          }}
          className={campo}
        >
          {(Object.keys(MARCAS) as Marca[]).map((m) => (
            <option key={m} value={m}>
              {MARCAS[m]}
            </option>
          ))}
        </select>
        {extremo && (
          <select
            aria-label="Candidato"
            value={lado}
            onChange={(e) => setLado(e.target.value as typeof lado)}
            className={campo}
          >
            <option value="todos">Os dois candidatos</option>
            <option value="a">{nA}</option>
            <option value="b">{nB}</option>
          </select>
        )}
        <select
          aria-label="Estado"
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className={campo}
        >
          <option value="">Todas as UFs</option>
          {d.porUf.map((u) => (
            <option key={u.uf} value={u.uf}>
              {u.uf === 'ZZ' ? 'Exterior' : u.uf}
            </option>
          ))}
        </select>
        <select
          aria-label="Tipo de local"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as Categoria | '')}
          className={campo}
        >
          <option value="">Todos os locais</option>
          {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORIAS[c]}
            </option>
          ))}
        </select>
        <select
          aria-label="Mínimo de votos válidos"
          value={minimo}
          onChange={(e) => setMinimo(Number(e.target.value))}
          className={campo}
        >
          {[0, 10, 50, 100, 200].map((n) => (
            <option key={n} value={n}>
              {n ? `${n}+ votos válidos` : 'Qualquer tamanho'}
            </option>
          ))}
        </select>
      </div>

      <p className="m-0 text-[14px] text-[#B4B8C7]">
        {num(filtradas.length)} seções, das maiores para as menores.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-[#8B90A3]">
              <th className="py-2 pr-3 font-medium">Seção</th>
              <th className="px-3 py-2 font-medium">Local</th>
              <th className="px-3 py-2 text-right font-medium">Aptos</th>
              <th className="px-3 py-2 text-right font-medium">Votaram</th>
              <th className="px-3 py-2 text-right font-medium">{nA}</th>
              <th className="px-3 py-2 text-right font-medium">{nB}</th>
              <th className="px-3 py-2 text-right font-medium">
                Outros / br / nulo
              </th>
              <th className="py-2 pl-3 text-right font-medium">
                Sem biometria
              </th>
            </tr>
          </thead>
          <tbody>
            {filtradas.slice(0, limite).map((s) => (
              <tr
                key={`${s.uf}-${s.zona}-${s.secao}`}
                className="border-t border-white/[0.06] align-top"
              >
                <td className="py-2.5 pr-3">
                  <div className="font-medium">
                    {s.municipio} · {s.uf === 'ZZ' ? 'Exterior' : s.uf}
                  </div>
                  <div className="f-mono text-[12px] text-[#8B90A3]">
                    zona {s.zona} · seção {s.secao}
                  </div>
                </td>
                <td className="max-w-[300px] px-3 py-2.5">
                  <div className="text-pretty">{s.local || '—'}</div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-[#8B90A3]">
                    {CATEGORIAS[s.categoria]}
                    {s.urna !== 'Apurada' && <span>· urna: {s.urna}</span>}
                    {s.lat !== null && s.lon !== null && (
                      <a
                        href={`https://www.google.com/maps?q=${s.lat},${s.lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-[#67E8F9]"
                      >
                        <MapPinIcon className="size-3" />
                        mapa
                      </a>
                    )}
                  </div>
                </td>
                <td className="f-mono px-3 py-2.5 text-right tabular-nums">
                  {num(s.aptos)}
                </td>
                <td className="f-mono px-3 py-2.5 text-right tabular-nums">
                  {num(s.comparecimento)}
                  <div className="text-[12px] text-[#8B90A3]">
                    {s.aptos ? pct((100 * s.comparecimento) / s.aptos, 0) : '—'}
                  </div>
                </td>
                <Votos v={s.a} total={validos(s)} cor={AZUL} />
                <Votos v={s.b} total={validos(s)} cor={VERDE} />
                <td className="f-mono px-3 py-2.5 text-right text-[#B4B8C7] tabular-nums">
                  {num(s.outros)} / {num(s.brancos)} / {num(s.nulos)}
                </td>
                <td className="f-mono py-2.5 pl-3 text-right tabular-nums">
                  {num(s.biometria)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtradas.length > limite && (
        <button
          type="button"
          onClick={() => setLimite((l) => l + PAGINA * 5)}
          className="min-h-11 cursor-pointer self-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-[14px] font-medium hover:bg-white/[0.08]"
        >
          Mostrar mais ({num(filtradas.length - limite)} restantes)
        </button>
      )}
    </Cartao>
  )
}

function Votos({ v, total, cor }: { v: number; total: number; cor: string }) {
  return (
    <td className="f-mono px-3 py-2.5 text-right tabular-nums">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2 rounded-full"
          style={{ background: `rgb(${cor})` }}
        />
        {num(v)}
      </span>
      <div className="text-[12px] text-[#8B90A3]">
        {total ? pct((100 * v) / total, 1) : '—'}
      </div>
    </td>
  )
}

function PorUf({ d, nA, nB }: { d: AnaliseSecoes; nA: string; nB: string }) {
  return (
    <Cartao className="flex flex-col gap-4 p-5">
      <Cabeca numero="04" rotulo="ESTADOS" titulo="Por UF" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-[#8B90A3]">
              <th className="py-2 pr-3 font-medium">UF</th>
              <th className="px-3 py-2 text-right font-medium">Seções</th>
              <th className="px-3 py-2 text-right font-medium">
                Comparecimento
              </th>
              <th className="px-3 py-2 text-right font-medium">{nA}</th>
              <th className="px-3 py-2 text-right font-medium">{nB}</th>
              <th className="px-3 py-2 text-right font-medium">100% {nA}</th>
              <th className="px-3 py-2 text-right font-medium">100% {nB}</th>
              <th className="px-3 py-2 text-right font-medium">95%+ {nA}</th>
              <th className="py-2 pl-3 text-right font-medium">95%+ {nB}</th>
            </tr>
          </thead>
          <tbody className="f-mono tabular-nums">
            {d.porUf.map((u) => {
              const val = u.a + u.b + u.outros
              return (
                <tr key={u.uf} className="border-t border-white/[0.06]">
                  <td className="py-2 pr-3 font-sans font-medium">
                    {u.uf === 'ZZ' ? 'Exterior' : u.uf}
                  </td>
                  <td className="px-3 py-2 text-right">{num(u.secoes)}</td>
                  <td className="px-3 py-2 text-right">
                    {pct((100 * u.comparecimento) / u.aptos, 1)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {pct((100 * u.a) / val, 1)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {pct((100 * u.b) / val, 1)}
                  </td>
                  <td className="px-3 py-2 text-right">{num(u.cemA)}</td>
                  <td className="px-3 py-2 text-right">{num(u.cemB)}</td>
                  <td className="px-3 py-2 text-right">{num(u.quaseA)}</td>
                  <td className="py-2 pl-3 text-right">{num(u.quaseB)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Cartao>
  )
}
