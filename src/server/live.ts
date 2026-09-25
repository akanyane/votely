/**
 * Serviço do Votely Live: junta config, cache e normalização num formato que
 * a interface consome. Só servidor.
 */
import { ELEICAO } from '@/config/election'
import type { CargoLive, ResultadoCargo } from '@/lib/live/tipos'
import { type UF, UFS } from '@/lib/votely'
import { lerHistorico, type Snapshot, salvarSnapshot } from './historico'
import {
  obterEleicoes,
  obterResultadoArquivo,
  resolverAlvo,
} from './tse/eleicoes'

export type EstadoLive<T> =
  | { estado: 'aguardando' }
  | { estado: 'sem_segundo_turno' }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'ok'; dados: T; obtidoEm: string; desatualizado: boolean }

export async function resultadoLive(
  cargo: CargoLive,
  abrangencia: UF | 'br',
): Promise<EstadoLive<ResultadoCargo>> {
  try {
    const { dados: eleicoes } = await obterEleicoes()
    const alvo = resolverAlvo(eleicoes, cargo, abrangencia, ELEICAO.turno)
    if (alvo.tipo !== 'arquivo') return { estado: alvo.tipo }
    const r = await obterResultadoArquivo(
      alvo.url,
      alvo.chave,
      cargo,
      salvarSnapshot,
    )
    return {
      estado: 'ok',
      dados: r.dados,
      obtidoEm: new Date(r.obtidoEm).toISOString(),
      desatualizado: r.desatualizado,
    }
  } catch (e) {
    console.error('[live]', cargo, abrangencia, e)
    return {
      estado: 'erro',
      mensagem: 'Não foi possível obter os dados do TSE agora.',
    }
  }
}

export type UfNoMapa = {
  uf: UF
  pctSecoes: number
  top: { sq: string; nome: string; partido: string; pct: number }[]
}

/** Presidente por UF, para o mapa: 27 arquivos, todos com o mesmo cache */
export async function mapaPresidente(): Promise<EstadoLive<UfNoMapa[]>> {
  const porUf = await Promise.all(
    UFS.map(async ([uf]) => [uf, await resultadoLive('pres', uf)] as const),
  )
  const primeiro = porUf.find(([, r]) => r.estado !== 'ok')?.[1]
  if (porUf.every(([, r]) => r.estado !== 'ok')) {
    return primeiro && primeiro.estado !== 'ok'
      ? primeiro
      : { estado: 'erro', mensagem: 'Sem dados' }
  }
  let obtidoEm = ''
  let desatualizado = false
  const dados: UfNoMapa[] = []
  for (const [uf, r] of porUf) {
    if (r.estado !== 'ok') {
      desatualizado = true
      continue
    }
    if (r.obtidoEm > obtidoEm) obtidoEm = r.obtidoEm
    desatualizado ||= r.desatualizado
    dados.push({
      uf,
      pctSecoes: r.dados.secoes.pct,
      top: r.dados.candidatos.slice(0, 3).map((c) => ({
        sq: c.sq,
        nome: c.nome,
        partido: c.partido,
        pct: c.pct,
      })),
    })
  }
  return { estado: 'ok', dados, obtidoEm, desatualizado }
}

export async function historicoLive(
  cargo: CargoLive,
  abrangencia: UF | 'br',
): Promise<Snapshot[]> {
  const r = await resultadoLive(cargo, abrangencia)
  if (r.estado !== 'ok') return []
  try {
    return await lerHistorico(
      r.dados.simulado,
      r.dados.turno,
      cargo,
      abrangencia,
    )
  } catch (e) {
    console.error('[historico]', e)
    return []
  }
}
