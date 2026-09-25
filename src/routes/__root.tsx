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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Votely · Sua colinha para 2026' },
      {
        name: 'description',
        content:
          'Monte a colinha com os números dos seus candidatos para as Eleições 2026.',
      },
    ],
    links: [
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
