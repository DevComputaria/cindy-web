# Agentes locais

## Modelo de integração

O runtime é “bring your own CLI”: detecta comandos com `--version`, herda o ambiente do usuário e nunca gerencia tokens. Os adapters ficam em `server/agents.ts` e devem manter três responsabilidades pequenas: construir argv, iniciar sem shell e interpretar eventos.

| Agente      | Primeiro turno                                           | Continuação                                                | Identidade esperada               |
| ----------- | -------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Codex       | `codex exec --json --skip-git-repo-check PROMPT`         | `codex exec resume --json --skip-git-repo-check ID PROMPT` | evento `thread.started.thread_id` |
| Claude Code | `claude -p --verbose --output-format stream-json PROMPT` | adiciona `--resume ID`                                     | `session_id` em evento JSON       |
| Hermes      | `hermes chat --prompt PROMPT`                            | configurável                                               | `session_id`, quando emitido      |

Prompts são argumentos literais; não existe expansão por shell. `NO_COLOR=1` e `FORCE_COLOR=0` reduzem ruído no parser.

## Hermes configurável

`CINDY_HERMES_ARGS` é um array JSON de strings. `{prompt}` e `{session}` são substituídos em cada item:

```bash
export CINDY_HERMES_ARGS='["chat","--session","{session}","--prompt","{prompt}"]'
```

Uma configuração inválida deve falhar visivelmente; não faça fallback silencioso para execução por shell.

## Regras para novos adapters

- adicione o tipo ao contrato compartilhado e à constraint do banco;
- defina primeiro turno, continuação e eventos de saída documentados;
- teste argumentos, parsing, erros e extração de sessão sem chamar o CLI real;
- adicione o agente ao smoke test somente com fixture determinística;
- não faça download automático nem procure credenciais do agente.

`tools/README.md` registra a política para ferramentas externas.
