const pulso = 'animate-[pulse_1.4s_ease-in-out_infinite] bg-muted'

export function Carregando() {
  return (
    <div
      role="status"
      aria-label="Carregando resultados"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5">
        <div className={`h-10 w-[55%] rounded-md ${pulso}`} />
        <div className={`h-3 w-full rounded-full ${pulso}`} />
        <div className={`h-4 w-[40%] rounded-md ${pulso}`} />
      </div>
      <div className={`h-[52px] rounded-lg ${pulso}`} />
      {[1, 2, 3].map((k) => (
        <div
          key={k}
          className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-[18px]"
        >
          <div className="flex items-center gap-3">
            <div className={`size-[52px] rounded-full ${pulso}`} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`h-[18px] w-[65%] rounded-md ${pulso}`} />
              <div className={`h-3.5 w-[40%] rounded-md ${pulso}`} />
            </div>
          </div>
          <div className={`h-8 w-[35%] rounded-md ${pulso}`} />
          <div className={`h-2.5 w-full rounded-full ${pulso}`} />
        </div>
      ))}
      <p className="text-center text-[17px] text-muted-foreground">
        Carregando resultados do TSE…
      </p>
    </div>
  )
}
