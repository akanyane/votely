import { describe, expect, test } from 'bun:test'
import { ultimaRodada } from '@/components/live/GraficoEvolucao'

const s = (t: string, p: number) => ({ t, p, c: [] })

describe('ultimaRodada()', () => {
  test('apuração real: % só cresce, fica tudo', () => {
    const r = ultimaRodada([
      s('2026-10-04T17:10:00-03:00', 5),
      s('2026-10-04T17:20:00-03:00', 20),
    ])
    expect(r.map((x) => x.p)).toEqual([5, 20])
  })
  test('simulado: testes de dias diferentes na mesma chave, fica o último', () => {
    const r = ultimaRodada([
      s('2026-09-29T15:04:00-03:00', 7),
      s('2026-09-28T15:06:00-03:00', 7),
      s('2026-09-28T16:37:00-03:00', 100),
      s('2026-09-29T15:34:00-03:00', 50),
    ])
    expect(r.map((x) => x.p)).toEqual([7, 50])
  })
})
