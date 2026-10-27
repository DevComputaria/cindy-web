import type { Message } from '../types';

export interface ChatRequest {
  endpoint: string;
  model: string;
  apiKey: string;
  messages: Message[];
  signal: AbortSignal;
  onToken: (text: string) => void;
}

function endpointUrl(base: string): string {
  const normalized = base.replace(/\/+$/, '');
  return normalized.endsWith('/chat/completions') ? normalized : `${normalized}/chat/completions`;
}

export async function streamChat(request: ChatRequest): Promise<void> {
  const response = await fetch(endpointUrl(request.endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      stream: true,
      messages: request.messages.map(({ role, content, attachments }) => ({
        role,
        content: attachments?.length
          ? `${content}\n\nArquivos anexados:\n${attachments.map((file) => `--- ${file.name} ---\n${file.text ?? '[arquivo binário]'}`).join('\n')}`
          : content,
      })),
    }),
    signal: request.signal,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`O provedor respondeu ${response.status}: ${details.slice(0, 300)}`);
  }
  if (!response.body) throw new Error('O provedor não retornou um stream de resposta.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) request.onToken(token);
      } catch {
        // Providers occasionally send keep-alive lines that are not JSON.
      }
    }
  }
}

export async function mockChat(prompt: string, signal: AbortSignal, onToken: (text: string) => void) {
  const response = `Estou no modo de demonstração. Recebi: “${prompt.slice(0, 120)}”.\n\nConecte um provedor em **Configurações → Modelo** para obter respostas reais. Suas tarefas já ficam salvas neste navegador.`;
  for (const word of response.split(/(\s+)/)) {
    if (signal.aborted) throw new DOMException('Interrompido', 'AbortError');
    onToken(word);
    await new Promise((resolve) => window.setTimeout(resolve, 22));
  }
}
