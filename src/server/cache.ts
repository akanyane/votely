/**
 * Cache em duas camadas para arquivos do TSE:
 *
 * 1. Memória da instância (com deduplicação de chamadas simultâneas).
 * 2. Redis compartilhado entre instâncias, com trava: só quem pega a trava
 *    busca no TSE; as demais leem o resultado dela.
 *
 * Se a busca falhar, devolve o último dado válido marcado como desatualizado.
 * Se o Redis falhar ou não existir, segue só com a memória.
 */
import { redis } from './redis'

export type Entrada<T> = {
  dados: T
  /** Versão do arquivo (idg ou data/hora de geração); nunca retrocede */
  versao: number
  etag: string | null
  /** Última vez que conseguimos um dado válido do TSE (ms) */
  obtidoEm: number
  /** Última vez que conferimos o TSE, com ou sem mudança (ms) */
  conferidoEm: number
}

export type Resultado<T> = {
  dados: T
  obtidoEm: number
  desatualizado: boolean
}

export type Buscador<T> = (
  anterior: Entrada<T> | null,
) => Promise<
  { dados: T; versao: number; etag: string | null } | 'nao_modificado'
>

const memoria = new Map<string, Entrada<unknown>>()
const emAndamento = new Map<string, Promise<Resultado<unknown>>>()

/**
 * Versão do formato guardado. Suba sempre que ResultadoCargo ou a
 * normalização mudarem: dados antigos no Redis passam a ser ignorados.
 */
const FORMATO = 2
const PREFIXO = `votely:tse:v${FORMATO}:`
const TRAVA_MS = 15_000
const GUARDAR_REDIS_S = 7 * 24 * 3600

export let comandosRedis = 0

async function lerRedis<T>(chave: string): Promise<Entrada<T> | null> {
  const r = redis()
  if (!r) return null
  try {
    comandosRedis++
    return (await r.get<Entrada<T>>(PREFIXO + chave)) ?? null
  } catch (e) {
    console.error('[cache] redis get falhou', e)
    return null
  }
}

async function gravarRedis<T>(chave: string, e: Entrada<T>) {
  const r = redis()
  if (!r) return
  try {
    comandosRedis++
    await r.set(PREFIXO + chave, e, { ex: GUARDAR_REDIS_S })
  } catch (err) {
    console.error('[cache] redis set falhou', err)
  }
}

async function pegarTrava(
  chave: string,
): Promise<'ok' | 'ocupada' | 'sem_redis'> {
  const r = redis()
  if (!r) return 'sem_redis'
  try {
    comandosRedis++
    const ok = await r.set(`${PREFIXO}trava:${chave}`, 1, {
      nx: true,
      px: TRAVA_MS,
    })
    return ok ? 'ok' : 'ocupada'
  } catch {
    return 'sem_redis'
  }
}

async function soltarTrava(chave: string) {
  const r = redis()
  if (!r) return
  try {
    comandosRedis++
    await r.del(`${PREFIXO}trava:${chave}`)
  } catch {}
}

const fresco = (e: Entrada<unknown> | null | undefined, ttlMs: number) =>
  !!e && Date.now() - e.conferidoEm < ttlMs

const comoResultado = <T>(
  e: Entrada<T>,
  desatualizado: boolean,
): Resultado<T> => ({
  dados: e.dados,
  obtidoEm: e.obtidoEm,
  desatualizado,
})

/** Mantém a versão mais nova entre duas entradas */
function maisNova<T>(a: Entrada<T> | null, b: Entrada<T> | null) {
  if (!a) return b
  if (!b) return a
  if (a.versao !== b.versao) return a.versao > b.versao ? a : b
  return a.conferidoEm >= b.conferidoEm ? a : b
}

export async function obterComCache<T>(
  chave: string,
  ttlMs: number,
  buscar: Buscador<T>,
): Promise<Resultado<T>> {
  const local = memoria.get(chave) as Entrada<T> | undefined
  if (fresco(local, ttlMs)) return comoResultado(local as Entrada<T>, false)

  const pendente = emAndamento.get(chave)
  if (pendente) return pendente as Promise<Resultado<T>>

  const p = (async (): Promise<Resultado<T>> => {
    let atual = maisNova(local ?? null, await lerRedis<T>(chave))
    if (atual && fresco(atual, ttlMs)) {
      memoria.set(chave, atual)
      return comoResultado(atual, false)
    }

    const trava = await pegarTrava(chave)
    if (trava === 'ocupada') {
      // Outra instância está buscando: esperar o resultado dela por até ~3 s
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 250))
        const outra = await lerRedis<T>(chave)
        if (outra && fresco(outra, ttlMs)) {
          memoria.set(chave, outra)
          return comoResultado(outra, false)
        }
      }
      if (atual) return comoResultado(atual, false)
      // Sem nada guardado: buscar mesmo assim
    }

    try {
      const r = await buscar(atual)
      const agora = Date.now()
      if (r === 'nao_modificado') {
        if (!atual) throw new Error('304 sem entrada anterior')
        atual = { ...atual, conferidoEm: agora }
      } else if (atual && r.versao < atual.versao) {
        // Arquivo mais antigo que o que já temos (geração dessincronizada)
        atual = { ...atual, conferidoEm: agora }
      } else {
        atual = { ...r, obtidoEm: agora, conferidoEm: agora }
      }
      memoria.set(chave, atual)
      await gravarRedis(chave, atual)
      return comoResultado(atual, false)
    } catch (e) {
      console.error(
        `[cache] falha ao atualizar ${chave}:`,
        e instanceof Error ? e.message : e,
      )
      if (atual) {
        // Continua servindo o último dado válido; tenta de novo no próximo ciclo
        return comoResultado(atual, true)
      }
      throw e
    } finally {
      if (trava === 'ok') await soltarTrava(chave)
    }
  })()

  emAndamento.set(chave, p)
  try {
    return await p
  } finally {
    emAndamento.delete(chave)
  }
}

/** Só para testes */
export function _limparCache() {
  memoria.clear()
  emAndamento.clear()
  comandosRedis = 0
}
