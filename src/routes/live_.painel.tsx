import { createFileRoute, redirect } from '@tanstack/react-router'

// O painel virou o próprio /live; mantém os links já compartilhados
export const Route = createFileRoute('/live_/painel')({
  beforeLoad: () => {
    throw redirect({ to: '/live', replace: true })
  },
})
