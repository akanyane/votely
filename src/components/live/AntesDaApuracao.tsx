import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { liberacaoAtual, turnoAtual } from '@/config/election'
import { Chip } from './partes'

const dois = (n: number) => String(n).padStart(2, '0')

/**
 * Antes do 1º boletim. A página continua consultando o servidor e troca
 * sozinha para os resultados quando o TSE publicar dados.
 */
export function AntesDaApuracao() {
  // Relógio só no navegador (evita divergência com o HTML do servidor)
  const [agora, setAgora] = useState<number | null>(null)
  useEffect(() => {
    setAgora(Date.now())
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const faltam =
    agora === null ? null : Math.max(0, liberacaoAtual().getTime() - agora)
  const s = faltam === null ? 0 : Math.floor(faltam / 1000)
  // Mais de um dia: dias/horas/minutos ("212 horas" é difícil de ler)
  const partes =
    s >= 86_400
      ? [
          {
            v: Math.floor(s / 86_400),
            l: Math.floor(s / 86_400) === 1 ? 'dia' : 'dias',
          },
          { v: Math.floor((s % 86_400) / 3600), l: 'horas' },
          { v: Math.floor((s % 3600) / 60), l: 'minutos' },
        ]
      : [
          { v: Math.floor(s / 3600), l: 'horas' },
          { v: Math.floor((s % 3600) / 60), l: 'minutos' },
          { v: s % 60, l: 'segundos' },
        ]
  const passouDaHora = faltam === 0

  return (
    <section className="mx-auto flex max-w-[560px] flex-col items-center gap-4 rounded-xl border border-border bg-card px-5 py-6 text-center">
      <Chip>{turnoAtual().rotulo}</Chip>
      <h1 className="text-[27px] leading-[1.2] font-extrabold text-balance">
        {passouDaHora
          ? 'Aguardando os primeiros resultados'
          : 'A apuração ainda não começou'}
      </h1>
      <p className="text-[18px] text-pretty text-muted-foreground">
        {passouDaHora
          ? 'As urnas já fecharam. Os primeiros números do TSE devem aparecer em instantes.'
          : 'Os resultados começam a ser divulgados depois que as urnas fecham, às 17h (horário de Brasília).'}
      </p>
      {!passouDaHora && (
        <div
          role="timer"
          aria-label="Tempo até o fechamento das urnas"
          className="grid w-full grid-cols-3 gap-2.5"
        >
          {partes.map((p) => (
            <div
              key={p.l}
              className="rounded-lg bg-accent px-1.5 pt-3.5 pb-2.5"
            >
              <div className="text-[46px] leading-none font-bold tracking-[-0.01em] text-accent-foreground tabular-nums">
                {faltam === null ? '--' : dois(p.v)}
              </div>
              <div className="mt-1.5 text-[15px] text-muted-foreground">
                {p.l}
              </div>
            </div>
          ))}
        </div>
      )}
      <Link
        to="/"
        className={buttonVariants({
          className:
            'h-14 w-full rounded-lg text-[19px] font-extrabold no-underline',
        })}
      >
        Voltar para minha colinha
      </Link>
      <p className="text-[16px] text-pretty text-muted-foreground">
        Esta página se atualiza sozinha quando os primeiros resultados chegarem.
      </p>
    </section>
  )
}
