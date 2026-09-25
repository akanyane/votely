import { queryOptions } from '@tanstack/react-query'
import { ELEICAO } from '@/config/election'
import type { UF } from '@/lib/votely'
import { buscarHistorico, buscarMapa, buscarResultado } from './api'
import type { CargoLive } from './tipos'

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
