import { DownloadIcon, MessageCircleIcon, PrinterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type LinhaResumo, prontos, textoCompartilhar } from './resumo'

type Props = {
  uf: string
  ufNome: string
  resumo: LinhaResumo[]
  onSalvar: () => void
}

const botao =
  'h-14 gap-2.5 rounded-lg text-[19px] [&_svg:not([class*=size-])]:size-[22px]'
const botaoOutline = `${botao} border-2 border-input bg-card font-bold text-foreground dark:border-input dark:bg-card`

export function MinhaColinha({ uf, ufNome, resumo, onSalvar }: Props) {
  const compartilhar = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(textoCompartilhar(uf, resumo))}`,
      '_blank',
      'noopener',
    )
  }

  return (
    <Card className="gap-1 rounded-xl p-5 text-[18px] ring-2 ring-primary">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[26px] font-extrabold">Minha colinha</h2>
        <span className="inline-flex h-[30px] items-center rounded-full bg-accent px-3 text-[15px] font-bold whitespace-nowrap text-accent-foreground">
          {prontos(resumo)} de 6 prontos
        </span>
      </div>
      <p className="mb-2 text-[16px] text-muted-foreground">
        {ufNome} · na ordem da urna
      </p>

      <ol>
        {resumo.map((linha) => (
          <li key={linha.cargo.id} className="border-t border-border py-3">
            <div className="text-[14px] font-extrabold tracking-[0.05em] text-muted-foreground uppercase">
              {linha.titulo}
            </div>
            <LinhaValor linha={linha} />
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-col gap-2.5">
        <Button
          onClick={() => window.print()}
          className={`${botao} font-extrabold`}
        >
          <PrinterIcon />
          Imprimir
        </Button>
        <Button
          variant="outline"
          onClick={compartilhar}
          className={botaoOutline}
        >
          <MessageCircleIcon />
          Compartilhar no WhatsApp
        </Button>
        <Button variant="outline" onClick={onSalvar} className={botaoOutline}>
          <DownloadIcon />
          Salvar neste aparelho
        </Button>
      </div>

      <p className="mt-3.5 text-[16px] text-pretty text-muted-foreground">
        O celular não pode entrar na cabine de votação. Leve a colinha impressa
        ou anotada em papel.
      </p>
    </Card>
  )
}

function LinhaValor({ linha }: { linha: LinhaResumo }) {
  const { consulta, digits } = linha
  const numero = 'font-mono font-bold tracking-[0.08em] leading-[1.15]'

  let num = '—'
  let nome = 'Ainda não preenchido'
  let tom = 'text-muted-foreground'
  let tomNome = 'text-muted-foreground'
  let tamanho = 'text-[36px]'

  if (consulta.status === 'branco') {
    num = 'BRANCO'
    nome = 'Voto em branco'
    tom = 'text-foreground'
    tamanho = 'text-[26px]'
  } else if (consulta.status === 'encontrado') {
    num = consulta.candidato.numero
    nome = `${consulta.candidato.nome} · ${consulta.candidato.sigla}`
    tom = tomNome = 'text-foreground'
  } else if (consulta.status === 'nao_encontrado') {
    num = digits
    nome = 'Número não encontrado'
    tom = tomNome = 'text-destructive'
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
      <span className={`${numero} ${tamanho} ${tom}`}>{num}</span>
      <span className={`text-[17px] ${tomNome}`}>{nome}</span>
    </div>
  )
}
