import type {
  Andamento,
  CadeirasAgremiacao,
  CandidatoLive,
  CargoLive,
  ResultadoCargo,
  StatusCandidato,
} from '@/lib/live/tipos'
import { isUf } from '@/lib/votely'
import { numero, type ResultadoRaw } from './schemas'

/** "24/09/2026" + "16:12:52" (horário de Brasília) → ISO com -03:00 */
export function dataHoraBrasilia(d?: string, h?: string): string | null {
  const m = d?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const hora = /^\d{2}:\d{2}:\d{2}$/.test(h ?? '') ? h : '00:00:00'
  // O Brasil não tem horário de verão desde 2019: Brasília é sempre -03:00
  return `${m[3]}-${m[2]}-${m[1]}T${hora}-03:00`
}

const ANDAMENTO: Record<string, Andamento> = {
  n: 'nao_iniciada',
  p: 'parcial',
  f: 'finalizada',
}

/**
 * Situação do candidato SÓ quando o TSE a informa:
 * - Totalização final (tf = "s"): campo `st` literal do TSE.
 * - Antes disso, para presidente e governador: `md` (matematicamente
 *   definido) = "e" ou "s", junto com `e = "s"` do candidato.
 * - Em qualquer outro caso: sem status.
 */
function statusDoTse(
  cargo: CargoLive,
  raw: ResultadoRaw,
  cand: { e?: string; st?: string },
): StatusCandidato | null {
  if (raw.tf === 's') {
    const st = (cand.st ?? '').trim().toLowerCase()
    if (st.startsWith('eleito')) return 'eleito' // Eleito, Eleito por QP, Eleito por média
    if (st.startsWith('2')) return 'segundo_turno' // "2º turno"
    if (st === 'não eleito' || st === 'nao eleito') return 'nao_eleito'
    if (st === 'suplente') return 'suplente'
    return null
  }
  if ((cargo === 'pres' || cargo === 'gov') && cand.e === 's') {
    if (raw.md === 'e') return 'eleito'
    if (raw.md === 's') return 'segundo_turno'
  }
  return null
}

const pct = (v: unknown) => numero(v) ?? 0
const arred = (n: number) => Math.round(n * 1000) / 1000

const TOP_DEPUTADOS = 30
const inteiro = (v: unknown) => Math.round(numero(v) ?? 0)

export function normalizarResultado(
  raw: ResultadoRaw,
  cargo: CargoLive,
): ResultadoCargo {
  const carg = raw.carg[0]
  const proporcional = cargo === 'depfed' || cargo === 'depest'
  const liberada = raw.dv !== 'n'

  const candidatos: CandidatoLive[] = []
  const cadeiras: CadeirasAgremiacao[] = []

  for (const agr of carg.agr) {
    const composta = agr.tp === 'c' || agr.tp === 'f'
    for (const par of agr.par) {
      for (const c of par.cand) {
        candidatos.push({
          sq: c.sqcand ?? '',
          numero: c.n,
          nome: c.nmu ?? c.nm ?? `Nº ${c.n}`,
          // Partidos inaptos vêm com "**" na sigla
          partido: (par.sg ?? '').replace(/\*+$/, ''),
          partidoNome: par.nm ?? '',
          agremiacao: composta ? (agr.nm ?? null) : null,
          votos: liberada ? inteiro(c.vap) : 0,
          pct: liberada ? pct(c.pvapn ?? c.pvap) : 0,
          status: statusDoTse(cargo, raw, c),
          emPosicao: raw.tf !== 's' && c.e === 's',
        })
      }
    }
    const vagas = inteiro(agr.vag)
    if (proporcional && vagas > 0) {
      cadeiras.push({
        nome: agr.nm ?? agr.par[0]?.sg ?? '',
        composicao: agr.tp === 'f' ? (agr.com ?? null) : null,
        tipo: agr.tp === 'f' ? 'federacao' : 'partido',
        cadeiras: vagas,
      })
    }
  }

  // Sempre por votos; desempate estável pelo nome (o `seq` do TSE não é ranking)
  candidatos.sort(
    (a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, 'pt-BR'),
  )
  cadeiras.sort(
    (a, b) => b.cadeiras - a.cadeiras || a.nome.localeCompare(b.nome, 'pt-BR'),
  )

  // Deputados: até ~2.500 candidatos por UF. Dados completos só de quem a
  // interface lista (eleitos/em posição + os mais votados); o resto vai no
  // ranking compacto, suficiente para achar o candidato da colinha.
  let lista = candidatos
  let ranking: ResultadoCargo['ranking'] = null
  if (proporcional) {
    ranking = candidatos.map((c) => [c.numero, c.votos, arred(c.pct)])
    lista = candidatos.filter(
      (c, i) => i < TOP_DEPUTADOS || c.emPosicao || c.status === 'eleito',
    )
  }

  const s = raw.s
  const e = raw.e
  const v = raw.v
  const abr = (raw.cdabr ?? '').toUpperCase()

  return {
    cargo,
    abrangencia: isUf(abr) ? abr : 'br',
    turno: raw.t === '2' ? 2 : 1,
    simulado: raw.f === 's',
    geradoEm: dataHoraBrasilia(raw.dg, raw.hg) ?? new Date(0).toISOString(),
    totalizadoEm: dataHoraBrasilia(raw.dt, raw.ht),
    secoes: {
      total: inteiro(s.ts),
      totalizadas: inteiro(s.st),
      pct: pct(s.pstn ?? s.pst),
    },
    andamento: ANDAMENTO[raw.and ?? ''] ?? 'nao_iniciada',
    final: raw.tf === 's',
    votacaoLiberada: liberada,
    vagas: inteiro(carg.nv) || 1,
    quociente: numero(carg.qe) ?? null,
    candidatos: lista,
    ranking,
    cadeiras,
    totais: {
      validos: inteiro(v.vv),
      brancos: { votos: inteiro(v.vb), pct: pct(v.pvbn ?? v.pvb) },
      nulos: { votos: inteiro(v.tvn), pct: pct(v.ptvnn ?? v.ptvn) },
      abstencao: { votos: inteiro(e.a), pct: pct(e.pan ?? e.pa) },
    },
    semEleitos: raw.esae === 's',
  }
}

/**
 * Identificador de versão para não voltar no tempo quando os arquivos do TSE
 * ficam momentaneamente dessincronizados: `idg` (2026+) ou data/hora de geração.
 */
export function versaoDoArquivo(raw: {
  idg?: string
  dg?: string
  hg?: string
}): number {
  const idg = numero(raw.idg)
  if (idg !== undefined) return idg
  const iso = dataHoraBrasilia(raw.dg, raw.hg)
  return iso ? Date.parse(iso) : 0
}
