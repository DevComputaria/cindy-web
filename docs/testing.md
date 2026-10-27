# Estratégia de testes

## Camadas

| Camada     | Objetivo                                                                  | Comando                              |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------ |
| unitária   | parsing, argumentos, preferências e regras do banco                       | `npm test`                           |
| cobertura  | impedir erosão nos módulos de domínio selecionados                        | `npm run test:coverage`              |
| build/type | contratos TypeScript e artefatos web/server                               | `npm run typecheck`, `npm run build` |
| integração | servidor real, HTTP, origem, subprocesso fixture, resume e restart SQLite | `npm run test:integration`           |
| qualidade  | formatação, lint, docs e todas as camadas                                 | `npm run check`                      |

Testes novos precisam proteger comportamento observável ou uma falha realista. Evite testes que apenas repetem implementação, snapshots enormes ou mocks do componente que deveria estar sob teste.

## Smoke test do runtime

`scripts/smoke-runtime.mjs` usa diretório temporário, porta local e um falso Codex determinístico. Ele verifica:

1. health e descoberta do adapter;
2. rejeição de origem externa;
3. criação de tarefa e primeiro turno;
4. captura da sessão e continuação no segundo turno;
5. encerramento, restart e persistência de quatro mensagens.

O teste nunca usa credenciais ou rede externa. Falhas devem exibir diagnóstico do processo sem despejar segredos.

## CI

A workflow principal separa qualidade, testes multiplataforma, integração e audit de produção; um job final `verify` serve como required check estável. O CodeQL usa o default setup já habilitado na organização, evitando uma segunda configuração incompatível. Dependabot cobre npm e GitHub Actions.

Limites de cobertura são piso, não meta. Código de I/O exercitado pelo smoke pode ser excluído da métrica unitária, mas não da validação do repositório.
