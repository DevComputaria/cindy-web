export type Role = 'user' | 'assistant';
export type AgentKind = 'codex' | 'claude' | 'hermes';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  text?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
  pending?: boolean;
  error?: boolean;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  cwd: string;
  agent: AgentKind;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  messages: Message[];
  running: boolean;
}

export type Theme = 'system' | 'light' | 'dark';

export interface Preferences {
  theme: Theme;
  defaultAgent: AgentKind;
  displayName: string;
}

export interface AgentDescriptor { id: AgentKind; label: string; command: string; available: boolean }
export interface RuntimeHealth { ok: boolean; version: number; cwd: string; dataRoot: string; agents: AgentDescriptor[] }
