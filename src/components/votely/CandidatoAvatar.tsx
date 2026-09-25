import { cn } from 'cn'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { type Candidato, iniciais } from '@/lib/votely'

type Props = {
  candidato: Pick<Candidato, 'sq' | 'nome'>
  className?: string
}

/**
 * Foto do TSE (public/fotos/{sq}.webp, gerada por scripts/fotos.ts). O Avatar
 * do Base UI mostra as iniciais enquanto a foto carrega ou se ela não existir.
 */
export function CandidatoAvatar({ candidato, className }: Props) {
  return (
    <Avatar aria-hidden className={cn('size-16 after:hidden', className)}>
      <AvatarImage
        src={`/fotos/${candidato.sq}.webp`}
        alt=""
        loading="lazy"
        className="object-top"
      />
      <AvatarFallback className="bg-muted text-[22px] font-extrabold text-foreground">
        {iniciais(candidato.nome)}
      </AvatarFallback>
    </Avatar>
  )
}
