import { ArrowUp, FileText, FolderOpen, Paperclip, Square, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { filesToAttachments } from '../lib/files';
import type { Attachment } from '../types';

interface ComposerProps {
  busy: boolean;
  cwd: string;
  agent: string;
  onCwd: (cwd: string) => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
}

export function Composer({ busy, cwd, agent, onCwd, onSend, onStop }: ComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = () => {
    if ((!text.trim() && !attachments.length) || busy) return;
    onSend(text.trim() || 'Analise os arquivos anexados.', attachments);
    setText('');
    setAttachments([]);
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        {attachments.length > 0 && (
          <div className="attachment-row">
            {attachments.map((file) => (
              <span className="attachment" key={file.id}>
                <FileText size={13} /> {file.name}
                <button
                  onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}
                  aria-label={`Remover ${file.name}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="O que você quer realizar?"
          rows={3}
        />
        <div className="composer-tools">
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={async (event) => {
              if (event.target.files) {
                const nextAttachments = await filesToAttachments(event.target.files);
                setAttachments((current) => [...current, ...nextAttachments]);
              }
              event.target.value = '';
            }}
          />
          <button className="tool-button" onClick={() => fileInput.current?.click()} title="Anexar arquivos">
            <Paperclip size={16} />
          </button>
          <button
            className="project-pill"
            onClick={() => {
              const next = window.prompt('Caminho absoluto da pasta de trabalho', cwd)?.trim();
              if (next) onCwd(next);
            }}
            title={cwd}
          >
            <FolderOpen size={14} /> {cwd}
          </button>
          <span className="model-label">{agent}</span>
          {busy ? (
            <button className="send-button stop" onClick={onStop} aria-label="Interromper resposta">
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              className="send-button"
              onClick={submit}
              disabled={!text.trim() && !attachments.length}
              aria-label="Enviar"
            >
              <ArrowUp size={17} />
            </button>
          )}
        </div>
      </div>
      <small className="composer-note">Cindy pode cometer erros. Revise ações importantes.</small>
    </div>
  );
}
