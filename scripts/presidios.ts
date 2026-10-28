/**
 * Votos para presidente só nas seções de presos provisórios (cadeias, CDPs,
 * penitenciárias) e de unidades de internação de adolescentes.
 *
 * Cruza dois arquivos do Portal de Dados Abertos do TSE, achados pela API do
 * portal (nada de URL montada na mão):
 * - eleitorado_local_votacao_2026: seções com DS_TIPO_LOCAL "Preso provisório";
 * - bweb_<turno>t_<UF>: boletim de urna de cada seção (SP passa de 1 GB).
 * Só baixa o boletim das UFs que têm alguma dessas seções.
 *
 * Uso: bun run presidios [--turno 1|2] [--uf SP,BA] [--manter-zips]
 * Saída: resumo no terminal e .cache/presidios/presidios-t<turno>.csv
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ELEICAO } from '../src/config/election'
import { baixar, campos, linhas, recursos, semAcento } from './lib/dadosAbertos'

const args = process.argv.slice(2)
const arg = (nome: string) => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : undefined
}
const turno = Number(arg('--turno') ?? ELEICAO.turno)
if (turno !== 1 && turno !== 2) throw new Error('--turno deve ser 1 ou 2')
const soUfs = arg('--uf')?.toUpperCase().split(',')
const manterZips = args.includes('--manter-zips')

const DIR = '.cache/presidios'

// O TSE marca as duas coisas como "Preso provisório"; o nome do local é o
// único jeito de separar unidade socioeducativa (adolescentes) de presídio.
// Comparado sem acentos. "CASA DE DETENÇÃO/PRISÃO" é presídio; "CASA <cidade>"
// é unidade da Fundação Casa.
const ADOLESCENTES =
  /FUNDACAO CASA|\bCASA\b(?! DE (DETENCAO|PRISAO))|IASES|UNIRE|INTERNA(CAO|TO)|SOCIO ?EDUCATIV|\bCASEM?\b|FUNASE|SUMESE|\bCSE\b|C\.S\.E\.A\.S|\bCEJ\b|JOVEM|ADOLESCENTE|\bUIP?\b/

type Grupo = 'presidio' | 'adolescentes'
type Secao = {
  uf: string
  municipio: string
  zona: string
  secao: string
  local: string
  grupo: Grupo
  aptos: number
  comparecimento: number
  votos: Map<string, number>
  temBu: boolean
}
type Votavel = { nome: string; partido: string }

async function lerSecoes() {
  const zip = join(DIR, 'eleitorado_local_votacao_2026.zip')
  const url = (await recursos('eleitorado-2026')).find((r) =>
    r.url.includes('eleitorado_local_votacao_2026.zip'),
  )?.url
  if (!url) throw new Error('arquivo de locais de votação não achado no portal')
  console.log('baixando locais de votação…')
  await baixar(url, zip)

  const secoes = new Map<string, Secao>()
  let col: Record<string, number> = {}
  let agregadas = 0
  for await (const l of linhas(
    zip,
    'eleitorado_local_votacao_2026_BRASIL.csv',
    '"Preso provis',
  )) {
    const f = campos(l)
    if (f[0] === 'DT_GERACAO') {
      col = Object.fromEntries(f.map((n, i) => [n, i]))
      continue
    }
    if (f[col.CD_TIPO_LOCAL] !== '3' || f[col.NR_TURNO] !== String(turno))
      continue
    const uf = f[col.SG_UF]
    if (soUfs && !soUfs.includes(uf)) continue
    // Seção agregada não tem boletim próprio: os votos saem misturados no
    // boletim da seção principal (em 2026 são 2, ambas com 0 eleitores)
    if (f[col.DS_TIPO_SECAO_AGREGADA] === 'Agregada') {
      agregadas++
      continue
    }
    const local = f[col.NM_LOCAL_VOTACAO]
    const s: Secao = {
      uf,
      municipio: f[col.NM_MUNICIPIO],
      zona: f[col.NR_ZONA],
      secao: f[col.NR_SECAO],
      local,
      grupo: ADOLESCENTES.test(semAcento(local)) ? 'adolescentes' : 'presidio',
      aptos: 0,
      comparecimento: 0,
      votos: new Map(),
      temBu: false,
    }
    secoes.set(`${uf}-${s.zona}-${s.secao}`, s)
  }
  if (agregadas) console.log(`${agregadas} seções agregadas ignoradas`)
  return secoes
}

async function lerBoletins(secoes: Map<string, Secao>) {
  const votaveis = new Map<string, Votavel>()
  const ufs = [...new Set([...secoes.values()].map((s) => s.uf))].sort()
  const bus = await recursos('resultados-2026-boletim-de-urna')
  for (const uf of ufs) {
    const url = bus.find(
      (r) => r.url.endsWith('.zip') && r.url.includes(`/bweb_${turno}t_${uf}_`),
    )?.url
    if (!url) {
      console.error(`${uf}: boletim do ${turno}º turno ainda não publicado`)
      continue
    }
    const zip = join(DIR, url.split('/').pop() as string)
    const t0 = Date.now()
    process.stdout.write(`${uf}: baixando… `)
    await baixar(url, zip)
    process.stdout.write('lendo… ')
    const csv = (url.split('/').pop() as string).replace(/\.zip$/, '.csv')
    let col: Record<string, number> = {}
    for await (const l of linhas(zip, csv, ';"Presidente";')) {
      const f = campos(l)
      if (f[0] === 'DT_GERACAO') {
        col = Object.fromEntries(f.map((n, i) => [n, i]))
        continue
      }
      if (f[col.CD_CARGO_PERGUNTA] !== '1') continue
      const s = secoes.get(`${uf}-${f[col.NR_ZONA]}-${f[col.NR_SECAO]}`)
      if (!s) continue
      s.temBu = true
      s.aptos = Number(f[col.QT_APTOS])
      s.comparecimento = Number(f[col.QT_COMPARECIMENTO])
      const tipo = f[col.DS_TIPO_VOTAVEL]
      const chave = tipo === 'Nominal' ? f[col.NR_VOTAVEL] : tipo
      if (!votaveis.has(chave))
        votaveis.set(chave, {
          nome: tipo === 'Nominal' ? f[col.NM_VOTAVEL] : tipo,
          partido: tipo === 'Nominal' ? f[col.SG_PARTIDO] : '',
        })
      s.votos.set(chave, (s.votos.get(chave) ?? 0) + Number(f[col.QT_VOTOS]))
    }
    if (!manterZips) await rm(zip)
    console.log(`ok (${Math.round((Date.now() - t0) / 1000)} s)`)
  }
  return votaveis
}

function resumo(
  titulo: string,
  lista: Secao[],
  votaveis: Map<string, Votavel>,
) {
  const com = lista.filter((s) => s.temBu)
  const total = new Map<string, number>()
  for (const s of com)
    for (const [k, v] of s.votos) total.set(k, (total.get(k) ?? 0) + v)
  const aptos = com.reduce((a, s) => a + s.aptos, 0)
  const comp = com.reduce((a, s) => a + s.comparecimento, 0)
  const brancos = total.get('Branco') ?? 0
  const nulos = total.get('Nulo') ?? 0
  const nominais = [...total].filter(([k]) => k !== 'Branco' && k !== 'Nulo')
  const validos = nominais.reduce((a, [, v]) => a + v, 0)
  const pct = (n: number, d: number) =>
    d ? `${((100 * n) / d).toFixed(1).replace('.', ',')}%` : '-'

  console.log(`\n== ${titulo}`)
  console.log(
    `${com.length} seções com boletim (de ${lista.length}) · aptos ${aptos} · ` +
      `comparecimento ${comp} (${pct(comp, aptos)})`,
  )
  console.table(
    nominais
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({
        candidato: votaveis.get(k)?.nome,
        partido: votaveis.get(k)?.partido,
        votos: v,
        '% válidos': pct(v, validos),
      })),
  )
  console.log(
    `válidos ${validos} · brancos ${brancos} (${pct(brancos, comp)}) · ` +
      `nulos ${nulos} (${pct(nulos, comp)})`,
  )
}

async function gravarCsv(secoes: Secao[], votaveis: Map<string, Votavel>) {
  const ordem = [...votaveis.keys()].sort((a, b) => {
    const n = (k: string) => (k === 'Branco' || k === 'Nulo' ? 1 : 0)
    return n(a) - n(b) || a.localeCompare(b)
  })
  const q = (s: string | number) => `"${String(s).replaceAll('"', '""')}"`
  const cab = [
    'uf',
    'municipio',
    'zona',
    'secao',
    'local',
    'grupo',
    'tem_boletim',
    'aptos',
    'comparecimento',
    ...ordem.map((k) =>
      k === 'Branco' || k === 'Nulo'
        ? k.toLowerCase()
        : `${k} ${votaveis.get(k)?.nome} (${votaveis.get(k)?.partido})`,
    ),
  ]
  const linhasCsv = secoes.map((s) =>
    [
      s.uf,
      s.municipio,
      s.zona,
      s.secao,
      s.local,
      s.grupo,
      s.temBu ? 'sim' : 'nao',
      s.aptos,
      s.comparecimento,
      ...ordem.map((k) => s.votos.get(k) ?? 0),
    ]
      .map(q)
      .join(';'),
  )
  const arquivo = join(DIR, `presidios-t${turno}.csv`)
  await writeFile(
    arquivo,
    `${[cab.map(q).join(';'), ...linhasCsv].join('\n')}\n`,
  )
  return arquivo
}

await mkdir(DIR, { recursive: true })
const secoes = await lerSecoes()
console.log(`${secoes.size} seções de presos provisórios no ${turno}º turno`)
const votaveis = await lerBoletins(secoes)

const todas = [...secoes.values()].sort(
  (a, b) =>
    a.uf.localeCompare(b.uf) ||
    Number(a.zona) - Number(b.zona) ||
    Number(a.secao) - Number(b.secao),
)
const semBu = todas.filter((s) => !s.temBu)
if (semBu.length)
  console.log(
    `\nsem boletim de presidente: ${semBu.map((s) => `${s.uf} ${s.zona}/${s.secao} ${s.local}`).join('; ')}`,
  )
resumo(
  'Presídios (adultos)',
  todas.filter((s) => s.grupo === 'presidio'),
  votaveis,
)
resumo(
  'Unidades de internação (adolescentes)',
  todas.filter((s) => s.grupo === 'adolescentes'),
  votaveis,
)
resumo('Tudo junto', todas, votaveis)
console.log(`\nseção por seção: ${await gravarCsv(todas, votaveis)}`)
