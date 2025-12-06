import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { readFile, writeFile, openFileDialog, saveFileDialog } from './services/filesystem';
import Toolbar from './components/Toolbar';
import MenuBar from './components/MenuBar';
import SettingsModal from './components/SettingsModal';
import FindWidget from './components/FindWidget';
import SaveAsModal from './components/SaveAsModal';
import { INITIAL_MARKDOWN, THEMES, DEFAULT_SETTINGS } from './constants';
import { Theme, ViewMode, EditorAction, AppSettings } from './types';
import { TRANSLATIONS } from './translations';

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function App() {
  const [markdown, setMarkdown] = useState<string>(INITIAL_MARKDOWN);
  const [theme, setTheme] = useState<Theme>(Theme.Dark);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // File State
  const [fileName, setFileName] = useState('Untitled.md');
  const [isModified, setIsModified] = useState(false);

  // UI State
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Stats
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const tConfig = THEMES[theme];
  const t = TRANSLATIONS[settings.language];

  // Update window title based on filename
  useEffect(() => {
    // Only update title if NOT printing, to avoid overwriting the temporary print filename
    if (!isPrinting) {
      document.title = `${fileName}${isModified ? '*' : ''} - Mark-Lee`;
    }
  }, [fileName, isModified, isPrinting]);

  // Handle Print Completion
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Helper to determine text contrast based on transparency
  const getTextColorClass = () => {
    if (settings.transparency < 0.85) {
      if (theme === Theme.Light || theme === Theme.Sepia) return 'text-black font-medium drop-shadow-sm';
      return 'text-white font-medium drop-shadow-md';
    }
    return tConfig.fg;
  };

  const currentFg = getTextColorClass();

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

  // Mouse move handler for distraction-free mode
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handleMouseMove = () => {
      setIsUiVisible(true);
      
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!isSettingsOpen && !isFindOpen && !isSaveAsOpen && !isExportPdfOpen) {
          setIsUiVisible(false);
        }
      }, 2500);
    };

    window.addEventListener('mousemove', handleMouseMove);
    timeout = setTimeout(() => { if (!isSettingsOpen && !isSaveAsOpen && !isExportPdfOpen) setIsUiVisible(false); }, 2500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isSettingsOpen, isFindOpen, isSaveAsOpen, isExportPdfOpen]);

  // Update stats
  useEffect(() => {
    setWordCount(markdown.trim().split(/\s+/).filter(w => w.length > 0).length);
    setCharCount(markdown.length);
  }, [markdown]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 's': 
            e.preventDefault(); 
            if (e.shiftKey) handleMenuAction('file-save-as');
            else handleMenuAction('file-save'); 
            break;
          case 'o': e.preventDefault(); handleMenuAction('file-open'); break;
          case 'p': e.preventDefault(); handleMenuAction('file-print'); break;
          case 'f': e.preventDefault(); handleMenuAction('edit-find'); break;
          case 'b': e.preventDefault(); handleAction('bold'); break;
          case 'i': e.preventDefault(); handleAction('italic'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markdown, fileName]);

  const updateCursorPos = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const val = textarea.value;
    const sel = textarea.selectionStart;
    const lines = val.substr(0, sel).split("\n");
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;
    setCursorPos({ line: lineNum, col: colNum });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
    setIsModified(true);
  };

  const handleFileOpen = async () => {
    try {
      const path = await openFileDialog();
      if (path) {
        const content = await readFile(path);
        setMarkdown(content);
        setFileName(path.split(/[\\/]/).pop() || 'Untitled.md');
        setIsModified(false);
        // We could store the full path in state if needed for "Save" without "Save As"
        // For MVP let's store it in a ref or new state
        setCurrentPath(path);
      }
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  // Add state for current path
  const [currentPath, setCurrentPath] = useState<string | null>(null);

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

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'file-new': 
        setMarkdown(''); 
        setFileName('Untitled.md'); 
        setIsModified(false);
        break;
      case 'file-open': handleFileOpen(); break;
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
      case 'edit-find': setIsFindOpen(true); break;
      case 'view-zen': setIsUiVisible(!isUiVisible); break;
      case 'view-toolbar': setShowToolbar(!showToolbar); break;
      case 'view-editor': setViewMode('edit'); break;
      case 'view-preview': setViewMode('preview'); break;
      case 'view-split': setViewMode('split'); break;
      case 'settings-pref': setIsSettingsOpen(true); break;
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

  const handleAction = (action: EditorAction) => {
    switch (action) {
      case 'bold': insertAtCursor('**', '**'); break;
      case 'italic': insertAtCursor('*', '*'); break;
      case 'code': insertAtCursor('`', '`'); break;
      case 'link': insertAtCursor('[', '](url)'); break;
      case 'image': insertAtCursor('![alt text](', ')'); break;
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
      <div className="min-h-screen w-full bg-white text-black p-[1cm]">
         <div className="prose prose-slate max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, className, children, ...props}) {
                    return <code className={`${className} bg-gray-100 px-1 py-0.5 rounded font-mono text-sm border border-gray-200`} {...props}>{children}</code>
                },
                pre({node, children, ...props}) {
                  return <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto border border-gray-200 break-inside-avoid">{children}</pre>
                },
                img({node, ...props}) {
                  return <img className="rounded-lg max-w-full h-auto mx-auto break-inside-avoid" {...props} />
                },
                blockquote({node, children, ...props}) {
                  return <blockquote className="border-l-4 border-gray-400 pl-4 italic">{children}</blockquote>
                }
              }}
            >
              {markdown}
            </ReactMarkdown>
         </div>
      </div>
    );
  }

  // --- APP MODE RENDER ---
  return (
    <div 
        className="flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 relative"
        style={{ 
            backgroundColor: hexToRgba(tConfig.bgHex, settings.transparency),
            backdropFilter: settings.transparency < 1 ? 'blur(10px)' : 'none'
        }}
    >
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdate={setSettings}
        tConfig={tConfig}
      />

      <SaveAsModal 
        isOpen={isSaveAsOpen}
        onClose={() => setIsSaveAsOpen(false)}
        onSave={handleSave}
        currentFileName={fileName}
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

      <FindWidget 
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        onFind={handleFind}
        tConfig={tConfig}
        language={settings.language}
      />

      <div className={`flex-none z-30 transition-all duration-700 ease-in-out ${isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <MenuBar theme={theme} onAction={handleMenuAction} tConfig={tConfig} language={settings.language} />
        {showToolbar && (
            <Toolbar 
            theme={theme} 
            setTheme={setTheme} 
            viewMode={viewMode} 
            setViewMode={setViewMode}
            onAction={handleAction}
            language={settings.language}
            fileName={fileName}
            />
        )}
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Editor Pane */}
        <div className={`
          flex-col relative transition-all duration-300
          ${viewMode === 'preview' ? 'hidden' : 'flex'}
          ${viewMode === 'split' ? 'w-1/2 border-r' : 'w-full'}
          ${isUiVisible ? tConfig.uiBorder : 'border-transparent'} 
        `}>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={handleTextChange}
            onClick={updateCursorPos}
            onKeyUp={updateCursorPos}
            className={`
              w-full h-full p-8 resize-none outline-none bg-transparent
              ${currentFg}
              selection:bg-indigo-500/30
              ${settings.wordWrap ? '' : 'whitespace-nowrap'}
              font-${settings.fontFamily}
            `}
            style={{ 
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              paddingBottom: settings.typewriterMode ? '50vh' : '2rem'
            }}
            placeholder="Type your markdown here..."
            spellCheck={settings.spellCheck}
          />
        </div>

        {/* Preview Pane */}
        <div 
          ref={previewRef}
          className={`
          overflow-y-auto p-8 transition-all duration-300
          ${viewMode === 'edit' ? 'hidden' : 'block'}
          ${viewMode === 'split' ? 'w-1/2' : 'w-full'}
        `}>
          <div className={`prose prose-sm md:prose-base max-w-none mx-auto ${tConfig.prose} ${settings.transparency < 0.9 ? 'drop-shadow-sm' : ''}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, className, children, ...props}) {
                    return (
                        <code className={`${className} bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-sm`} {...props}>
                          {children}
                        </code>
                    )
                },
                pre({node, children, ...props}) {
                  return (
                    <pre className="bg-black/5 dark:bg-white/5 p-4 rounded-lg overflow-x-auto border border-black/5 dark:border-white/5">
                      {children}
                    </pre>
                  )
                },
                img({node, ...props}) {
                  return (
                    <img className="rounded-lg shadow-sm max-w-full h-auto mx-auto" {...props} />
                  )
                },
                blockquote({node, children, ...props}) {
                  return (
                    <blockquote className="border-l-4 border-indigo-500/50 pl-4 italic opacity-80">
                      {children}
                    </blockquote>
                  )
                }
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>

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
           <span>{wordCount} {t['stats.words']}</span>
           <span>{charCount} {t['stats.chars']}</span>
        </div>
      </div>
    </div>
  );
}

export default App;