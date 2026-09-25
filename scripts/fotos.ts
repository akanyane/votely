/**
 * Baixa as fotos dos candidatos de 2026 do TSE, cruza com o SQ_CANDIDATO do
 * consulta_cand_2026.zip e salva em public/fotos/{sq}.webp (160px de largura).
 *
 * Uso: bun run fotos [--force]
 *   --force  reconverte fotos que já existem em public/fotos
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const CAND_ZIP = join(ROOT, 'consulta_cand_2026.zip')
const CACHE_DIR = join(ROOT, '.cache/fotos')
const ZIPS_DIR = join(CACHE_DIR, 'zips')
const RAW_DIR = join(CACHE_DIR, 'raw')
const OUT_DIR = join(ROOT, 'public/fotos')

const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'BR',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
]
const zipUrl = (uf: string) =>
  `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_${uf}_div.zip`

// O Akamai do TSE responde 403 para o fetch do Bun/Node e para curl sem
// headers de navegador; curl com HTTP/1.1 + estes headers passa.
const CURL_HEADERS = [
  'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language: pt-BR,pt;q=0.9',
  'Accept-Encoding: gzip, deflate, br',
  'Connection: keep-alive',
  'Upgrade-Insecure-Requests: 1',
]

// Nome dos arquivos nos zips: F{UF}{SQ_CANDIDATO}_div.jpg
const FOTO_RE = /^F[A-Z]{2}(\d+)_div\.jpe?g$/i

const WIDTH = 160
const CONCURRENCY = 8

const force = process.argv.includes('--force')

async function downloadZips() {
  await mkdir(ZIPS_DIR, { recursive: true })
  for (const uf of UFS) {
    const dest = join(ZIPS_DIR, `${uf}.zip`)
    if (existsSync(dest)) continue
    execFileSync('curl', [
      '--http1.1',
      '--fail',
      '--silent',
      '--show-error',
      '--retry',
      '3',
      ...CURL_HEADERS.flatMap((h) => ['-H', h]),
      '-o',
      `${dest}.part`,
      zipUrl(uf),
    ])
    await rename(`${dest}.part`, dest)
    console.log(`baixado ${uf}`)
  }
}

function extractZips() {
  for (const uf of UFS) {
    execFileSync('unzip', [
      '-o',
      '-q',
      join(ZIPS_DIR, `${uf}.zip`),
      '-d',
      RAW_DIR,
    ])
  }
}

/** SQ_CANDIDATO -> nome de urna, lido do consulta_cand_2026_BRASIL.csv */
function readCandidatos() {
  const buf = execFileSync(
    'unzip',
    ['-p', CAND_ZIP, 'consulta_cand_2026_BRASIL.csv'],
    { maxBuffer: 64 * 1024 * 1024 },
  )
  const lines = new TextDecoder('latin1').decode(buf).split(/\r?\n/)
  const header = lines[0].split(';').map((h) => h.replaceAll('"', ''))
  const iSq = header.indexOf('SQ_CANDIDATO')
  const iUf = header.indexOf('SG_UF')
  const iNome = header.indexOf('NM_URNA_CANDIDATO')

  const candidatos = new Map<string, string>()
  for (const line of lines.slice(1)) {
    if (!line) continue
    const cols = line.split(';').map((c) => c.replaceAll('"', ''))
    candidatos.set(cols[iSq], `${cols[iUf]} ${cols[iNome]}`)
  }
  return candidatos
}

async function main() {
  await downloadZips()
  await rm(RAW_DIR, { recursive: true, force: true })
  await mkdir(RAW_DIR, { recursive: true })
  extractZips()
  await mkdir(OUT_DIR, { recursive: true })

  const candidatos = readCandidatos()

  const fotos = new Map<string, string>()
  for (const file of await readdir(RAW_DIR)) {
    const sq = FOTO_RE.exec(file)?.[1]
    if (sq) fotos.set(sq, join(RAW_DIR, file))
  }

  const jobs = [...fotos].filter(
    ([sq]) =>
      candidatos.has(sq) && (force || !existsSync(join(OUT_DIR, `${sq}.webp`))),
  )

  let done = 0
  const worker = async () => {
    for (let job = jobs.pop(); job; job = jobs.pop()) {
      const [sq, src] = job
      await sharp(src)
        .resize({ width: WIDTH, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(join(OUT_DIR, `${sq}.webp`))
      if (++done % 1000 === 0) console.log(`${done} convertidas`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const semFoto = [...candidatos].filter(([sq]) => !fotos.has(sq))
  const semCandidato = [...fotos.keys()].filter((sq) => !candidatos.has(sq))

  console.log(`\ncandidatos: ${candidatos.size}`)
  console.log(
    `com foto: ${candidatos.size - semFoto.length} (${done} convertidas agora)`,
  )
  console.log(`sem foto (usam avatar com iniciais): ${semFoto.length}`)
  for (const [sq, nome] of semFoto) console.log(`  ${sq} ${nome}`)
  if (semCandidato.length) {
    console.log(`fotos sem candidato no CSV: ${semCandidato.length}`)
  }
}

await main()
