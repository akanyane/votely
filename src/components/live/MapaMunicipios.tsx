import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState } from 'react'
import {
  apuracaoMunicipiosQuery,
  malhaQuery,
  resultadoMunicipioQuery,
} from '@/lib/live/consultas'
import { fmtHora, fmtPct, fmtVotos, ordinal } from '@/lib/live/formato'
import type { CargoLive } from '@/lib/live/tipos'
import { nomeUf, type UF } from '@/lib/votely'
import { Barra, Cartao } from './partes'

/** Faixas de % apurado → intensidade da cor primária sobre o fundo da trilha */
const FAIXAS: { ate: number; mistura: number; rotulo: string }[] = [
  { ate: 0, mistura: 0, rotulo: '0%' },
  { ate: 25, mistura: 25, rotulo: 'até 25%' },
  { ate: 50, mistura: 45, rotulo: 'até 50%' },
  { ate: 75, mistura: 65, rotulo: 'até 75%' },
  { ate: 99.999, mistura: 82, rotulo: 'quase lá' },
  { ate: 100, mistura: 100, rotulo: '100%' },
]

const cor = (pct: number | undefined) => {
  const f = FAIXAS.find((x) => (pct ?? 0) <= x.ate) ?? FAIXAS[FAIXAS.length - 1]
  return f.mistura === 0
    ? 'var(--track)'
    : `color-mix(in oklab, var(--primary) ${f.mistura}%, var(--track))`
}

type Props = {
  uf: UF
  cargo: CargoLive
  /** "presidente", "governador"… para os textos */
  nomeCargo: string
}

/** Use com key={uf}: a cidade escolhida volta para a capital ao trocar de UF */
export function MapaMunicipios({ uf, cargo, nomeCargo }: Props) {
  const malha = useQuery(malhaQuery(uf))
  const apuracao = useQuery(apuracaoMunicipiosQuery(uf))
  const idBusca = useId()

  const municipios = malha.data?.municipios ?? []
  const capital = municipios.find((m) => m[2] === 1)?.[0] ?? null
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const sel = escolhida ?? capital
  const [busca, setBusca] = useState('')

  const cidade = useQuery(resultadoMunicipioQuery(cargo, uf, sel))

  const a = apuracao.data?.estado === 'ok' ? apuracao.data.dados : null
  const pct = a?.pct ?? {}

  // 645 caminhos em SP: só redesenha quando os dados mudam, não a seleção
  const desenho = useMemo(
    () =>
      municipios.map(([cd, nome, , d]) =>
        d ? (
          // biome-ignore lint/a11y/noStaticElementInteractions: no teclado, a cidade é escolhida pela busca abaixo (645 contornos seriam 645 paradas de Tab)
          <path
            key={cd}
            d={d}
            fill={cor(pct[cd])}
            onClick={() => setEscolhida(cd)}
            className="cursor-pointer stroke-card hover:opacity-80"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${nome}: ${fmtPct(pct[cd] ?? 0)} apurado`}</title>
          </path>
        ) : null,
      ),
    [municipios, pct],
  )

  if (!malha.data || !a) return null

  const nomes = new Map(municipios.map((m) => [m[0], m[1]]))
  const contornoSel = municipios.find((m) => m[0] === sel)?.[3]
  const valores = municipios.map((m) => pct[m[0]] ?? 0)
  const concluidas = valores.filter((v) => v >= 100).length
  const iniciadas = valores.filter((v) => v > 0).length

  const escolherPorNome = (texto: string) => {
    setBusca(texto)
    const alvo = texto.trim().toLocaleUpperCase('pt-BR')
    const m = municipios.find((x) => x[1] === alvo)
    if (m) {
      setEscolhida(m[0])
      setBusca('')
    }
  }

  const c = cidade.data?.estado === 'ok' ? cidade.data.dados : null
  const nomeSel = sel ? titulo(nomes.get(sel) ?? '') : ''

  return (
    <Cartao className="flex flex-col gap-3.5">
      <div>
        <h3 className="text-[21px] font-extrabold">
          Apuração nas cidades de {nomeUf(uf)}
        </h3>
        <p className="mt-0.5 text-[16px] text-muted-foreground">
          {concluidas} de {municipios.length}{' '}
          {municipios.length === 1 ? 'cidade concluída' : 'cidades concluídas'}{' '}
          · {iniciadas} com votos apurados. Toque numa cidade ou busque pelo
          nome.
        </p>
      </div>

      <svg
        viewBox={`0 0 ${malha.data.largura} ${malha.data.altura}`}
        className="max-h-[440px] w-full"
        role="img"
        aria-label={`Mapa de ${nomeUf(uf)} colorido pelo percentual apurado em cada cidade`}
      >
        {desenho}
        {contornoSel && (
          <path
            d={contornoSel}
            fill="none"
            className="pointer-events-none stroke-foreground"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <div
        className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[14px]"
        aria-hidden
      >
        {FAIXAS.map((f) => (
          <span key={f.rotulo} className="flex items-center gap-1.5">
            <span
              className="size-3.5 rounded-sm border border-border"
              style={{ background: cor(f.ate) }}
            />
            {f.rotulo}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idBusca} className="text-[16px] font-bold">
          Buscar cidade
        </label>
        <input
          id={idBusca}
          list={`${idBusca}-lista`}
          value={busca}
          onChange={(e) => escolherPorNome(e.target.value)}
          placeholder={`Ex.: ${titulo(nomes.get(capital ?? '') ?? '')}`}
          autoComplete="off"
          className="h-12 w-full rounded-lg border-2 border-input bg-field px-3.5 text-[17px] outline-offset-2 focus-visible:ring-4 focus-visible:ring-focus-glow"
        />
        <datalist id={`${idBusca}-lista`}>
          {municipios.map((m) => (
            <option key={m[0]} value={m[1]} />
          ))}
        </datalist>
      </div>

      {sel && (
        <div
          className="flex flex-col gap-2.5 border-t border-border pt-3.5"
          aria-live="polite"
        >
          <div className="text-[18px] font-extrabold">
            {nomeCargo} em {nomeSel}
          </div>
          <Barra
            valor={pct[sel] ?? 0}
            rotulo={`Seções apuradas em ${nomeSel}`}
          />
          <p className="text-[14px] text-muted-foreground">
            {fmtPct(pct[sel] ?? 0)} das seções apuradas
            {c?.totalizadoEm
              ? ` · atualizado às ${fmtHora(c.totalizadoEm)}`
              : ''}
          </p>

          {cidade.isPending && (
            <p className="text-[16px] text-muted-foreground">Carregando…</p>
          )}
          {cidade.data && cidade.data.estado !== 'ok' && (
            <p className="text-[16px] text-muted-foreground">
              Sem resultado desta cidade agora. Tentamos de novo em instantes.
            </p>
          )}
          {c && !c.votacaoLiberada && (
            <p className="text-[16px] text-muted-foreground">
              Os votos para presidente são liberados às 17h.
            </p>
          )}
          {c?.votacaoLiberada &&
            (c.candidatos.every((x) => x.votos === 0) ? (
              <p className="text-[16px] text-muted-foreground">
                Ainda sem votos apurados nesta cidade.
              </p>
            ) : (
              c.candidatos
                .slice(0, cargo.startsWith('dep') ? 5 : 3)
                .map((x, i) => (
                  <div
                    key={x.sq}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1"
                  >
                    <span className="text-[17px] font-bold">
                      {ordinal(i + 1)} {x.nome}{' '}
                      <span className="font-normal text-muted-foreground">
                        · {x.partido}
                      </span>
                    </span>
                    <span className="text-[20px] font-bold tracking-[-0.01em] tabular-nums">
                      {fmtPct(x.pct)}
                    </span>
                    <span className="col-span-full -mt-1 text-[14px] text-muted-foreground">
                      {fmtVotos(x.votos)}
                    </span>
                  </div>
                ))
            ))}
        </div>
      )}
    </Cartao>
  )
}

/** "SÃO JOSÉ DOS CAMPOS" → "São José dos Campos" */
function titulo(nome: string) {
  const minusculas = new Set(['de', 'da', 'do', 'das', 'dos', 'e', "d'"])
  return nome
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((p, i) =>
      i > 0 && minusculas.has(p)
        ? p
        : p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1),
    )
    .join(' ')
}
