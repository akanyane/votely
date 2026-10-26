import { Pilula, Selo } from './Marca'

export function Cabecalho() {
  return (
    <header className="flex items-center justify-between gap-3 pt-2 pb-5">
      <div className="flex items-center gap-3.5">
        <Selo className="size-12" />
        <div>
          <h1 className="text-[28px] leading-[1.05] font-bold">Votely</h1>
          <div className="text-[16px] text-muted-foreground">
            Sua colinha para 2026
          </div>
        </div>
      </div>
      <Pilula to="/live" aoVivo>
        Apuração
      </Pilula>
    </header>
  )
}
