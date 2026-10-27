# Design system

O Cindy Web porta a linguagem visual essencial do Cindy: produto de trabalho calmo, denso e quase monocromático, sem decoração que dispute atenção com a conversa.

## Princípios

- uma superfície principal contínua, com hierarquia por contraste e espaçamento;
- Inter como tipografia de interface e fonte monoespaçada somente para código;
- sombras evitadas; bordas e mudança sutil de superfície definem camadas;
- cores semânticas reservadas a estado, erro, atenção e agentes;
- ações frequentes ficam visíveis; ações destrutivas pedem confirmação;
- o layout deve funcionar de desktop amplo até viewport móvel.

## Tokens e geometria

As variáveis de tema vivem em `src/styles.css`. Prefira tokens existentes a cores literais. Raios permitidos seguem a escala `0 / 2 / 4 / 8 / 12 / pill`; controles relacionados compartilham altura e alinhamento. Áreas clicáveis devem ter pelo menos 36 px e foco de teclado claramente visível.

## Componentes e estados

Todo componente interativo considera `hover`, `focus-visible`, `disabled`, loading e erro. Streaming deve preservar continuidade visual, sem reposicionar controles. Mensagens do agente usam Markdown legível; blocos de código precisam manter overflow horizontal sem quebrar o layout.

## Acessibilidade

- HTML semântico antes de ARIA;
- contraste suficiente em ambos os temas;
- ícones sem texto recebem nome acessível;
- alertas operacionais usam região apropriada;
- funcionalidade principal é acessível por teclado;
- `prefers-reduced-motion` deve ser respeitado ao adicionar animações.

Novos padrões visuais devem ser generalizados em token/componente quando aparecem mais de uma vez. Evite reproduzir pixel a pixel estruturas do Electron que não servem à arquitetura web responsiva.
