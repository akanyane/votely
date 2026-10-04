/**
 * Cores dos partidos, só para o mapa nacional por cidade (/live/map). O resto
 * do Live continua colorindo por posição no ranking, nunca por partido.
 * Aproximações das cores de cada legenda; ajustar aqui.
 */
const CORES: Record<string, string> = {
  PT: '#c8102e',
  PL: '#1f3f99',
  AVANTE: '#f08a00',
  PSD: '#e3b505',
  MISSÃO: '#7b3fa8',
  NOVO: '#00a3a6',
  UP: '#7a1e1e',
  PSTU: '#e4572e',
  DC: '#3c8d40',
  PCB: '#9e1b32',
  DEMOCRATA: '#4a90d9',
  PCO: '#5a5a5a',
}

const RESERVA = ['#8d6e63', '#607d8b', '#9c27b0', '#795548']

export function corPartido(partido: string, i = 0) {
  return CORES[partido] ?? RESERVA[i % RESERVA.length]
}
