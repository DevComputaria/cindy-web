# Cindy Web

Uma reconstrução web-first do fluxo principal do [Cindy](https://github.com/makecindy/cindy), orientada por análise estática com [REA](https://github.com/morluto/rea).

O projeto roda inteiramente no navegador: não inclui Electron, processo `main`, preload, IPC, binários locais ou um backend próprio. Tarefas e preferências ficam no `localStorage`; a chave do provedor fica somente no `sessionStorage`.

## Recursos implementados

- tarefas persistentes, busca, renomeação e exclusão;
- conversa com streaming via qualquer endpoint OpenAI-compatible;
- modo demonstração sem chave de API;
- anexos de texto e seleção de diretório pela File System Access API quando disponível;
- Markdown, tabelas e blocos de código;
- tema claro, escuro ou do sistema;
- layout responsivo e acessível;
- PWA instalável com shell offline.

## Executar

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Validação:

```bash
npm test
npm run typecheck
npm run build
```

## Conectar um modelo

Abra **Configurações → Modelo**, informe um endpoint que implemente `POST /chat/completions`, o identificador do modelo e a chave da API. Chamadas saem diretamente do navegador, portanto o endpoint deve permitir CORS para a origem da aplicação.

Para produção, recomenda-se um gateway próprio com autenticação do usuário e chaves mantidas no servidor. O modo direto é adequado para uso pessoal e endpoints locais/confiáveis.

## O que “100% web” muda

O Cindy Desktop usa Renderer React, preload/bridge e processo Electron principal. Este porte mantém os fluxos de interface, mas substitui as fronteiras nativas:

| Cindy Desktop | Cindy Web |
| --- | --- |
| Electron IPC / preload | estado e adapters do navegador |
| SQLite e filesystem local | `localStorage`, `File` e File System Access API |
| processos locais de Agent | endpoint HTTP OpenAI-compatible |
| atualizador desktop | service worker/PWA |
| janelas auxiliares | painéis e rotas web responsivas |

Recursos que dependem de execução arbitrária no computador, terminal, SSH, keychain, tray e integrações nativas exigirão um serviço remoto opcional ou APIs futuras do navegador; eles não são simulados como se fossem nativos.

## Proveniência

Este projeto é derivado conceitualmente do Cindy, licenciado sob Apache-2.0. Consulte [NOTICE](NOTICE) e [docs/rea-analysis.md](docs/rea-analysis.md).

## Licença

Apache License 2.0.
