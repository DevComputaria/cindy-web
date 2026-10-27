# Segurança

## Threat model suportado

O runtime confia no usuário local e nos CLIs que ele instalou. Não confia em páginas web externas, dados HTTP, prompts, nomes de arquivos ou stdout do agente. Não foi projetado para usuários mutuamente hostis na mesma conta do sistema, nem para exposição em rede.

## Controles atuais

- bind fixo em `127.0.0.1`;
- validação de `Origin` para chamadas vindas do navegador;
- CSP, `frame-ancestors 'none'`, `nosniff` e `no-referrer` nos assets;
- caminhos estáticos normalizados para permanecer em `dist/`;
- workdirs absolutos e existentes, validados na criação/edição e no spawn;
- subprocessos com `shell: false` e argv separado;
- limite de 2 MB para JSON;
- uma execução por tarefa e shutdown limitado;
- credenciais permanecem nos mecanismos oficiais de cada CLI;
- dependências auditadas e CodeQL na CI.

Clientes locais sem cabeçalho `Origin` (por exemplo `curl`) são permitidos. Isso não transforma a API em interface pública. Um futuro modo LAN precisa autenticação, TLS ou canal seguro, autorização por workdir, proteção CSRF explícita, rate limiting e revisão do conteúdo retornado.

## Capacidade do agente

Selecionar um workdir não é um sandbox de sistema operacional. Codex, Claude Code e Hermes herdam as permissões da conta que iniciou o runtime e podem acessar outros recursos conforme suas próprias políticas. A UI deve comunicar isso claramente e nunca prometer isolamento inexistente.

## Credenciais e logs

- nunca leia arquivos de autenticação dos agentes;
- nunca envie segredos ao navegador ou SQLite;
- não inclua prompt, stdout completo ou caminhos pessoais em logs de produção;
- variáveis de ambiente de exemplo não contêm valores reais;
- relatos de segurança não devem usar issue pública quando incluírem um exploit ou segredo.

## Revisão de mudanças sensíveis

Mudanças em bind, origem, subprocessos, filesystem, migrations, headers ou exposição de dados exigem teste negativo. Rode `npm run test:integration`, `npm audit --omit=dev` e documente o impacto no pull request.
