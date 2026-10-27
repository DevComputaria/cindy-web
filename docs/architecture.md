# Arquitetura

## Objetivo

Cindy Web orquestra agentes instalados na máquina do usuário por uma interface web. O runtime local substitui o main process do Electron sem remover as capacidades locais necessárias.

```text
┌──────────────── Browser / PWA ────────────────┐
│ React UI · preferências · File API            │
└───────────────────┬───────────────────────────┘
                    │ HTTP JSON + SSE (loopback)
┌───────────────────▼───────────────────────────┐
│ Node local runtime                            │
│ HTTP boundary → AgentRuntime → adapters       │
│                    │             │            │
│                  SQLite      child_process    │
└────────────────────┼─────────────┼────────────┘
                     │             └─ Codex / Claude / Hermes
                     └─ tasks / messages / runs / migrations
```

## Responsabilidades

| Camada    | Pode possuir                                    | Não pode possuir                                |
| --------- | ----------------------------------------------- | ----------------------------------------------- |
| navegador | UI, tema, preferências, arquivos escolhidos     | credenciais, processos, verdade durável de runs |
| HTTP/SSE  | validação, serialização, status e eventos       | regra específica de um CLI                      |
| runtime   | exclusão mútua por tarefa, lifecycle, streaming | renderização ou acesso a DOM                    |
| adapters  | argv e parsing de eventos por agente            | SQL ou estado de interface                      |
| banco     | tarefas, mensagens, runs, sessão nativa         | processos vivos ou segredos do CLI              |

## Fluxo de um turno

1. `POST /messages` valida tarefa, workdir, agente e exclusão mútua.
2. Runtime inicia o processo sem shell, persiste mensagem do usuário e placeholder do assistente, registra o run e publica SSE.
3. O adapter transforma JSONL/stdout em texto e identidade de sessão; cada atualização relevante é persistida antes de ser enviada à UI.
4. No encerramento, mensagem e run recebem estado terminal: `completed`, `failed` ou `interrupted`.
5. O próximo turno usa a sessão nativa. Trocar agente ou workdir a invalida.

## Lifecycle e recuperação

- Recarregar/fechar a aba: nenhuma ação sobre subprocessos.
- Desconectar SSE: o run continua e grava no SQLite.
- `SIGINT`/`SIGTERM` do runtime: interrompe filhos, aguarda até cinco segundos e encerra o banco.
- Crash/restart: o startup marca runs órfãos como `interrupted`.
- Vários clientes podem observar a mesma tarefa; apenas um run pode escrevê-la por vez.

## Decisões portadas

Do Cindy original foram preservados: separação de domínio/adapters, SQLite como verdade local, processos pertencentes ao backend, regras append-only para migrations, contratos de segurança e gates de contribuição. Foram removidos IPC/preload, lifecycle de janelas, updater Electron e download interno de binários.

## Limites atuais

- Sem autenticação: o runtime é exclusivamente loopback.
- Sem reconexão a um PID após crash; o estado é encerrado honestamente como interrompido.
- Anexos binários não são enviados aos agentes; arquivos de texto têm limite no cliente.
- O protocolo de Hermes varia entre instalações e pode exigir `CINDY_HERMES_ARGS`.
- Não há distribuição/atualização automática do runtime Node.
