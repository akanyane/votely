import { queryOptions } from '@tanstack/react-query'
import { ELEICAO } from '@/config/election'
import type { UF } from '@/lib/votely'
import {
  buscarApuracaoMunicipios,
  buscarHistorico,
  buscarMapa,
  buscarMapaCidades,
  buscarResultado,
  buscarResultadoMunicipio,
} from './api'
import type { CargoLive, MalhaCidades, MunicipiosUf } from './tipos'

/**
 * A cada 30 s; o TanStack Query pausa o intervalo com a aba oculta e
 * atualiza ao voltar (refetchOnWindowFocus).
 */
const vivo = {
  refetchInterval: ELEICAO.atualizacaoMs,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  staleTime: 15_000,
  // Mantém os dados anteriores na tela durante a próxima busca
  placeholderData: <T>(anterior: T | undefined) => anterior,
} as const

export const resultadoQuery = (
  cargo: CargoLive,
  uf: UF | null,
  turno: 1 | 2 = ELEICAO.turno,
) =>
  queryOptions({
    queryKey: ['live', 'resultado', turno, cargo, cargo === 'pres' ? 'br' : uf],
    queryFn: () =>
      buscarResultado({
        data: {
          cargo,
          uf: cargo === 'pres' ? undefined : (uf ?? undefined),
          turno,
        },
      }),
    enabled: cargo === 'pres' || !!uf,
    ...vivo,
  })

export const mapaQuery = () =>
  queryOptions({
    queryKey: ['live', 'mapa', ELEICAO.turno],
    queryFn: () => buscarMapa(),
    ...vivo,
  })

export const historicoQuery = (cargo: CargoLive, uf: UF | null) =>
  queryOptions({
    queryKey: [
      'live',
      'historico',
      ELEICAO.turno,
      cargo,
      cargo === 'pres' ? 'br' : uf,
    ],
    queryFn: () =>
      buscarHistorico({
        data: { cargo, uf: cargo === 'pres' ? undefined : (uf ?? undefined) },
      }),
    ...vivo,
  })

/** Contorno dos municípios (arquivo estático, não muda durante a apuração) */
export const malhaQuery = (uf: UF | 'BR') =>
  queryOptions({
    queryKey: ['municipios', 'malha', uf],
    queryFn: async (): Promise<MunicipiosUf> => {
      const r = await fetch(`/municipios/${uf}.json`)
      if (!r.ok) throw new Error(`malha ${uf}: ${r.status}`)
      return r.json()
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60_000,
  })

export const apuracaoMunicipiosQuery = (uf: UF) =>
  queryOptions({
    queryKey: ['live', 'municipios', ELEICAO.turno, uf],
    queryFn: () => buscarApuracaoMunicipios({ data: { uf } }),
    ...vivo,
  })

export const resultadoMunicipioQuery = (
  cargo: CargoLive,
  uf: UF,
  municipio: string | null,
) =>
  queryOptions({
    queryKey: ['live', 'municipio', ELEICAO.turno, cargo, uf, municipio],
    queryFn: () =>
      buscarResultadoMunicipio({
        data: { cargo, uf, municipio: municipio ?? '' },
      }),
    enabled: !!municipio,
    ...vivo,
    // Trocar de cidade não deve mostrar a anterior
    placeholderData: undefined,
  })

/** Retrato de todas as cidades (muda a cada ~10 min) */
export const mapaCidadesQuery = () =>
  queryOptions({
    queryKey: ['live', 'mapa-cidades', ELEICAO.turno],
    queryFn: () => buscarMapaCidades(),
    ...vivo,
    refetchInterval: 60_000,
  })

/** Contorno de todas as cidades do Brasil (estático, ~250 KB comprimido) */
export const malhaCidadesQuery = () =>
  queryOptions({
    queryKey: ['municipios', 'malha', 'BR-cidades'],
    queryFn: async (): Promise<MalhaCidades> => {
      const r = await fetch('/municipios/BR-cidades.json')
      if (!r.ok) throw new Error(`malha BR-cidades: ${r.status}`)
      return r.json()
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60_000,
  })
