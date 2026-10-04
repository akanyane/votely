/**
 * Mapa nacional por cidade (/live/map). Buscar as ~5.570 cidades a cada
 * visita estouraria o limite do TSE; quem busca é o scripts/mapa-cidades.ts,
 * em ritmo controlado, e grava o retrato pronto numa chave do Redis.
 * Aqui só se lê essa chave (com 30 s de memória por instância).
 */
import { ELEICAO } from '@/config/election'
import type { MapaCidades } from '@/lib/live/tipos'
import type { EstadoLive } from './live'
import { redis } from './redis'
import { ambienteTse } from './tse/ambiente'

export const chaveMapaCidades = (ambiente: string, turno: 1 | 2) =>
  `votely:mapa-cidades:v1:${ambiente === 'oficial' ? 'ofi' : 'sim'}:t${turno}`

const MEMORIA_MS = 30_000
let guardado: { em: number; dados: MapaCidades | null } | null = null

export async function mapaCidades(): Promise<EstadoLive<MapaCidades>> {
  if (guardado && Date.now() - guardado.em < MEMORIA_MS) {
    return guardado.dados ? ok(guardado.dados) : { estado: 'aguardando' }
  }
  const r = redis()
  if (!r) return await arquivoLocal()
  try {
    const dados = await r.get<MapaCidades>(
      chaveMapaCidades(ambienteTse().nome, ELEICAO.turno),
    )
    guardado = { em: Date.now(), dados: dados ?? null }
    return dados ? ok(dados) : { estado: 'aguardando' }
  } catch (e) {
    console.error('[mapa-cidades]', e)
    if (guardado?.dados) {
      return {
        estado: 'ok',
        dados: guardado.dados,
        obtidoEm: guardado.dados.geradoEm,
        desatualizado: true,
      }
    }
    return { estado: 'erro', mensagem: 'Não foi possível carregar o mapa.' }
  }
}

const ok = (dados: MapaCidades): EstadoLive<MapaCidades> => ({
  estado: 'ok',
  dados,
  obtidoEm: dados.geradoEm,
  desatualizado: false,
})

/** Desenvolvimento sem Redis: lê o mapa-cidades.json gerado pelo script */
async function arquivoLocal(): Promise<EstadoLive<MapaCidades>> {
  if (process.env.NODE_ENV === 'production') return { estado: 'aguardando' }
  try {
    const { readFile } = await import('node:fs/promises')
    return ok(JSON.parse(await readFile('mapa-cidades.json', 'utf8')))
  } catch {
    return { estado: 'aguardando' }
  }
}
