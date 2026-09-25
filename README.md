<div align="center">

<img src="public/favicon.svg" width="72" height="72" alt="" />

# Votely

**A colinha digital para as Eleições 2026.**

Escolha seu estado, digite os números (ou busque pelo nome) e leve para a urna uma colinha impressa, sem erro e sem o celular na cabine.

`1º turno · domingo, 4 de outubro de 2026`

</div>

---

## Por que existe

No dia da eleição, a urna pede **seis números em sequência**: deputado federal, deputado estadual, dois senadores, governador e presidente. Quem esquece um número, erra um dígito ou confunde a ordem acaba votando em outra pessoa ou anulando o voto sem perceber.

O Votely resolve só isso, e faz com cuidado:

- **Na ordem da urna.** Os cards seguem exatamente a sequência em que a urna pede os votos.
- **Confere na hora.** Ao completar os dígitos, aparece a foto, o nome de urna e o partido do candidato. Número errado aparece como erro, na hora.
- **"Não sei o número".** Busca por nome, partido ou número, sem se importar com acentos ou maiúsculas.
- **Imprime pronto.** Folha A4 em preto e branco com **duas colinhas de meia folha** para recortar, uma para você e outra para quem quiser.
- **Pensado para todo mundo.** Fontes grandes (Atkinson Hyperlegible, criada para baixa visão), alto contraste nos dois temas, alvos de toque ≥ 48 px e pouquíssimos passos. O público inclui pessoas mais velhas e com pouca familiaridade com tecnologia.
- **Apartidário.** Paleta neutra, candidatos em ordem alfabética e nenhum destaque para ninguém.

## O que ele faz

| | |
|---|---|
| 🗳️ **6 cargos, 1 tela** | Deputado Federal (4 dígitos), Estadual/Distrital (5), Senador 1ª e 2ª vaga (3), Governador (2) e Presidente (2). |
| 📷 **Foto oficial do TSE** | 20.983 fotos otimizadas em WebP. Quem não tem foto ganha um avatar com as iniciais. |
| 🔎 **Busca sem acento** | "joao" encontra "JOÃO"; dá para buscar por sigla, nome do partido ou número. |
| ⚠️ **Avisos úteis** | Número não encontrado, **mesmo candidato nas duas vagas de senador**, candidatura sub judice ou indeferida. |
| ⬜ **Voto em branco** | Um toque, com a instrução de qual tecla apertar na urna. |
| 🖨️ **Imprimir** | A4 com duas cópias e linha de recorte ✂️. Caixas vazias para anotar à mão o que faltar. |
| 💬 **WhatsApp** | Compartilha a colinha em texto, pronta para mandar para a família. |
| 💾 **Salvar neste aparelho** | Baixa a colinha como imagem PNG e guarda no navegador para continuar depois. |
| 🌗 **Tema claro e escuro** | Segue o sistema no primeiro acesso e lembra a escolha. |

> 📵 **O celular não pode entrar na cabine de votação.** Por isso o foco do Votely é o papel: imprima ou anote.

## Stack

- **[TanStack Start](https://tanstack.com/start)**: SSR e roteamento por arquivos com TanStack Router
- **[TanStack Form](https://tanstack.com/form)**: estado da colinha (UF + 6 votos)
- **[shadcn/ui](https://ui.shadcn.com)** no estilo `base-nova`, com **[Base UI](https://base-ui.com)** como primitivos (Select, Dialog, Avatar, Button e OTPField)
- **Tailwind CSS v4**, `cmdk` na busca, `sonner` nos avisos e `lucide-react` nos ícones
- **Vite 8**, **TypeScript** e **Bun**
- **sharp** para processar as fotos

## Começando

Requisitos: [Bun](https://bun.sh), além de `curl` e `unzip` no sistema (usados pelos scripts de dados).

```bash
bun install
bun run dev        # http://localhost:3000
```

Os dados dos candidatos (`public/data`) já vêm prontos. As fotos precisam ser geradas uma vez:

```bash
bun run fotos      # baixa, cruza e converte ~21 mil fotos (~1 min)
```

Build de produção:

```bash
bun run build      # vite build + checagem de tipos
bun run preview
```

Lint e formatação com [Biome](https://biomejs.dev):

```bash
bun run lint       # biome check .
bun run format     # biome check --write . (formata, organiza imports e aplica correções seguras)
```

> Componentes novos do shadcn chegam com aspas duplas. Rode `bun run format` depois de um `shadcn add`.

## Dados: do TSE para o app

Tudo vem do [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br) e é pré-processado em **arquivos estáticos**. O app não tem backend nem banco de dados: carrega só o JSON do estado escolhido e faz a busca no próprio aparelho. Por isso é rápido, funciona com internet ruim e aguenta o pico do dia da eleição servido por qualquer CDN.

```
consulta_cand_2026.zip ──► bun run candidatos ──► public/data/{UF}.json   (27 arquivos, 2,3 MB)
fotos do TSE (28 zips) ──► bun run fotos      ──► public/fotos/{sq}.webp  (20.983 fotos, 160 px)
```

### `bun run candidatos`

Lê o `consulta_cand_2026_BRASIL.csv` de dentro do `consulta_cand_2026.zip` (na raiz do projeto) e gera um JSON por UF com os cargos da urna, incluindo os presidentes.

- Vices e suplentes ficam de fora, porque não são votados separadamente.
- **Candidaturas substituídas:** o TSE mantém o registro antigo e o novo com o mesmo número. O script fica com o mais recente (o `SQ_CANDIDATO` é sequencial) e descarta 117 registros antigos.
- **Situação da candidatura:** em 25/09/2026 o TSE publica a coluna vazia (`#NE`) para todos. O mapeamento para *sub judice* e *indeferida* já está pronto em `scripts/candidatos.ts`; quando a coluna for preenchida, é conferir os valores e rodar de novo.

Para atualizar: baixe o `consulta_cand_2026.zip` mais recente do TSE para a raiz e rode `bun run candidatos`.

### `bun run fotos`

Baixa os pacotes `foto_cand2026_{UF}_div.zip` (27 UFs + BR), cruza os arquivos `F{UF}{SQ_CANDIDATO}_div.jpg` com o CSV e salva cada foto em WebP de 160 px em `public/fotos/{sq}.webp`.

- Os zips ficam em `.cache/fotos`, e as fotos já convertidas são puladas. Use `--force` para refazer tudo.
- **CDN do TSE:** o Akamai responde `403` para o `fetch` do Node/Bun e para `curl` simples. Só passa com `curl` em HTTP/1.1 e headers de navegador, e é por isso que o script usa o `curl` do sistema.
- Ao final, o script lista quem ficou sem foto. Esses candidatos aparecem com o avatar de iniciais.

## Estrutura

```
src/
├── routes/
│   ├── __root.tsx          # documento HTML, fontes, tema sem "piscar", Toaster
│   └── index.tsx           # a página: form, cards, busca, colinha
├── components/
│   ├── ui/                 # shadcn/ui (Base UI); otp-field.tsx é próprio
│   └── votely/             # CardUf, CardCargo, BuscaDialog, MinhaColinha,
│                           # FolhaImpressao, imagemColinha (PNG em canvas)…
├── lib/
│   ├── votely.ts           # UFs, cargos na ordem da urna, tipos, consulta
│   ├── candidatos.ts       # carrega /data/{UF}.json com cache
│   └── tema.ts             # claro/escuro com prefers-color-scheme
└── styles.css              # tokens do design (verde-petróleo + cinzas)
scripts/
├── candidatos.ts           # CSV do TSE → JSON por UF
└── fotos.ts                # fotos do TSE → WebP
```

## Decisões de design

- **O papel é o produto final.** O celular fica do lado de fora da cabine, então imprimir, compartilhar e baixar a imagem são as ações principais.
- **Nada aparece antes de escolher o estado.** Um passo de cada vez.
- **Um campo de dígitos por cargo, igual à urna.** Cada casa é um `<input>` de verdade (OTPField do Base UI): aceita só números, cola de uma vez e anda sozinho para a próxima casa.
- **Sem backend.** Dados públicos, iguais para todos e que só mudam quando o TSE atualiza não precisam de servidor.
- **Acessibilidade primeiro.** Paleta desenhada para contraste ≥ 4,5:1 nos dois temas, `prefers-reduced-motion` respeitado e rótulos para leitores de tela em cada casa de dígito.

## Deploy

Qualquer hospedagem que rode TanStack Start serve. Duas dicas:

- **Fotos fora do git.** São ~21 mil arquivos (~91 MB). Gere no build (`bun run fotos`) ou suba para um armazenamento de arquivos (R2, S3…). Verifique o limite de arquivos por deploy da sua hospedagem.
- **Cache.** Fotos podem ter cache longo, porque não mudam. Os JSONs devem ter cache curto (horas), porque a situação das candidaturas muda durante a campanha.

---

<div align="center">

**O Votely é independente e apartidário. Não é um aplicativo oficial da Justiça Eleitoral.**<br />
Dados: TSE, Portal de Dados Abertos. Confira sempre as informações na tela da urna antes de confirmar.

</div>
