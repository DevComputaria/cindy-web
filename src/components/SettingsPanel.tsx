import { Bot, Database, Monitor, Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AgentDescriptor, Preferences, Theme } from '../types';

interface SettingsPanelProps {
  preferences: Preferences;
  agents: AgentDescriptor[];
  dataRoot?: string;
  onChange: (preferences: Preferences) => void;
  onClose: () => void;
}

const themes: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

export function SettingsPanel({ preferences, agents, dataRoot, onChange, onClose }: SettingsPanelProps) {
  const [draft, setDraft] = useState(preferences);

  useEffect(() => setDraft(preferences), [preferences]);

  const save = () => {
    onChange(draft);
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header>
          <div><h2 id="settings-title">Configurações</h2><p>Preferências deste navegador</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </header>

        <div className="settings-content">
          <section className="setting-section">
            <h3>Aparência</h3>
            <div className="theme-options">
              {themes.map(({ value, label, icon: Icon }) => (
                <button key={value} className={draft.theme === value ? 'active' : ''} onClick={() => setDraft({ ...draft, theme: value })}>
                  <Icon size={17} /> {label}
                </button>
              ))}
            </div>
          </section>

          <section className="setting-section">
            <div className="section-title"><Bot size={17} /><div><h3>Agente local padrão</h3><p>Usado ao criar novas tarefas</p></div></div>
            <div className="agent-options">
              {agents.map((agent) => (
                <button key={agent.id} disabled={!agent.available} className={draft.defaultAgent === agent.id ? 'active' : ''} onClick={() => setDraft({ ...draft, defaultAgent: agent.id })}>
                  <span className={`status-dot ${agent.available ? 'online' : ''}`} />
                  <span><strong>{agent.label}</strong><small>{agent.available ? agent.command : 'Não encontrado no PATH'}</small></span>
                </button>
              ))}
            </div>
            <div className="privacy-note"><ShieldCheck size={16} /><span>O runtime escuta apenas em <strong>127.0.0.1</strong>. Agentes executam com as permissões do seu usuário dentro da pasta escolhida.</span></div>
          </section>

          <section className="setting-section">
            <div className="section-title"><Database size={17} /><div><h3>Persistência local</h3><p>SQLite e histórico de execuções</p></div></div>
            <code className="data-path">{dataRoot ?? 'Runtime indisponível'}</code>
          </section>

          <section className="setting-section">
            <h3>Perfil</h3>
            <label>Nome de exibição<input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></label>
          </section>
        </div>

        <footer><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={save}>Salvar</button></footer>
      </section>
    </div>
  );
}
