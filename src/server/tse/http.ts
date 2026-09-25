/**
 * Único ponto de saída para o TSE. Regras oficiais (docs/tse/README.md):
 * máximo de 100 req/s por IP, bloqueio de 10 min (renovado) se exceder, e
 * vários 404 também podem bloquear o IP.
 *
 * Aqui ficamos MUITO abaixo disso: no máximo MAX_POR_SEGUNDO por instância,
 * poucas em paralelo, e qualquer sinal de bloqueio pausa tudo por 10 min.
 */

const MAX_POR_SEGUNDO = 8
const MAX_PARALELO = 4
const TIMEOUT_MS = 10_000
const PAUSA_BLOQUEIO_MS = 11 * 60_000

const USER_AGENT = 'Votely/1.0 (+https://votely.akanyane.dev)'

export class ErroTse extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ErroTse'
    this.status = status
  }
}

type Resposta =
  | { tipo: 'ok'; corpo: string; etag: string | null }
  | { tipo: 'nao_modificado' }

// ---------- ritmo global (token bucket) + concorrência ----------

let fichas = MAX_POR_SEGUNDO
let ultimaRecarga = Date.now()
let emVoo = 0
let pausadoAte = 0

async function aguardarVez() {
  for (;;) {
    const agora = Date.now()
    if (agora < pausadoAte) {
      throw new ErroTse('Acesso ao TSE pausado após sinal de bloqueio')
    }
    fichas = Math.min(
      MAX_POR_SEGUNDO,
      fichas + ((agora - ultimaRecarga) / 1000) * MAX_POR_SEGUNDO,
    )
    ultimaRecarga = agora
    if (fichas >= 1 && emVoo < MAX_PARALELO) {
      fichas -= 1
      emVoo += 1
      return
    }
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100))
  }
}

// ---------- recuo exponencial por URL ----------

const falhas = new Map<string, { n: number; ate: number }>()

function emRecuo(url: string) {
  const f = falhas.get(url)
  return f && Date.now() < f.ate
}

function registrarFalha(url: string, status?: number) {
  const n = (falhas.get(url)?.n ?? 0) + 1
  // 404: o arquivo não existe (ainda). Esperar bastante para não acumular 404s.
  const base = status === 404 ? 5 * 60_000 : 2_000 * 2 ** Math.min(n, 7)
  const espera = Math.min(base, 10 * 60_000) * (0.8 + Math.random() * 0.4)
  falhas.set(url, { n, ate: Date.now() + espera })
}

export async function buscarTse(
  url: string,
  etag?: string | null,
): Promise<Resposta> {
  if (emRecuo(url)) throw new ErroTse('Em recuo após falha recente')
  await aguardarVez()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        ...(etag ? { 'If-None-Match': etag } : {}),
      },
    })
    if (r.status === 304) {
      falhas.delete(url)
      return { tipo: 'nao_modificado' }
    }
    if (r.status === 403 || r.status === 429) {
      // Possível bloqueio: respeitar os 10 min do TSE para todas as URLs
      pausadoAte = Date.now() + PAUSA_BLOQUEIO_MS
      console.error(`[tse] ${r.status} em ${url}: pausando acesso por 11 min`)
    }
    if (!r.ok) {
      registrarFalha(url, r.status)
      throw new ErroTse(`HTTP ${r.status}`, r.status)
    }
    const corpo = await r.text()
    falhas.delete(url)
    return { tipo: 'ok', corpo, etag: r.headers.get('etag') }
  } catch (e) {
    if (!(e instanceof ErroTse)) registrarFalha(url)
    throw e instanceof ErroTse
      ? e
      : new ErroTse(e instanceof Error ? e.message : String(e))
  } finally {
    clearTimeout(timer)
    emVoo -= 1
  }
}

/** Só para testes */
export function _reiniciarHttp() {
  fichas = MAX_POR_SEGUNDO
  ultimaRecarga = Date.now()
  emVoo = 0
  pausadoAte = 0
  falhas.clear()
}
