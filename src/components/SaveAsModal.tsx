import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileDown } from 'lucide-react';
import { ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface SaveAsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileName: string) => void;
  currentFileName: string;
  tConfig: ThemeConfig;
  language: Language;
  mode?: 'save' | 'pdf';
  title?: string;
  confirmLabel?: string;
  placeholder?: string;
}

const SaveAsModal: React.FC<SaveAsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentFileName,
  tConfig, 
  language,
  mode = 'save',
  title,
  confirmLabel,
  placeholder
}) => {
  const [fileName, setFileName] = useState(currentFileName);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  // Derive defaults based on mode if not provided
  const displayTitle = title || t['save.title'];
  const displayConfirm = confirmLabel || t['save.confirm'];
  const displayPlaceholder = placeholder || t['save.placeholder'];

  useEffect(() => {
    if (isOpen) {
      setFileName(currentFileName);
      // Slight delay to allow render
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select name part without extension
          const dotIndex = currentFileName.lastIndexOf('.');
          if (dotIndex > 0) {
            inputRef.current.setSelectionRange(0, dotIndex);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, currentFileName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileName.trim()) {
      onSave(fileName.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-96 rounded-xl shadow-2xl border ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}>
        <div className="flex justify-between items-center p-4 border-b border-opacity-10 border-gray-500">
          <h2 className="font-semibold flex items-center gap-2">
            {mode === 'save' ? <Save size={18} /> : <FileDown size={18} />}
            {displayTitle}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder={displayPlaceholder}
            className={`w-full p-2 rounded text-sm border bg-transparent outline-none ${tConfig.uiBorder} focus:border-indigo-500`}
            autoFocus
          />
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded text-sm hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-opacity`}
            >
              {t['save.cancel']}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded text-sm bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm transition-colors"
            >
              {displayConfirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveAsModal;