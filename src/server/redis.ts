import { Redis } from '@upstash/redis'

let cliente: Redis | null | undefined

/**
 * Upstash Redis criado pelo Marketplace da Vercel (variáveis KV_REST_API_*).
 * Sem credenciais (dev sem .env, testes), devolve null e o Live funciona só
 * com o cache em memória.
 */
export function redis(): Redis | null {
  if (cliente !== undefined) return cliente
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  cliente = url && token ? new Redis({ url, token }) : null
  return cliente
}

/** Só para testes */
export function _definirRedis(r: Redis | null) {
  cliente = r
}
