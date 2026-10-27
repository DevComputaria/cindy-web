# Desenvolvimento

## Preparação

```bash
npm ci
npm run doctor
npm run dco:install-hook
npm run check
```

Use Node.js 22.13+ e mantenha `package-lock.json` sincronizado. `npm ci` é o caminho usado pela CI. Os diretórios gerados e bancos locais estão no `.gitignore`.

## Commits e DCO

Contribuições usam Developer Certificate of Origin. Faça commits com `git commit -s`; o trailer precisa ter o mesmo e-mail do autor. O hook versionado apenas facilita isso e não substitui o gate da CI.

Commits devem ser pequenos, revisáveis e descrever intenção. Não misture formatação global com mudança comportamental sem necessidade.

## Pull requests

Preencha escopo, base de design, testes e riscos. Inclua evidência visual para UI e explique efeito em SQLite, processos, filesystem, segurança e compatibilidade entre sistemas quando aplicável.

Antes de enviar:

```bash
npm run check
npm audit --omit=dev
git status --short
```

## Configuração e ferramentas

Variáveis suportadas estão em `config/runtime.env.example`. Não adicione segredos ou caminhos pessoais a exemplos. CLIs de agente não são vendorizados: valide instalações locais com `npm run doctor [-- /caminho/de/trabalho]`.

Atualizações de dependências passam pelo Dependabot e pelos mesmos gates de pull request. Mudanças de runtime Node devem atualizar `engines`, matriz da CI, README e testes em conjunto.
