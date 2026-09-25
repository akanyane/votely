/**
 * Ambiente do TSE (só servidor). Endereços conforme a página de informações
 * técnicas de 2026 e as instruções de download (docs/tse/README.md).
 *
 * TSE_AMBIENTE=simulado | oficial   (padrão: simulado)
 */

export type AmbienteTse = {
  nome: 'simulado' | 'oficial'
  /** <base> do arq[].dir */
  base: string
  /** <ambiente> do arq[].dir */
  ambiente: string
}

const AMBIENTES: Record<AmbienteTse['nome'], AmbienteTse> = {
  simulado: {
    nome: 'simulado',
    base: 'https://resultados-sim.tse.jus.br',
    ambiente: 'simulado/simulado2026',
  },
  oficial: {
    nome: 'oficial',
    base: 'https://resultados.tse.jus.br',
    ambiente: 'oficial',
  },
}

export function ambienteTse(): AmbienteTse {
  const nome = process.env.TSE_AMBIENTE === 'oficial' ? 'oficial' : 'simulado'
  return AMBIENTES[nome]
}

/** EA11: <base>/<ambiente>/comum/config/ele-c.json */
export const urlConfig = (a: AmbienteTse) =>
  `${a.base}/${a.ambiente}/comum/config/ele-c.json`

/** Monta a URL a partir do padrão `dir` do próprio ele-c.json */
export function urlDoPadrao(
  dir: string,
  tokens: Record<string, string>,
  arquivo: string,
): string {
  const caminho = dir.replace(/<([a-z_]+)>/g, (m, k: string) => {
    const v = tokens[k]
    if (v === undefined) throw new Error(`token ${m} sem valor`)
    return v
  })
  return `${caminho}/${arquivo}`
}
