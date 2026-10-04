import { describe, expect, test } from 'bun:test'
import { somarCamara, somarMajoritario } from '@/lib/live/bancadas'
import type {
  CandidatoLive,
  CargoLive,
  ResultadoCargo,
  StatusCandidato,
} from '@/lib/live/tipos'

const cand = (
  partido: string,
  votos: number,
  status: StatusCandidato | null = null,
  emPosicao = false,
): CandidatoLive => ({
  sq: `${partido}-${votos}`,
  numero: '1',
  nome: `Fulano ${partido}`,
  partido,
  partidoNome: `Partido ${partido}`,
  agremiacao: null,
  votos,
  pct: 0,
  status,
  emPosicao,
})

const res = (
  cargo: CargoLive,
  candidatos: CandidatoLive[],
  extra: Partial<ResultadoCargo> = {},
): ResultadoCargo => ({
  cargo,
  abrangencia: 'SP',
  turno: 1,
  simulado: false,
  geradoEm: '2026-10-04T20:00:00-03:00',
  totalizadoEm: null,
  secoes: { total: 100, totalizadas: 50, pct: 50 },
  andamento: 'parcial',
  final: false,
  votacaoLiberada: true,
  vagas: 1,
  quociente: null,
  candidatos,
  ranking: null,
  cadeiras: [],
  totais: {
    validos: 0,
    brancos: { votos: 0, pct: 0 },
    nulos: { votos: 0, pct: 0 },
    abstencao: { votos: 0, pct: 0 },
  },
  semEleitos: false,
  ...extra,
})

describe('somarCamara()', () => {
  test('soma eleitos e em posição por partido, entre UFs', () => {
    const r = somarCamara([
      res(
        'depfed',
        [cand('PA', 9, null, true), cand('PB', 8, null, true), cand('PC', 7)],
        {
          vagas: 2,
          cadeiras: [
            {
              nome: 'Federação X',
              composicao: null,
              tipo: 'federacao',
              cadeiras: 2,
            },
          ],
        },
      ),
      res('depfed', [cand('PA', 9, 'eleito'), cand('PB', 3, 'nao_eleito')], {
        vagas: 1,
        final: true,
        cadeiras: [
          {
            nome: 'Federação X',
            composicao: null,
            tipo: 'federacao',
            cadeiras: 1,
          },
        ],
      }),
      null,
    ])
    expect(r.vagas).toBe(3)
    expect(r.ufsFinais).toBe(1)
    expect(r.ufsComDados).toBe(2)
    expect(
      r.partidos.map((p) => [p.partido, p.eleitos, p.provisorios]),
    ).toEqual([
      ['PA', 1, 1],
      ['PB', 0, 1],
    ])
    expect(r.agremiacoes).toEqual([
      { nome: 'Federação X', tipo: 'federacao', cadeiras: 3 },
    ])
  })

  test('UF sem votação liberada não conta', () => {
    const r = somarCamara([
      res('depfed', [cand('PA', 0, null, true)], {
        secoes: { total: 1, totalizadas: 0, pct: 0 },
      }),
    ])
    expect(r.ufsComDados).toBe(0)
    expect(r.partidos).toEqual([])
  })
})

describe('somarMajoritario()', () => {
  test('parcial: os `vagas` primeiros por votos ficam como à frente', () => {
    const r = somarMajoritario([
      res('sen', [cand('PA', 10), cand('PB', 9), cand('PC', 8)], { vagas: 2 }),
    ])
    expect(r.partidos.map((p) => [p.partido, p.provisorios])).toEqual([
      ['PA', 1],
      ['PB', 1],
    ])
  })

  test('status do TSE manda: eleito e 2º turno', () => {
    const r = somarMajoritario([
      res('gov', [cand('PA', 10, 'eleito'), cand('PB', 2, 'nao_eleito')], {
        final: true,
      }),
      res(
        'gov',
        [cand('PB', 10, 'segundo_turno'), cand('PC', 9, 'segundo_turno')],
        {
          final: true,
        },
      ),
    ])
    expect(r.ufsFinais).toBe(2)
    expect(
      r.partidos.map((p) => [p.partido, p.eleitos, p.segundoTurno]),
    ).toEqual([
      ['PA', 1, 0],
      ['PB', 0, 1],
      ['PC', 0, 1],
    ])
  })
})
