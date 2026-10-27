import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chat } from './components/Chat';
import { SettingsPanel } from './components/SettingsPanel';
import { Sidebar } from './components/Sidebar';
import { Welcome } from './components/Welcome';
import { localApi } from './lib/api';
import { loadPreferences, savePreferences } from './lib/store';
import type { Attachment, Message, Preferences, RuntimeHealth, Task } from './types';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [tasks, activeTaskId],
  );
  const loadTasks = useCallback(async () => {
    const next = await localApi.tasks();
    setTasks(next);
    return next;
  }, []);

  useEffect(() => {
    Promise.all([localApi.health(), loadTasks()])
      .then(([runtime, nextTasks]) => {
        setHealth(runtime);
        setRuntimeError('');
        setActiveTaskId((current) => current ?? nextTasks[0]?.id ?? null);
      })
      .catch((error: Error) => setRuntimeError(error.message));
  }, [loadTasks]);

  useEffect(() => savePreferences(preferences), [preferences]);
  useEffect(() => {
    const root = document.documentElement;
    const dark =
      preferences.theme === 'dark' ||
      (preferences.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
  }, [preferences.theme]);

  useEffect(() => {
    if (!activeTaskId) return;
    const events = new EventSource(`/api/tasks/${activeTaskId}/events`);
    events.addEventListener('message', (raw) => {
      const patch = JSON.parse((raw as MessageEvent).data) as Partial<Message> & { id: string };
      setTasks((current) =>
        current.map((task) =>
          task.id !== activeTaskId
            ? task
            : {
                ...task,
                messages: task.messages.some((message) => message.id === patch.id)
                  ? task.messages.map((message) =>
                      message.id === patch.id ? { ...message, ...patch } : message,
                    )
                  : [...task.messages, patch as Message],
              },
        ),
      );
    });
    events.addEventListener('run', (raw) => {
      const event = JSON.parse((raw as MessageEvent).data) as { status: string };
      setTasks((current) =>
        current.map((task) =>
          task.id === activeTaskId ? { ...task, running: event.status === 'running' } : task,
        ),
      );
      if (event.status !== 'running') setSending(false);
    });
    events.onerror = () => {
      if (events.readyState === EventSource.CLOSED)
        setRuntimeError('Conexão com o runtime local foi encerrada.');
    };
    return () => events.close();
  }, [activeTaskId]);

  const createTask = async (prompt?: string) => {
    if (!health) return;
    try {
      const selected =
        health.agents.find((agent) => agent.id === preferences.defaultAgent && agent.available) ??
        health.agents.find((agent) => agent.available);
      if (!selected) throw new Error('Instale Codex, Claude Code ou Hermes e reinicie o runtime.');
      const task = await localApi.createTask({
        cwd: health.cwd,
        project: health.cwd.split(/[\\/]/).filter(Boolean).at(-1),
        agent: selected.id,
      });
      setTasks((current) => [task, ...current]);
      setActiveTaskId(task.id);
      if (prompt) {
        setSending(true);
        await localApi.send(task.id, prompt);
        await loadTasks();
      }
    } catch (error) {
      setRuntimeError((error as Error).message);
      setSending(false);
    }
  };

  const updateTask = async (
    id: string,
    patch: Partial<Pick<Task, 'title' | 'project' | 'cwd' | 'agent'>>,
  ) => {
    try {
      const task = await localApi.updateTask(id, patch);
      setTasks((current) => current.map((item) => (item.id === id ? { ...item, ...task } : item)));
    } catch (error) {
      setRuntimeError((error as Error).message);
    }
  };

  const sendMessage = async (text: string, attachments: Attachment[]) => {
    if (!activeTask || activeTask.running || sending) return;
    const attachmentText = attachments.length
      ? `\n\nArquivos anexados pelo usuário:\n${attachments.map((file) => `--- ${file.name} ---\n${file.text ?? '[arquivo binário não incluído]'}`).join('\n')}`
      : '';
    setSending(true);
    try {
      await localApi.send(activeTask.id, `${text}${attachmentText}`);
      await loadTasks();
    } catch (error) {
      setRuntimeError((error as Error).message);
      setSending(false);
    }
  };

  const updatePreferences = (next: Preferences) => {
    setPreferences(next);
    savePreferences(next);
  };
  const agentLabel =
    health?.agents.find((agent) => agent.id === activeTask?.agent)?.label ?? activeTask?.agent ?? '';

  return (
    <div className="app-shell">
      <Sidebar
        tasks={tasks}
        activeTaskId={activeTaskId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onSelect={setActiveTaskId}
        onNew={() => void createTask()}
        onSettings={() => setSettingsOpen(true)}
      />
      {runtimeError && (
        <div className="runtime-banner" role="alert">
          <strong>Runtime local:</strong> {runtimeError}
          <button
            onClick={() => {
              setRuntimeError('');
              void loadTasks();
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {activeTask ? (
        <Chat
          task={activeTask}
          busy={activeTask.running || sending}
          agent={agentLabel}
          onRename={() => {
            const title = window.prompt('Nome da tarefa', activeTask.title)?.trim();
            if (title) void updateTask(activeTask.id, { title });
          }}
          onDelete={() => {
            if (window.confirm('Excluir esta tarefa e o histórico local?'))
              void localApi.deleteTask(activeTask.id).then(() => {
                setTasks((current) => current.filter((task) => task.id !== activeTask.id));
                setActiveTaskId(null);
              });
          }}
          onCwd={(cwd) =>
            void updateTask(activeTask.id, {
              cwd,
              project: cwd.split(/[\\/]/).filter(Boolean).at(-1) || activeTask.project,
            })
          }
          onSend={sendMessage}
          onStop={() => void localApi.interrupt(activeTask.id)}
        />
      ) : (
        <Welcome onNew={(prompt) => void createTask(prompt)} />
      )}
      {settingsOpen && (
        <SettingsPanel
          preferences={preferences}
          agents={health?.agents ?? []}
          dataRoot={health?.dataRoot}
          onChange={updatePreferences}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
