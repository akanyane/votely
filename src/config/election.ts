/**
 * Configuração central do Votely Live. Tudo aqui é seguro para o navegador;
 * o que é só do servidor (ambiente do TSE, credenciais) fica em
 * src/server/tse/ambiente.ts.
 */

export type Turno = 1 | 2

export const ELEICAO = {
  /** Turno em exibição no Live. Trocar para 2 depois da totalização do 1º. */
  turno: 1 as Turno,

  turnos: {
    1: {
      data: '2026-10-04',
      rotulo: '1º turno · 4 de outubro',
      // Resolução 23.751/2026, art. 265 §1º: presidente liberado às 17h de Brasília
      liberacao: '2026-10-04T17:00:00-03:00',
    },
    2: {
      data: '2026-10-25',
      rotulo: '2º turno · 25 de outubro',
      liberacao: '2026-10-25T17:00:00-03:00',
    },
  },

  /** Banner "A apuração começou" na colinha. */
  bannerApuracao: false,

  /** Intervalo de atualização no navegador. */
  atualizacaoMs: 30_000,
} as const

export const turnoAtual = () => ELEICAO.turnos[ELEICAO.turno]

export const liberacaoAtual = () => new Date(turnoAtual().liberacao)
