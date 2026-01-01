import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDiscard: () => void;
  tConfig: ThemeConfig;
  language: Language;
  fileName: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onDiscard,
  tConfig, 
  language,
  fileName
}) => {
  const t = TRANSLATIONS[language];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-96 rounded-xl shadow-2xl border ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}>
        <div className="flex items-center gap-3 p-4 border-b border-opacity-10 border-gray-500">
          <AlertTriangle size={24} className="text-amber-500" />
          <h2 className="font-semibold">{t['confirm.unsaved.title']}</h2>
        </div>
        
        <div className="p-4">
          <p className="text-sm opacity-80">
            {t['confirm.unsaved.message'].replace('{fileName}', fileName)}
          </p>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-opacity-10 border-gray-500">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded text-sm hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-opacity`}
          >
            {t['confirm.cancel']}
          </button>
          <button
            onClick={onDiscard}
            className={`px-4 py-2 rounded text-sm hover:bg-red-500/20 text-red-500 transition-colors`}
          >
            {t['confirm.discard']}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded text-sm bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm transition-colors"
          >
            {t['confirm.save']}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
