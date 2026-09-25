import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ELEICAO, liberacaoAtual } from '@/config/election'
import { resultadoQuery } from '@/lib/live/consultas'
import { fmtHora, fmtPct } from '@/lib/live/formato'

/**
 * Link para o Votely Live no topo da colinha. Liga pela flag
 * ELEICAO.bannerApuracao e só aparece a partir das 17h (Brasília) do dia.
 */
export function BannerApuracao() {
  // Decidido só no navegador: o servidor não sabe a hora do visitante
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    if (!ELEICAO.bannerApuracao) return
    const checar = () => setVisivel(Date.now() >= liberacaoAtual().getTime())
    checar()
    const id = setInterval(checar, 30_000)
    return () => clearInterval(id)
  }, [])

  const pres = useQuery({ ...resultadoQuery('pres', null), enabled: visivel })
  if (!visivel) return null

  const dados = pres.data?.estado === 'ok' ? pres.data.dados : null

  return (
    <Link
      to="/live"
      className="mb-5 flex items-center gap-3.5 rounded-xl bg-primary px-4 py-4 text-primary-foreground no-underline hover:opacity-95"
    >
      <span
        aria-hidden
        className="size-2.5 flex-none rounded-full bg-primary-foreground motion-safe:animate-[vlive_2s_ease-out_infinite]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[20px] leading-[1.2] font-extrabold">
          A apuração começou — acompanhe no Votely Live
        </span>
        <span className="block text-[16px] opacity-90">
          {dados
            ? `${fmtPct(dados.secoes.pct)} das seções apuradas · atualizado às ${fmtHora(dados.totalizadoEm ?? dados.geradoEm)}`
            : 'Resultados oficiais do TSE, atualizados a cada 30 segundos'}
        </span>
      </span>
      <ChevronRightIcon className="size-6 flex-none" strokeWidth={2.6} />
    </Link>
  )
}
