import type { Attachment } from '../types';

const MAX_TEXT_BYTES = 250_000;

export async function filesToAttachments(files: FileList | File[]): Promise<Attachment[]> {
  return Promise.all(
    Array.from(files).map(async (file) => {
      const isText = file.type.startsWith('text/') || /\.(md|json|js|jsx|ts|tsx|css|html|py|go|rs|java|yaml|yml|toml|sql)$/i.test(file.name);
      return {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        text: isText && file.size <= MAX_TEXT_BYTES ? await file.text() : undefined,
      };
    }),
  );
}

export async function pickProjectName(): Promise<string | null> {
  if (!window.showDirectoryPicker) return null;
  const handle = await window.showDirectoryPicker();
  return handle.name;
}
