# Gestão de Temas de TI — Vicunha Têxtil

App (PWA web/mobile) para gerenciar os temas de TI, ações e informações da Vicunha Têxtil,
usando o Notion como banco de dados (via API oficial) e um backend Node/Express como proxy
seguro entre o navegador e o Notion.

```
app/
├── backend/     Node 20 + Express — proxy seguro para a API do Notion
└── frontend/    React 18 + Vite + TypeScript + Tailwind — PWA instalável no celular
```

---

## 1. Pré-requisitos

- Node.js 20 ou superior (https://nodejs.org)
- Uma conta Notion com acesso à página "Gestão de Temas de TI — Vicunha (App)"
  (as databases "Temas TI Vicunha" e "Itens - Ações e Informações" já existem e estão
  populadas — este app **não** cria as databases, apenas lê/escreve nelas)

## 2. Criar a integração do Notion (obrigatório — sem isso o backend recebe 401)

1. Acesse **https://www.notion.so/my-integrations** logado com a conta que tem acesso ao workspace da Vicunha.
2. Clique em **"+ New integration"**.
   - Nome sugerido: `App Temas TI Vicunha`
   - Workspace: selecione o workspace correto
   - Tipo: **Internal integration**
3. Salve e copie o **"Internal Integration Secret"** (começa com `secret_...`). Guarde esse
   valor com cuidado — ele dá acesso de leitura/escrita às páginas compartilhadas com a integração.
4. Abra a página **"Gestão de Temas de TI — Vicunha (App)"** no Notion (a página-mãe que contém
   as duas databases).
5. Clique no menu **"..."** no canto superior direito da página → **"Connections"** (ou
   "Conexões") → adicione a integração criada no passo 2.
   - Isso dá à integração acesso às databases **"Temas TI Vicunha"** e
     **"Itens - Ações e Informações"**, que ficam dentro dessa página.
6. Pronto — a integração agora pode ler e escrever nessas duas databases via API.

> Sem este passo, toda chamada do backend ao Notion retorna **401 Unauthorized**. Isso é
> esperado e não é um bug: o app foi construído sem um token real neste ambiente de
> desenvolvimento, exatamente para você conectar com sua própria integração.

## 3. Configurar o backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o arquivo `.env` e preencha:

```
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   # o segredo copiado no passo 2.3
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

Rodar em desenvolvimento (reinicia automaticamente ao salvar arquivos, via `node --watch`):

```bash
npm run dev
```

Ou em modo normal:

```bash
npm start
```

Teste rápido: abra `http://localhost:4000/api/health` — deve responder
`{"status":"ok","notionConfigured":true,...}`. Se `notionConfigured` estiver `false`, o `.env`
não foi lido corretamente. Se as rotas `/api/temas` etc. retornarem erro 401, revise os passos
2.5–2.6 (a página precisa estar compartilhada com a integração).

## 4. Configurar o frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edite `.env`:

```
VITE_API_URL=http://localhost:4000
```

Rodar em desenvolvimento:

```bash
npm run dev
```

Acesse `http://localhost:5173` no navegador. Para gerar a build de produção (usada para
publicar/hospedar o PWA):

```bash
npm run build
npm run preview   # opcional, serve a build localmente para conferir
```

## 5. Instalar o PWA no celular ("Adicionar à tela inicial")

1. Publique o `frontend` em algum host com HTTPS (Vercel, Netlify, Cloudflare Pages etc.) —
   PWAs exigem HTTPS para funcionar fora do `localhost`. Configure `VITE_API_URL` apontando
   para onde o backend estiver publicado (Render, Railway, Fly.io etc.) antes do build.
2. **Android (Chrome):** abra a URL do app → menu "⋮" → **"Adicionar à tela inicial"** /
   **"Instalar app"**.
3. **iPhone/iPad (Safari):** abra a URL do app → toque no ícone de **compartilhar** (quadrado
   com seta para cima) → **"Adicionar à Tela de Início"**.
4. O ícone instalado abre o app em modo standalone (sem barra de endereço), com o tema escuro
   definido no `manifest.webmanifest`.

Em ambiente local (sem HTTPS), o service worker e a instalação como PWA podem não funcionar
completamente — isso é uma limitação do navegador, não do código.

## 6. Estrutura da API (backend)

| Método | Rota                              | Descrição                                              |
|--------|------------------------------------|----------------------------------------------------------|
| GET    | `/api/temas`                       | Lista os 12 temas + contagem de itens pendentes por tema |
| PATCH  | `/api/temas/:id/foco`              | Alterna "Foco da Semana" de um tema                       |
| DELETE | `/api/temas/:id`                   | Exclui (arquiva no Notion) um tema — recusado com 409 se ainda houver itens vinculados |
| GET    | `/api/itens`                       | Lista itens (filtros: `tema`, `status`, `tipo`, `prioridade`, `q`) |
| POST   | `/api/itens`                       | Cria um novo item (Origem = "App")                        |
| PATCH  | `/api/itens/:id`                   | Atualiza status/prioridade/responsável/prazo/etc.        |
| DELETE | `/api/itens/:id`                   | Exclui (arquiva no Notion) um item                        |
| PATCH  | `/api/itens/:id/priorizar-hoje`    | Alterna "Priorizado Hoje"                                 |
| GET    | `/api/itens/kanban`                | Itens agrupados por Status                                |
| GET    | `/api/dashboard/semana`            | Temas em foco + itens priorizados para hoje               |
| GET    | `/api/habitos`                     | Lista hábitos (filtro opcional `ativo=true\|false`)        |
| POST   | `/api/habitos`                     | Cria um novo hábito                                        |
| PATCH  | `/api/habitos/:id`                 | Atualiza título/descrição/dias da semana/horário/ativo    |
| DELETE | `/api/habitos/:id`                 | Exclui (arquiva no Notion) um hábito                       |
| GET    | `/api/habitos/hoje?data=YYYY-MM-DD`| Hábitos ativos previstos para o dia da semana da data informada, com `concluidoHoje` |
| PATCH  | `/api/habitos/:id/checkin`         | Marca/desmarca conclusão numa data (`{ data, concluido }`) |
| GET    | `/api/habitos/:id/historico?dias=` | Datas concluídas mais recentes de um hábito                |
| GET    | `/api/rotinas?data=YYYY-MM-DD`     | Lista rotinas com progresso (`tempoRealizado`/`atingiuTotal`) do período que contém `data` (filtro opcional `ativo=`) |
| POST   | `/api/rotinas`                     | Cria uma nova rotina (`nome`, `tipoRecorrencia`, `tempoTotal` em minutos) |
| PATCH  | `/api/rotinas/:id`                 | Atualiza nome/tipo de recorrência/tempo total/ativo        |
| DELETE | `/api/rotinas/:id`                 | Exclui (arquiva no Notion) uma rotina                       |
| GET    | `/api/rotinas/:id/apontamentos?data=` | Apontamentos do período de recorrência que contém `data`  |
| POST   | `/api/rotinas/:id/apontamentos`    | Registra tempo (`data`, `minutos`, `observacao?`) — recusa com 409 se o tempo total do período já foi atingido |
| DELETE | `/api/rotinas/apontamentos/:id`    | Remove (arquiva) um apontamento lançado por engano          |
| GET    | `/api/rotinas/destinatarios`       | Lista destinatários do resumo diário por e-mail             |
| POST   | `/api/rotinas/destinatarios`       | Cadastra um destinatário (`email`)                          |
| PATCH  | `/api/rotinas/destinatarios/:id`   | Ativa/desativa um destinatário                               |
| DELETE | `/api/rotinas/destinatarios/:id`   | Remove um destinatário                                       |
| GET    | `/api/rotinas/resumo-diario?data=` | Calcula e envia por e-mail o resumo das rotinas do dia (padrão: ontem, fuso America/Sao_Paulo) — chamada automaticamente pelo Vercel Cron |
| GET    | `/api/health`                      | Healthcheck (mostra se `NOTION_API_KEY` está configurado) |

Todas as rotas GET usam um cache em memória de 60s (arquivo `backend/cache.js`), invalidado
automaticamente sempre que uma rota PATCH/POST/DELETE é chamada.

"Excluir" no Notion, via API pública, sempre significa **arquivar** a página (ela vai para a
Lixeira do workspace, de onde pode ser restaurada) — não existe exclusão permanente pela API.

## 7. Telas do app (frontend)

| Rota          | Tela                                                                  |
|---------------|------------------------------------------------------------------------|
| `/`           | **Hoje** — temas em foco, itens priorizados para hoje, criação rápida  |
| `/tabela`     | **Tabela** — grid com TanStack Table: ordenar, filtrar, agrupar por tema, edição inline |
| `/kanban`     | **Kanban** — colunas por Status, arrastar e soltar (dnd-kit) atualiza o Status |
| `/temas`      | **Temas** — um card por tema, contadores e toggle "Focar esta semana" |
| `/temas/:id`  | **Detalhe do tema** — itens do tema + formulário de novo item          |
| `/habitos`    | **Hábitos** — cadastro/edição/exclusão de hábitos, histórico de check-ins |
| `/rotinas`    | **Rotinas** — cadastro/edição/exclusão de rotinas, apontamento de tempo com barra de progresso, destinatários do resumo diário |
| `/novo`       | **Novo item** — formulário completo de criação                         |

A tela **Hoje** também mostra os hábitos previstos para o dia (calculado a partir de "Dias da
Semana" + a data local do navegador) com checkbox para marcar/desmarcar conclusão.

### Rotinas: acúmulo de tempo por período e resumo diário por e-mail

Cada rotina tem um **Tempo Total** (minutos) por período de recorrência (Diária/Semanal/Mensal).
Ao registrar um apontamento de tempo, o backend soma os apontamentos já lançados no período atual
da rotina (semana = segunda a domingo; mês = dia 1 ao último dia) e recusa (HTTP 409) qualquer novo
apontamento se esse total já tiver sido atingido — a mensagem de erro é exibida no app. Apagar um
apontamento "desfaz" a soma e libera novos lançamentos no mesmo período.

Todo dia, um Vercel Cron (`vercel.json`, `0 10 * * *` = 07:00 no fuso America/Sao_Paulo) chama
`GET /api/rotinas/resumo-diario`, que monta um resumo das rotinas com tempo apontado no dia
anterior e envia por e-mail (via [Resend](https://resend.com)) para os endereços ativos cadastrados
em `/rotinas`. Variáveis necessárias no `.env` do backend (ver `.env.example`):

- `RESEND_API_KEY` — sem ela, o endpoint calcula o resumo normalmente mas não envia e-mail (fica
  registrado em `envio.enviado: false` na resposta).
- `RESEND_FROM_EMAIL` — remetente; em produção precisa ser um domínio verificado na Resend.
- `CRON_SECRET` — opcional; se definido (nos dois lados — `.env` local ou Environment Variables da
  Vercel), protege o endpoint contra chamadas externas não autorizadas. A Vercel injeta o header
  `Authorization: Bearer <CRON_SECRET>` automaticamente nas chamadas agendadas.

O cron do Vercel Hobby plan permite no máximo 1 execução por dia por rota — compatível com este uso.

## 8. Notas e decisões de implementação

- Toda a lógica de acesso ao Notion está isolada em `backend/services/notionService.js` —
  nenhum outro arquivo do backend importa `@notionhq/client` diretamente.
- O cache em memória (`backend/cache.js`) é intencionalmente simples (um `Map` com TTL) —
  suficiente para o volume de dados do projeto (12 temas + 371 itens) e evita a necessidade
  de Redis ou outra dependência externa.
- Não há autenticação/usuário no app (single-tenant): qualquer pessoa com acesso à URL do
  frontend/backend consegue ler e escrever nas databases do Notion através do proxy. Avalie
  a exposição da URL publicada de acordo com a sensibilidade dos dados.
- A funcionalidade de Hábitos usa duas databases próprias no Notion, criadas como filhas da
  mesma página-mãe das databases de Temas/Itens: **"Hábitos"** (Título do Hábito, Descrição,
  Dias da Semana, Horário, Ativo) e **"Registro de Hábitos"** (relação com o hábito + Data —
  cada página representa um check-in de um dia específico; desmarcar um dia arquiva a
  página correspondente em vez de zerar um campo).
- A funcionalidade de Rotinas usa três databases próprias no Notion, também filhas da mesma
  página-mãe: **"Rotinas Diárias"** (Nome da Rotina, Tipo de Recorrência, Tempo Total em
  Minutos, Ativo), **"Apontamentos de Rotina"** (relação com a rotina + Data + Minutos +
  Observação — cada página é um lançamento de tempo) e **"Destinatários do Resumo Diário"**
  (Email, Ativo). "Tempo realizado" não é um campo próprio — é sempre calculado somando os
  apontamentos dentro do período de recorrência atual da rotina.
- O envio de e-mail está isolado em `backend/services/emailService.js` — nenhum outro arquivo
  do backend importa `resend` diretamente, no mesmo espírito do `notionService.js`.
- A sequência manual (arrastar e soltar) da lista "Priorizado para hoje" na tela Hoje é salva
  em dois campos na própria database Itens: **"Ordem Priorizado Hoje"** (número) e **"Data
  Ordem Priorizado"** (data). A ordem só é aplicada se `Data Ordem Priorizado` for igual à
  data local de hoje — assim ela "reseta" a cada dia sem precisar apagar nada: valores de dias
  anteriores simplesmente deixam de ser considerados. Por ser um campo do Notion (não
  `localStorage`), a ordem sincroniza entre dispositivos.
- Não há testes automatizados nem ESLint/Prettier configurados em nenhum dos dois projetos.
