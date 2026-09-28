/**
 * Gera public/municipios/{UF}.json: o contorno de cada município (malha do
 * IBGE, qualidade mínima) já projetado como caminho SVG, com o código do TSE.
 * A ligação TSE ↔ IBGE vem do próprio TSE (mun-e<ELEICAO>-cm.json, campo cdi).
 *
 * Uso: bun run municipios
 * Só precisa rodar de novo se o TSE mudar a lista de municípios.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MunicipiosUf } from '../src/lib/live/tipos'
import { UFS } from '../src/lib/votely'
import { ambienteTse, urlConfig, urlDoPadrao } from '../src/server/tse/ambiente'
import { buscarTse } from '../src/server/tse/http'
import { configEleicoesSchema } from '../src/server/tse/schemas'

const OUT_DIR = join(import.meta.dirname, '..', 'public/municipios')
const LARGURA = 1000

type MunCfg = { cd: string; cdi: string; nm: string; c?: string }
type CfgMunicipios = { abr: { cd: string; mu: MunCfg[] }[] }
type Anel = [number, number][]
type Feature = {
  properties: { codarea: string }
  geometry:
    | { type: 'Polygon'; coordinates: Anel[] }
    | { type: 'MultiPolygon'; coordinates: Anel[][] }
}

async function texto(url: string) {
  const r = await buscarTse(url, null)
  if (r.tipo !== 'ok') throw new Error(`sem corpo: ${url}`)
  return r.corpo
}

async function configMunicipios(): Promise<CfgMunicipios> {
  const amb = ambienteTse()
  const cfg = configEleicoesSchema.parse(
    JSON.parse(await texto(urlConfig(amb))),
  )
  const dir = cfg.arq.find((a) => a.tp === 'cm')?.dir
  const pl = cfg.pl.find((p) => p.e.some((e) => e.tp === '8'))
  const fed = pl?.e.find((e) => e.tp === '8' && e.t === '1')
  if (!dir || !pl?.c || !fed)
    throw new Error('ele-c.json sem config de municípios')
  const url = urlDoPadrao(
    dir,
    { base: amb.base, ambiente: amb.ambiente, ciclo: pl.c, cd_eleicao: fed.cd },
    `mun-e${fed.cd.padStart(6, '0')}-cm.json`,
  )
  return JSON.parse(await texto(url))
}

async function malhaIbge(codUf: string): Promise<Feature[]> {
  const url = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${codUf}?intrarregiao=municipio&qualidade=minima&formato=application/vnd.geo+json`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`IBGE ${r.status} em ${url}`)
  return (await r.json()).features
}

/** Equirretangular com correção pela latitude média; y cresce para baixo */
function projetar(features: Feature[]) {
  const aneis = (f: Feature) =>
    f.geometry.type === 'Polygon'
      ? f.geometry.coordinates
      : f.geometry.coordinates.flat()
  let [x0, x1, y0, y1] = [180, -180, 90, -90]
  for (const f of features)
    for (const a of aneis(f))
      for (const [lon, lat] of a) {
        x0 = Math.min(x0, lon)
        x1 = Math.max(x1, lon)
        y0 = Math.min(y0, lat)
        y1 = Math.max(y1, lat)
      }
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180)
  const escala = LARGURA / ((x1 - x0) * k)
  const altura = Math.ceil((y1 - y0) * escala)

  const caminho = (f: Feature) =>
    aneis(f)
      .map((anel) => {
        let [px, py] = [0, 0]
        const partes: string[] = []
        for (const [lon, lat] of anel) {
          const x = Math.round((lon - x0) * k * escala)
          const y = Math.round((y1 - lat) * escala)
          if (partes.length === 0) partes.push(`M${x} ${y}`)
          else if (x !== px || y !== py) partes.push(`${x - px} ${y - py}`)
          ;[px, py] = [x, y]
        }
        // "M x y l dx dy dx dy …z": coordenadas relativas deixam o arquivo menor
        return partes.length > 2
          ? `${partes[0]}l${partes.slice(1).join(' ')}z`
          : ''
      })
      .join('')

  return { altura, caminho }
}

const cfg = await configMunicipios()
await mkdir(OUT_DIR, { recursive: true })

for (const [uf] of UFS) {
  const lista = cfg.abr.find((a) => a.cd === uf.toLowerCase())?.mu ?? []
  if (lista.length === 0) throw new Error(`${uf}: sem municípios no TSE`)
  const codUf = lista[0].cdi.slice(0, 2)
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
