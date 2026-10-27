# Banco de dados e migrations

## Modelo

O arquivo `cindy-web.sqlite3` é a fonte de verdade durável do runtime.

- `tasks`: workdir, adapter, metadados e sessão nativa;
- `messages`: conversa ordenada, estado pendente e erro;
- `runs`: auditoria de processo, PID, status, código de saída e erro;
- `schema_migrations`: versões aplicadas e data.

Foreign keys ficam ativas, mensagens/runs usam `ON DELETE CASCADE` e WAL permite leitura enquanto o runtime grava.

## Regra append-only

Migrations publicadas nunca são reordenadas, renumeradas ou editadas. Uma alteração de schema recebe o próximo número em `server/database.ts`, é idempotente onde fizer sentido e executa em `BEGIN IMMEDIATE`. O registro da versão ocorre na mesma transação.

Checklist para uma migration:

1. suportar upgrade de um banco real da versão anterior;
2. suportar criação de um banco vazio;
3. preservar dados e constraints existentes;
4. atualizar teste, modelo e documentação juntos;
5. considerar rollback operacional por backup, não SQL destrutivo automático.

## Compatibilidade anterior ao ledger

Bancos criados pelas primeiras versões do Cindy Web não tinham `schema_migrations`. O bootstrap detecta a coluna `native_session_id`, adiciona-a quando necessário e então registra o schema base. Esse bloco é compatibilidade histórica e não deve virar um segundo mecanismo geral de migrations.

## Backup e recuperação

Pare o runtime antes de copiar ou restaurar dados. Copie todo o diretório, incluindo possíveis arquivos `-wal` e `-shm`. Em startup, runs ainda marcados como `running` tornam-se `interrupted`, pois o novo processo não possui o child process antigo.

Não grave tokens, cookies ou credenciais no banco. Caminhos e prompts são dados locais potencialmente sensíveis e não devem aparecer em logs/telemetria.
