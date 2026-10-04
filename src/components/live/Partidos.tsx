import { useQuery } from '@tanstack/react-query'
import type { BancadaPartido, CasaNacional } from '@/lib/live/bancadas'
import { bancadasQuery } from '@/lib/live/consultas'
import { fmtHora, fmtNum } from '@/lib/live/formato'
import { Carregando } from './Carregando'
import { Barra, Cartao } from './partes'

const MAX_LINHAS = 12

/** Aba "Partidos": soma nacional por partido, a partir das 27 UFs */
export function Partidos() {
  const q = useQuery(bancadasQuery())
  const d = q.data

  if (!d && q.isPending) return <Carregando />
  if (d?.estado !== 'ok') {
    return (
      <Cartao role="alert" className="text-[17px]">
        Não foi possível somar os resultados dos estados agora. Tentamos de novo
        a cada 2 minutos.
      </Cartao>
    )
  }
  const { camara, senado, governo } = d.dados

  return (
    <>
      <p className="text-[16px] text-pretty text-muted-foreground">
        Soma dos 27 estados, como o TSE marca em cada um:{' '}
        <strong>eleitos</strong> na totalização final e, enquanto a apuração é
        parcial, <strong>à frente</strong> ou em posição de eleição. Atualizado
        às {fmtHora(d.obtidoEm)}.
      </p>

      <Casa
        titulo="Câmara dos Deputados"
        casa={camara}
        rotuloProvisorio="em posição de eleição"
        rodape={
          camara.agremiacoes.length > 0 && (
            <details className="mt-1 text-[16px]">
              <summary className="cursor-pointer font-bold">
                Cadeiras por federação ou partido (como o TSE distribui)
              </summary>
              <ul className="mt-2 flex flex-col">
                {camara.agremiacoes.map((a) => (
                  <li
                    key={a.nome}
                    className="flex justify-between gap-3 border-t border-border py-2"
                  >
                    <span className="min-w-0 break-words">{a.nome}</span>
                    <strong className="tabular-nums">
                      {fmtNum(a.cadeiras)}
                    </strong>
                  </li>
                ))}
              </ul>
            </details>
          )
        }
      />
      <Casa titulo="Senado" casa={senado} rotuloProvisorio="à frente" />
      <Casa
        titulo="Governadores"
        casa={governo}
        rotuloProvisorio="à frente"
        segundoTurno
      />
    </>
  )
}

function Casa({
  titulo,
  casa,
  rotuloProvisorio,
  segundoTurno = false,
  rodape,
}: {
  titulo: string
  casa: CasaNacional
  rotuloProvisorio: string
  segundoTurno?: boolean
  rodape?: React.ReactNode
}) {
  const final = casa.ufsFinais === 27
  const linhas = casa.partidos.slice(0, MAX_LINHAS)
  const resto = casa.partidos.length - linhas.length

  return (
    <Cartao className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[21px] font-extrabold">{titulo}</h3>
          <p className="mt-0.5 text-[16px] text-muted-foreground">
            {fmtNum(casa.vagas)} {casa.vagas === 1 ? 'vaga' : 'vagas'} em 2026 ·{' '}
            {casa.ufsFinais} de 27 estados com resultado final
          </p>
        </div>
        {!final && (
          <span className="inline-flex h-7 items-center rounded-full border border-input px-2.5 text-[14px] font-extrabold text-muted-foreground">
            Parcial
          </span>
        )}
      </div>

      {linhas.length === 0 ? (
        <p className="text-[16px] text-muted-foreground">
          Ainda não há resultados para somar.
        </p>
      ) : (
        <ul className="flex flex-col">
          {linhas.map((p) => (
            <Linha
              key={p.partido}
              p={p}
              vagas={casa.vagas}
              rotuloProvisorio={rotuloProvisorio}
              segundoTurno={segundoTurno}
            />
          ))}
        </ul>
      )}
      {casa.ufsSemEleitos > 0 && (
        <p className="text-[15px] text-pretty text-muted-foreground">
          Em {casa.ufsSemEleitos}{' '}
          {casa.ufsSemEleitos === 1 ? 'estado' : 'estados'}, o TSE informou que
          não foi possível atribuir todos os eleitos; essas vagas ficam fora da
          soma até a definição.
        </p>
      )}
      {resto > 0 && (
        <p className="text-[15px] text-muted-foreground">
          e mais {resto} {resto === 1 ? 'partido' : 'partidos'}
        </p>
      )}
      {rodape}
    </Cartao>
  )
}

function Linha({
  p,
  vagas,
  rotuloProvisorio,
  segundoTurno,
}: {
  p: BancadaPartido
  vagas: number
  rotuloProvisorio: string
  segundoTurno: boolean
}) {
  const soma = p.eleitos + p.provisorios
  const detalhes = [
    p.eleitos > 0 &&
      `${fmtNum(p.eleitos)} ${p.eleitos === 1 ? 'eleito' : 'eleitos'}`,
    p.provisorios > 0 && `${fmtNum(p.provisorios)} ${rotuloProvisorio}`,
    segundoTurno &&
      p.segundoTurno > 0 &&
      `${fmtNum(p.segundoTurno)} no 2º turno`,
  ].filter(Boolean)

  return (
    <li className="flex flex-col gap-1.5 border-t border-border py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[17px] font-extrabold">{p.partido}</span>{' '}
          <span className="text-[14px] text-muted-foreground break-words">
            {p.partidoNome}
          </span>
        </div>
        <strong className="text-[19px] tabular-nums">{fmtNum(soma)}</strong>
      </div>
      <Barra
        valor={vagas ? (soma / vagas) * 100 : 0}
        rotulo={`${p.partido}: ${fmtNum(soma)} de ${fmtNum(vagas)}`}
      />
      <div className="text-[14px] text-muted-foreground">
        {detalhes.join(' · ')}
      </div>
    </li>
  )
}
