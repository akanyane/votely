import { fmtHora, fmtPct } from '@/lib/live/formato'
import type { ResultadoCargo } from '@/lib/live/tipos'

/**
 * Texto para o WhatsApp. SEMPRE inclui o % apurado e o horário, para quem
 * receber não confundir um resultado parcial com o final.
 */
export function textoCompartilhar(titulo: string, r: ResultadoCargo): string {
  const hora = fmtHora(r.totalizadoEm ?? r.geradoEm)
  const status = r.final
    ? `Resultado FINAL (${fmtPct(r.secoes.pct)} das seções apuradas, ${hora}).`
    : `Resultado PARCIAL: ${fmtPct(r.secoes.pct)} das seções apuradas, atualizado às ${hora}. Ainda pode mudar.`

  const linhas =
    r.cargo === 'depfed' || r.cargo === 'depest'
      ? r.cadeiras.map(
          (c) =>
            `${c.nome}: ${c.cadeiras} ${c.cadeiras === 1 ? 'cadeira' : 'cadeiras'}`,
        )
      : r.candidatos
          .slice(0, 5)
          .map((c, i) => `${i + 1}º ${c.nome} (${c.partido}) ${fmtPct(c.pct)}`)

  return [
    `${titulo}${r.turno === 2 ? ' (2º turno)' : ''}`,
    status,
    '',
    ...linhas,
    '',
    'Fonte: TSE · via Votely Live',
    'https://votely.akanyane.dev/live',
  ].join('\n')
}

export function abrirWhatsApp(texto: string) {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(texto)}`,
    '_blank',
    'noopener',
  )
}
