import { KeyRound, Monitor, Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Preferences, Theme } from '../types';

interface SettingsPanelProps {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  onClose: () => void;
}

const themes: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

export function SettingsPanel({ preferences, onChange, onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('cindy-web:api-key') ?? '');
  const [draft, setDraft] = useState(preferences);

  useEffect(() => setDraft(preferences), [preferences]);

  const save = () => {
    if (apiKey) sessionStorage.setItem('cindy-web:api-key', apiKey);
    else sessionStorage.removeItem('cindy-web:api-key');
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
            <div className="section-title"><KeyRound size={17} /><div><h3>Modelo</h3><p>API compatível com OpenAI</p></div></div>
            <label>Endpoint<input value={draft.endpoint} onChange={(event) => setDraft({ ...draft, endpoint: event.target.value })} placeholder="https://api.openai.com/v1" /></label>
            <label>Modelo<input value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="gpt-4.1-mini" /></label>
            <label>Chave da API<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-…" autoComplete="off" /></label>
            <div className="privacy-note"><ShieldCheck size={16} /><span>A chave fica apenas em <strong>sessionStorage</strong> e é apagada ao encerrar a sessão do navegador. O provedor precisa aceitar CORS.</span></div>
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
