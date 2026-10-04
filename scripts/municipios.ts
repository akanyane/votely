/**
 * Gera public/municipios/{UF}.json: o contorno de cada município (malha do
 * IBGE, qualidade mínima) já projetado como caminho SVG, com o código do TSE.
 * Gera também public/municipios/BR.json, com o contorno de cada estado.
 * A ligação TSE ↔ IBGE vem do próprio TSE (mun-e<ELEICAO>-cm.json, campo cdi).
 *
 * Uso: bun run municipios
 * Só precisa rodar de novo se o TSE mudar a lista de municípios.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MunicipiosUf } from '../src/lib/live/tipos'
import { nomeUf, UFS } from '../src/lib/votely'
import {
  configMunicipios,
  type Feature,
  malhaIbge,
  projetar,
} from './lib/malha'

const OUT_DIR = join(import.meta.dirname, '..', 'public/municipios')
const LARGURA = 1000

const cfg = await configMunicipios()
await mkdir(OUT_DIR, { recursive: true })
/** Código IBGE da UF (2 dígitos) → sigla, para o mapa do Brasil */
const siglaPorIbge = new Map<string, string>()

for (const [uf] of UFS) {
  const lista = cfg.abr.find((a) => a.cd === uf.toLowerCase())?.mu ?? []
  if (lista.length === 0) throw new Error(`${uf}: sem municípios no TSE`)
  const codUf = lista[0].cdi.slice(0, 2)
  siglaPorIbge.set(codUf, uf)
  const features = await malhaIbge(codUf)
  const porIbge = new Map(features.map((f) => [f.properties.codarea, f]))
  const { altura, caminho } = projetar(features)

  const saida: MunicipiosUf = { largura: LARGURA, altura, municipios: [] }
  const semMalha: string[] = []
  for (const m of lista) {
    const f = porIbge.get(m.cdi)
    // Município novo ainda sem malha: fica na busca, só não aparece no desenho
    if (!f) semMalha.push(m.nm)
    saida.municipios.push([
      m.cd,
      m.nm,
      m.c === 's' ? 1 : 0,
      f ? caminho(f) : '',
    ])
  }
  saida.municipios.sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))

  const json = JSON.stringify(saida)
  await writeFile(join(OUT_DIR, `${uf}.json`), json)
  console.log(
    `${uf}: ${saida.municipios.length} municípios · ${(json.length / 1024).toFixed(0)} KB${semMalha.length ? ` · sem malha: ${semMalha.join(', ')}` : ''}`,
  )
  // Ritmo educado com o IBGE
  await new Promise((r) => setTimeout(r, 300))
}

// Brasil: um contorno por estado, com a sigla no lugar do código do TSE
const r = await fetch(
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima&formato=application/vnd.geo+json',
)
if (!r.ok) throw new Error(`IBGE ${r.status} na malha do Brasil`)
const estados: Feature[] = (await r.json()).features
const brasil = projetar(estados)
const saida: MunicipiosUf = {
  largura: LARGURA,
  altura: brasil.altura,
  municipios: estados.map((f) => {
    const uf = siglaPorIbge.get(f.properties.codarea)
    if (!uf) throw new Error(`UF sem sigla: ${f.properties.codarea}`)
    return [uf, nomeUf(uf), 0, brasil.caminho(f), brasil.rotulo(f)]
  }),
}
const json = JSON.stringify(saida)
await writeFile(join(OUT_DIR, 'BR.json'), json)
console.log(
  `BR: ${saida.municipios.length} estados · ${(json.length / 1024).toFixed(0)} KB`,
)
