# Análise do Cindy com REA

Data: 2026-10-27

REA: `rea-agents` 6.8.0, checkout `https://github.com/morluto/rea`

Alvo: `https://github.com/makecindy/cindy`, aplicação `apps/desktop`

## Escopo

Foram selecionadas as entradas que definem a experiência principal e a fronteira nativa:

- `src/renderer/main-entry.tsx`
- `src/renderer/App.tsx`
- `src/renderer/router.tsx`
- `src/renderer/components/layout/MainLayout.tsx`
- `src/renderer/features/cc-agent/CCAgentSessionView.tsx`
- `src/renderer/features/cc-agent/NewMakerDraftRoute.tsx`
- `src/renderer/lib/makerChatStore.ts`
- `src/preload/preload.ts`
- `src/main/maker-ipc/register.ts`

O REA autenticou o recorte como artefato de diretório e gerou a evidência parcial
`ev_cbc7adeb66873596a4c6034dda070c94547f7805619c3ee04b5e83de20381818`, com 22 nós e 21 relações estruturais.

## Limitação observada

O worker encerrou antes da resposta terminal, retornando `unreadable_output`. A falha foi reproduzida tanto no monorepo quanto em recortes menores, inclusive um recorte contendo apenas `router.tsx`. Por isso, as relações semânticas e rotas recuperadas devem ser tratadas como desconhecidas, não ausentes. O REA preservou a evidência parcial, os hashes dos arquivos e a limitação explícita.

## Decisões de porte

1. O Renderer React e o sistema de rotas são reconstruídos como uma SPA/PWA.
2. O preload e o IPC não entram no bundle web. Seus papéis viram interfaces baseadas em APIs do navegador.
3. O estado local usa armazenamento do navegador; nenhum dado do perfil Cindy Desktop é importado.
4. A execução de Agent local é substituída por streaming HTTP de endpoint OpenAI-compatible.
5. Recursos sem equivalente seguro no navegador são declarados como lacunas, não simulados como concluídos.

## Verificação complementar

Além do REA, o código-fonte e as regras públicas do Cindy foram usados como evidência primária para nomes de rotas, princípios de produto e sistema visual. O porte preserva os princípios de superfície plana, divisores de 1 px, ausência de sombras na linguagem-base, geometria arredondada e temas claro/escuro.
