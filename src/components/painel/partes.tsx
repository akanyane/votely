import { type ComponentProps, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export const AZUL = '59,130,246'
export const VERDE = '16,185,129'

const dec = (casas: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export const pct = (n: number, casas = 2) => `${dec(casas).format(n)}%`
export const num = (n: number) => inteiro.format(Math.round(n))
export const mi = (n: number) => `${dec(2).format(n / 1e6)} mi`
export const pp1 = (n: number) => `+${dec(1).format(n)}`
export const hora = (t: number) =>
  new Date(t).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

/** Cartão com o brilho que segue o mouse */
export function Cartao({ className, ...props }: ComponentProps<'section'>) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: só efeito visual
    <section
      onMouseMove={(e) => {
        const el = e.currentTarget
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      className={cn('painel-cartao', className)}
      {...props}
    />
  )
}

export function Cabeca({
  numero,
  rotulo,
  titulo,
  children,
}: {
  numero: string
  rotulo: string
  titulo: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="painel-rotulo">
          {numero} / {rotulo}
        </span>
        <h2 className="painel-titulo m-0">{titulo}</h2>
      </div>
      {children}
    </div>
  )
}

/** Valor que desliza até o novo número em vez de pular */
export function useAnimado(valor: number, ms = 1000) {
  const [v, setV] = useState(valor)
  const atual = useRef(valor)
  useEffect(() => {
    const de = atual.current
    if (de === valor) return
    const t0 = performance.now()
    let raf = 0
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const x = de + (valor - de) * (1 - (1 - k) ** 3)
      atual.current = x
      setV(x)
      if (k < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [valor, ms])
  return v
}

export function Animado({
  valor,
  formato,
}: {
  valor: number
  formato: (n: number) => string
}) {
  return <>{formato(useAnimado(valor))}</>
}

/** Contador em placas, como num painel de aeroporto */
export function Placas({ valor }: { valor: number }) {
  const texto = num(useAnimado(valor, 1600))
  return (
    <div
      role="img"
      aria-label={`${num(valor)} votos apurados`}
      className="flex flex-wrap items-center gap-1"
    >
      {[...texto].map((ch, i) =>
        ch === '.' ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: posição fixa do separador
            key={i}
            className="f-display self-end px-px text-[clamp(28px,4vw,54px)] leading-none font-bold text-[#4B5068]"
          >
            .
          </span>
        ) : (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: cada placa é uma casa decimal
            key={i}
            className="f-display relative inline-grid h-[1.12em] w-[0.66em] place-items-center overflow-hidden rounded-lg border border-white/[0.08] text-[clamp(36px,5.4vw,72px)] leading-none font-bold text-[#F4F5F8] tabular-nums [font-stretch:62%] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_-8px_rgba(0,0,0,0.7)]"
            style={{
              background:
                'linear-gradient(180deg,#171A29 0%,#11131F 50%,#0C0E16 50%,#0E1019 100%)',
            }}
          >
            <span className="absolute inset-x-0 top-1/2 h-px bg-black/75" />
            {ch}
          </span>
        ),
      )}
    </div>
  )
}

export function Celula({
  rotulo,
  valor,
  className,
}: {
  rotulo: string
  valor: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col gap-1 bg-[#0E1019] px-3 py-2.5', className)}
    >
      <span className="text-[11px] text-[#8B90A3]">{rotulo}</span>
      <span className="f-mono text-[13px]">{valor}</span>
    </div>
  )
}
