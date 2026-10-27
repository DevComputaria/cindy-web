import {
  Archive,
  Bot,
  ChevronLeft,
  FileClock,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Task } from '../types';

interface SidebarProps {
  tasks: Task[];
  activeTaskId: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSettings: () => void;
}

export function Sidebar(props: SidebarProps) {
  const [query, setQuery] = useState('');
  const visibleTasks = useMemo(
    () => props.tasks.filter((task) => !task.archived && task.title.toLowerCase().includes(query.toLowerCase())),
    [props.tasks, query],
  );

  if (props.collapsed) {
    return (
      <aside className="sidebar collapsed" aria-label="Navegação">
        <button className="icon-button" onClick={props.onToggle} title="Abrir barra lateral">
          <PanelLeftOpen size={18} />
        </button>
        <button className="icon-button accent" onClick={props.onNew} title="Nova tarefa">
          <Plus size={18} />
        </button>
        <div className="sidebar-spacer" />
        <button className="icon-button" onClick={props.onSettings} title="Configurações">
          <Settings size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="Navegação">
      <div className="brand-row">
        <div className="brand-mark">C</div>
        <span>Cindy</span>
        <span className="web-badge">WEB</span>
        <button className="icon-button push-right" onClick={props.onToggle} title="Recolher barra lateral">
          <PanelLeftClose size={17} />
        </button>
      </div>

      <button className="new-task" onClick={props.onNew}>
        <Plus size={17} /> Nova tarefa
      </button>

      <nav className="main-nav" aria-label="Seções">
        <button className="nav-item selected"><Sparkles size={16} /> Tarefas</button>
        <button className="nav-item"><Bot size={16} /> Parceiros <span className="soon">em breve</span></button>
        <button className="nav-item"><FileClock size={16} /> Agendadas <span className="soon">em breve</span></button>
      </nav>

      <div className="sidebar-heading">
        <span>Recentes</span>
        <Archive size={14} />
      </div>
      <label className="sidebar-search">
        <Search size={14} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarefas" />
      </label>

      <div className="task-list">
        {visibleTasks.map((task) => (
          <button
            className={`task-item ${task.id === props.activeTaskId ? 'active' : ''}`}
            key={task.id}
            onClick={() => props.onSelect(task.id)}
          >
            <span className="task-title">{task.title}</span>
            <span className="task-project"><Folder size={12} /> {task.project}</span>
          </button>
        ))}
        {!visibleTasks.length && <p className="empty-list">Nenhuma tarefa por aqui.</p>}
      </div>

      <div className="sidebar-footer">
        <button className="profile-button" onClick={props.onSettings}>
          <span className="avatar">V</span>
          <span><strong>Seu espaço</strong><small>Dados locais</small></span>
          <Settings size={16} className="push-right" />
        </button>
        <button className="back-source" title="Projeto derivado do Cindy Desktop">
          <ChevronLeft size={13} /> Apache-2.0
        </button>
      </div>
    </aside>
  );
}
