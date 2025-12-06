import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export async function readFile(path: string): Promise<string> {
  return await invoke('read_file', { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return await invoke('write_file', { path, content });
}

export async function listDir(path: string): Promise<string[]> {
  return await invoke('list_dir', { path });
}

export async function openFileDialog(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'Markdown',
      extensions: ['md', 'markdown', 'txt']
    }]
  });
  return selected ? (selected as any).path || selected : null;
}

export async function saveFileDialog(currentName?: string): Promise<string | null> {
  const selected = await save({
    defaultPath: currentName,
    filters: [{
      name: 'Markdown',
      extensions: ['md']
    }]
  });
  return selected ? (selected as any).path || selected : null;
}
