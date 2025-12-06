import React from 'react';
import { X, Type, AlignJustify, Keyboard, Check, Globe, Layers } from 'lucide-react';
import { ThemeConfig, AppSettings, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  tConfig: ThemeConfig;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdate, tConfig }) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[settings.language];

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const fonts = [
    { label: 'Monospace', value: 'mono', class: 'font-mono' },
    { label: 'Sans Serif', value: 'sans', class: 'font-sans' },
    { label: 'Serif', value: 'serif', class: 'font-serif' },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'pt-BR', label: 'Português (Brasil)' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'es-ES', label: 'Español' },
    { code: 'fr-FR', label: 'Français' },
    { code: 'it-IT', label: 'Italiano' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'ja-JP', label: '日本語' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-96 rounded-xl shadow-2xl border ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg} max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center p-4 border-b border-opacity-10 border-gray-500">
          <h2 className="font-semibold flex items-center gap-2">
            <Keyboard size={18} />
            {t['settings.title']}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* General / Language / Transparency */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold opacity-50 uppercase tracking-wider">{t['settings.behavior']}</h3>
            
            {/* Language */}
            <div className="space-y-2">
               <label className="text-sm font-medium flex items-center gap-2">
                 <Globe size={16} className="opacity-70" />
                 {t['settings.language']}
               </label>
               <select 
                 value={settings.language}
                 onChange={(e) => handleChange('language', e.target.value)}
                 className={`w-full p-2 rounded text-sm border bg-transparent outline-none ${tConfig.uiBorder}`}
               >
                 {languages.map((lang) => (
                   <option key={lang.code} value={lang.code} className="text-black">{lang.label}</option>
                 ))}
               </select>
            </div>

            {/* Transparency */}
            <div className="space-y-2">
               <div className="flex justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Layers size={16} className="opacity-70" />
                    {t['settings.transparency']}
                  </label>
                  <span className="text-xs opacity-70">{Math.round(settings.transparency * 100)}%</span>
               </div>
               <input 
                 type="range" 
                 min="0.2" 
                 max="1.0" 
                 step="0.05"
                 value={settings.transparency}
                 onChange={(e) => handleChange('transparency', parseFloat(e.target.value))}
                 className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-500"
               />
            </div>
          </div>

          <div className={`h-px ${tConfig.uiBorder.replace('border', 'bg')} opacity-50`} />

          {/* Typography Section */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold opacity-50 uppercase tracking-wider">{t['settings.typography']}</h3>
             
             {/* Font Family */}
             <div className="space-y-2">
               <label className="text-sm font-medium">{t['settings.fontFamily']}</label>
               <div className="grid grid-cols-3 gap-2">
                 {fonts.map((f) => (
                   <button
                    key={f.value}
                    onClick={() => handleChange('fontFamily', f.value)}
                    className={`text-xs py-2 rounded border transition-all ${
                      settings.fontFamily === f.value 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' 
                      : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/5 opacity-70`
                    }`}
                   >
                     <span className={f.class}>{f.label}</span>
                   </button>
                 ))}
               </div>
             </div>

             {/* Font Size */}
             <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t['settings.fontSize']}</label>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => handleChange('fontSize', Math.max(10, settings.fontSize - 1))}
                   className={`w-8 h-8 rounded border ${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center`}
                 >-</button>
                 <span className="w-8 text-center text-sm">{settings.fontSize}px</span>
                 <button 
                   onClick={() => handleChange('fontSize', Math.min(32, settings.fontSize + 1))}
                   className={`w-8 h-8 rounded border ${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center`}
                 >+</button>
              </div>
            </div>

             {/* Line Height */}
             <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t['settings.lineHeight']}</label>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => handleChange('lineHeight', Math.max(1, parseFloat((settings.lineHeight - 0.1).toFixed(1))))}
                   className={`w-8 h-8 rounded border ${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center`}
                 >-</button>
                 <span className="w-8 text-center text-sm">{settings.lineHeight}</span>
                 <button 
                   onClick={() => handleChange('lineHeight', Math.min(3, parseFloat((settings.lineHeight + 0.1).toFixed(1))))}
                   className={`w-8 h-8 rounded border ${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center`}
                 >+</button>
              </div>
            </div>
          </div>

          <div className={`h-px ${tConfig.uiBorder.replace('border', 'bg')} opacity-50`} />

          {/* Editor Behavior Section */}
          <div className="space-y-4">
            
            {/* Word Wrap */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlignJustify size={16} className="opacity-70" />
                {t['settings.wordWrap']}
              </label>
              <button 
                onClick={() => handleChange('wordWrap', !settings.wordWrap)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.wordWrap ? 'bg-indigo-500' : 'bg-gray-400'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.wordWrap ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Typewriter Mode */}
             <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Type size={16} className="opacity-70" />
                {t['settings.typewriter']}
              </label>
              <button 
                onClick={() => handleChange('typewriterMode', !settings.typewriterMode)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.typewriterMode ? 'bg-indigo-500' : 'bg-gray-400'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.typewriterMode ? 'translate-x-5' : ''}`} />
              </button>
            </div>

             {/* Spell Check */}
             <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Check size={16} className="opacity-70" />
                {t['settings.spellCheck']}
              </label>
              <button 
                onClick={() => handleChange('spellCheck', !settings.spellCheck)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.spellCheck ? 'bg-indigo-500' : 'bg-gray-400'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.spellCheck ? 'translate-x-5' : ''}`} />
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;