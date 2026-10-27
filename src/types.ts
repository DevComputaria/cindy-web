export type Role = 'user' | 'assistant';

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
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  messages: Message[];
}

export type Theme = 'system' | 'light' | 'dark';

export interface Preferences {
  theme: Theme;
  endpoint: string;
  model: string;
  displayName: string;
}

export interface AppState {
  version: 1;
  tasks: Task[];
  activeTaskId: string | null;
  preferences: Preferences;
}
