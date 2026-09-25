# Documentação do TSE: divulgação de resultados 2026

Documentos públicos baixados em 25/09/2026 de
<https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados>
e <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>.

| Arquivo | Conteúdo |
|---|---|
| `tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026.pdf` | Estrutura de pastas e nomes dos arquivos |
| `apresentacao-interessados-2026.pdf` | Audiência técnica (jul/2026): regras de consumo, datas |
| `tse-ea11-…` | EA11: configuração de eleições (`ele-c.json`) |
| `tse-ea20-…` | EA20: resultado unificado (`<br\|uf>-c<CCCC>-e<ELEICA>-u.json`) |
| `tse-ea14-…` / `tse-ea15-…` | EA14/EA15: acompanhamento Brasil / UF |
| `tse-ea10-…` | EA10: eleitos (só gov, sen e dep. federal; gerado após a totalização final da 1ª UF) |

## Parâmetros confirmados

- **Oficial**: `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json`, dados a partir de 03/10/2026.
  1º turno (04/10/2026, pleito 3220): `6257` Eleição Geral Federal, `6259` Eleições Gerais Estaduais.
- **Simulado**: `https://resultados-sim.tse.jus.br/simulado/simulado2026/comum/config/ele-c.json`
  (eleições `21270` federal / `21272` estadual; 2º turno `21271` / `21273`). Candidatos fictícios.
- **Limite**: 100 requisições por IP por segundo; bloqueio de 10 min (renovado). Vários 404 também
  podem bloquear o IP: nunca montar URL sem confirmar no `ele-c.json`.
- Presidente liberado a partir das 17h de Brasília (`dv = "n"` antes disso: votos zerados).

## Diferenças entre a especificação e os arquivos reais

- Todos os números vêm como **texto**, e os percentuais usam **vírgula** decimal, inclusive os
  campos "numéricos" de 9 casas (`"pvapn": "59,351118968"`).
- `seq` não é a posição no ranking.
- O `ele-c.json` do simulado tem um tipo de arquivo não documentado (`tp: "t"`).
- O simulado usa nomes de candidato com caracteres especiais (`Candidato string 1234!@#$"TSE"`)
  para testar escape de texto.
