import { useState, useEffect } from "react";
import { X, FileText, Plus, Settings2 } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalTemplate } from "../domain/template-service";
import { listTemplates, getExcerpt } from "../domain/template-service";

interface TemplatePickerDialogProps {
  open: boolean;
  t?: Record<string, string>;
  tConfig: ThemeConfig;
  journalRootPath: string;
  onClose: () => void;
  onSelect: (body: string) => void;
  onManageTemplates?: () => void;
}

export function TemplatePickerDialog({ open, t, tConfig, journalRootPath, onClose, onSelect, onManageTemplates }: TemplatePickerDialogProps) {
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const tr = (k: string, fallback: string) => t?.[k] || fallback;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listTemplates(journalRootPath).then((list) => {
      setTemplates(list);
      setLoading(false);
    });
  }, [open, journalRootPath]);

  if (!open) return null;

  const pick = (body: string) => { onSelect(body); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[560px] max-w-[94vw] max-h-[78vh] rounded-lg shadow-2xl border flex flex-col"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: tConfig.uiBorderHex }}>
          <h3 className="text-sm font-semibold">{tr("journal.newFromTemplate", "New entry")}</h3>
          <div className="flex items-center gap-1">
            {onManageTemplates && (
              <button type="button" onClick={() => { onClose(); onManageTemplates(); }}
                className="h-7 w-7 rounded flex items-center justify-center hover:opacity-70"
                style={{ color: tConfig.fgHex + "70" }} title={tr("journal.manageTemplates", "Manage templates")}>
                <Settings2 size={15} />
              </button>
            )}
            <button type="button" onClick={onClose} className="h-7 w-7 rounded flex items-center justify-center hover:opacity-70"
              style={{ color: tConfig.fgHex + "70" }}><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-xs px-2 py-6 text-center" style={{ color: tConfig.fgHex + "50" }}>{tr("journal.loading", "Loading…")}</p>
          ) : (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {/* Blank entry */}
              <button type="button" onClick={() => pick("")}
                className="flex flex-col gap-2 p-3 rounded-lg border text-left transition-all hover:-translate-y-0.5"
                style={{ borderColor: tConfig.accentHex + "40", backgroundColor: tConfig.accentHex + "08", minHeight: 104 }}>
                <span className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}>
                  <Plus size={15} />
                </span>
                <span className="font-medium text-sm" style={{ color: tConfig.fgHex }}>{tr("journal.blankEntry", "Blank entry")}</span>
                <span className="text-[11px]" style={{ color: tConfig.fgHex + "55" }}>{tr("journal.blankEntryDesc", "Start from scratch")}</span>
              </button>

              {templates.map((tpl) => (
                <button key={tpl.name} type="button" onClick={() => pick(tpl.body)}
                  className="flex flex-col gap-1.5 p-3 rounded-lg border text-left transition-all hover:-translate-y-0.5"
                  style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.uiHex, minHeight: 104 }}>
                  <span className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: tConfig.fgHex + "0F", color: tConfig.fgHex + "70" }}>
                    <FileText size={14} />
                  </span>
                  <span className="font-medium text-sm truncate" style={{ color: tConfig.fgHex }}>{tpl.name}</span>
                  {tpl.body.trim() && (
                    <span className="text-[11px] leading-snug line-clamp-3" style={{ color: tConfig.fgHex + "55", whiteSpace: "pre-wrap" }}>
                      {getExcerpt(tpl.body.replace(/[#>*`-]/g, "").replace(/\n+/g, " "), 90)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
