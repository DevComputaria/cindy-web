import { Bot, CircleAlert, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Task } from '../types';
import { Composer } from './Composer';

interface ChatProps {
  task: Task;
  busy: boolean;
  model: string;
  onRename: () => void;
  onDelete: () => void;
  onProject: (project: string) => void;
  onSend: Parameters<typeof Composer>[0]['onSend'];
  onStop: () => void;
}

export function Chat({ task, busy, model, onRename, onDelete, onProject, onSend, onStop }: ChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [task.messages, busy]);

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <h1>{task.title}</h1>
          <span>{task.project}</span>
        </div>
        <button className="icon-button" onClick={onRename} title="Renomear tarefa"><Pencil size={16} /></button>
        <button className="icon-button danger-hover" onClick={onDelete} title="Excluir tarefa"><Trash2 size={16} /></button>
        <button className="icon-button" title="Mais opções"><MoreHorizontal size={18} /></button>
      </header>

      <div className="messages">
        {task.messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            {message.role === 'assistant' && <div className="assistant-icon"><Bot size={16} /></div>}
            <div className="message-body">
              {message.error && <CircleAlert size={15} className="error-icon" />}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || (message.pending ? 'Pensando…' : '')}</ReactMarkdown>
              {message.attachments?.length ? (
                <div className="message-files">{message.attachments.map((file) => <span key={file.id}>{file.name}</span>)}</div>
              ) : null}
              {message.role === 'assistant' && message.content && !message.pending && (
                <button className="copy-button" onClick={() => navigator.clipboard.writeText(message.content)}><Copy size={13} /> Copiar</button>
              )}
            </div>
          </article>
        ))}
        <div ref={endRef} />
      </div>
      <Composer busy={busy} project={task.project} model={model} onProject={onProject} onSend={onSend} onStop={onStop} />
    </main>
  );
}
