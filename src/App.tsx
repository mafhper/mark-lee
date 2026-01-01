import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import remarkGfm from 'remark-gfm';
import { exit } from '@tauri-apps/plugin-process';
import { getMatches } from '@tauri-apps/plugin-cli';
import { getCurrentWindow } from '@tauri-apps/api/window';
// convertFileSrc removed - using readFile approach for local images
import { readFile, writeFile, openFileDialog, saveFileDialog } from './services/filesystem';
import { openUrl } from '@tauri-apps/plugin-opener';
import { saveSettings, loadSettings, addRecentFile, getRecentFiles, RecentFile } from './services/storage';
import { formatMarkdown, minifyMarkdown } from './services/markdown-processor';

// Lazy load modal components for faster startup
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const FindWidget = lazy(() => import('./components/FindWidget'));
const SaveAsModal = lazy(() => import('./components/SaveAsModal'));
const ConfirmModal = lazy(() => import('./components/ConfirmModal'));
const SnippetsMenu = lazy(() => import('./components/SnippetsMenu'));
const AboutModal = lazy(() => import('./components/AboutModal'));
const Toolbar = lazy(() => import('./components/Toolbar'));
const MenuBar = lazy(() => import('./components/MenuBar'));
const CodePreview = lazy(() => import('./components/CodePreview'));

// Helper to detect if a file is code (not markdown)
const CODE_FILE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'json', 'jsonc', 'html', 'htm', 'xml', 'svg', 'css', 'scss', 'sass', 'less', 'py', 'rb', 'java', 'c', 'cpp', 'cs', 'php', 'go', 'rs', 'sql', 'sh', 'bash', 'ps1', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'txt', 'log'];
const MARKDOWN_EXTENSIONS = ['md', 'markdown'];

const isCodeFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return CODE_FILE_EXTENSIONS.includes(ext) && !MARKDOWN_EXTENSIONS.includes(ext);
};

import { THEMES, DEFAULT_SHORTCUTS, TEXT_PRESETS } from './constants';
import { Theme, ViewMode, EditorAction, AppSettings } from './types';
import { TRANSLATIONS } from './translations';

// Memoized UI Components to prevent re-renders on typing
const MemoizedMenuBar = React.memo(MenuBar);
const MemoizedToolbar = React.memo(Toolbar);

// LocalImage Component Definition - Uses load_image Tauri command for base64 data URLs
import { invoke } from '@tauri-apps/api/core';

interface LocalImageProps {
  src?: string;
  className?: string;
  basePath?: string; // Current file path for resolving relative images
  [key: string]: any;
}

const LocalImage: React.FC<LocalImageProps> = ({ src, className, basePath, ...props }) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }
    
    // External URLs - use directly
    if (src.startsWith('http') || src.startsWith('https') || src.startsWith('data:')) {
      setImgSrc(src);
      setLoading(false);
      return;
    }

    let active = true;
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Clean the path (remove angle brackets used in markdown)
        let cleanPath = src;
        // Remove < and > from start/end
        cleanPath = cleanPath.replace(/^</, '').replace(/>$/, '');
        // Decode URI components
        cleanPath = decodeURIComponent(cleanPath);
        
        console.log('[LocalImage] Original src:', src);
        console.log('[LocalImage] After cleaning angle brackets:', cleanPath);
        
        // Resolve relative paths using basePath
        if (!cleanPath.match(/^[a-zA-Z]:\\/i) && !cleanPath.startsWith('/')) {
          // It's a relative path - need to combine with basePath
          if (basePath) {
            // Get directory from basePath (remove filename)
            const baseDir = basePath.replace(/[/\\][^/\\]*$/, '');
            // Remove ./ prefix if present
            cleanPath = cleanPath.replace(/^\.\//, '');
            // Combine paths
            cleanPath = `${baseDir}/${cleanPath}`;
          }
        }
        
        // Normalize path separators for Windows
        cleanPath = cleanPath.replace(/\//g, '\\');
        
        console.log('[LocalImage] Final path to load:', cleanPath);
        
        // Use the load_image Tauri command which returns a base64 data URL
        const dataUrl = await invoke<string>('load_image', { path: cleanPath });
        
        if (active) {
          setImgSrc(dataUrl);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load image:', src, err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    loadImage();
    return () => { active = false; };
  }, [src, basePath]);

  if (error) {
    return (
      <div className="inline-flex items-center gap-1 text-red-500 text-xs border border-red-500 px-2 py-1 rounded bg-red-500/10">
        <span>⚠️ Image Error</span>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-500/20 w-48 h-32 inline-flex items-center justify-center rounded border border-gray-500/20">
        <span className="text-xs opacity-50">Loading...</span>
      </div>
    );
  }

  return <img src={imgSrc} className={className} loading="lazy" {...props} />;
};
// Lazy load ReactMarkdown for better initial load performance
const ReactMarkdown = lazy(() => import('react-markdown'));

// Debounce hook for preview updates
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function App() {
  // Load saved settings on first render
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  
  // Theme and viewMode are now part of settings for persistence
  const [theme, setTheme] = useState<Theme>(() => {
    const savedSettings = loadSettings();
    return savedSettings.theme || Theme.Sepia;
  });
  
  const [markdown, setMarkdown] = useState<string>('');
  const debouncedMarkdown = useDebounce(markdown, 150);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedSettings = loadSettings();
    return savedSettings.viewMode || 'edit';
  });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => getRecentFiles());
  
  // File State
  const [fileName, setFileName] = useState('Untitled.md');
  const [isModified, setIsModified] = useState(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  // Update Window Title when filename changes
  useEffect(() => {
    const title = fileName === 'Untitled.md' && !isModified 
       ? 'Mark-Lee' 
       : `${fileName}${isModified ? '*' : ''} - Mark-Lee`;
    
    getCurrentWindow().setTitle(title).catch(err => {
        console.error('Failed to set window title:', err);
    });
  }, [fileName, isModified]);

  // UI State
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false); // Zen mode (auto-hide UI)
  const [showMenuBar, setShowMenuBar] = useState(true); // Auto-hide menu bar (Default true now)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); // Confirm save dialog
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editorOnRight, setEditorOnRight] = useState(false);

  const [isSnippetsOpen, setIsSnippetsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null); // Action after confirm
  
  // Stats
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [hoveredLink, setHoveredLink] = useState<{ url: string, x: number, y: number } | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [selectedWordCount, setSelectedWordCount] = useState(0);
  const [selectedCharCount, setSelectedCharCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const tConfig = THEMES[theme];
  const t = TRANSLATIONS[settings.language];

  // Check for file path passed via command line (file association)
  useEffect(() => {
    const loadFileFromArgs = async () => {
      try {
        const matches = await getMatches();
        // Check for positional argument (file path)
        const fileArg = matches.args.file;
        if (fileArg && fileArg.value && typeof fileArg.value === 'string') {
          const filePath = fileArg.value;
          console.log('Opening file from CLI:', filePath);
          const content = await readFile(filePath);
          setMarkdown(content);
          setFileName(filePath.split(/[\\/]/).pop() || 'Untitled.md');
          setCurrentPath(filePath);
          setIsModified(false);
        }
      } catch (err) {
        console.error('Failed to process CLI arguments:', err);
      }
    };
    loadFileFromArgs();
  }, []); // Run once on mount

  // Update window title based on filename
  useEffect(() => {
    // Only update title if NOT printing, to avoid overwriting the temporary print filename
    if (!isPrinting) {
      document.title = `${fileName}${isModified ? '*' : ''} - Mark-Lee`;
    }
  }, [fileName, isModified, isPrinting]);

  // Save settings when they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Save theme to settings when changed
  useEffect(() => {
    setSettings(prev => {
      if (prev.theme !== theme) {
        const updated = { ...prev, theme };
        saveSettings(updated);
        return updated;
      }
      return prev;
    });
  }, [theme]);

  // Save viewMode to settings when changed
  useEffect(() => {
    setSettings(prev => {
      if (prev.viewMode !== viewMode) {
        const updated = { ...prev, viewMode };
        saveSettings(updated);
        return updated;
      }
      return prev;
    });
  }, [viewMode]);

  // Handle Print Completion
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Helper to determine text contrast based on transparency
  // With real transparency, we just use the theme's foreground color
  // Helper to determine text contrast based on transparency
  // With real transparency, we just use the theme's foreground color
  // const currentFg = tConfig.fg; // Unused

  // Scroll Sync Logic
  useEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;

    if (!textarea || !preview) return;

    const handleEditorScroll = (e: Event) => {
      if (isScrolling.current) return;
      isScrolling.current = true;
      
      const target = e.target as HTMLTextAreaElement;
      const percentage = target.scrollTop / (target.scrollHeight - target.clientHeight);
      
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
      
      setTimeout(() => { isScrolling.current = false; }, 50);
    };

    const handlePreviewScroll = (e: Event) => {
      if (isScrolling.current) return;
      isScrolling.current = true;
      
      const target = e.target as HTMLDivElement;
      const percentage = target.scrollTop / (target.scrollHeight - target.clientHeight);
      
      textarea.scrollTop = percentage * (textarea.scrollHeight - textarea.clientHeight);
      
      setTimeout(() => { isScrolling.current = false; }, 50);
    };

    if (viewMode === 'split') {
        textarea.addEventListener('scroll', handleEditorScroll);
        preview.addEventListener('scroll', handlePreviewScroll);
    }

    return () => {
      textarea.removeEventListener('scroll', handleEditorScroll);
      preview.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [viewMode, markdown]); 

  // Mouse move handler for distraction-free mode and auto-hide menu bar
  const showMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let zenTimeout: ReturnType<typeof setTimeout>;

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle: If in normal mode, we don't need to do anything complex unless we are hidden
      // But currently normal mode = always visible.
      // We only care about Zen Mode or if we were hidden for some reason.
      
      if (!isUiVisible) {
         setIsUiVisible(true);
      }

      // MenuBar Behavior
      if (!isZenMode) {
        // Normal Mode: Always show menu bar
        if (!showMenuBar) setShowMenuBar(true);
        
        // Clear any pending timers to prevent erratic behavior
        if (hideMenuTimeoutRef.current) { clearTimeout(hideMenuTimeoutRef.current); hideMenuTimeoutRef.current = null; }
        if (showMenuTimeoutRef.current) { clearTimeout(showMenuTimeoutRef.current); showMenuTimeoutRef.current = null; }
      } else {
        // Zen Mode: Auto-hide logic
        // Show menu bar when mouse is near the top of the window (within 80px)
        const isNearTop = e.clientY < 80;
        
        if (isNearTop) {
          // Clear any pending hide timer
          if (hideMenuTimeoutRef.current) {
              clearTimeout(hideMenuTimeoutRef.current);
              hideMenuTimeoutRef.current = null;
          }

          // If not already showing or scheduled to show
          if (!showMenuBar && !showMenuTimeoutRef.current) {
              showMenuTimeoutRef.current = setTimeout(() => {
                  setShowMenuBar(true);
                  showMenuTimeoutRef.current = null;
              }, 150); 
          }
        } else {
          // Clear any pending show timer if we moved away
          if (showMenuTimeoutRef.current) {
              clearTimeout(showMenuTimeoutRef.current);
              showMenuTimeoutRef.current = null;
          }

          // Schedule hide if appropriate
          if (!isSettingsOpen && !isFindOpen && !isSaveAsOpen && !isExportPdfOpen) {
              if (showMenuBar && !hideMenuTimeoutRef.current) {
                  hideMenuTimeoutRef.current = setTimeout(() => {
                      setShowMenuBar(false);
                      hideMenuTimeoutRef.current = null;
                  }, 1500); 
              }
          }
        }
      }
      
      // Auto-hide UI in Zen Mode (Debounce/Throttle)
      if (isZenMode) {
        clearTimeout(zenTimeout);
        zenTimeout = setTimeout(() => {
          if (!isSettingsOpen && !isFindOpen && !isSaveAsOpen && !isExportPdfOpen) {
            setIsUiVisible(false);
          }
        }, 2000);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Initial hide check
    if (isZenMode) {
        zenTimeout = setTimeout(() => { if (!isSettingsOpen && !isSaveAsOpen && !isExportPdfOpen) setIsUiVisible(false); }, 2500);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(zenTimeout);
      if (showMenuTimeoutRef.current) clearTimeout(showMenuTimeoutRef.current);
      if (hideMenuTimeoutRef.current) clearTimeout(hideMenuTimeoutRef.current);
    };
  }, [isZenMode, isSettingsOpen, isFindOpen, isSaveAsOpen, isExportPdfOpen, showMenuBar]); // Added showMenuBar to deps

  // Auto-hide scrollbar: show only during scrolling
  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;
    
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      target.classList.add('is-scrolling');
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        target.classList.remove('is-scrolling');
      }, 1000); // Hide scrollbar 1 second after scrolling stops
    };

    const textarea = textareaRef.current;
    const preview = previewRef.current;

    if (textarea) textarea.addEventListener('scroll', handleScroll);
    if (preview) preview.addEventListener('scroll', handleScroll);

    return () => {
      if (textarea) textarea.removeEventListener('scroll', handleScroll);
      if (preview) preview.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Update stats
  useEffect(() => {
    setWordCount(markdown.trim().split(/\s+/).filter(w => w.length > 0).length);
    setCharCount(markdown.length);
  }, [markdown]);

  // Auto-save logic
  useEffect(() => {
    if (!settings.autoSave || !isModified || !currentPath) return;

    const autoSaveTimer = setInterval(async () => {
      if (isModified && currentPath) {
        try {
          await writeFile(currentPath, markdown);
          setIsModified(false);
          console.log('Auto-saved:', fileName);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }
    }, settings.autoSaveInterval * 1000);

    return () => clearInterval(autoSaveTimer);
  }, [settings.autoSave, settings.autoSaveInterval, isModified, currentPath, markdown, fileName]);

  // Typewriter Mode Logic
  useEffect(() => {
    if (settings.typewriterMode && textareaRef.current && !isScrolling.current) {
        const textarea = textareaRef.current;
        const lineHeightPx = settings.fontSize * settings.lineHeight;
        const targetScrollTop = (cursorPos.line - 1) * lineHeightPx - (textarea.clientHeight / 2) + lineHeightPx;
        
        textarea.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }
  }, [cursorPos.line, settings.typewriterMode, settings.fontSize, settings.lineHeight]);

  // Keyboard Shortcuts
  useEffect(() => {
    const checkShortcut = (e: KeyboardEvent, actionId: string) => {
      const config = settings.customShortcuts?.[actionId] || DEFAULT_SHORTCUTS[actionId];
      if (!config) return false;

      const parts = config.toUpperCase().split('+');
      
      const ctrl = parts.includes('CTRL');
      const shift = parts.includes('SHIFT');
      const alt = parts.includes('ALT');
      
      let key = parts[parts.length - 1];
      
      let eventKey = e.key.toUpperCase();
      if (eventKey === ' ') eventKey = 'SPACE';
      if (['CONTROL', 'SHIFT', 'ALT'].includes(eventKey)) return false;
      
      // Handle F-keys explicitly if needed, usually they match e.key.toUpperCase() like 'F11'
      
      return (
          e.ctrlKey === ctrl &&
          e.shiftKey === shift &&
          e.altKey === alt &&
          eventKey === key
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // File Actions
      if (checkShortcut(e, 'file-save')) { e.preventDefault(); handleMenuAction('file-save'); return; }
      if (checkShortcut(e, 'file-save-as')) { e.preventDefault(); handleMenuAction('file-save-as'); return; }
      if (checkShortcut(e, 'file-open')) { e.preventDefault(); handleMenuAction('file-open'); return; }
      if (checkShortcut(e, 'file-print')) { e.preventDefault(); handleMenuAction('file-print'); return; }
      
      // Edit Actions
      if (checkShortcut(e, 'edit-find')) { e.preventDefault(); handleMenuAction('edit-find'); return; }
      if (checkShortcut(e, 'edit-replace')) { e.preventDefault(); handleMenuAction('edit-replace'); return; } // Assuming handleMenuAction handles this or opens find
      
      // View Actions
      if (checkShortcut(e, 'view-zen')) { e.preventDefault(); handleMenuAction('view-zen'); return; }

      // Editor formatting shortcuts (Ctrl+B, I, etc) - Keep standard for now or make configurable too?
      // For now keep standard to avoid complexity unless requested
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'b': e.preventDefault(); handleAction('bold'); break;
          case 'i': e.preventDefault(); handleAction('italic'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markdown, fileName, settings.customShortcuts]);

  const handleInsertSnippet = (content: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = markdown;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      const newText = before + content + after;
      setMarkdown(newText);
      setIsModified(true);
      
      // Restore cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + content.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const updateCursorPos = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const val = textarea.value;
    const sel = textarea.selectionStart;
    const lines = val.substr(0, sel).split("\n");
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;
    setCursorPos({ line: lineNum, col: colNum });
    
    // Update selection count
    const selectedText = val.substring(textarea.selectionStart, textarea.selectionEnd);
    if (selectedText.length > 0) {
      setSelectedCharCount(selectedText.length);
      setSelectedWordCount(selectedText.trim().split(/\s+/).filter(w => w.length > 0).length);
    } else {
      setSelectedCharCount(0);
      setSelectedWordCount(0);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
    setIsModified(true);
  };

  // Actually open a file (internal helper)
  const doOpenFile = async () => {
    try {
      const pathResult = await openFileDialog();
      const path = Array.isArray(pathResult) ? pathResult[0] : pathResult;

      if (path) {
        const content = await readFile(path);
        const name = path.split(/[\\/]/).pop() || 'Untitled.md';
        setMarkdown(content);
        setFileName(name);
        setIsModified(false);
        setCurrentPath(path);
        // Add to recent files
        addRecentFile(path, name);
        setRecentFiles(getRecentFiles());
      }
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  // Handle file open with unsaved changes check
  const handleFileOpen = async () => {
    if (isModified) {
      // Store the action to execute after user decision
      setPendingAction(() => doOpenFile);
      setIsConfirmOpen(true);
    } else {
      await doOpenFile();
    }
  };

  // Handle confirm modal actions
  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    if (fileName === 'Untitled.md') {
      setIsSaveAsOpen(true);
      // After save, pendingAction should execute - but this flow is complex
      // For simplicity, just save and then execute pending action
    } else {
      await handleSave(fileName);
    }
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
  };

  const handleConfirmDiscard = async () => {
    setIsConfirmOpen(false);
    setIsModified(false);
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
  };

  const handleConfirmCancel = () => {
    setIsConfirmOpen(false);
    setPendingAction(null);
  };

  const handleSave = async (name: string) => {
    try {
      let path = currentPath;
      
      // If no path (new file) or saving as new name, we need save dialog IF we don't have a path derived from name (which is just filename)
      // Actually simpler: if we have currentPath and name matches, we overwrite. 
      // But handleSave is called by SaveAsModal which passes a filename.
      
      // If we are "Saving" (Ctrl+S) on an existing file, we shouldn't show dialog.
      // But handleMenuAction 'file-save' logic decides that.
      
      // If we need a new path:
      if (!path || name !== fileName) {
         // This logic is a bit mixed in the original App.tsx. 
         // Let's rely on saveFileDialog providing the path.
         
         // If we are in "Save As" flow or "Save" on untitled:
         const newPath = await saveFileDialog(name);
         if (!newPath) return; // Users cancelled
         path = newPath;
      }

      await writeFile(path, markdown);
      
      setCurrentPath(path);
      setFileName(path.split(/[\\/]/).pop() || name);
      setIsModified(false);
      setIsSaveAsOpen(false);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  const handlePdfExportConfirm = (name: string) => {
    // 1. Prepare Filename
    const nameWithoutExt = name.replace(/\.md$/i, '').replace(/\.pdf$/i, '');
    
    // 2. Set Document Title (Browser uses this as default save filename)
    document.title = nameWithoutExt;
    
    // 3. Switch to Printing State (Replaces UI with Clean Doc)
    setIsExportPdfOpen(false);
    setIsPrinting(true);

    // 4. Trigger Print after render
    setTimeout(() => {
        window.print();
    }, 50);
  };

  const handleMenuAction = async (action: string, data?: any) => {
    switch (action) {
      case 'file-new': 
        setMarkdown(''); 
        setFileName('Untitled.md'); 
        setIsModified(false);
        setCurrentPath(null);
        break;
      case 'edit-snippets': setIsSnippetsOpen(true); break;
      case 'file-open': handleFileOpen(); break;
      case 'file-open-recent':
        if (data) {
          try {
            const content = await readFile(data);
            const name = data.split(/[\\/]/).pop() || 'Untitled.md';
            setMarkdown(content);
            setFileName(name);
            setIsModified(false);
            setCurrentPath(data);
            addRecentFile(data, name);
            setRecentFiles(getRecentFiles());
          } catch (err) {
            console.error('Failed to open recent file:', err);
          }
        }
        break;
      case 'file-save': 
        if (fileName === 'Untitled.md') {
          setIsSaveAsOpen(true);
        } else {
          handleSave(fileName);
        }
        break;
      case 'file-save-as': setIsSaveAsOpen(true); break;
      case 'file-print': window.print(); break;
      case 'file-export-pdf': setIsExportPdfOpen(true); break;
      case 'file-export-html': 
        // Export preview as HTML file using Tauri save dialog
        try {
          const htmlContent = previewRef.current?.innerHTML || '';
          
          if (!htmlContent) {
            console.warn('No preview content available for HTML export');
            // Could show a notification here
            break;
          }
          
          const fullHtml = `<!DOCTYPE html>
<html lang="${settings.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName.replace('.md', '')}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; background: #fff; }
    h1, h2, h3, h4, h5, h6 { color: #1a1a1a; margin-top: 1.5em; margin-bottom: 0.5em; }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; margin-left: 0; font-style: italic; color: #555; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    a { color: #6366f1; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul, ol { padding-left: 1.5em; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
    th { background: #f4f4f4; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
          
          const savePath = await saveFileDialog(fileName.replace('.md', '.html'));
          if (savePath) {
            await writeFile(savePath, fullHtml);
            console.log('HTML exported to:', savePath);
          }
        } catch (err) {
          console.error('Failed to export HTML:', err);
        }
        break; 
      case 'file-export-md-formatted':
        try {
          const formatted = formatMarkdown(markdown);
          const savePath = await saveFileDialog(fileName.replace('.md', '_formatted.md'));
          if (savePath) {
            await writeFile(savePath, formatted);
            console.log('Formatted Markdown exported to:', savePath);
          }
        } catch (err) {
          console.error('Failed to export formatted Markdown:', err);
        }
        break;
      case 'file-export-md-minified':
        try {
          const minified = minifyMarkdown(markdown);
          const savePath = await saveFileDialog(fileName.replace('.md', '_minified.md'));
          if (savePath) {
            await writeFile(savePath, minified);
            console.log('Minified Markdown exported to:', savePath);
          }
        } catch (err) {
          console.error('Failed to export minified Markdown:', err);
        }
        break;
      case 'edit-find': setIsFindOpen(true); break;
      case 'view-zen': 
        const newZen = !isZenMode;
        setIsZenMode(newZen);
        // Zen Mode: Hide everything.
        setIsUiVisible(!newZen); 
        setShowMenuBar(!newZen);
        setShowToolbar(!newZen); // Also toggle toolbar
        
        // Add visual feedback
        if (newZen) {
             console.log('Entering Zen Mode');
        }
        break;
      case 'view-toolbar': setShowToolbar(!showToolbar); break;
      case 'view-editor': setViewMode('edit'); break;
      case 'view-preview': setViewMode('preview'); break;
      case 'view-split': setViewMode('split'); break;
      case 'settings-pref': setIsSettingsOpen(true); break;
      case 'view-swap': setEditorOnRight(!editorOnRight); break;
      case 'help-guide':
        // Open README based on current language
        const readmeMap: Record<string, string> = {
          'pt-BR': 'README.pt-BR.md',
          'en-US': 'README.md',
          'es-ES': 'README.es.md',
          'fr-FR': 'README.fr.md',
          'it-IT': 'README.it.md',
          'zh-CN': 'README.zh.md',
          'ja-JP': 'README.ja.md',
        };
        const readmeFile = readmeMap[settings.language] || 'README.md';
        openUrl(`https://github.com/mafhper/mark-lee/blob/main/${readmeFile}`);
        break;
      case 'help-faq':
        openUrl('https://mafhper.github.io/mark-lee/faq.html');
        break;
      case 'help-contribute':
        openUrl('https://mafhper.github.io/mark-lee/contributing.html');
        break;
      case 'help-about':
        setIsAboutOpen(true);
        break;
      case 'file-exit': 
        exit(0);
        break;
    }
  };

  const handleFind = (text: string, direction: 'next' | 'prev') => {
    if (!textareaRef.current || !text) return;
    const textarea = textareaRef.current;
    const content = textarea.value;
    const lowerContent = content.toLowerCase();
    const lowerText = text.toLowerCase();
    
    let searchIndex;
    if (direction === 'next') {
        searchIndex = lowerContent.indexOf(lowerText, textarea.selectionEnd);
        if (searchIndex === -1) searchIndex = lowerContent.indexOf(lowerText, 0); 
    } else {
        searchIndex = lowerContent.lastIndexOf(lowerText, textarea.selectionStart - 1);
        if (searchIndex === -1) searchIndex = lowerContent.lastIndexOf(lowerText);
    }

    if (searchIndex !== -1) {
        textarea.focus();
        textarea.setSelectionRange(searchIndex, searchIndex + text.length);
        
        const lineHeight = settings.fontSize * settings.lineHeight; 
        const lines = content.substr(0, searchIndex).split('\n').length;
        if (!settings.typewriterMode) {
             textarea.scrollTop = lines * lineHeight - (textarea.clientHeight / 2);
        }
    }
  };

  const insertAtCursor = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selection = currentText.substring(start, end);
    const newText = currentText.substring(0, start) + before + selection + after + currentText.substring(end);

    setMarkdown(newText);
    setIsModified(true);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
      updateCursorPos();
    }, 0);
  };

  const insertBlock = (prefix: string) => {
     const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const currentText = textarea.value;
    const lineStart = currentText.lastIndexOf('\n', start - 1) + 1;
    const isAtLineStart = start === lineStart;
    const insertion = isAtLineStart ? prefix : `\n${prefix}`;
    insertAtCursor(insertion);
  }

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
        const updated = { ...prev, ...newSettings };
        saveSettings(updated); // Persist immediately
        return updated;
    });
  };

  const handleAction = (action: EditorAction) => {
    switch (action) {
      case 'bold': insertAtCursor('**', '**'); break;
      case 'italic': insertAtCursor('*', '*'); break;
      case 'code': insertAtCursor('`', '`'); break;
      case 'link': insertAtCursor('[', '](url)'); break;
      case 'image': 
        // Open file picker for image
        openFileDialog({
            multiple: false,
            directory: false,
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
        }).then((path) => {
            if (path && typeof path === 'string') {
                // Normalize path: replace backslashes with forward slashes
                const normalizedPath = path.replace(/\\/g, '/');
                // Use angle brackets < > to handle spaces safely in Markdown
                insertAtCursor(`![Image](<${normalizedPath}>)`);
            } else {
                // Fallback if cancelled or error
                insertAtCursor('![Image Title](', ')');
            }
        });
        break;
      case 'h1': insertBlock('# '); break;
      case 'h2': insertBlock('## '); break;
      case 'h3': insertBlock('### '); break;
      case 'quote': insertBlock('> '); break;
      case 'list-ul': insertBlock('- '); break;
      case 'list-ol': insertBlock('1. '); break;
      case 'check': insertBlock('- [ ] '); break;
    }
  };

  // --- PRINT MODE RENDER ---
  if (isPrinting) {
    return (
      <div className="min-h-screen w-full bg-white text-black print:p-0">
         <div className="prose prose-slate max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, className, children, ...props}) {
                    return <code className={`${className} bg-gray-100 text-black px-1 py-0.5 rounded font-mono text-sm border border-gray-300 print:bg-gray-50 print:border-gray-300`} {...props}>{children}</code>
                },
                pre({ children }) {
                  return <pre className="bg-gray-100 text-black p-4 rounded-lg overflow-x-auto border border-gray-300 break-inside-avoid print:bg-gray-50 print:border-gray-300 print:whitespace-pre-wrap">{children}</pre>
                },
                img({node, ...props}) {
                  return <img className="rounded-lg max-w-full h-auto mx-auto break-inside-avoid print:shadow-none" {...props} />
                },
                blockquote({ children }) {
                  return <blockquote className="border-l-4 border-black pl-4 italic print:border-black">{children}</blockquote>
                },
                a({ children, href }) {
                    return <a href={href} className="text-blue-600 underline print:text-black print:no-underline">{children}</a>
                }
              }}
            >
              {markdown}
            </ReactMarkdown>
         </div>
      </div>
    );
  }

  // Link Preview Tooltip Handlers
  const handlePreviewMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const url = target.getAttribute('href');
      if (url) {
        setHoveredLink({ url, x: e.clientX, y: e.clientY });
      }
    }
  };

  const handlePreviewMouseOut = () => {
    setHoveredLink(null);
  };

  const swapSplitSides = () => {
    setEditorOnRight(!editorOnRight);
  };

  // --- APP MODE RENDER ---
  console.log('[Mark-Lee] Rendering App. Transparency:', settings.transparency, 'BG:', tConfig.bgHex);
  
  return (
    <div 
        className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 relative font-sans ${tConfig.bg} ${tConfig.fg}`}
        style={{ 
            backgroundColor: hexToRgba(tConfig.bgHex, Math.max(0.1, settings.transparency)), // Enforce min opacity 0.1 for debugging
            backdropFilter: settings.transparency < 0.95 ? 'blur(10px)' : 'none',
            WebkitBackdropFilter: settings.transparency < 0.95 ? 'blur(10px)' : 'none',
            willChange: settings.transparency < 0.95 ? 'backdrop-filter' : 'auto'
        }}
    >
      {/* Focus Mode Overlay */}
      {settings.focusMode && <div className="focus-mode-overlay" />}

      {/* Menu Bar (Overlay to prevent layout shift) */}
      <div className={`menubar-container fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        showMenuBar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <Suspense fallback={<div className="h-8 bg-transparent" />}>
          <MemoizedMenuBar 
            theme={theme} 
            onAction={handleMenuAction} 
            tConfig={tConfig} 
            language={settings.language}
            recentFiles={recentFiles}
            shortcuts={settings.customShortcuts}
            fileName={fileName}
            isModified={isModified}
            isZenMode={isZenMode}
          />
        </Suspense>
      </div>

      {/* Main Workspace (Toolbar + Content) */}
      <div className={`flex-1 flex overflow-hidden relative min-h-0 transition-[padding] duration-300 ease-in-out ${
        showMenuBar ? 'pt-9' : 'pt-0'
      }`}>

        {/* Left Toolbar */}
        {showToolbar && settings.toolbarPosition === 'left' && (
           <Suspense fallback={null}>
             <MemoizedToolbar 
               theme={theme} 
               setTheme={setTheme} 
               viewMode={viewMode} 
               setViewMode={setViewMode} 
               onAction={handleAction}
               onMenuAction={handleMenuAction}
               language={settings.language}
               fileName={fileName}
               isModified={isModified}
               isZenMode={isZenMode}
               onSwapSides={swapSplitSides}
               orientation="vertical"
               toolbarPosition={settings.toolbarPosition}
               onPositionChange={(pos) => updateSettings({ toolbarPosition: pos })}
               toolbarItems={settings.toolbarItems}
             />
           </Suspense>
        )}

        {/* Content Column */}
        <div className="flex flex-col flex-1 h-full relative overflow-hidden min-w-0">
            
            {/* Top Toolbar */}
            {showToolbar && settings.toolbarPosition === 'top' && (
              <Suspense fallback={null}>
                <MemoizedToolbar 
                  theme={theme} 
                  setTheme={setTheme} 
                  viewMode={viewMode} 
                  setViewMode={setViewMode} 
                  onAction={handleAction}
                  onMenuAction={handleMenuAction}
                  language={settings.language}
                  fileName={fileName}
                  isModified={isModified}
                  isZenMode={isZenMode}
                  onSwapSides={swapSplitSides}
                  orientation="horizontal"
                  toolbarPosition={settings.toolbarPosition}
                  onPositionChange={(pos) => updateSettings({ toolbarPosition: pos })}
                  toolbarItems={settings.toolbarItems}
                />
              </Suspense>
            )}

            {/* Editor Container */}
            <div className={`flex-1 flex relative overflow-hidden min-h-0 ${editorOnRight ? 'flex-row-reverse' : 'flex-row'}`}>
              
                {/* Editor Pane */}
                <div className={`
                    flex flex-col relative transition-all duration-300
                    ${viewMode === 'preview' ? 'hidden' : 'flex'}
                    ${viewMode === 'split' ? 'w-1/2 border-r ' + tConfig.uiBorder : 'w-full'}
                `}>
                    <textarea
                        ref={textareaRef}
                        value={markdown}
                        onChange={handleTextChange}
                        onClick={updateCursorPos}
                        onKeyUp={updateCursorPos}
                        className={`
                        w-full h-full p-8 resize-none outline-none bg-transparent
                        ${tConfig.fg}
                        selection:bg-indigo-500/30
                        ${settings.wordWrap ? '' : 'whitespace-nowrap'}
                        font-${settings.fontFamily}
                        `}
                        style={{ 
                        fontSize: `${settings.fontSize}px`,
                        lineHeight: settings.lineHeight,
                        paddingBottom: settings.typewriterMode ? '50vh' : '2rem'
                        }}
                        placeholder={t['editor.placeholder'] || "Start typing..."}
                        spellCheck={settings.spellCheck}
                    />
                </div>

                {/* Preview Pane */}
                <div 
                    ref={previewRef}
                    onMouseOver={handlePreviewMouseOver}
                    onMouseOut={handlePreviewMouseOut}
                    className={`
                    overflow-y-auto p-8 transition-all duration-300
                    ${viewMode === 'edit' ? 'hidden' : 'block'}
                    ${viewMode === 'split' ? 'w-1/2' : 'w-full'}
                    `}
                >
                    {/* Code files: show CodePreview with syntax highlighting */}
                    {isCodeFile(fileName) ? (
                      <Suspense fallback={<div className="animate-pulse text-center py-8 opacity-50">Loading code preview...</div>}>
                        <CodePreview 
                          content={debouncedMarkdown} 
                          fileName={fileName} 
                          tConfig={tConfig}
                        />
                      </Suspense>
                    ) : (
                      /* Markdown files: show formatted preview */
                      <div className={`prose prose-sm md:prose-base max-w-none mx-auto ${tConfig.prose} ${TEXT_PRESETS[settings.presetId || 'minimalist'].proseClass}`}>
                        <Suspense fallback={<div className="animate-pulse text-center py-8 opacity-50">Loading preview...</div>}>
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                            h1: ({node, className, children, ...props}) => <h1 className={TEXT_PRESETS[settings.presetId || 'minimalist'].components.h1} {...props}>{children}</h1>,
                            h2: ({node, className, children, ...props}) => <h2 className={TEXT_PRESETS[settings.presetId || 'minimalist'].components.h2} {...props}>{children}</h2>,
                            p: ({node, className, children, ...props}) => <p className={TEXT_PRESETS[settings.presetId || 'minimalist'].components.p} {...props}>{children}</p>,
                            a: ({node, className, children, ...props}) => <a className={TEXT_PRESETS[settings.presetId || 'minimalist'].components.link} {...props}>{children}</a>,
                            code(props: any) {
                                const {className, children, inline} = props;
                                const preset = TEXT_PRESETS[settings.presetId || 'minimalist'];
                                
                                // BLOCK CODE (inside pre)
                                if (!inline) {
                                   return (
                                    <code className={`${className} font-mono text-sm ${preset.components.code} ${tConfig.fg.replace('text-', '!text-')}`} style={{ backgroundColor: 'transparent' }} {...props}>
                                      {children}
                                    </code>
                                   )  
                                }

                                // INLINE CODE
                                return (
                                    <code className={`${className} bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-sm ${preset.components.code}`} style={{ color: 'inherit' }} {...props}>
                                      {children}
                                    </code>
                                )
                            },
                            pre({ children }) {
                                return (
                                <pre className={`bg-black/5 dark:bg-white/5 p-4 rounded-lg overflow-x-auto border border-black/5 dark:border-white/5 ${tConfig.fg.replace('text-', '!text-')}`}>
                                  {children}
                                </pre>
                                )
                            },
                            img: (props) => {
                              return (
                                <LocalImage 
                                  className={`max-w-full h-auto mx-auto ${TEXT_PRESETS[settings.presetId || 'minimalist'].components.img}`} 
                                  basePath={currentPath || undefined}
                                  {...props} 
                                />
                              )
                            },
                            blockquote({ children }) {
                              const preset = TEXT_PRESETS[settings.presetId || 'minimalist'];
                              return (
                                <blockquote className={`${preset.components.blockquote} ${preset.id !== 'creative' ? tConfig.uiBorder.replace('border', 'border') : ''}`}>
                                  {children}
                                </blockquote>
                              )
                            }
                            }}
                        >
                            {debouncedMarkdown}
                        </ReactMarkdown>
                        </Suspense>
                      </div>
                    )}
                </div>

            </div>
            
            {/* Bottom Toolbar */}
            {showToolbar && settings.toolbarPosition === 'bottom' && (
              <Suspense fallback={null}>
                <MemoizedToolbar 
                  theme={theme} 
                  setTheme={setTheme} 
                  viewMode={viewMode} 
                  setViewMode={setViewMode} 
                  onAction={handleAction}
                  onMenuAction={handleMenuAction}
                  language={settings.language}
                  fileName={fileName}
                  isModified={isModified}
                  isZenMode={isZenMode}
                  onSwapSides={swapSplitSides}
                  orientation="horizontal"
                  toolbarPosition={settings.toolbarPosition}
                  onPositionChange={(pos) => updateSettings({ toolbarPosition: pos })}
                  toolbarItems={settings.toolbarItems}
                />
              </Suspense>
            )}
            
        </div>
        
        {/* Right Toolbar */}
        {showToolbar && settings.toolbarPosition === 'right' && (
           <Suspense fallback={null}>
             <MemoizedToolbar 
               theme={theme} 
               setTheme={setTheme} 
               viewMode={viewMode} 
               setViewMode={setViewMode} 
               onAction={handleAction}
               onMenuAction={handleMenuAction}
               language={settings.language}
               fileName={fileName}
               isModified={isModified}
               isZenMode={isZenMode}
               onSwapSides={swapSplitSides}
               orientation="vertical"
               toolbarPosition={settings.toolbarPosition}
               onPositionChange={(pos) => updateSettings({ toolbarPosition: pos })}
               toolbarItems={settings.toolbarItems}
             />
           </Suspense>
        )}
      </div>

      {/* Status Bar */}
      <div className={`
        flex-none h-8 border-t text-xs flex items-center justify-between px-4 select-none
        ${tConfig.ui} ${tConfig.fg}
        transition-all duration-700 ease-in-out bg-opacity-80
        ${isUiVisible ? `opacity-100 ${tConfig.uiBorder}` : 'opacity-0 border-transparent pointer-events-none'}
      `}>
        <div className="flex items-center gap-4 opacity-70">
          <span>{t['stats.ln']} {cursorPos.line}, {t['stats.col']} {cursorPos.col}</span>
          <span className="w-px h-3 bg-current opacity-20"></span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4 opacity-70">
           <span>{wordCount} {t['stats.words']}{selectedWordCount > 0 && <span className="text-indigo-500"> ({selectedWordCount} {t['stats.selected'] || 'sel.'})</span>}</span>
           <span>{charCount} {t['stats.chars']}{selectedCharCount > 0 && <span className="text-indigo-500"> ({selectedCharCount})</span>}</span>
           <span>{Math.max(1, Math.ceil(wordCount / 200))} {t['stats.readingTime'] || 'min read'}</span>
        </div>
      </div>

       {/* Modals & Overlays - Rendered via Portal to bypass backdrop-filter stacking context */}
      {ReactDOM.createPortal(
        <>
          {hoveredLink && (
            <div className="fixed bottom-10 left-4 bg-black/80 text-white text-xs px-2 py-1 rounded z-50 pointer-events-none max-w-md truncate">
              {hoveredLink.url}
            </div>
          )}

          <Suspense fallback={null}>
            <FindWidget 
              isOpen={isFindOpen}
              onClose={() => setIsFindOpen(false)}
              onFind={handleFind}
              tConfig={tConfig}
              language={settings.language}
            />

            <ConfirmModal
              isOpen={isConfirmOpen}
              onClose={handleConfirmCancel}
              onConfirm={handleConfirmSave}
              onDiscard={handleConfirmDiscard}
              tConfig={tConfig}
              language={settings.language}
              fileName={fileName}
            />

            <SaveAsModal
              isOpen={isSaveAsOpen}
              onClose={() => setIsSaveAsOpen(false)}
              onSave={(name) => {
                  handleSave(name);
                  setIsSaveAsOpen(false);
              }}
              currentFileName={fileName === 'Untitled.md' ? '' : fileName}
              tConfig={tConfig}
              language={settings.language}
              mode="save"
            />
            
            <SaveAsModal 
              isOpen={isExportPdfOpen}
              onClose={() => setIsExportPdfOpen(false)}
              onSave={handlePdfExportConfirm}
              currentFileName={fileName.replace('.md', '')}
              tConfig={tConfig}
              language={settings.language}
              mode="pdf"
              title={t['pdf.title']}
              confirmLabel={t['pdf.confirm']}
              placeholder={t['pdf.placeholder']}
            />

            <SettingsModal 
              isOpen={isSettingsOpen} 
              onClose={() => setIsSettingsOpen(false)} 
              settings={settings}
              onUpdate={updateSettings}
              tConfig={tConfig}
            />
            
            <SnippetsMenu 
              isOpen={isSnippetsOpen}
              onClose={() => setIsSnippetsOpen(false)}
              onInsert={handleInsertSnippet} 
              tConfig={tConfig}
              language={settings.language}
            />
            
            <AboutModal 
              isOpen={isAboutOpen}
              onClose={() => setIsAboutOpen(false)}
              tConfig={tConfig}
              language={settings.language}
            />
          </Suspense>
        </>,
        document.body
      )}

    </div>
  );
}

export default App;