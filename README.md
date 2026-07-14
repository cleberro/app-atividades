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
| `/novo`       | **Novo item** — formulário completo de criação                         |

## 8. Notas e decisões de implementação

- Toda a lógica de acesso ao Notion está isolada em `backend/services/notionService.js` —
  nenhum outro arquivo do backend importa `@notionhq/client` diretamente.
- O cache em memória (`backend/cache.js`) é intencionalmente simples (um `Map` com TTL) —
  suficiente para o volume de dados do projeto (12 temas + 371 itens) e evita a necessidade
  de Redis ou outra dependência externa.
- Não há autenticação/usuário no app (single-tenant): qualquer pessoa com acesso à URL do
  frontend/backend consegue ler e escrever nas databases do Notion através do proxy. Avalie
  a exposição da URL publicada de acordo com a sensibilidade dos dados.
- Não há testes automatizados nem ESLint/Prettier configurados em nenhum dos dois projetos.
