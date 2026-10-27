import { useEffect, useMemo, useRef, useState } from 'react';
import { Chat } from './components/Chat';
import { SettingsPanel } from './components/SettingsPanel';
import { Sidebar } from './components/Sidebar';
import { Welcome } from './components/Welcome';
import { mockChat, streamChat } from './lib/ai';
import { createTask, loadState, saveState } from './lib/store';
import type { AppState, Attachment, Message, Preferences } from './types';

function now() {
  return new Date().toISOString();
}

export function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pendingPromptRef = useRef<string | null>(null);

  const activeTask = useMemo(() => state.tasks.find((task) => task.id === state.activeTaskId) ?? null, [state]);

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    const root = document.documentElement;
    const dark = state.preferences.theme === 'dark' || (state.preferences.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
  }, [state.preferences.theme]);

  const updateTask = (taskId: string, updater: (task: AppState['tasks'][number]) => AppState['tasks'][number]) => {
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? updater(task) : task) }));
  };

  const newTask = (prompt?: string) => {
    const task = createTask();
    pendingPromptRef.current = prompt ?? null;
    setState((current) => ({ ...current, tasks: [task, ...current.tasks], activeTaskId: task.id }));
  };

  const sendMessage = async (text: string, attachments: Attachment[]) => {
    if (!activeTask || busy) return;
    const taskId = activeTask.id;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text, attachments, createdAt: now() };
    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = { id: assistantId, role: 'assistant', content: '', createdAt: now(), pending: true };
    const title = activeTask.messages.length === 0 ? text.slice(0, 48) || attachments[0]?.name || 'Nova tarefa' : activeTask.title;
    const history = [...activeTask.messages, userMessage];
    updateTask(taskId, (task) => ({ ...task, title, updatedAt: now(), messages: [...history, assistantMessage] }));
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const appendToken = (token: string) => updateTask(taskId, (task) => ({
      ...task,
      messages: task.messages.map((message) => message.id === assistantId ? { ...message, content: message.content + token } : message),
    }));

    try {
      const apiKey = sessionStorage.getItem('cindy-web:api-key') ?? '';
      if (apiKey) {
        await streamChat({ endpoint: state.preferences.endpoint, model: state.preferences.model, apiKey, messages: history, signal: controller.signal, onToken: appendToken });
      } else {
        await mockChat(text, controller.signal, appendToken);
      }
      updateTask(taskId, (task) => ({ ...task, updatedAt: now(), messages: task.messages.map((message) => message.id === assistantId ? { ...message, pending: false } : message) }));
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        updateTask(taskId, (task) => ({ ...task, messages: task.messages.map((message) => message.id === assistantId ? { ...message, pending: false, content: message.content || 'Resposta interrompida.' } : message) }));
      } else {
        const details = error instanceof Error ? error.message : 'Falha desconhecida';
        updateTask(taskId, (task) => ({ ...task, messages: task.messages.map((message) => message.id === assistantId ? { ...message, pending: false, error: true, content: `Não foi possível falar com o modelo.\n\n${details}` } : message) }));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (activeTask && pendingPromptRef.current && activeTask.messages.length === 0) {
      const prompt = pendingPromptRef.current;
      pendingPromptRef.current = null;
      void sendMessage(prompt, []);
    }
  }, [activeTask?.id]);

  const updatePreferences = (preferences: Preferences) => setState((current) => ({ ...current, preferences }));

  return (
    <div className="app-shell">
      <Sidebar
        tasks={state.tasks}
        activeTaskId={state.activeTaskId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onSelect={(id) => setState((current) => ({ ...current, activeTaskId: id }))}
        onNew={() => newTask()}
        onSettings={() => setSettingsOpen(true)}
      />
      {activeTask ? (
        <Chat
          task={activeTask}
          busy={busy}
          model={sessionStorage.getItem('cindy-web:api-key') ? state.preferences.model : 'Demonstração'}
          onRename={() => {
            const title = window.prompt('Nome da tarefa', activeTask.title)?.trim();
            if (title) updateTask(activeTask.id, (task) => ({ ...task, title }));
          }}
          onDelete={() => {
            if (!window.confirm('Excluir esta tarefa deste navegador?')) return;
            setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== activeTask.id), activeTaskId: null }));
          }}
          onProject={(project) => updateTask(activeTask.id, (task) => ({ ...task, project }))}
          onSend={sendMessage}
          onStop={() => abortRef.current?.abort()}
        />
      ) : <Welcome onNew={newTask} />}
      {settingsOpen && <SettingsPanel preferences={state.preferences} onChange={updatePreferences} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
