# Cindy Web

Interface web local para orquestrar agentes de programação no computador do usuário. É um porte web-first do [Cindy](https://github.com/makecindy/cindy), orientado pela análise do [REA](https://github.com/morluto/rea), sem Electron, preload ou IPC.

O navegador cuida da experiência; um servidor Node.js em loopback mantém processos, filesystem, SQLite e sessões nativas de Codex, Claude Code e Hermes. Portanto, “100% web” descreve a interface e o protocolo, não transfere execução privilegiada para um servidor remoto.

## Estado atual

- tarefas, mensagens, execuções e sessões de agente persistidas em SQLite;
- processos locais desacoplados do ciclo de vida da aba;
- continuação de sessão com `codex exec resume` e `claude --resume`;
- eventos em tempo real por Server-Sent Events (SSE) e interrupção de execução;
- diretórios de trabalho reais e anexos de texto;
- Markdown, tabelas, código, temas claro/escuro e layout responsivo;
- PWA instalável, servida pelo próprio runtime;
- migrations versionadas, testes unitários, cobertura e smoke test ponta a ponta.

## Arquitetura

```text
Navegador / PWA
  └─ HTTP JSON + SSE em 127.0.0.1
       └─ runtime Node.js
            ├─ SQLite: tarefas, mensagens, runs e migrations
            ├─ filesystem: workdirs escolhidos pelo usuário
            └─ subprocessos sem shell: Codex / Claude Code / Hermes
```

Fechar ou recarregar a página não encerra um agente: o processo pertence ao runtime. Reiniciar o runtime interrompe subprocessos e marca no banco qualquer `run` que tenha ficado como ativo. A sessão nativa do agente é preservada para o próximo turno, mas nunca se afirma que um processo perdido continua executando.

Veja [arquitetura](docs/architecture.md), [agentes](docs/agents.md), [persistência](docs/database-and-migrations.md) e [segurança](docs/security.md).

## Requisitos e início rápido

- Node.js 22.13 ou superior;
- npm;
- ao menos um CLI instalado, autenticado e disponível no `PATH`: `codex`, `claude` ou `hermes`.

```bash
npm ci
npm run doctor
npm run build
npm start
```

Abra `http://127.0.0.1:4317`. O servidor entrega tanto a interface compilada quanto `/api/*`; não é necessário executar outro backend.

Para desenvolvimento:

```bash
npm run dev       # compila e executa o runtime integrado
npm run dev:web   # Vite isolado, útil para trabalhar somente na interface
```

`dev:web` não substitui o runtime local. Fluxos reais de tarefas devem ser validados com o servidor integrado.

## Servidor local

O entrypoint de produção é `server-dist/index.js`, gerado de `server/index.ts`. Ele escuta somente em `127.0.0.1`, serve `dist/`, aplica cabeçalhos de segurança, valida `Origin` em `/api/*` e limita corpos JSON a 2 MB.

### Configuração

| Variável               | Padrão                         | Uso                                         |
| ---------------------- | ------------------------------ | ------------------------------------------- |
| `CINDY_WEB_PORT`       | `4317`                         | porta HTTP de loopback                      |
| `CINDY_WEB_DATA_DIR`   | diretório de estado do SO      | banco SQLite e arquivos futuros do runtime  |
| `CINDY_CODEX_COMMAND`  | `codex`                        | executável do Codex                         |
| `CINDY_CLAUDE_COMMAND` | `claude`                       | executável do Claude Code                   |
| `CINDY_HERMES_COMMAND` | `hermes`                       | executável do Hermes                        |
| `CINDY_HERMES_ARGS`    | `['chat', '--prompt', prompt]` | array JSON; aceita `{prompt}` e `{session}` |

Exemplo em [config/runtime.env.example](config/runtime.env.example). O projeto não carrega `.env` automaticamente: exporte as variáveis no processo, use seu gerenciador de serviços ou `node --env-file`.

### API v1

| Método   | Rota                       | Responsabilidade                                        |
| -------- | -------------------------- | ------------------------------------------------------- |
| `GET`    | `/api/health`              | versão, diretórios e agentes detectados                 |
| `GET`    | `/api/tasks`               | tarefas com mensagens e estado transitório `running`    |
| `POST`   | `/api/tasks`               | cria tarefa após validar workdir e agente               |
| `PATCH`  | `/api/tasks/:id`           | altera título, projeto, workdir, agente ou arquivamento |
| `DELETE` | `/api/tasks/:id`           | remove tarefa e dependências, se não estiver executando |
| `POST`   | `/api/tasks/:id/messages`  | persiste o turno e inicia o agente (`202`)              |
| `POST`   | `/api/tasks/:id/interrupt` | envia interrupção ao processo ativo                     |
| `GET`    | `/api/tasks/:id/events`    | stream SSE de mensagens e lifecycle da execução         |

Erros usam `{ "error": { "code": "...", "message": "..." } }`. Uma tarefa aceita no máximo uma execução concorrente. A API ainda é local e sem autenticação; expô-la na LAN ou internet não é suportado.

### Dados

- Linux: `$XDG_STATE_HOME/cindy-web` ou `~/.local/state/cindy-web`;
- macOS: `~/Library/Application Support/CindyWeb`;
- Windows: `%APPDATA%/CindyWeb`.

O banco é `cindy-web.sqlite3`, usa WAL, foreign keys e migrations append-only. Para backup consistente, pare o runtime e copie o diretório inteiro. Preferências visuais não sensíveis ficam no `localStorage`; histórico e estado operacional não ficam no navegador.

## Qualidade e contribuição

```bash
npm run check            # gate local completo
npm test                 # testes rápidos
npm run test:coverage    # testes + limites de cobertura
npm run test:integration # API, segurança, processo, resume e restart
npm run lint
npm run typecheck
npm run dco:install-hook # assinatura automática de novos commits
```

Todo commit deve usar DCO (`git commit -s`). Consulte [AGENTS.md](AGENTS.md), [desenvolvimento](docs/development.md) e [estratégia de testes](docs/testing.md).

## Cindy Desktop → Cindy Web

| Cindy Desktop                       | Cindy Web                                                |
| ----------------------------------- | -------------------------------------------------------- |
| Electron IPC / preload              | HTTP local e SSE                                         |
| SQLite e filesystem no main process | SQLite e filesystem no runtime Node local                |
| processos locais de Agent           | subprocessos locais persistentes no runtime              |
| atualizador desktop                 | service worker/PWA; distribuição do runtime ainda manual |
| janelas auxiliares                  | painéis responsivos na mesma aplicação                   |

Este repositório não baixa nem redistribui CLIs de terceiros. Cada agente usa sua própria instalação e autenticação; credenciais não entram no banco do Cindy Web.

## Proveniência e licença

Derivado conceitualmente do Cindy, sob Apache-2.0. Consulte [NOTICE](NOTICE), [análise REA](docs/rea-analysis.md) e [LICENSE](LICENSE).
