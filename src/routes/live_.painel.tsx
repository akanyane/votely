import { createFileRoute } from '@tanstack/react-router'
import { Painel } from '@/components/painel/Painel'

// live_.painel: página própria em /live/painel, fora do layout do /live
export const Route = createFileRoute('/live_/painel')({
  head: () => ({
    meta: [
      { title: 'Painel da apuração · Votely Live' },
      {
        name: 'description',
        content:
          'Painel da apuração para presidente nas Eleições 2026: votos apurados, duelo, mapa por estado e evolução, com dados oficiais do TSE.',
      },
      { name: 'theme-color', content: '#090A0F' },
    ],
    links: [
      {
        rel: 'canonical',
        href: 'https://votely.akanyane.dev/live/painel',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap',
      },
    ],
  }),
  component: Painel,
})
