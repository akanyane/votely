/**
 * Presidente seção por seção, no Brasil todo: acha as seções com resultado
 * extremo (100% ou 95%+ para um candidato), comparecimento quase total,
 * muita gente liberada sem biometria ou urna fora do normal, e resume tudo
 * por UF.
 *
 * Lê do Portal de Dados Abertos do TSE, achados pela API do portal:
 * - bweb_<turno>t_<UF>: boletim de urna de cada seção (SP passa de 1 GB);
 * - eleitorado_local_votacao_2026: nome, tipo e coordenadas do local, só
 *   para as seções que entraram na lista.
 *
 * Uso: bun run secoes [--turno 1|2] [--uf SP,BA] [--manter-zips]
 * Saída: public/data/secoes-t<turno>.json (lido pela página /live/secoes)
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ELEICAO } from '../src/config/election'
import type {
  AnaliseSecoes,
  Candidato,
  Categoria,
  Marca,
  ResumoUf,
  SecaoMarcada,
} from '../src/lib/secoes'
import { baixar, campos, linhas, recursos, semAcento } from './lib/dadosAbertos'

const args = process.argv.slice(2)
const arg = (nome: string) => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : undefined
}
const turno = Number(arg('--turno') ?? ELEICAO.turno) as 1 | 2
if (turno !== 1 && turno !== 2) throw new Error('--turno deve ser 1 ou 2')
const soUfs = arg('--uf')?.toUpperCase().split(',')
const manterZips = args.includes('--manter-zips')

const DIR = '.cache/secoes'
const SAIDA = `public/data/secoes-t${turno}.json`

// Critérios das marcas (ver src/lib/secoes.ts)
const QUASE = 0.95
const MIN_VALIDOS = 50
const COMPARECIMENTO = 0.97
const MIN_APTOS = 50
const BIOMETRIA = 0.25
const GRANDE = 100

type Secao = {
  uf: string
  municipio: string
  zona: number
  secao: number
  aptos: number
  comparecimento: number
  biometria: number
  urna: string
  abertura: string
  encerramento: string
  brancos: number
  nulos: number
  votos: Map<string, number>
}

const horaLocal = (dt: string) => dt.slice(11, 16)
const chave = (uf: string, zona: number | string, secao: number | string) =>
  `${uf}-${Number(zona)}-${Number(secao)}`

const nomes = new Map<string, Omit<Candidato, 'votos'>>()
let dataTse = ''

async function lerUf(url: string, uf: string, secoes: Secao[]) {
  const zip = join(DIR, url.split('/').pop() as string)
  const t0 = Date.now()
  process.stdout.write(`${uf}: baixando… `)
  await baixar(url, zip)
  process.stdout.write('lendo… ')
  const csv = (url.split('/').pop() as string).replace(/\.zip$/, '.csv')
  const daUf = new Map<string, Secao>()
  let col: Record<string, number> = {}
  for await (const l of linhas(zip, csv, ';"Presidente";')) {
    const f = campos(l)
    if (f[0] === 'DT_GERACAO') {
      col = Object.fromEntries(f.map((n, i) => [n, i]))
      continue
    }
    if (f[col.CD_CARGO_PERGUNTA] !== '1') continue
    if (!dataTse) dataTse = `${f[col.DT_GERACAO]} ${f[col.HH_GERACAO]}`
    const k = chave(uf, f[col.NR_ZONA], f[col.NR_SECAO])
    let s = daUf.get(k)
    if (!s) {
      s = {
        uf,
        municipio: f[col.NM_MUNICIPIO],
        zona: Number(f[col.NR_ZONA]),
        secao: Number(f[col.NR_SECAO]),
        aptos: Number(f[col.QT_APTOS]),
        comparecimento: Number(f[col.QT_COMPARECIMENTO]),
        biometria: Number(f[col.QT_ELEI_BIOM_SEM_HABILITACAO]) || 0,
        urna: f[col.DS_TIPO_URNA],
        abertura: horaLocal(f[col.DT_ABERTURA]),
        encerramento: horaLocal(f[col.DT_ENCERRAMENTO]),
        brancos: 0,
        nulos: 0,
        votos: new Map(),
      }
      daUf.set(k, s)
    }
    const tipo = f[col.DS_TIPO_VOTAVEL]
    const n = Number(f[col.QT_VOTOS])
    if (tipo === 'Branco') s.brancos += n
    else if (tipo === 'Nulo') s.nulos += n
    else {
      const nr = f[col.NR_VOTAVEL]
      if (!nomes.has(nr))
        nomes.set(nr, {
          numero: nr,
          nome: f[col.NM_VOTAVEL],
          partido: f[col.SG_PARTIDO],
        })
      s.votos.set(nr, (s.votos.get(nr) ?? 0) + n)
    }
  }
  for (const s of daUf.values()) secoes.push(s)
  if (!manterZips) await rm(zip)
  console.log(`${daUf.size} seções (${Math.round((Date.now() - t0) / 1000)} s)`)
}

/** Os dois mais votados no país; a é o de menor número, como no painel */
function duelo(secoes: Secao[]): [Candidato, Candidato] {
  const total = new Map<string, number>()
  for (const s of secoes)
    for (const [nr, v] of s.votos) total.set(nr, (total.get(nr) ?? 0) + v)
  const [x, y] = [...total]
    .sort((p, q) => q[1] - p[1])
    .map(([nr, votos]) => ({ ...(nomes.get(nr) as Candidato), votos }))
  if (!x || !y) throw new Error('menos de dois candidatos nos boletins')
  return Number(x.numero) <= Number(y.numero) ? [x, y] : [y, x]
}

function vazio(): Omit<ResumoUf, 'uf'> {
  return {
    secoes: 0,
    aptos: 0,
    comparecimento: 0,
    a: 0,
    b: 0,
    outros: 0,
    brancos: 0,
    nulos: 0,
    cemA: 0,
    cemB: 0,
    quaseA: 0,
    quaseB: 0,
  }
}

/** Pelo cadastro e pelo nome, endereço e bairro do local */
function categoria(uf: string, texto: string, tipoLocal: string): Categoria {
  const nome = semAcento(texto.toUpperCase())
  if (uf === 'ZZ') return 'exterior'
  if (tipoLocal === '3') return 'prisional'
  if (/ALDEIA|INDIGENA|\bTERRA IND|\bPOLO BASE\b/.test(nome)) return 'indigena'
  if (/QUILOMB/.test(nome)) return 'quilombola'
  if (/ASSENTAMENTO/.test(nome)) return 'assentamento'
  return 'comum'
}

/** Nome, tipo e coordenadas do local das seções marcadas */
async function locais(marcadas: Map<string, SecaoMarcada>) {
  const zip = join(DIR, 'eleitorado_local_votacao_2026.zip')
  const url = (await recursos('eleitorado-2026')).find((r) =>
    r.url.includes('eleitorado_local_votacao_2026.zip'),
  )?.url
  if (!url) throw new Error('arquivo de locais de votação não achado no portal')
  console.log('locais de votação: baixando…')
  await baixar(url, zip)
  const [ano, mes, dia] = ELEICAO.turnos[turno].data.split('-')
  let col: Record<string, number> = {}
  let achados = 0
  for await (const l of linhas(
    zip,
    'eleitorado_local_votacao_2026_BRASIL.csv',
    `;"${dia}/${mes}/${ano}";`,
  )) {
    const f = campos(l)
    if (f[0] === 'DT_GERACAO') {
      col = Object.fromEntries(f.map((n, i) => [n, i]))
      continue
    }
    const s = marcadas.get(chave(f[col.SG_UF], f[col.NR_ZONA], f[col.NR_SECAO]))
    if (!s || s.local) continue
    s.local = f[col.NM_LOCAL_VOTACAO]
    s.categoria = categoria(
      s.uf,
      `${s.local} ${f[col.DS_ENDERECO]} ${f[col.NM_BAIRRO]}`,
      f[col.CD_TIPO_LOCAL],
    )
    const lat = Number(f[col.NR_LATITUDE])
    const lon = Number(f[col.NR_LONGITUDE])
    // O TSE usa -1 quando o local não tem coordenada
    if (lat && lon && lat !== -1 && lon !== -1) {
      s.lat = lat
      s.lon = lon
    }
    achados++
  }
  console.log(`locais achados: ${achados} de ${marcadas.size}`)
}

await mkdir(DIR, { recursive: true })
await mkdir('public/data', { recursive: true })

const bus = await recursos('resultados-2026-boletim-de-urna')
const todas = bus
  .filter((r) => r.url.endsWith('.zip') && r.url.includes(`/bweb_${turno}t_`))
  .map((r) => ({
    url: r.url,
    uf: (r.url.match(/bweb_\dt_([A-Z]{2})_/) as RegExpMatchArray)[1],
  }))
const UFS =
  'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO ZZ'.split(
    ' ',
  )
const faltando = UFS.filter(
  (uf) => (!soUfs || soUfs.includes(uf)) && !todas.some((r) => r.uf === uf),
)
if (
  faltando.length === UFS.length ||
  (soUfs && faltando.length === soUfs.length)
) {
  console.error(`boletins do ${turno}º turno ainda não publicados no portal`)
  process.exit(1)
}
if (faltando.length) console.error(`ainda sem boletim: ${faltando.join(', ')}`)

const secoes: Secao[] = []
for (const { url, uf } of todas) {
  if (soUfs && !soUfs.includes(uf)) continue
  await lerUf(url, uf, secoes)
}

const [a, b] = duelo(secoes)
const total = vazio()
const porUf = new Map<string, ResumoUf>()
const faixas = {
  todas: Array<number>(101).fill(0),
  grandes: Array<number>(101).fill(0),
}
const marcadas = new Map<string, SecaoMarcada>()

for (const s of secoes) {
  const va = s.votos.get(a.numero) ?? 0
  const vb = s.votos.get(b.numero) ?? 0
  let validos = 0
  let topo: [string, number] = ['', 0]
  for (const [nr, v] of s.votos) {
    validos += v
    if (v > topo[1]) topo = [nr, v]
  }
  const lado = topo[0] === a.numero ? 'a' : topo[0] === b.numero ? 'b' : topo[0]
  const fracao = validos ? topo[1] / validos : 0

  const marcas: Marca[] = []
  if (validos > 0 && fracao === 1) marcas.push('cem')
  else if (validos >= MIN_VALIDOS && fracao >= QUASE) marcas.push('quase')
  if (s.aptos >= MIN_APTOS && s.comparecimento / s.aptos >= COMPARECIMENTO)
    marcas.push('comparecimento')
  if (
    s.comparecimento >= MIN_VALIDOS &&
    s.biometria / s.comparecimento >= BIOMETRIA
  )
    marcas.push('biometria')
  if (s.urna !== 'Apurada') marcas.push('urna')

  const u =
    porUf.get(s.uf) ??
    (porUf.set(s.uf, { uf: s.uf, ...vazio() }).get(s.uf) as ResumoUf)
  for (const r of [u, total]) {
    r.secoes++
    r.aptos += s.aptos
    r.comparecimento += s.comparecimento
    r.a += va
    r.b += vb
    r.outros += validos - va - vb
    r.brancos += s.brancos
    r.nulos += s.nulos
    if (marcas.includes('cem') && lado === 'a') r.cemA++
    if (marcas.includes('cem') && lado === 'b') r.cemB++
    if (marcas.includes('quase') && lado === 'a') r.quaseA++
    if (marcas.includes('quase') && lado === 'b') r.quaseB++
  }
  if (validos > 0) {
    const i = Math.floor((100 * va) / validos)
    faixas.todas[i]++
    if (validos >= GRANDE) faixas.grandes[i]++
  }

  if (marcas.length)
    marcadas.set(chave(s.uf, s.zona, s.secao), {
      uf: s.uf,
      municipio: s.municipio,
      zona: s.zona,
      secao: s.secao,
      local: '',
      categoria: s.uf === 'ZZ' ? 'exterior' : 'comum',
      lat: null,
      lon: null,
      aptos: s.aptos,
      comparecimento: s.comparecimento,
      a: va,
      b: vb,
      outros: validos - va - vb,
      brancos: s.brancos,
      nulos: s.nulos,
      biometria: s.biometria,
      urna: s.urna,
      abertura: s.abertura,
      encerramento: s.encerramento,
      lider: marcas.includes('cem') || marcas.includes('quase') ? lado : null,
      marcas,
    })
}

await locais(marcadas)

const saida: AnaliseSecoes = {
  turno,
  geradoEm: new Date().toISOString(),
  dataTse,
  a,
  b,
  faltando,
  total,
  porUf: [...porUf.values()].sort((x, y) => x.uf.localeCompare(y.uf)),
  faixas,
  secoes: [...marcadas.values()].sort(
    (x, y) =>
      x.uf.localeCompare(y.uf) ||
      x.municipio.localeCompare(y.municipio) ||
      x.zona - y.zona ||
      x.secao - y.secao,
  ),
}
await writeFile(SAIDA, JSON.stringify(saida))

const conta = (m: Marca) => saida.secoes.filter((s) => s.marcas.includes(m))
console.log(`\n${total.secoes} seções · ${a.nome} (a) × ${b.nome} (b)`)
console.table({
  '100% a': total.cemA,
  '100% b': total.cemB,
  '95%+ a': total.quaseA,
  '95%+ b': total.quaseB,
  comparecimento: conta('comparecimento').length,
  biometria: conta('biometria').length,
  urna: conta('urna').length,
})
console.log(`${saida.secoes.length} seções marcadas → ${SAIDA}`)
