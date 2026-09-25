'use client'

import {
  CheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

// Sem next-themes: as cores vêm dos tokens (--foreground/--background), que
// já mudam com a classe .dark no <html>.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group print:hidden"
      position="bottom-center"
      duration={2800}
      icons={{
        success: <CheckIcon className="size-5" strokeWidth={3} />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--foreground)',
          '--normal-text': 'var(--background)',
          '--normal-border': 'transparent',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'cn-toast gap-2.5! px-4! py-3.5! text-[17px]! font-bold! font-sans! shadow-[0_10px_30px_rgba(0,0,0,.18)]!',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
