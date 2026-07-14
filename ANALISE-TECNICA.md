# Análise Técnica — Gestão de Temas de TI (Vicunha)

> Documento gerado a partir de uma varredura do código-fonte atual (backend + frontend), com o objetivo de servir de base para priorizar melhorias de desenvolvimento. Não é uma auditoria de segurança formal nem cobre comportamento em runtime (não foi executado o app).

**Data da análise:** 2026-07-14
**Escopo:** `backend/` (Node 20 + Express) e `frontend/` (React 18 + Vite + TS + Tailwind)

---

## 1. Visão geral da arquitetura

```
Browser (PWA) ── fetch /api/* ──▶ Express backend ──▶ Notion API
                                        │
                                        └─ cache em memória (Map, TTL 60s)
```

- **Backend**: proxy fino sobre a API do Notion. Toda a integração está isolada em `backend/services/notionService.js` (boa decisão de arquitetura — ponto único de acesso ao `@notionhq/client`).
- **Frontend**: SPA com React Query para cache/estado de servidor, TanStack Table (tabela), dnd-kit (Kanban), roteamento via `react-router-dom`. PWA instalável via `vite-plugin-pwa`.
- **Persistência**: nenhuma — o Notion é o banco de dados de fato. Não há schema/migração própria.
- **Autenticação**: nenhuma (single-tenant, já documentado no README como decisão consciente).
- **Versionamento**: **o diretório não é um repositório Git** — não há histórico, branches, nem possibilidade de rollback granular hoje.

### Pontos fortes já presentes
- Separação clara de camadas no backend (`routes/` finos, lógica de domínio em `services/`).
- Cache simples e propositalmente sem overengineering (`cache.js`), com invalidação por prefixo coerente em todas as rotas de escrita.
- Tipagem TypeScript ponta a ponta no frontend, com tipos de domínio centralizados (`api/types.ts`) reaproveitados em toda a UI.
- Componentização de filtros (`FiltrosItens`, `MultiSelectFiltro`, `FiltroPrazo`) reaproveitada entre Tabela/Kanban/Detalhe do Tema.
- README bem escrito, cobre setup passo a passo e documenta decisões (cache em memória, "exclusão" = arquivar, ausência de auth).
- Update otimista já implementado no drag-and-drop do Kanban (`Kanban.tsx:113-138`).

---

## 2. Backend — oportunidades de melhoria

### 2.1 Segurança
| # | Achado | Local | Risco |
|---|--------|-------|-------|
| B1 | Nenhuma autenticação/autorização — qualquer um com a URL lê/escreve todas as databases do Notion via proxy. Já documentado no README como risco aceito, mas vale reforçar antes de publicar a URL fora da rede interna. | `backend/server.js` | Alto se exposto publicamente |
| B2 | Sem `helmet` ou headers de segurança (CSP, X-Frame-Options, etc.). | `server.js:15-16` | Médio |
| B3 | Mensagens de erro não-401 repassam `err.message` cru ao cliente, podendo vazar detalhes internos da API do Notion. | `server.js:41-52` | Baixo/Médio |
| B4 | IDs das databases do Notion hardcoded no código-fonte em vez de variável de ambiente. Não é segredo por si só, mas acopla o código a um workspace específico e dificulta trocar de ambiente (dev/homologação/produção). | `notionService.js:26-27` | Baixo |
| B5 | Rate limit é global por IP (120 req/min) — adequado como está, mas não há proteção por rota (ex.: `POST`/`DELETE` poderiam ter limite mais restritivo que `GET`). | `server.js:19-25` | Baixo |

### 2.2 Robustez e validação
| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| B6 | Validação de entrada é manual e mínima (apenas checa presença de `nome`/`titulo`). Não há schema de validação (ex.: Zod, Joi) — campos como `prazo`, `ordem`, `urlAta` não são validados quanto a formato antes de ir para o Notion, que pode devolver erro 400 pouco claro. | `routes/temas.js`, `routes/itens.js` | Médio |
| B7 | Nomes de propriedades do Notion (`p['Título']`, `p['Descrição']`, etc.) são strings mágicas espalhadas por `notionService.js`. Se alguém renomear uma coluna no Notion, o app falha silenciosamente (campo vira `null`/`''` em vez de erro explícito). | `notionService.js` (mapeadores) | Médio — falha silenciosa é pior que erro |
| B8 | `listTemas()` sempre busca **todos** os itens com status "Pendente" para calcular contagem (`notionService.js:145`) — funciona bem para 371 itens, mas não escala indefinidamente; não há paginação de resposta para o frontend. | `notionService.js:135-158` | Baixo hoje, cresce com o volume de dados |
| B9 | Sem verificação de variáveis de ambiente obrigatórias na inicialização — o servidor sobe normalmente mesmo sem `NOTION_API_KEY` (só loga aviso). Um `fail-fast` explícito ajudaria a pegar erro de config mais cedo em produção. | `server.js:54-61` | Baixo |

### 2.3 Qualidade de código / manutenibilidade
| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| B10 | Sem testes automatizados no backend (nenhum framework configurado, nenhum arquivo `*.test.js`). | projeto todo | Alto para confiabilidade em mudanças futuras |
| B11 | Sem ESLint/Prettier configurado — já sinalizado no README como dívida conhecida. | `backend/package.json` | Médio |
| B12 | Sem logging estruturado (`console.error`/`console.warn` apenas) — dificulta troubleshooting em produção. | `server.js` | Baixo/Médio |

---

## 3. Frontend — oportunidades de melhoria

### 3.1 Tipagem e correção
| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| F1 | Uso de `as any` para contornar tipagem em mutações (`dados as any` ao atualizar item; casts de enum em `ItemForm`). Perde-se a checagem estática exatamente nos pontos onde ela mais importa (payloads que vão pro backend). | `Tabela.tsx:40`, `ItemForm.tsx:46-51` | Médio |
| F2 | Duas cópias de `vite.config` no repo: `vite.config.ts` (fonte) e `vite.config.js` (artefato compilado, aparentemente gerado por `tsc -b` incluir esse arquivo no build). Ambos coexistem no diretório de trabalho e podem confundir sobre qual é a fonte da verdade — vale excluir `vite.config.ts` do `tsconfig` de build ou adicionar ao `.gitignore`/limpeza automática. | `frontend/vite.config.js` vs `.ts` | Baixo, mas gera confusão |

### 3.2 Duplicação / reuso
| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| F3 | Lógica de filtragem de itens (tema/status/tipo/prioridade/responsável/prazo/busca) está duplicada quase idêntica em `Tabela.tsx` (linhas 59-75) e `Kanban.tsx` (`passaNosFiltros`, linhas 149-157). Um hook `useFiltrosItens(itens, filtros)` compartilhado eliminaria a duplicação e centralizaria a regra de negócio dos filtros. | `Tabela.tsx`, `Kanban.tsx` | Médio |
| F4 | Cálculo de `responsaveisDisponiveis` (extrair valores únicos de `responsavel`) duplicado em `Tabela.tsx:53-57` e `Kanban.tsx:143-147`. Candidato ao mesmo hook acima ou a um helper isolado. | idem | Baixo |
| F5 | Update otimista (padrão `onMutate`/`onError`/`onSettled` do React Query) só existe no drag-and-drop do Kanban. As edições inline de Status/Prioridade na Tabela (`Tabela.tsx:110-146`) e o toggle "Priorizado Hoje" em `Hoje.tsx` fazem apenas invalidação pós-sucesso, deixando a UI "travada" até a resposta do servidor. Padronizar o otimismo traria uma UX mais consistente. | `Tabela.tsx`, `Hoje.tsx` | Médio (percepção de performance) |

### 3.3 Performance / escalabilidade
| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| F6 | `GET /api/itens` sem paginação real: a Tabela e o Kanban carregam todos os itens de uma vez e filtram no cliente. Funciona bem em 371 itens; se a base crescer bastante, considerar paginação/server-side filtering ou pelo menos virtualização de linhas na tabela. | `Tabela.tsx`, `Kanban.tsx`, `itens.js` | Baixo hoje |
| F7 | Sem `React.memo`/virtualização nas listas de cartões do Kanban — não é problema no volume atual, mas vale monitorar se colunas crescerem muito (ex.: "Pendente" concentrando a maioria dos 371 itens). | `Kanban.tsx` | Baixo |

### 3.4 Acessibilidade e UX
| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| F8 | Vários `<select>`/inputs de edição inline sem `aria-label` (ex.: selects de Status/Prioridade na tabela, linhas 106-119 e 131-144 de `Tabela.tsx`) — leitores de tela não conseguem identificar o propósito do campo fora do contexto visual da coluna. | `Tabela.tsx` | Médio (acessibilidade) |
| F9 | Nome "Cleber" hardcoded na saudação da tela Hoje (`Hoje.tsx:43`). Funciona para uso pessoal atual, mas travaria caso o app seja usado por mais de uma pessoa. | `Hoje.tsx:43` | Baixo, mas fácil de corrigir |
| F10 | Não há `ErrorBoundary` React — um erro de render não tratado (ex.: dado inesperado do Notion) derruba a tela inteira em vez de mostrar um fallback. | projeto todo | Médio |

### 3.5 Qualidade de código
| # | Achado | Local | Impacto |
|---|--------|-------|---------|
| F11 | Sem testes automatizados (nenhum Vitest/Jest/Testing Library configurado). | projeto todo | Alto |
| F12 | Sem ESLint/Prettier — já sinalizado no README. | `frontend/package.json` | Médio |

---

## 4. Infraestrutura / processo

| # | Achado | Impacto |
|---|--------|---------|
| I1 | **Projeto não está sob controle de versão** (não é repositório Git). Isso significa: sem histórico de mudanças, sem possibilidade de reverter uma alteração ruim, sem branches para experimentar, sem colaboração segura. É a lacuna de maior risco estrutural no momento. | **Alto** |
| I2 | Sem CI (lint/test/build automático a cada mudança) — consequência natural de não haver Git/testes ainda. | Alto (depende de I1) |
| I3 | Sem Dockerfile/configuração de deploy versionada — o README menciona Render/Railway/Vercel como sugestão, mas não há arquivo de configuração (`render.yaml`, `Dockerfile`, `vercel.json`) no repo. | Médio |
| I4 | `backend/.env` e `frontend/.env` existem localmente com segredo real (`NOTION_API_KEY`). Estão corretamente listados em `.gitignore` — mas isso só terá efeito **depois** que o projeto virar um repositório Git; até lá, o segredo vive em texto puro no disco sem proteção adicional (aceitável para uso local, mas atenção redobrada ao inicializar o Git para não commitar por engano). | Baixo/Médio |

---

## 5. Priorização sugerida

### Quick wins (baixo esforço, valor imediato)
1. **I1** — Inicializar o repositório Git (`git init`, primeiro commit, confirmar que `.env` está ignorado). Pré-requisito para quase tudo abaixo.
2. **B4** — Mover `TEMAS_DB_ID`/`ITENS_DB_ID` para variáveis de ambiente.
3. **F9** — Tornar o nome da saudação em `Hoje.tsx` configurável (env var ou constante).
4. **F1/F2** — Remover os `as any`, tipar os payloads das mutações corretamente; excluir `vite.config.ts` da compilação `tsc -b` (ajustar `tsconfig.node.json`/`exclude`) para não gerar `vite.config.js` duplicado.
5. **B9** — Fail-fast no boot se `NOTION_API_KEY` não estiver definido (ou manter warning, mas também expor isso com mais destaque no `/api/health`).

### Médio prazo (esforço moderado, melhora estrutural)
6. **B11/F12** — Configurar ESLint + Prettier em backend e frontend (consistência de estilo, pega bugs bobos cedo).
7. **F3/F4** — Extrair hook `useFiltrosItens` compartilhado entre Tabela e Kanban.
8. **B6** — Adicionar validação de schema (Zod é uma boa escolha, já que o frontend também é TS — dá pra compartilhar tipos/schemas).
9. **F5** — Padronizar update otimista nas mutações restantes (Tabela, Hoje).
10. **F8** — Adicionar `aria-label`s nos controles de edição inline.
11. **I2** — Pipeline de CI básico (lint + build) assim que I1 e B11/F12 estiverem prontos.

### Investimento maior (mas de alto retorno)
12. **B10/F11** — Suite de testes: começar pelo backend (testes de rota com mock do `notionService`, já que a camada está bem isolada) e depois testes de componente no frontend (React Testing Library) para os fluxos críticos (criar item, mover no Kanban, editar inline).
13. **B7** — Camada de mapeamento mais defensiva: validar no boot (ou em teste de integração) que as propriedades esperadas existem no schema atual do Notion, para falhar alto e claro em vez de devolver campos vazios silenciosamente.
14. **I3** — Formalizar deploy (Dockerfile para o backend + config de build para o frontend), possibilitando deploy repetível.
15. **F10** — `ErrorBoundary` global no frontend.

---

## 6. Não recomendado no momento
- Trocar o cache em memória por Redis: desnecessário no volume atual (12 temas + 371 itens) — só reconsiderar se o backend passar a rodar em múltiplas instâncias.
- Adicionar autenticação de usuários agora, a menos que a URL vá ser exposta fora da rede confiável — é uma decisão consciente já documentada no README, não uma omissão acidental.
- Migrar de Notion para banco próprio — fora do escopo do produto atual (o Notion é a fonte de dados por design).
