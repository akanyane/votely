/**
 * Gera public/data/{UF}.json a partir do consulta_cand_2026.zip do TSE.
 * Cada arquivo tem os candidatos da UF para os cargos da urna, mais os de
 * Presidente, para o app carregar um único arquivo ao escolher o estado.
 *
 * Uso: bun run candidatos
 */
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Candidato, CandidatosUF, Pool } from '../src/lib/votely'

const ROOT = join(import.meta.dirname, '..')
const CAND_ZIP = join(ROOT, 'consulta_cand_2026.zip')
const OUT_DIR = join(ROOT, 'public/data')

const POOL_POR_CARGO: Record<string, Pool> = {
  'DEPUTADO FEDERAL': 'depfed',
  'DEPUTADO ESTADUAL': 'depest',
  'DEPUTADO DISTRITAL': 'depest',
  SENADOR: 'sen',
  GOVERNADOR: 'gov',
  PRESIDENTE: 'pres',
}

function readCsv() {
  const buf = execFileSync(
    'unzip',
    ['-p', CAND_ZIP, 'consulta_cand_2026_BRASIL.csv'],
    { maxBuffer: 64 * 1024 * 1024 },
  )
  const [header, ...rows] = new TextDecoder('latin1')
    .decode(buf)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) =>
      line
        .split(';')
        .map((c) => c.replaceAll('"', '').replace(/\s+/g, ' ').trim()),
    )
  const col = (name: string) => {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`coluna ${name} não encontrada`)
    return i
  }
  const c = {
    uf: col('SG_UF'),
    cargo: col('DS_CARGO'),
    sq: col('SQ_CANDIDATO'),
    numero: col('NR_CANDIDATO'),
    nome: col('NM_URNA_CANDIDATO'),
    sigla: col('SG_PARTIDO'),
    partido: col('NM_PARTIDO'),
    situacao: col('DS_SITUACAO_CANDIDATURA'),
  }
  return rows.map((r) => ({
    uf: r[c.uf],
    cargo: r[c.cargo],
    sq: r[c.sq],
    numero: r[c.numero],
    nome: r[c.nome],
    sigla: r[c.sigla],
    partido: r[c.partido],
    situacao: r[c.situacao],
  }))
}

// Em 25/09/2026 o TSE publica esta coluna vazia ("#NE") para todos. Conferir
// os valores reais quando ela for preenchida e ajustar o mapeamento.
function situacao(ds: string): Candidato['sit'] {
  if (/SUB JUDICE|COM RECURSO|PENDENTE/.test(ds)) return 'sub_judice'
  if (/INDEFERID|INAPTO/.test(ds)) return 'indeferido'
  return undefined
}

async function main() {
  const rows = readCsv()
  const porUf = new Map<string, CandidatosUF>()
  const presidentes: Candidato[] = []

  for (const r of rows) {
    const pool = POOL_POR_CARGO[r.cargo]
    if (!pool) continue // vices e suplentes não são votados separadamente
    const cand: Candidato = {
      sq: r.sq,
      numero: r.numero,
      nome: r.nome,
      sigla: r.sigla,
      partido: r.partido,
    }
    const sit = situacao(r.situacao)
    if (sit) cand.sit = sit

    if (pool === 'pres') {
      presidentes.push(cand)
      continue
    }
    let dados = porUf.get(r.uf)
    if (!dados) {
      dados = { depfed: [], depest: [], sen: [], gov: [], pres: [] }
      porUf.set(r.uf, dados)
    }
    dados[pool].push(cand)
  }

  const byNome = (a: Candidato, b: Candidato) =>
    a.nome.localeCompare(b.nome, 'pt-BR')

  // Candidatos substituídos continuam no CSV com o mesmo número. Sem a
  // situação da candidatura preenchida, fica o registro mais recente (o
  // SQ_CANDIDATO é sequencial).
  let substituidos = 0
  const semSubstituidos = (lista: Candidato[]) => {
    const porNumero = new Map<string, Candidato>()
    for (const c of lista) {
      const atual = porNumero.get(c.numero)
      if (!atual || BigInt(c.sq) > BigInt(atual.sq)) porNumero.set(c.numero, c)
    }
    substituidos += lista.length - porNumero.size
    return [...porNumero.values()]
  }

  const pres = semSubstituidos(presidentes).sort(byNome)
  await mkdir(OUT_DIR, { recursive: true })
  for (const [uf, dados] of [...porUf].sort()) {
    for (const pool of ['depfed', 'depest', 'sen', 'gov'] as const) {
      dados[pool] = semSubstituidos(dados[pool]).sort(byNome)
    }
    dados.pres = pres
    await writeFile(join(OUT_DIR, `${uf}.json`), JSON.stringify(dados))
    const resumo = Object.entries(dados)
      .map(([k, v]) => `${k}=${v.length}`)
      .join(' ')
    console.log(`${uf}: ${resumo}`)
  }
  console.log(`registros substituídos descartados: ${substituidos}`)
}

await main()
