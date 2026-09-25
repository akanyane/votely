/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { temaInicialScript } from '@/lib/tema'
import stylesCss from '../styles.css?url'

const SITE = 'https://votely.akanyane.dev'
const TITULO = 'Votely · Sua colinha para as Eleições 2026'
const DESCRICAO =
  'Monte a colinha com os números dos seus candidatos para as Eleições 2026, na ordem da urna, com dados e fotos oficiais do TSE. Grátis e apartidário.'

// Dados estruturados para buscadores (schema.org)
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Votely',
  url: `${SITE}/`,
  description: DESCRICAO,
  inLanguage: 'pt-BR',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
  image: `${SITE}/og.png`,
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: TITULO },
      { name: 'description', content: DESCRICAO },
      { name: 'robots', content: 'index, follow' },
      { name: 'theme-color', content: '#155E66' },
      // Prévia de link (WhatsApp, redes sociais)
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Votely' },
      { property: 'og:locale', content: 'pt_BR' },
      { property: 'og:url', content: `${SITE}/` },
      { property: 'og:title', content: TITULO },
      { property: 'og:description', content: DESCRICAO },
      { property: 'og:image', content: `${SITE}/og.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'Votely: sua colinha para as Eleições 2026',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITULO },
      { name: 'twitter:description', content: DESCRICAO },
      { name: 'twitter:image', content: `${SITE}/og.png` },
    ],
    links: [
      { rel: 'canonical', href: `${SITE}/` },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;700;800&family=Atkinson+Hyperlegible+Mono:wght@500;700&display=swap',
      },
      { rel: 'stylesheet', href: stylesCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
    scripts: [
      { type: 'application/ld+json', children: JSON.stringify(JSON_LD) },
    ],
  }),
  component: Outlet,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // A classe .dark é aplicada pelo script antes da hidratação
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ScriptOnce>{temaInicialScript}</ScriptOnce>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
