import { describe, expect, test } from 'bun:test'
import { normalizarResultado, versaoDoArquivo } from '@/server/tse/normalizar'
import { numero, resultadoSchema } from '@/server/tse/schemas'
import {
  final,
  lerFixture,
  parcial,
  presidenteAntesDas17h,
  semCargos,
  zeroVotos,
} from '../fixtures/tse/cenarios'

const normalizar = (
  raw: unknown,
  cargo: Parameters<typeof normalizarResultado>[1],
) => normalizarResultado(resultadoSchema.parse(raw), cargo)

describe('numero()', () => {
  test('texto do TSE com vírgula decimal', () => {
    expect(numero('59,351118968')).toBeCloseTo(59.351118968, 9)
    expect(numero('100,00')).toBe(100)
    expect(numero('3393110')).toBe(3393110)
    expect(numero('100')).toBe(100)
  })
  test('ponto decimal não vira milhar', () => {
    expect(numero('59.35')).toBe(59.35)
  })
  test('ausente ou inválido', () => {
    expect(numero(undefined)).toBeUndefined()
    expect(numero('')).toBeUndefined()
    expect(numero('abc')).toBeUndefined()
  })
})

describe('presidente, final (simulado real)', () => {
  const r = normalizar(final('br-c0001-e021270-u.json'), 'pres')

  test('metadados', () => {
    expect(r.abrangencia).toBe('br')
    expect(r.simulado).toBe(true)
    expect(r.final).toBe(true)
    expect(r.andamento).toBe('finalizada')
    expect(r.secoes.pct).toBe(100)
    expect(r.geradoEm).toBe('2026-09-24T16:12:52-03:00')
    expect(r.totalizadoEm).toBe('2026-09-24T16:12:34-03:00')
  })

  test('ordenado por votos (não pelo seq do TSE)', () => {
    const votos = r.candidatos.map((c) => c.votos)
    expect(votos).toEqual([...votos].sort((a, b) => b - a))
    expect(r.candidatos[0].numero).toBe('57')
  })

  test('status vem do `st` do TSE', () => {
    const segundo = r.candidatos.filter((c) => c.status === 'segundo_turno')
    expect(segundo.map((c) => c.numero).sort()).toEqual(['57', '89'])
    expect(r.candidatos.filter((c) => c.status === 'nao_eleito')).toHaveLength(
      11,
    )
  })

  test('nome com caracteres especiais preservado como texto', () => {
    expect(
      r.candidatos.some((c) => c.nome === 'Candidato string 1234!@#$"TSE"'),
    ).toBe(true)
  })

  test('brancos, nulos e abstenção', () => {
    expect(r.totais.brancos.votos).toBe(9118018)
    expect(r.totais.brancos.pct).toBeCloseTo(6.566190705, 6)
    expect(r.totais.abstencao.votos).toBe(24215741)
  })
})

describe('senado SP: 2 vagas', () => {
  const r = normalizar(final('sp-c0005-e021272-u.json'), 'sen')
  test('duas vagas e dois eleitos pelo TSE', () => {
    expect(r.vagas).toBe(2)
    expect(r.candidatos.filter((c) => c.status === 'eleito')).toHaveLength(2)
    expect(r.candidatos.slice(0, 2).every((c) => c.status === 'eleito')).toBe(
      true,
    )
  })
})

describe('deputados', () => {
  const fed = normalizar(final('sp-c0006-e021272-u.json'), 'depfed')
  test('cadeiras por agremiação somam as vagas', () => {
    expect(fed.vagas).toBe(69)
    expect(fed.quociente).toBe(371139)
    expect(fed.cadeiras.reduce((s, c) => s + c.cadeiras, 0)).toBe(69)
    expect(fed.cadeiras.some((c) => c.tipo === 'federacao')).toBe(true)
  })
  test('"Eleito por média" vira eleito; lista traz todos os eleitos', () => {
    expect(fed.candidatos.filter((c) => c.status === 'eleito')).toHaveLength(69)
  })
  test('ranking compacto com todos os candidatos, por votos', () => {
    expect(fed.ranking).toHaveLength(1750)
    const votos = (fed.ranking ?? []).map(([, v]) => v)
    expect(votos).toEqual([...votos].sort((a, b) => b - a))
    // lista completa é bem menor que o total
    expect(fed.candidatos.length).toBeLessThan(120)
    expect(JSON.stringify(fed).length).toBeLessThan(120_000)
  })
  test('majoritários não têm ranking', () => {
    expect(
      normalizar(final('sp-c0003-e021272-u.json'), 'gov').ranking,
    ).toBeNull()
  })
  test('DF: deputado distrital normaliza como depest', () => {
    const df = normalizar(final('df-c0008-e021272-u.json'), 'depest')
    expect(df.abrangencia).toBe('DF')
    expect(df.vagas).toBe(28)
  })
})

describe('antes e durante a apuração', () => {
  test('zero votos: sem status, 0%', () => {
    const r = normalizar(zeroVotos('sp-c0003-e021272-u.json'), 'gov')
    expect(r.andamento).toBe('nao_iniciada')
    expect(r.secoes.pct).toBe(0)
    expect(r.candidatos.every((c) => c.votos === 0 && c.status === null)).toBe(
      true,
    )
    expect(r.totalizadoEm).toBeNull()
  })

  test('parcial sem md: nenhum status, mesmo com e = s', () => {
    const r = normalizar(parcial('sp-c0003-e021272-u.json'), 'gov')
    expect(r.final).toBe(false)
    expect(r.secoes.pct).toBeCloseTo(47.123456789, 9)
    expect(r.candidatos.every((c) => c.status === null)).toBe(true)
  })

  test('parcial com md = s: "vai ao 2º turno" só para quem o TSE marca', () => {
    const r = normalizar(parcial('sp-c0003-e021272-u.json', { md: 's' }), 'gov')
    const marcados = r.candidatos.filter((c) => c.status === 'segundo_turno')
    expect(marcados).toHaveLength(2)
  })

  test('md não vale para senado nem deputados', () => {
    const r = normalizar(parcial('sp-c0005-e021272-u.json', { md: 'e' }), 'sen')
    expect(r.candidatos.every((c) => c.status === null)).toBe(true)
  })

  test('deputados parciais: "em posição" vem do e = s do TSE', () => {
    const r = normalizar(parcial('sp-c0006-e021272-u.json'), 'depfed')
    expect(r.candidatos.filter((c) => c.emPosicao)).toHaveLength(69)
    expect(r.candidatos.every((c) => c.status === null)).toBe(true)
  })

  test('presidente antes das 17h (dv = n): votos zerados e sinalizados', () => {
    const r = normalizar(presidenteAntesDas17h(), 'pres')
    expect(r.votacaoLiberada).toBe(false)
    expect(r.candidatos.every((c) => c.votos === 0 && c.pct === 0)).toBe(true)
  })
})

describe('arquivos malformados ou antigos', () => {
  test('sem carg é rejeitado', () => {
    expect(resultadoSchema.safeParse(semCargos()).success).toBe(false)
  })
  test('campos extras e ausentes não quebram', () => {
    const raw = lerFixture('sp-c0003-e021272-u.json')
    raw.campoNovo = { x: 1 }
    delete raw.v.pvbn
    delete raw.e
    const r = normalizar(raw, 'gov')
    expect(r.totais.abstencao.votos).toBe(0)
    expect(r.totais.brancos.pct).toBeGreaterThan(0) // cai para pvap
  })
  test('arquivo de 2024 (sem idg) também valida', () => {
    const raw = JSON.parse(
      require('node:fs').readFileSync(
        require('node:path').join(
          import.meta.dirname,
          '../fixtures/tse/oficial-2024-sp71072-c0011-e000620-u.json',
        ),
        'utf8',
      ),
    )
    expect(resultadoSchema.safeParse(raw).success).toBe(true)
    expect(versaoDoArquivo(raw)).toBe(Date.parse('2024-10-27T19:57:45-03:00'))
  })
  test('versão usa idg quando existe', () => {
    expect(
      versaoDoArquivo({ idg: '172098798', dg: '24/09/2026', hg: '16:12:52' }),
    ).toBe(172098798)
  })
})
