export type AgentKind = 'codex' | 'claude' | 'hermes';

export interface StoredTask {
  id: string;
  title: string;
  project: string;
  cwd: string;
  agent: AgentKind;
  nativeSessionId: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface StoredMessage {
  id: string;
  taskId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  pending: boolean;
  error: boolean;
}

export interface RunEvent {
  type: 'message' | 'run' | 'task';
  taskId: string;
  data: unknown;
}
