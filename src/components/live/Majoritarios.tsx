import { CheckIcon, InfoIcon } from 'lucide-react'
import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { CandidatoAvatar } from '@/components/votely/CandidatoAvatar'
import { fmtPct, fmtVotos, ordinal } from '@/lib/live/formato'
import type { CandidatoLive, ResultadoCargo } from '@/lib/live/tipos'
import { Barra, Cartao, Selo } from './partes'

function CardCandidato({
  c,
  pos,
  destaque,
  vaga,
  final,
}: {
  c: CandidatoLive
  pos: number
  destaque: boolean
  vaga: number | null
  final: boolean
}) {
  return (
    <article
      className={`flex min-w-0 flex-col gap-2.5 rounded-xl bg-card px-[18px] py-4 ${destaque ? 'border-2 border-primary' : 'border border-border'}`}
    >
      <div className="flex items-center gap-3">
        <CandidatoAvatar candidato={c} className="size-[52px] *:text-[18px]" />
        <div className="min-w-0 flex-1">
          <div className="text-[20px] leading-[1.2] font-extrabold break-words">
            {c.nome}
          </div>
          <div className="text-[15px] text-muted-foreground">
            <strong className="text-foreground">{c.partido}</strong>
            {c.partidoNome && ` · ${c.partidoNome}`} · Nº {c.numero}
          </div>
        </div>
        <div className="grid h-9 min-w-10 flex-none place-items-center rounded-md bg-track px-2 text-[17px] font-extrabold">
          <span className="sr-only">Posição </span>
          {ordinal(pos)}
        </div>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[34px] leading-[1.05] font-bold tracking-[-0.01em] tabular-nums">
          {fmtPct(c.pct)}
        </span>
        <span className="text-[16px] text-muted-foreground tabular-nums">
          {fmtVotos(c.votos)}
        </span>
      </div>
      <Barra
        valor={c.pct}
        rotulo={`${c.nome}: ${fmtPct(c.pct)} dos votos válidos`}
      />
      {(vaga !== null || c.status) && (
        <div className="flex flex-wrap gap-2">
          {vaga !== null && (
            <span className="inline-flex h-7 items-center rounded-full bg-accent px-2.5 text-[14px] font-extrabold text-accent-foreground">
              {final ? `Vaga ${vaga}` : `Posição de vaga ${vaga}`}
            </span>
          )}
          {c.status && <Selo status={c.status} />}
        </div>
      )}
    </article>
  )
}

/** Presidente, governador e senado (1º turno) */
export function ListaCandidatos({ r }: { r: ResultadoCargo }) {
  const senado = r.cargo === 'sen'
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {r.candidatos.map((c, i) => {
        const pos = i + 1
        // "Posição de vaga" é só a ordem atual; eleição quem diz é o TSE
        const vaga = senado && pos <= r.vagas ? pos : null
        return (
          <Fragment key={c.sq || c.numero}>
            <CardCandidato
              c={c}
              pos={pos}
              destaque={vaga !== null}
              vaga={vaga}
              final={r.final}
            />
            {senado && pos === r.vagas && r.candidatos.length > r.vagas && (
              <div className="col-span-full flex items-center gap-2.5 text-[15px] font-extrabold text-accent-foreground">
                <div className="flex-1 border-t-2 border-dashed border-primary" />
                Acima desta linha:{' '}
                {r.vagas === 1 ? 'a vaga' : `as ${r.vagas} vagas`}
                <div className="flex-1 border-t-2 border-dashed border-primary" />
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

/** 2º turno: dois candidatos lado a lado */
export function Confronto({ r }: { r: ResultadoCargo }) {
  const [a, b] = r.candidatos
  if (!a || !b) return <ListaCandidatos r={r} />
  const diferenca = Math.abs(a.pct - b.pct)
  return (
    <Cartao className="flex flex-col gap-3.5">
      <div className="relative grid grid-cols-2 gap-3">
        {[a, b].map((c, i) => (
          <div
            key={c.sq || c.numero}
            className="flex min-w-0 flex-col items-center gap-2 rounded-lg bg-background px-2.5 py-4 text-center"
          >
            <div className="text-[15px] font-extrabold text-muted-foreground">
              {ordinal(i + 1)}
            </div>
            <CandidatoAvatar
              candidato={c}
              className="size-[72px] *:text-[24px]"
            />
            <div className="text-[20px] leading-[1.2] font-extrabold break-words">
              {c.nome}
            </div>
            <div className="text-[15px] text-muted-foreground">
              {c.partido} · Nº {c.numero}
            </div>
            <div className="text-[36px] leading-[1.05] font-bold tracking-[-0.01em] tabular-nums lg:text-[52px]">
              {fmtPct(c.pct)}
            </div>
            <div className="text-[15px] text-muted-foreground tabular-nums">
              {fmtVotos(c.votos)}
            </div>
            <Barra
              valor={c.pct}
              rotulo={`${c.nome}: ${fmtPct(c.pct)}`}
              className="w-full"
            />
            {c.status && <Selo status={c.status} />}
          </div>
        ))}
        <div
          aria-hidden
          className="absolute top-[118px] left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-border bg-card text-[18px] font-extrabold text-muted-foreground"
        >
          ×
        </div>
      </div>
      <p className="text-center text-[16px] text-muted-foreground">
        Diferença de {fmtPct(diferenca).replace('%', '')} pontos ·{' '}
        {fmtVotos(Math.abs(a.votos - b.votos))}
      </p>
    </Cartao>
  )
}

/** 2º turno, UF onde o governador já foi eleito no 1º */
export function SemSegundoTurno({
  ufNome,
  eleito,
  onVerPresidente,
}: {
  ufNome: string
  eleito: CandidatoLive | null
  onVerPresidente: () => void
}) {
  return (
    <Cartao className="flex flex-col gap-3.5 p-5">
      <div className="flex gap-3">
        <InfoIcon
          className="mt-0.5 size-[26px] flex-none text-accent-foreground"
          strokeWidth={2.2}
        />
        <div>
          <h3 className="text-[22px] leading-[1.25] font-extrabold text-balance">
            Seu estado não tem 2º turno para governador
          </h3>
          <p className="mt-1.5 text-[17px] text-pretty text-muted-foreground">
            A eleição para governador de {ufNome} foi decidida no 1º turno.
            Neste 2º turno, você vota só para Presidente.
          </p>
        </div>
      </div>
      {eleito && (
        <div className="flex items-center gap-3 rounded-lg bg-background p-3.5">
          <CandidatoAvatar
            candidato={eleito}
            className="size-[52px] *:text-[18px]"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[19px] font-extrabold">{eleito.nome}</div>
            <div className="text-[15px] text-muted-foreground">
              {eleito.partido} · Nº {eleito.numero} · {fmtPct(eleito.pct)} dos
              votos válidos
            </div>
          </div>
          {eleito.status && <Selo status={eleito.status} />}
        </div>
      )}
      <Button
        onClick={onVerPresidente}
        className="h-[52px] rounded-lg text-[18px] font-extrabold"
      >
        Ver resultado para Presidente
      </Button>
    </Cartao>
  )
}

export function BrancosNulos({ r }: { r: ResultadoCargo }) {
  const itens = [
    { rotulo: 'Brancos', ...r.totais.brancos },
    { rotulo: 'Nulos', ...r.totais.nulos },
    { rotulo: 'Abstenção', ...r.totais.abstencao },
  ]
  return (
    <Cartao className="px-[18px] py-4">
      <div className="grid grid-cols-3 gap-3">
        {itens.map((x) => (
          <div key={x.rotulo} className="min-w-0">
            <div className="text-[13px] font-extrabold tracking-[0.05em] text-muted-foreground uppercase">
              {x.rotulo}
            </div>
            <div className="text-[24px] font-bold tracking-[-0.01em] tabular-nums">
              {fmtPct(x.pct)}
            </div>
            <div className="text-[14px] text-muted-foreground tabular-nums">
              {fmtVotos(x.votos)}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-border pt-2.5 text-[15px] text-pretty text-muted-foreground">
        Os percentuais dos candidatos consideram só os votos válidos (sem
        brancos e nulos).
      </p>
    </Cartao>
  )
}

/**
 * Nota de destaque quando o TSE conclui a totalização. O texto só descreve o
 * que os status do TSE dizem.
 */
export function NotaFinal({
  r,
  ufNome,
}: {
  r: ResultadoCargo
  ufNome: string
}) {
  if (!r.final) return null
  const nomes = (lista: CandidatoLive[]) =>
    lista.map((c) => c.nome).join(lista.length === 2 ? ' e ' : ', ')
  const eleitos = r.candidatos.filter((c) => c.status === 'eleito')
  const segundo = r.candidatos.filter((c) => c.status === 'segundo_turno')

  let titulo: string | null = null
  let texto = ''
  if (r.cargo === 'depfed' || r.cargo === 'depest') {
    titulo = 'Cadeiras definidas'
    texto = `As ${r.vagas} vagas foram preenchidas em ${ufNome}, segundo a totalização final do TSE.`
  } else if (segundo.length >= 2) {
    titulo = 'Haverá 2º turno em 25 de outubro'
    texto = `${nomes(segundo)} disputam o 2º turno${r.cargo === 'gov' ? ` em ${ufNome}` : ''}.`
  } else if (eleitos.length > 0 && r.cargo === 'sen') {
    titulo = eleitos.length === 1 ? 'Senador eleito' : 'Senadores eleitos'
    texto = `${nomes(eleitos)} ${eleitos.length === 1 ? 'vai' : 'vão'} representar ${ufNome} no Senado.`
  } else if (eleitos.length > 0) {
    titulo = r.cargo === 'pres' ? 'Presidente eleito' : 'Governador eleito'
    texto = `${nomes(eleitos)}, segundo a totalização final do TSE.`
  } else if (r.semEleitos) {
    titulo = 'Totalização sem eleitos'
    texto =
      'O TSE informou que não foi possível atribuir eleitos nesta eleição.'
  }
  if (!titulo) return null

  return (
    <div className="flex gap-3 rounded-xl border border-primary bg-accent p-4">
      <CheckIcon
        className="mt-0.5 size-[22px] flex-none text-accent-foreground"
        strokeWidth={2.4}
      />
      <div>
        <div className="text-[18px] font-extrabold">{titulo}</div>
        <div className="text-[16px] text-pretty">{texto}</div>
      </div>
    </div>
  )
}
