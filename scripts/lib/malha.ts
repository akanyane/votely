/**
 * Malha do IBGE e lista de municípios do TSE, compartilhadas pelos scripts
 * que geram os mapas (municipios.ts e mapa-cidades-malha.ts).
 */
import {
  ambienteTse,
  urlConfig,
  urlDoPadrao,
} from '../../src/server/tse/ambiente'
import { buscarTse } from '../../src/server/tse/http'
import { configEleicoesSchema } from '../../src/server/tse/schemas'

export type MunCfg = { cd: string; cdi: string; nm: string; c?: string }
export type CfgMunicipios = { abr: { cd: string; mu: MunCfg[] }[] }
export type Anel = [number, number][]
export type Feature = {
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

export async function configMunicipios(): Promise<CfgMunicipios> {
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

export async function malhaIbge(codUf: string): Promise<Feature[]> {
  const url = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${codUf}?intrarregiao=municipio&qualidade=minima&formato=application/vnd.geo+json`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`IBGE ${r.status} em ${url}`)
  return (await r.json()).features
}

/** Equirretangular com correção pela latitude média; y cresce para baixo */
export function projetar(features: Feature[], LARGURA = 1000) {
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

  /** Centro da caixa do maior anel: onde vai a sigla no mapa do Brasil */
  const rotulo = (f: Feature): [number, number] => {
    let melhor: [number, number] = [0, 0]
    let maior = -1
    for (const anel of aneis(f)) {
      const xs = anel.map(([lon]) => (lon - x0) * k * escala)
      const ys = anel.map(([, lat]) => (y1 - lat) * escala)
      const [a, b, c, d] = [
        Math.min(...xs),
        Math.max(...xs),
        Math.min(...ys),
        Math.max(...ys),
      ]
      if ((b - a) * (d - c) > maior) {
        maior = (b - a) * (d - c)
        melhor = [Math.round((a + b) / 2), Math.round((c + d) / 2)]
      }
    }
    return melhor
  }

  return { altura, caminho, rotulo }
}
