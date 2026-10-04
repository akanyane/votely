/**
 * Gera public/municipios/BR-cidades.json: todos os municípios do Brasil numa
 * só projeção, para o mapa
 * nacional por cidade em /live/map, com o contorno dos estados por cima.
 *
 * Uso: bun run mapa:malha
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MalhaCidades } from '../src/lib/live/tipos'
import { UFS } from '../src/lib/votely'
import { configMunicipios, type Feature, projetar } from './lib/malha'

const LARGURA = 2000

const cfg = await configMunicipios()
const r = await fetch(
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=municipio&qualidade=minima&formato=application/vnd.geo+json',
)
if (!r.ok) throw new Error(`IBGE ${r.status} na malha de municípios`)
const features: Feature[] = (await r.json()).features
const porIbge = new Map(features.map((f) => [f.properties.codarea, f]))

// Contorno dos estados, projetado junto com as cidades para alinhar
const re = await fetch(
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima&formato=application/vnd.geo+json',
)
if (!re.ok) throw new Error(`IBGE ${re.status} na malha dos estados`)
const estados: Feature[] = (await re.json()).features
const { altura, caminho } = projetar([...features, ...estados], LARGURA)

const saida: MalhaCidades = {
  largura: LARGURA,
  altura,
  cidades: [],
  estados: [],
}
const siglaPorIbge = new Map<string, (typeof UFS)[number][0]>()
let semMalha = 0
let vazias = 0
for (const [uf] of UFS) {
  for (const m of cfg.abr.find((a) => a.cd === uf.toLowerCase())?.mu ?? []) {
    siglaPorIbge.set(m.cdi.slice(0, 2), uf)
    const f = porIbge.get(m.cdi)
    if (!f) {
      semMalha++
      continue
    }
    const c = caminho(f)
    if (!c) vazias++
    saida.cidades.push([m.cd, m.nm, uf, c])
  }
}
for (const f of estados) {
  const uf = siglaPorIbge.get(f.properties.codarea)
  if (!uf) throw new Error(`UF sem sigla: ${f.properties.codarea}`)
  saida.estados.push([uf, caminho(f)])
}
const json = JSON.stringify(saida)
await writeFile(
  join(import.meta.dirname, '..', 'public/municipios/BR-cidades.json'),
  json,
)
console.log(
  `BR-cidades: ${saida.cidades.length} municípios · ${(json.length / 1024).toFixed(0)} KB · sem malha ${semMalha} · pequenos demais ${vazias}`,
)
