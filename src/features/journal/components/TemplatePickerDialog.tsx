import { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalTemplate } from "../domain/template-service";
import { listTemplates, getExcerpt } from "../domain/template-service";

interface TemplatePickerDialogProps {
  open: boolean;
  tConfig: ThemeConfig;
  journalRootPath: string;
  onClose: () => void;
  onSelect: (body: string) => void;
}

export function TemplatePickerDialog({ open, tConfig, journalRootPath, onClose, onSelect }: TemplatePickerDialogProps) {
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listTemplates(journalRootPath).then((list) => {
      setTemplates(list);
      setLoading(false);
    });
  }, [open, journalRootPath]);

  const handleBlank = () => {
    onSelect("");
    onClose();
  };

  const handlePick = (tpl: JournalTemplate) => {
    onSelect(tpl.body);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] max-w-[90vw] max-h-[70vh] rounded-lg shadow-2xl border flex flex-col"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <h3 className="text-sm font-semibold">New entry from template</h3>
          <button type="button" onClick={onClose} className="hover:opacity-60"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button type="button" onClick={handleBlank}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-left transition-colors hover:opacity-80"
            style={{ color: tConfig.fgHex }}>
            <FileText size={16} style={{ color: tConfig.fgHex + "50" }} />
            <span>Blank entry</span>
          </button>
          {loading ? (
            <p className="text-xs px-3 py-2" style={{ color: tConfig.fgHex + "50" }}>Loading...</p>
          ) : templates.length === 0 ? (
            <p className="text-xs px-3 py-2" style={{ color: tConfig.fgHex + "40" }}>No templates yet.</p>
          ) : (
            templates.map((tpl) => (
              <button key={tpl.name} type="button" onClick={() => handlePick(tpl)}
                className="w-full flex flex-col gap-0.5 px-3 py-2.5 rounded text-sm text-left transition-colors hover:opacity-80"
                style={{ color: tConfig.fgHex }}>
                <span className="font-medium text-sm">{tpl.name}</span>
                {tpl.body.trim() && (
                  <span className="text-xs" style={{ color: tConfig.fgHex + "50" }}>
                    {getExcerpt(tpl.body, 80)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end px-5 py-3 border-t shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded border"
            style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
