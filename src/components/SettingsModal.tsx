import React from 'react';
import { X, Type, AlignJustify, Keyboard, Check, Globe, Layers, AppWindow, Save, Focus, BookOpen, PanelTop, PanelBottom, PanelLeft, PanelRight } from 'lucide-react';
import { ThemeConfig, AppSettings, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { TEXT_PRESETS } from '../constants';

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
  ];

  const shortcutActions = [
    { id: 'file-new', label: 'file.new' },
    { id: 'file-open', label: 'file.open' },
    { id: 'file-save', label: 'file.save' },
    { id: 'file-save-as', label: 'file.saveAs' },
    { id: 'edit-find', label: 'edit.find' },
    { id: 'view-zen', label: 'view.zen' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, actionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore modifier-only presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    
    // Normalize key
    let key = e.key.toUpperCase();
    if (key === ' ') key = 'Space';
    if (key.length === 1) key = key.toUpperCase();
    
    parts.push(key);
    
    const shortcut = parts.join('+');
    
    const newShortcuts = { ...settings.customShortcuts, [actionId]: shortcut };
    handleChange('customShortcuts', newShortcuts);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
          
          
          {/* Interface / Layout */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold opacity-50 uppercase tracking-wider">{t['settings.behavior']} & {t['view.toolbar']}</h3>

             {/* Toolbar Position */}
             <div className="space-y-2">
                 <label className="text-sm font-medium flex items-center gap-2">
                    <AlignJustify size={16} className="opacity-70" />
                    {t['settings.toolbarPosition'] || 'Posição da Barra de Ferramentas'}
                 </label>
                 <div className="grid grid-cols-4 gap-2">
                    {[
                      { pos: 'top', icon: PanelTop, label: 'TOP' },
                      { pos: 'bottom', icon: PanelBottom, label: 'BOTTOM' },
                      { pos: 'left', icon: PanelLeft, label: 'LEFT' },
                      { pos: 'right', icon: PanelRight, label: 'RIGHT' },
                    ].map(({ pos, icon: Icon, label }) => (
                        <button
                            key={pos}
                            onClick={() => handleChange('toolbarPosition', pos)}
                            className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${
                                settings.toolbarPosition === pos
                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                                : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/5 opacity-70`
                            }`}
                        >
                            <Icon size={18} />
                            <span className="text-[10px] uppercase font-bold">{label}</span>
                        </button>
                    ))}
                 </div>
             </div>

             <div className={`h-px ${tConfig.uiBorder.replace('border', 'bg')} opacity-50`} />
             
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
               <p className="text-[10px] opacity-50">Permite ver o conteúdo por trás da janela.</p>
            </div>

            {/* Single Instance */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <AppWindow size={16} className="opacity-70" />
                  {t['settings.singleInstance']}
                </label>
                <button 
                  onClick={() => handleChange('singleInstance', !settings.singleInstance)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${settings.singleInstance ? 'bg-indigo-500' : 'bg-gray-400'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.singleInstance ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <p className="text-[10px] opacity-50 ml-6">{t['settings.singleInstance.desc']}</p>
            </div>
          </div>

          <div className={`h-px ${tConfig.uiBorder.replace('border', 'bg')} opacity-50`} />

          {/* Typography Section */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold opacity-50 uppercase tracking-wider">{t['settings.typography']}</h3>

             {/* Style Preset Selector */}
             <div className="space-y-2">
               <label className="text-sm font-medium flex items-center gap-2">
                 <BookOpen size={16} className="opacity-70" />
                 {t['settings.preset'] || 'Estilo de Publicação'}
               </label>
               <div className="grid grid-cols-2 gap-2">
                 {Object.values(TEXT_PRESETS).map((preset) => (
                   <button
                    key={preset.id}
                    onClick={() => handleChange('presetId', preset.id)}
                    className={`text-xs p-2 rounded border transition-all text-left flex flex-col gap-1 ${
                      settings.presetId === preset.id 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' 
                      : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/5 opacity-70`
                    }`}
                   >
                     <span className="font-bold">{preset.name}</span>
                     <span className="text-[10px] opacity-70 leading-tight">{preset.description}</span>
                   </button>
                 ))}
               </div>
             </div>
             
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
            <div className="space-y-1">
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
              <p className="text-[10px] opacity-50 ml-6">Quebra linhas longas para caber na tela.</p>
            </div>

            {/* Typewriter Mode */}
            <div className="space-y-1">
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
              <p className="text-[10px] opacity-50 ml-6">Mantém o cursor sempre centralizado verticalmente.</p>
            </div>

            {/* Focus Mode */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Focus size={16} className="opacity-70" />
                  {t['settings.focusMode'] || 'Modo Foco'}
                </label>
                <button 
                  onClick={() => handleChange('focusMode', !settings.focusMode)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${settings.focusMode ? 'bg-indigo-500' : 'bg-gray-400'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.focusMode ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <p className="text-[10px] opacity-50 ml-6">{t['settings.focusMode.desc'] || 'Escurece tudo exceto a linha atual.'}</p>
            </div>

             {/* Spell Check */}
            <div className="space-y-1">
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
              <p className="text-[10px] opacity-50 ml-6">Sublinha palavras com erros ortográficos.</p>
            </div>

            {/* Auto-save */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Save size={16} className="opacity-70" />
                  {t['settings.autoSave'] || 'Salvamento Automático'}
                </label>
                <button 
                  onClick={() => handleChange('autoSave', !settings.autoSave)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${settings.autoSave ? 'bg-indigo-500' : 'bg-gray-400'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.autoSave ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {settings.autoSave && (
                <div className="ml-6 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="opacity-70">{t['settings.autoSaveInterval'] || 'Intervalo'}</span>
                    <span>{settings.autoSaveInterval}s</span>
                  </div>
                  <input 
                    type="range" 
                    min="30" 
                    max="300" 
                    step="30"
                    value={settings.autoSaveInterval}
                    onChange={(e) => handleChange('autoSaveInterval', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              )}
              <p className="text-[10px] opacity-50 ml-6">{t['settings.autoSave.desc'] || 'Salva automaticamente arquivos abertos.'}</p>
            </div>

            <div className={`h-px ${tConfig.uiBorder.replace('border', 'bg')} opacity-50`} />

            {/* Shortcuts Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold opacity-50 uppercase tracking-wider">{t['settings.shortcuts'] || 'Atalhos'}</h3>
              
              <div className="space-y-3">
                {shortcutActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between">
                    <label className="text-sm font-medium opacity-80">
                      {t[action.label] || action.label}
                    </label>
                    <div className="relative group">
                      <input
                        readOnly
                        value={settings.customShortcuts?.[action.id] || ''}
                        onKeyDown={(e) => handleKeyDown(e, action.id)}
                        className={`
                          w-32 text-center text-xs py-1.5 rounded border outline-none cursor-pointer
                          ${tConfig.uiBorder} bg-black/5 dark:bg-white/5
                          focus:border-indigo-500 focus:bg-indigo-500/10 focus:text-indigo-500
                          transition-all
                        `}
                        placeholder="Press key..."
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Keyboard size={12} className="opacity-50" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] opacity-50 text-center pt-2">Clique no campo e pressione a combinação desejada.</p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
