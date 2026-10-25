import type { Evento, TagEvento } from '@/lib/painel/dados'
import { Cabeca, Cartao, hora } from './partes'

export const COR_TAG: Record<TagEvento, [string, string]> = {
  VIRADA: ['rgba(245,181,74,0.14)', '#F5B54A'],
  CONCLUÍDO: ['rgba(16,185,129,0.14)', '#6EE7B7'],
  APURAÇÃO: ['rgba(148,163,184,0.12)', '#CBD5E1'],
  NACIONAL: ['rgba(59,130,246,0.15)', '#93C5FD'],
}

/** 04 · Linha do tempo da apuração */
export function Feed({ eventos }: { eventos: Evento[] }) {
  return (
    <Cartao className="flex max-h-[700px] min-w-0 flex-[1_1_320px] flex-col gap-3.5 p-6">
      <Cabeca numero="04" rotulo="FEED" titulo="Últimas atualizações">
        <span className="f-mono text-[12px] text-[#8B90A3]">
          {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}
        </span>
      </Cabeca>
      {eventos.length === 0 ? (
        <p className="text-[14px] text-[#8B90A3]">
          Os marcos da apuração aparecem aqui conforme o TSE publica.
        </p>
      ) : (
        <ol
          aria-live="polite"
          className="-mx-2 flex flex-col overflow-x-hidden overflow-y-auto px-2 [mask-image:linear-gradient(180deg,#000_85%,transparent)]"
        >
          {eventos.map((e) => {
            const [fundo, cor] = COR_TAG[e.tag]
            return (
              <li
                key={e.id}
                className="grid animate-[painel-entra_.6s_cubic-bezier(.2,.8,.2,1)_both] grid-cols-[54px_14px_minmax(0,1fr)] gap-2.5"
              >
                <span className="f-mono pt-3.5 text-[11px] text-[#8B90A3]">
                  {hora(e.t)}
                </span>
                <div className="relative flex justify-center">
                  <span className="absolute inset-y-0 w-px bg-white/[0.08]" />
                  <span
                    className="relative mt-4 size-[9px] rounded-full"
                    style={{
                      background: cor,
                      boxShadow: `0 0 0 3px #0D0F17, 0 0 10px ${cor}`,
                    }}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-[5px] border-b border-white/[0.05] py-3">
                  <span
                    className="f-mono self-start rounded px-1.5 py-0.5 text-[10px] tracking-[0.08em]"
                    style={{ background: fundo, color: cor }}
                  >
                    {e.tag}
                  </span>
                  <span className="text-[14px] leading-[1.45] text-pretty text-[#E2E8F0]">
                    {e.texto}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Cartao>
  )
}

/** Letreiro "Plantão" no topo, com os últimos eventos */
export function Letreiro({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) return null
  const linha = (k: string) =>
    eventos.slice(0, 8).map((e) => (
      <span
        key={k + e.id}
        className="inline-flex items-center gap-2.5 pr-10 text-[13px] whitespace-nowrap text-[#CBD5E1]"
      >
        <span
          className="f-mono text-[10px] tracking-[0.08em]"
          style={{ color: COR_TAG[e.tag][1] }}
        >
          {e.tag}
        </span>
        {e.texto}
        <span className="ml-[30px] text-[#3A3F52]">/</span>
      </span>
    ))
  return (
    <div className="flex items-center border-b border-white/[0.07] bg-[rgba(9,10,15,0.7)] backdrop-blur-[10px]">
      <div className="f-mono flex h-[38px] flex-none items-center gap-2 border-r border-white/[0.07] px-4 text-[11px] tracking-[0.1em] whitespace-nowrap text-[#F5B54A]">
        <span className="size-1.5 rounded-full bg-[#F5B54A]" />
        PLANTÃO
      </div>
      <div
        aria-hidden
        className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]"
      >
        <div className="flex w-max animate-[painel-letreiro_80s_linear_infinite] py-2.5">
          {linha('a')}
          {linha('b')}
        </div>
      </div>
    </div>
  )
}
