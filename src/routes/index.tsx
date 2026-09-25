import { useForm, useSelector } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BuscaDialog } from '@/components/votely/BuscaDialog'
import { Cabecalho } from '@/components/votely/Cabecalho'
import { CardCargo } from '@/components/votely/CardCargo'
import { CardUf } from '@/components/votely/CardUf'
import { FolhaImpressao } from '@/components/votely/FolhaImpressao'
import { baixarImagemColinha } from '@/components/votely/imagemColinha'
import { MinhaColinha } from '@/components/votely/MinhaColinha'
import { montarResumo } from '@/components/votely/resumo'
import { useCandidatos } from '@/lib/candidatos'
import {
  CARGOS,
  type CargoId,
  isUf,
  nomeUf,
  type UF,
  type Votos,
  votosVazios,
} from '@/lib/votely'

export const Route = createFileRoute('/')({
  component: Home,
})

const STORAGE_KEY = 'votely-colinha'

type Colinha = { uf: UF | ''; votos: Votos }

// Precisa ser estável: se mudar de identidade a cada render, o useForm volta
// para os valores padrão e desfaz a colinha restaurada.
const COLINHA_VAZIA: Colinha = { uf: '', votos: votosVazios() }

function Home() {
  const form = useForm({
    defaultValues: COLINHA_VAZIA,
  })
  const { uf, votos } = useSelector(form.store, (s) => s.values)
  const [buscando, setBuscando] = useState<CargoId | null>(null)

  const candidatos = useCandidatos(uf)
  const dados = candidatos?.dados
  const ufNome = nomeUf(uf)
  const resumo = montarResumo(uf, votos, dados)

  // Restaura a colinha salva neste aparelho
  useEffect(() => {
    try {
      const salva = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (salva && isUf(salva.uf)) {
        // setFieldValue, e não reset(): o reset troca os defaultValues e o
        // useForm os sobrescreve de volta no render seguinte
        form.setFieldValue('uf', salva.uf)
        form.setFieldValue('votos', { ...votosVazios(), ...salva.v })
      }
    } catch {}
  }, [form])

  // Guarda no navegador (restaura ao reabrir) e baixa a colinha como imagem
  const salvar = async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ uf, v: votos }))
    } catch {}
    try {
      await baixarImagemColinha(uf, resumo)
      toast.success('Colinha salva. A imagem foi baixada.')
    } catch {
      toast.error('Não foi possível baixar a imagem da colinha.')
    }
  }

  const cargoBusca = CARGOS.find((c) => c.id === buscando) ?? null

  return (
    <>
      <div className="mx-auto max-w-[520px] px-4 pt-4 print:hidden lg:max-w-[1160px] lg:px-10 lg:pt-8">
        <Cabecalho />

        <form.Field name="uf">
          {(field) => (
            <CardUf uf={field.state.value} onChange={field.handleChange} />
          )}
        </form.Field>

        {uf && (
          <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="px-1">
                <h2 className="text-[24px] font-extrabold">Seus candidatos</h2>
                <p className="mt-1 text-[17px] text-pretty text-muted-foreground">
                  Na mesma ordem da urna. Digite o número ou toque em “Não sei o
                  número”.
                </p>
              </div>

              {candidatos?.status === 'erro' && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-border bg-danger px-4 py-3.5 text-[16px] text-destructive"
                >
                  Não foi possível carregar os candidatos. Verifique a internet.
                  <Button
                    variant="outline"
                    onClick={candidatos.tentarDeNovo}
                    className="h-12 rounded-md px-4 text-[17px] font-bold"
                  >
                    Tentar de novo
                  </Button>
                </div>
              )}

              {resumo.map(({ cargo, consulta }, i) => (
                <form.Field key={cargo.id} name={`votos.${cargo.id}`}>
                  {(field) => (
                    <CardCargo
                      ordem={i + 1}
                      cargo={cargo}
                      uf={uf}
                      ufNome={ufNome}
                      voto={field.state.value}
                      consulta={consulta}
                      repetido={
                        cargo.id === 'sen2' &&
                        consulta.status === 'encontrado' &&
                        !votos.sen1.branco &&
                        votos.sen1.digits === votos.sen2.digits
                      }
                      onDigits={(digits) =>
                        field.handleChange({ digits, branco: false })
                      }
                      onBranco={(branco) =>
                        field.handleChange({ digits: '', branco })
                      }
                      onBuscar={() => setBuscando(cargo.id)}
                    />
                  )}
                </form.Field>
              ))}
            </div>

            <aside className="min-w-0 lg:sticky lg:top-6">
              <MinhaColinha
                uf={uf}
                ufNome={ufNome}
                resumo={resumo}
                onSalvar={salvar}
              />
            </aside>
          </div>
        )}

        <footer className="mt-10 flex flex-col gap-1.5 border-t border-border px-1 pt-6 pb-9 text-[16px] text-muted-foreground">
          <p>
            Dados oficiais do TSE (Portal de Dados Abertos). Confira sempre as
            informações.
          </p>
          <p>
            O Votely é independente e apartidário. Não é um aplicativo oficial
            da Justiça Eleitoral.
          </p>
        </footer>
      </div>

      {uf && <FolhaImpressao uf={uf} resumo={resumo} />}

      <BuscaDialog
        cargo={cargoBusca}
        uf={uf}
        ufNome={ufNome}
        candidatos={cargoBusca ? dados?.[cargoBusca.pool] : undefined}
        onClose={() => setBuscando(null)}
        onPick={(numero) => {
          if (!buscando) return
          form.setFieldValue(`votos.${buscando}`, {
            digits: numero,
            branco: false,
          })
          setBuscando(null)
        }}
      />
    </>
  )
}
