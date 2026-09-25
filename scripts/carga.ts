/**
 * Teste de carga do Votely Live contra um ambiente de STAGING (deploy de
 * preview da Vercel). Simula usuários abrindo o Live e trocando de aba/UF.
 *
 * Uso:
 *   bun run live:carga --url https://votely-xxxx.vercel.app [--usuarios 30] [--segundos 60]
 *
 * Não aponte para a produção na noite da eleição. O servidor chama o TSE só
 * pelo cache (1 busca por arquivo a cada 30 s), então o teste não aumenta a
 * carga no TSE, mas consome execuções da Vercel e comandos do Redis.
 */
import { UFS } from '../src/lib/votely'

const arg = (nome: string, padrao?: string) => {
  const i = process.argv.indexOf(`--${nome}`)
  return i > 0 ? process.argv[i + 1] : padrao
}

const base = arg('url')?.replace(/\/$/, '')
if (!base) {
  console.error('Informe --url https://<deploy-de-preview>.vercel.app')
  process.exit(1)
}
const usuarios = Number(arg('usuarios', '30'))
const segundos = Number(arg('segundos', '60'))
// Previews são protegidos pela autenticação da Vercel. O token OIDC de
// desenvolvimento (curta duração, baixado pelo `vercel link`/`vercel env pull`
// para o .env.local) dá acesso aos previews do próprio projeto.
const oidc = process.env.VERCEL_OIDC_TOKEN
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

// Entrada no formato seroval, igual ao que o navegador envia (GET ?payload=)
const str = (s: string) => ({ t: 1, s })
const indefinido = { t: 2, s: 1 }
function payload(cargo: string, uf?: string) {
  return JSON.stringify({
    t: {
      t: 10,
      i: 0,
      p: {
        k: ['data'],
        v: [
          {
            t: 10,
            i: 1,
            p: {
              k: ['cargo', 'uf', 'turno'],
              v: [str(cargo), uf ? str(uf) : indefinido, { t: 0, s: 1 }],
            },
            o: 0,
          },
        ],
      },
      o: 0,
    },
    f: 127,
    m: [],
  })
}

const ufs = UFS.map(([uf]) => uf)
const sortear = <T>(xs: readonly T[]) =>
  xs[Math.floor(Math.random() * xs.length)]

function proximaUrl(): string {
  const r = Math.random()
  if (r < 0.4)
    return `${base}/_serverFn/live-buscarResultado?payload=${encodeURIComponent(payload('pres'))}`
  if (r < 0.55) return `${base}/_serverFn/live-buscarMapa`
  const cargo = sortear(['gov', 'sen', 'depfed', 'depest'])
  return `${base}/_serverFn/live-buscarResultado?payload=${encodeURIComponent(payload(cargo, sortear(ufs)))}`
}

const latencias: number[] = []
const status = new Map<string, number>()
const cache = new Map<string, number>()
let bytes = 0
const conta = (m: Map<string, number>, k: string) =>
  m.set(k, (m.get(k) ?? 0) + 1)

const fim = Date.now() + segundos * 1000
async function usuario() {
  while (Date.now() < fim) {
    const t0 = performance.now()
    try {
      const r = await fetch(proximaUrl(), {
        headers: {
          'accept-encoding': 'gzip, br',
          // Como o navegador envia a partir de /live: a proteção CSRF do
          // TanStack Start só aceita chamadas do próprio site
          'x-tsr-serverfn': 'true',
          'sec-fetch-site': 'same-origin',
          referer: `${base}/live`,
          accept:
            'application/x-tss-framed, application/x-ndjson, application/json',
          ...(oidc ? { 'x-vercel-trusted-oidc-idp-token': oidc } : {}),
          ...(bypass ? { 'x-vercel-protection-bypass': bypass } : {}),
        },
      })
      const corpo = await r.arrayBuffer()
      bytes += corpo.byteLength
      conta(status, String(r.status))
      conta(cache, r.headers.get('x-vercel-cache') ?? 'sem cabeçalho')
    } catch (e) {
      conta(status, `erro: ${(e as Error).message.slice(0, 40)}`)
    }
    latencias.push(performance.now() - t0)
    // "Tempo de leitura" de uma pessoa entre cliques
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 800))
  }
}

console.log(`Carga: ${usuarios} usuários por ${segundos}s contra ${base}\n`)
const inicio = Date.now()
await Promise.all(Array.from({ length: usuarios }, usuario))
const duracao = (Date.now() - inicio) / 1000

latencias.sort((a, b) => a - b)
const p = (q: number) =>
  latencias[
    Math.min(latencias.length - 1, Math.floor(q * latencias.length))
  ]?.toFixed(0)
console.log(
  `requisições: ${latencias.length} (${(latencias.length / duracao).toFixed(1)}/s)`,
)
console.log(
  `latência: p50 ${p(0.5)} ms · p95 ${p(0.95)} ms · p99 ${p(0.99)} ms · máx ${latencias.at(-1)?.toFixed(0)} ms`,
)
console.log(
  `transferido: ${(bytes / 1024 / 1024).toFixed(1)} MB (descompactado)`,
)
console.log('status:', Object.fromEntries(status))
console.log('cache da CDN (x-vercel-cache):', Object.fromEntries(cache))
const falhas = [...status]
  .filter(([k]) => !k.startsWith('2'))
  .reduce((s, [, n]) => s + n, 0)
process.exit(falhas > latencias.length * 0.01 ? 1 : 0)
