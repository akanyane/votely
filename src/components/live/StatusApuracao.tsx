import { InfoIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { turnoAtual } from '@/config/election'
import { fmtHora, fmtPct } from '@/lib/live/formato'
import type { ResultadoCargo } from '@/lib/live/tipos'
import { Barra, Chip } from './partes'

type Props = {
  resultado: ResultadoCargo
  /** Última atualização falhou; mostrando os últimos dados válidos */
  desatualizado: boolean
  onTentarDeNovo: () => void
  tentando: boolean
}

export function StatusApuracao({
  resultado: r,
  desatualizado,
  onTentarDeNovo,
  tentando,
}: Props) {
  const hora = fmtHora(r.totalizadoEm ?? r.geradoEm)

  // O status fica fixo no topo: elementos rolados para a tela (por foco de
  // teclado ou âncora) precisam parar abaixo dele, e não escondidos atrás.
  const fixoRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = fixoRef.current
    if (!el) return
    const raiz = document.documentElement
    const obs = new ResizeObserver(() => {
      raiz.style.scrollPaddingTop = `${el.offsetHeight + 12}px`
    })
    obs.observe(el)
    return () => {
      obs.disconnect()
      raiz.style.scrollPaddingTop = ''
    }
  }, [])
  const pct = fmtPct(r.secoes.pct)

  return (
    <>
      <div ref={fixoRef} className="sticky top-0 z-10 bg-background pb-3">
        <section className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-[18px] py-4">
          {r.turno === 2 && (
            <Chip className="self-start">{turnoAtual().rotulo}</Chip>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[40px] leading-[1.05] font-bold tracking-[-0.01em] tabular-nums">
              {pct}
            </span>
            <span className="text-[19px] font-bold">das seções apuradas</span>
          </div>
          <Barra valor={r.secoes.pct} rotulo="Seções apuradas" alta />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[16px]">
            {desatualizado ? (
              <span className="flex items-center gap-2 font-bold text-warn-foreground">
                <TriangleAlertIcon className="size-[18px]" strokeWidth={2.4} />
                Últimos dados às {hora}
              </span>
            ) : (
              <span className="flex items-center gap-2 font-bold">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full bg-primary motion-safe:animate-[vlive_2s_ease-out_infinite]"
                />
                Atualizado às {hora}
              </span>
            )}
            <span className="text-muted-foreground">
              {r.final
                ? 'Totalização concluída'
                : desatualizado
                  ? 'Nova tentativa automática'
                  : 'Atualiza sozinho a cada 30 segundos'}
            </span>
          </div>
          <div className="flex items-start gap-2 border-t border-border pt-2.5 text-[15px] text-muted-foreground">
            <InfoIcon
              className="mt-0.5 size-[18px] flex-none"
              strokeWidth={2.2}
            />
            <span>
              {r.final
                ? 'Resultado final da totalização. Fonte: TSE.'
                : 'Resultado parcial até o fim da totalização. Fonte: TSE.'}
              {r.simulado &&
                ' Dados do SIMULADO do TSE (candidatos fictícios).'}
            </span>
          </div>
          {/* Anúncio discreto para leitores de tela, só quando os números mudam */}
          <span className="sr-only" aria-live="polite" aria-atomic>
            {pct} das seções apuradas, atualizado às {hora}
          </span>
        </section>
      </div>

      {desatualizado && (
        <div
          role="alert"
          className="mb-3 flex gap-3 rounded-xl border border-warn-border bg-warn p-4 text-warn-foreground"
        >
          <RefreshCwIcon
            className="mt-0.5 size-[22px] flex-none"
            strokeWidth={2.2}
          />
          <div className="flex-1">
            <div className="text-[18px] font-extrabold">
              Não conseguimos atualizar
            </div>
            <div className="text-[16px] text-pretty">
              Você está vendo os últimos dados válidos, das {hora}. Vamos tentar
              de novo em instantes.
            </div>
            <Button
              variant="outline"
              onClick={onTentarDeNovo}
              disabled={tentando}
              className="mt-2.5 h-11 rounded-md border-warn-border bg-transparent px-4 text-[16px] font-extrabold text-warn-foreground hover:bg-transparent dark:border-warn-border dark:bg-transparent"
            >
              {tentando ? 'Tentando…' : 'Tentar agora'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
