import {
  CARGOS,
  type CandidatosUF,
  type Cargo,
  type Consulta,
  consultar,
  tituloCompleto,
  type Votos,
} from '@/lib/votely'

export type LinhaResumo = {
  cargo: Cargo
  titulo: string
  digits: string
  consulta: Consulta
}

export function montarResumo(
  uf: string,
  votos: Votos,
  dados: CandidatosUF | undefined,
): LinhaResumo[] {
  return CARGOS.map((cargo) => ({
    cargo,
    titulo: tituloCompleto(cargo, uf),
    digits: votos[cargo.id].digits,
    consulta: consultar(cargo, votos[cargo.id], dados),
  }))
}

export const prontos = (resumo: LinhaResumo[]) =>
  resumo.filter(
    (l) => l.consulta.status === 'branco' || l.consulta.status === 'encontrado',
  ).length

export function textoCompartilhar(uf: string, resumo: LinhaResumo[]) {
  const linhas = resumo.map(({ titulo, consulta, digits }) => {
    switch (consulta.status) {
      case 'branco':
        return `${titulo}: BRANCO – Voto em branco`
      case 'encontrado':
        return `${titulo}: ${consulta.candidato.numero} – ${consulta.candidato.nome} · ${consulta.candidato.sigla}`
      case 'nao_encontrado':
        return `${titulo}: ${digits} – Número não encontrado`
      default:
        return `${titulo}: —`
    }
  })
  return [
    `Minha colinha – Eleições 2026 (${uf})`,
    ...linhas,
    '',
    'Feita no Votely. Confira sempre no TSE.',
  ].join('\n')
}

/** Linha de apoio da colinha impressa/imagem (preto e branco) */
export function legenda({ consulta }: LinhaResumo) {
  switch (consulta.status) {
    case 'branco':
      return 'Aperte a tecla BRANCO'
    case 'encontrado':
      return `${consulta.candidato.nome} · ${consulta.candidato.sigla}`
    case 'nao_encontrado':
      return 'Número não encontrado — confira'
    default:
      return ''
  }
}
