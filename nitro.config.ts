import { defineConfig } from 'nitro'

const DIA = 60 * 60 * 24

export default defineConfig({
  routeRules: {
    // Fotos do TSE: nome fixo por SQ_CANDIDATO e quase nunca mudam
    '/fotos/**': {
      headers: {
        'cache-control': `public, max-age=${7 * DIA}, stale-while-revalidate=${DIA}`,
      },
    },
    // Candidatos por UF: a situação das candidaturas muda durante a campanha
    '/data/**': {
      headers: {
        'cache-control': `public, max-age=3600, stale-while-revalidate=${DIA}`,
      },
    },
  },
})
