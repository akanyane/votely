import { SearchIcon, SearchXIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OTPField, OTPFieldInput } from '@/components/ui/otp-field'
import { type Cargo, type Consulta, tituloCargo, type Voto } from '@/lib/votely'
import { CandidatoAvatar } from './CandidatoAvatar'

type Props = {
  ordem: number
  cargo: Cargo
  uf: string
  ufNome: string
  voto: Voto
  consulta: Consulta
  /** 2ª vaga de senador igual à 1ª */
  repetido: boolean
  onDigits: (digits: string) => void
  onBranco: (branco: boolean) => void
  onBuscar: () => void
}

export function CardCargo({
  ordem,
  cargo,
  uf,
  ufNome,
  voto,
  consulta,
  repetido,
  onDigits,
  onBranco,
  onBuscar,
}: Props) {
  const titulo = tituloCargo(cargo, uf)
  const naoEncontrado = consulta.status === 'nao_encontrado'

  return (
    <Card className="gap-4 rounded-xl p-5 text-[18px] ring-border">
      <div className="flex items-center gap-3">
        <div className="grid size-9 flex-none place-items-center rounded-full bg-accent text-[17px] font-extrabold text-accent-foreground">
          {ordem}
        </div>
        <div className="min-w-0">
          <h3 className="text-[22px] leading-[1.2] font-extrabold">{titulo}</h3>
          <div className="text-[16px] text-muted-foreground">
            {cargo.vaga && `${cargo.vaga} · `}
            {cargo.digitos} dígitos
          </div>
        </div>
      </div>

      {voto.branco ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-dashed border-input p-4">
          <div>
            <div className="text-[21px] font-extrabold">Voto em branco</div>
            <div className="text-[16px] text-pretty text-muted-foreground">
              Na urna, aperte a tecla BRANCO e depois CONFIRMA.
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => onBranco(false)}
            className="h-12 rounded-md border-input bg-card px-[18px] text-[17px] font-bold dark:border-input dark:bg-card"
          >
            Desfazer
          </Button>
        </div>
      ) : (
        <>
          {/* O OTPField só aceita aria-label nas casas 2+; a 1ª usa este <label> */}
          <label htmlFor={`otp-${cargo.id}`} className="sr-only">
            Número para {titulo}
            {cargo.vaga && `, ${cargo.vaga}`}
          </label>
          <OTPField
            id={`otp-${cargo.id}`}
            length={cargo.digitos}
            value={voto.digits}
            onValueChange={onDigits}
            validationType="numeric"
            inputMode="numeric"
            autoComplete="off"
            className="max-w-full"
          >
            {Array.from({ length: cargo.digitos }, (_, i) => (
              <OTPFieldInput
                // biome-ignore lint/suspicious/noArrayIndexKey: casas são posições fixas
                key={i}
                aria-label={
                  i > 0 ? `Dígito ${i + 1} de ${cargo.digitos}` : undefined
                }
                aria-invalid={naoEncontrado || undefined}
                className="h-[68px] w-[54px] rounded-lg border-2 border-input bg-field font-mono text-[34px] leading-none font-bold caret-primary focus:border-primary focus:ring-4 focus:ring-focus-glow focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-focus-glow aria-invalid:border-destructive aria-invalid:ring-0 aria-invalid:focus:ring-4 aria-invalid:focus:ring-focus-glow dark:bg-field"
              />
            ))}
          </OTPField>

          <EstadoConsulta
            cargo={cargo}
            titulo={titulo}
            ufNome={ufNome}
            voto={voto}
            consulta={consulta}
            repetido={repetido}
          />
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Button
          variant="secondary"
          onClick={onBuscar}
          className="h-[50px] gap-2 rounded-lg px-4 text-[18px] font-extrabold [&_svg:not([class*='size-'])]:size-5"
        >
          <SearchIcon strokeWidth={2.6} />
          Não sei o número
        </Button>
        {!voto.branco &&
          (voto.digits ? (
            <Button
              variant="ghost"
              onClick={() => onDigits('')}
              className="h-12 px-3 text-[17px] font-bold text-muted-foreground"
            >
              Apagar
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => onBranco(true)}
              className="h-12 px-3 text-[17px] font-normal text-muted-foreground underline underline-offset-3"
            >
              Votar em branco
            </Button>
          ))}
      </div>
    </Card>
  )
}

function EstadoConsulta({
  cargo,
  titulo,
  ufNome,
  voto,
  consulta,
  repetido,
}: {
  cargo: Cargo
  titulo: string
  ufNome: string
  voto: Voto
  consulta: Consulta
  repetido: boolean
}) {
  switch (consulta.status) {
    case 'vazio':
      return (
        <p className="-mt-1 text-[17px] text-muted-foreground">
          Digite os {cargo.digitos} números do seu candidato.
        </p>
      )

    case 'carregando':
      return (
        <div role="status" className="flex items-center gap-3.5">
          <div className="size-16 flex-none animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2.5 text-[17px] text-muted-foreground">
              <span className="inline-block size-[18px] flex-none animate-[spin_0.8s_linear_infinite] rounded-full border-3 border-border border-t-primary" />
              Buscando candidato…
            </div>
            <div className="h-3 w-3/5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-md bg-muted" />
          </div>
        </div>
      )

    case 'nao_encontrado':
      return (
        <Aviso
          tom="danger"
          icone={<SearchXIcon />}
          titulo="Número não encontrado"
        >
          Não há candidato com o número {voto.digits} para {titulo} em {ufNome}.
          Confira o número ou toque em “Não sei o número”.
        </Aviso>
      )

    case 'encontrado': {
      const c = consulta.candidato
      return (
        <>
          <div className="flex items-center gap-3.5">
            <CandidatoAvatar candidato={c} />
            <div className="min-w-0">
              <div className="text-[23px] leading-[1.2] font-extrabold">
                {c.nome}
              </div>
              <div className="text-[16px] text-muted-foreground">
                <strong className="text-foreground">{c.sigla}</strong> ·{' '}
                {c.partido} · Nº {c.numero}
              </div>
            </div>
          </div>
          {repetido ? (
            <Aviso
              tom="warn"
              icone={<TriangleAlertIcon />}
              titulo="Candidato repetido"
            >
              Você já escolheu esta pessoa na 1ª vaga. Na 2ª vaga, escolha outro
              candidato.
            </Aviso>
          ) : c.sit === 'sub_judice' ? (
            <Aviso
              tom="warn"
              icone={<TriangleAlertIcon />}
              titulo="Candidatura sub judice"
            >
              O registro ainda está em julgamento. O voto é registrado, mas só
              vale se a candidatura for aprovada.
            </Aviso>
          ) : c.sit === 'indeferido' ? (
            <Aviso
              tom="danger"
              icone={<TriangleAlertIcon />}
              titulo="Candidatura indeferida"
            >
              A Justiça Eleitoral negou o registro. O número ainda pode aparecer
              na urna, mas o voto pode ser anulado.
            </Aviso>
          ) : null}
        </>
      )
    }

    default:
      return null
  }
}

const TONS = {
  warn: 'border-warn-border bg-warn text-warn-foreground',
  danger: 'border-danger-border bg-danger text-destructive',
}

function Aviso({
  tom,
  icone,
  titulo,
  children,
}: {
  tom: keyof typeof TONS
  icone: ReactNode
  titulo: string
  children: ReactNode
}) {
  return (
    <Alert
      className={`gap-x-3 rounded-lg px-4 py-3.5 *:[svg]:size-[22px] *:[svg]:translate-y-0.5 ${TONS[tom]}`}
    >
      {icone}
      <AlertTitle className="text-[18px] font-extrabold">{titulo}</AlertTitle>
      <AlertDescription className="text-[16px] text-current text-pretty">
        {children}
      </AlertDescription>
    </Alert>
  )
}
