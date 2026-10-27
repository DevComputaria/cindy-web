# Cindy Web

Uma reconstrução web-first do fluxo principal do [Cindy](https://github.com/makecindy/cindy), orientada por análise estática com [REA](https://github.com/morluto/rea).

O produto usa uma interface 100% web conectada a um runtime local em Node.js. O runtime preserva o que importa para orquestrar trabalho real no computador: processos de agentes, SQLite, histórico de execuções e acesso ao filesystem. Electron, preload e IPC não fazem parte da aplicação.

## Recursos implementados

- tarefas e mensagens persistidas em SQLite;
- processos locais persistentes de Codex, Claude Code e Hermes;
- streaming de eventos enquanto o agente trabalha;
- interrupção de execuções e recuperação do histórico após recarregar a página;
- pastas de trabalho reais e anexos de texto;
- Markdown, tabelas e blocos de código;
- tema claro, escuro ou do sistema;
- layout responsivo e acessível;
- PWA instalável servida pelo runtime local.

## Arquitetura

```text
Navegador/PWA ── HTTP + SSE ──> runtime local (127.0.0.1)
                                  ├─ SQLite: tarefas, mensagens e execuções
                                  ├─ filesystem: workdirs reais
                                  └─ processos: Codex / Claude Code / Hermes
```

Fechar ou recarregar a página não encerra o agente. O processo pertence ao runtime local, e sua saída continua sendo gravada no SQLite. Reiniciar o próprio runtime marca execuções que estavam ativas como interrompidas; não inventa continuidade quando o vínculo com o processo foi perdido.

## Executar

Requer Node.js 22.13 ou superior e pelo menos um CLI autenticado no `PATH`: `codex`, `claude` ou `hermes`.

```bash
npm install
npm run build
npm start
```

Abra `http://127.0.0.1:4317`. Para desenvolvimento com rebuild automático da interface, use `npm run dev:web` em outro terminal e mantenha o runtime ativo; a execução integrada padrão é `npm run dev`.

Validação:

```bash
npm test
npm run typecheck
npm run build
```

## Agentes locais

O runtime detecta os executáveis com `--version` e usa as autenticações já mantidas por cada CLI. Nenhuma credencial do agente é copiada para o banco do Cindy Web.

- Codex: `codex exec --json`
- Claude Code: `claude -p --verbose --output-format stream-json`
- Hermes: `hermes chat --prompt`

Comandos podem ser substituídos por `CINDY_CODEX_COMMAND`, `CINDY_CLAUDE_COMMAND` e `CINDY_HERMES_COMMAND`. Para uma instalação Hermes com argumentos diferentes, `CINDY_HERMES_ARGS` aceita um array JSON; `{prompt}` e `{session}` são substituídos sem invocar shell.

O identificador nativo emitido por cada agente fica associado à tarefa. Turnos seguintes usam `codex exec resume` ou `claude --resume`; trocar o agente ou a pasta de trabalho limpa esse vínculo para evitar retomar uma sessão no contexto errado.

## O que “100% web” muda

O Cindy Desktop usa Renderer React, preload/bridge e processo Electron principal. Este porte mantém os fluxos de interface, mas substitui as fronteiras nativas:

| Cindy Desktop | Cindy Web |
| --- | --- |
| Electron IPC / preload | HTTP local e Server-Sent Events |
| SQLite e filesystem local | SQLite e filesystem mantidos no runtime local |
| processos locais de Agent | processos Codex, Claude Code e Hermes mantidos pelo runtime |
| atualizador desktop | service worker/PWA |
| janelas auxiliares | painéis e rotas web responsivas |

O runtime escuta exclusivamente em `127.0.0.1`, valida a origem do navegador e inicia processos com `shell: false`. Os agentes continuam executando com as permissões normais do usuário; a pasta de trabalho não é um sandbox de sistema operacional.

## Dados

Use `CINDY_WEB_DATA_DIR` para escolher o diretório do banco. Sem configuração explícita:

- Linux: `$XDG_STATE_HOME/cindy-web` ou `~/.local/state/cindy-web`;
- macOS: `~/Library/Application Support/CindyWeb`;
- Windows: `%APPDATA%/CindyWeb`.

## Proveniência

Este projeto é derivado conceitualmente do Cindy, licenciado sob Apache-2.0. Consulte [NOTICE](NOTICE) e [docs/rea-analysis.md](docs/rea-analysis.md).

## Licença

Apache License 2.0.
