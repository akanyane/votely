import { type LinhaResumo, legenda } from './resumo'

// Mesma composição de uma cópia da FolhaImpressao (meia folha A4 a 96 dpi),
// desenhada em canvas para baixar como PNG.
const W = 794
const H = 562
const ESCALA = 2
const PAD_X = 44

const SANS = '"Atkinson Hyperlegible Next", system-ui, sans-serif'
const MONO = '"Atkinson Hyperlegible Mono", ui-monospace, monospace'

async function carregarFontes() {
  try {
    await Promise.all([
      document.fonts.load(`800 28px ${SANS}`),
      document.fonts.load(`400 16px ${SANS}`),
      document.fonts.load(`700 34px ${MONO}`),
    ])
  } catch {
    // Sem a fonte, o canvas usa a genérica do fallback
  }
}

export async function gerarImagemColinha(uf: string, resumo: LinhaResumo[]) {
  await carregarFontes()

  const canvas = document.createElement('canvas')
  canvas.width = W * ESCALA
  canvas.height = H * ESCALA
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponível')
  ctx.scale(ESCALA, ESCALA)

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  ctx.textBaseline = 'alphabetic'

  const texto = (
    t: string,
    x: number,
    y: number,
    fonte: string,
    opts: { align?: CanvasTextAlign; espaco?: number } = {},
  ) => {
    ctx.font = fonte
    ctx.textAlign = opts.align ?? 'left'
    ctx.letterSpacing = `${opts.espaco ?? 0}px`
    ctx.fillText(t, x, y)
    ctx.letterSpacing = '0px'
  }

  const caixa = (x: number, y: number, w: number, h: number, borda = 2) => {
    ctx.lineWidth = borda
    ctx.strokeRect(x + borda / 2, y + borda / 2, w - borda, h - borda)
  }

  // Cabeçalho
  texto('MINHA COLINHA', PAD_X, 58, `800 28px ${SANS}`, { espaco: 1.1 })
  texto(
    'Eleições 2026 · 1º turno · domingo, 4 de outubro',
    PAD_X,
    82,
    `400 16px ${SANS}`,
  )

  ctx.font = `800 26px ${SANS}`
  const ufW = ctx.measureText(uf).width + 24
  const ufX = W - PAD_X - ufW
  caixa(ufX, 44, ufW, 42)
  texto(uf, ufX + ufW / 2, 75, `800 26px ${SANS}`, { align: 'center' })
  texto('Estado', ufX - 8, 71, `400 15px ${SANS}`, { align: 'right' })

  const topo = 96
  ctx.fillRect(PAD_X, topo, W - PAD_X * 2, 3)

  // Linhas na ordem da urna
  const rodape = H - 22 - 22
  const alturaLinha = (rodape - (topo + 3)) / resumo.length
  resumo.forEach((linha, i) => {
    const y0 = topo + 3 + i * alturaLinha
    const meio = y0 + alturaLinha / 2

    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(PAD_X + 13, meio, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.textBaseline = 'middle'
    texto(String(i + 1), PAD_X + 13, meio + 1, `800 15px ${SANS}`, {
      align: 'center',
    })

    const leg = legenda(linha)
    texto(
      linha.titulo.toUpperCase(),
      PAD_X + 44,
      leg ? meio - 10 : meio,
      `800 19px ${SANS}`,
      {
        espaco: 0.6,
      },
    )
    if (leg) texto(leg, PAD_X + 44, meio + 13, `400 16px ${SANS}`)

    if (linha.consulta.status === 'branco') {
      ctx.font = `800 24px ${SANS}`
      const w = ctx.measureText('BRANCO').width + 32 + 8
      const x = W - PAD_X - w
      caixa(x, meio - 24, w, 48)
      texto('BRANCO', x + w / 2, meio + 1, `800 24px ${SANS}`, {
        align: 'center',
        espaco: 1.4,
      })
    } else {
      // Sem número: caixas vazias para anotar à mão
      const n = linha.cargo.digitos
      const x0 = W - PAD_X - (n * 40 + (n - 1) * 5)
      for (let d = 0; d < n; d++) {
        const x = x0 + d * 45
        caixa(x, meio - 24, 40, 48)
        const ch = linha.digits[d]
        if (ch)
          texto(ch, x + 20, meio + 2, `700 34px ${MONO}`, { align: 'center' })
      }
    }
    ctx.textBaseline = 'alphabetic'

    ctx.fillRect(PAD_X, y0 + alturaLinha - 1, W - PAD_X * 2, 1)
  })

  texto(
    'Antes de confirmar, confira o nome e a foto na tela da urna.',
    PAD_X,
    H - 26,
    `400 14px ${SANS}`,
  )
  texto('Votely · não oficial', W - PAD_X, H - 26, `400 14px ${SANS}`, {
    align: 'right',
  })

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob falhou'))),
      'image/png',
    ),
  )
}

export async function baixarImagemColinha(uf: string, resumo: LinhaResumo[]) {
  const blob = await gerarImagemColinha(uf, resumo)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `colinha-votely-${uf}.png`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
