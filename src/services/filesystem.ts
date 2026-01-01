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

// Supported file extensions
const TEXT_FILE_EXTENSIONS = [
  'md', 'markdown',           // Markdown
  'txt', 'text',              // Plain text
  'log',                      // Log files
  'json', 'jsonc',            // JSON
  'yaml', 'yml',              // YAML
  'xml',                      // XML
  'html', 'htm',              // HTML
  'css', 'scss', 'sass',      // Stylesheets
  'js', 'jsx', 'ts', 'tsx',   // JavaScript/TypeScript
  'py',                       // Python
  'sh', 'bash',               // Shell scripts
  'ini', 'cfg', 'conf',       // Config files
  'env',                      // Environment files
];

// Define simple interface to avoid importing heavy types if not needed, or use OpenDialogOptions
export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
  directory?: boolean;
}

export async function openFileDialog(options?: FileDialogOptions): Promise<string | string[] | null> {
  const defaultFilters = [
    {
      name: 'All Supported',
      extensions: TEXT_FILE_EXTENSIONS
    },
    {
      name: 'Markdown',
      extensions: ['md', 'markdown']
    },
    {
      name: 'Text Files',
      extensions: ['txt', 'text', 'log']
    },
    {
      name: 'Data Files',
      extensions: ['json', 'jsonc', 'yaml', 'yml', 'xml']
    },
    {
      name: 'Code Files',
      extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css']
    }
  ];

  // If options with filters are passed, use them. Otherwise use defaults.
  const filters = options?.filters ? options.filters : defaultFilters;

  const selected = await open({
    multiple: options?.multiple ?? false,
    directory: options?.directory ?? false,
    defaultPath: options?.defaultPath,
    title: options?.title,
    filters: filters
  });

  if (Array.isArray(selected)) {
    return selected.map(s => (s as any).path || s);
  }
  return selected ? (selected as any).path || selected : null;
}

export async function saveFileDialog(currentName?: string): Promise<string | null> {
  // Detect extension from current name
  const ext = currentName?.split('.').pop()?.toLowerCase() || 'md';

  // Determine primary filter based on extension
  const primaryFilter = (() => {
    if (['md', 'markdown'].includes(ext)) return { name: 'Markdown', extensions: ['md', 'markdown'] };
    if (['txt', 'text', 'log'].includes(ext)) return { name: 'Text', extensions: ['txt', 'text', 'log'] };
    if (ext === 'json') return { name: 'JSON', extensions: ['json'] };
    if (['html', 'htm'].includes(ext)) return { name: 'HTML', extensions: ['html', 'htm'] };
    if (['js', 'jsx'].includes(ext)) return { name: 'JavaScript', extensions: ['js', 'jsx'] };
    if (['ts', 'tsx'].includes(ext)) return { name: 'TypeScript', extensions: ['ts', 'tsx'] };
    if (ext === 'css') return { name: 'CSS', extensions: ['css'] };
    if (['yaml', 'yml'].includes(ext)) return { name: 'YAML', extensions: ['yaml', 'yml'] };
    return { name: 'File', extensions: [ext] };
  })();

  const selected = await save({
    defaultPath: currentName,
    filters: [
      primaryFilter,
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'Text', extensions: ['txt', 'text', 'log'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'JavaScript', extensions: ['js', 'jsx'] },
      { name: 'TypeScript', extensions: ['ts', 'tsx'] },
      { name: 'CSS', extensions: ['css', 'scss', 'sass'] },
      { name: 'YAML', extensions: ['yaml', 'yml'] },
      { name: 'Python', extensions: ['py'] },
      { name: 'All Supported', extensions: TEXT_FILE_EXTENSIONS },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return selected ? (selected as any).path || selected : null;
}
