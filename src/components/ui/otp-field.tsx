import { OTPField as OTPFieldPrimitive } from '@base-ui/react/otp-field'
import { cn } from 'cn'

// O registry do shadcn só tem o input-otp (lib input-otp). Este componente
// segue o mesmo padrão dos demais, mas em cima do OTPField do Base UI, em que
// cada casa é um <input> de verdade.

function OTPField({ className, ...props }: OTPFieldPrimitive.Root.Props) {
  return (
    <OTPFieldPrimitive.Root
      data-slot="otp-field"
      className={cn(
        'flex items-center gap-2 data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function OTPFieldInput({ className, ...props }: OTPFieldPrimitive.Input.Props) {
  return (
    <OTPFieldPrimitive.Input
      data-slot="otp-field-input"
      className={cn(
        'size-8 rounded-lg border border-input bg-transparent text-center text-sm caret-foreground transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  )
}

function OTPFieldSeparator({
  className,
  ...props
}: OTPFieldPrimitive.Separator.Props) {
  return (
    <OTPFieldPrimitive.Separator
      data-slot="otp-field-separator"
      className={cn('h-0.5 w-3 rounded-full bg-border', className)}
      {...props}
    />
  )
}

export { OTPField, OTPFieldInput, OTPFieldSeparator }
