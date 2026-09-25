import { ScissorsIcon } from 'lucide-react'
import { type LinhaResumo, legenda } from './resumo'

/**
 * Só aparece na impressão: A4 em preto e branco com duas cópias iguais de
 * meia folha (210 × 148,5 mm) para recortar.
 */
export function FolhaImpressao({
  uf,
  resumo,
}: {
  uf: string
  resumo: LinhaResumo[]
}) {
  return (
    <div className="hidden h-[297mm] w-[210mm] grid-rows-2 bg-white font-sans text-black print:grid">
      <Copia uf={uf} resumo={resumo} />
      <Copia uf={uf} resumo={resumo} segunda />
    </div>
  )
}

function Copia({
  uf,
  resumo,
  segunda,
}: {
  uf: string
  resumo: LinhaResumo[]
  segunda?: boolean
}) {
  return (
    <div
      className={`relative flex h-[148.5mm] flex-col px-11 pt-7 pb-[22px] ${segunda ? 'border-t-2 border-dashed border-black' : ''}`}
    >
      {segunda && (
        <div className="absolute -top-[13px] left-8 flex items-center gap-1.5 bg-white px-2 text-[15px]">
          <ScissorsIcon className="size-5" strokeWidth={2} />
          recorte aqui
        </div>
      )}

      <div className="flex items-end justify-between gap-4 border-b-3 border-black pb-2.5">
        <div>
          <div className="text-[28px] leading-[1.1] font-extrabold tracking-[0.04em]">
            MINHA COLINHA
          </div>
          <div className="text-[16px]">
            Eleições 2026 · 1º turno · domingo, 4 de outubro
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[15px]">Estado</span>
          <span className="border-2 border-black px-2.5 py-0.5 text-[26px] font-extrabold">
            {uf}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {resumo.map((linha, i) => (
          <div
            key={linha.cargo.id}
            className="grid flex-1 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-black"
          >
            <div className="grid size-[26px] place-items-center rounded-full border-2 border-black text-[15px] font-extrabold">
              {i + 1}
            </div>
            <div className="min-w-0">
              <div className="text-[19px] leading-[1.15] font-extrabold tracking-[0.03em] uppercase">
                {linha.titulo}
              </div>
              <div className="text-[16px]">{legenda(linha)}</div>
            </div>
            <Digitos linha={linha} />
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-4 pt-2 text-[14px]">
        <span>
          Antes de confirmar, confira o nome e a foto na tela da urna.
        </span>
        <span>Votely · não oficial</span>
      </div>
    </div>
  )
}

function Digitos({ linha }: { linha: LinhaResumo }) {
  if (linha.consulta.status === 'branco') {
    return (
      <div className="grid h-12 place-items-center border-2 border-black px-4 text-[24px] font-extrabold tracking-[0.06em]">
        BRANCO
      </div>
    )
  }
  // Sem número: caixas vazias para anotar à mão
  const digits = linha.digits.padEnd(linha.cargo.digitos, ' ')
  return (
    <div className="flex gap-[5px]">
      {[...digits].map((ch, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: posição do dígito
          key={i}
          className="grid h-12 w-10 place-items-center border-2 border-black font-mono text-[34px] leading-none font-bold"
        >
          {ch.trim()}
        </div>
      ))}
    </div>
  )
}
