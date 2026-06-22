import { BookOpen, Heart, Calendar, SmilePlus, Image, Table, BarChart3, Tags, MapPin, Download, FileText } from "lucide-react";
import type { ThemeConfig } from "../../../types";

interface JournalGettingStartedProps {
  tConfig: ThemeConfig;
  hasEntries: boolean;
  onNewEntry: () => void;
}

const features = [
  { icon: <SmilePlus size={16} />, label: "Mood", desc: "Track your mood with emojis" },
  { icon: <Tags size={16} />, label: "Tags", desc: "Organize entries with tags" },
  { icon: <Heart size={16} />, label: "Favorites", desc: "Star your best entries" },
  { icon: <Image size={16} />, label: "Photos", desc: "Add images and cover photos" },
  { icon: <Table size={16} />, label: "Tables", desc: "Insert structured data" },
  { icon: <BarChart3 size={16} />, label: "Trackers", desc: "Log numbers, text & booleans" },
  { icon: <Calendar size={16} />, label: "Calendar", desc: "Browse by date" },
  { icon: <MapPin size={16} />, label: "Location", desc: "Pin places on a map" },
  { icon: <Download size={16} />, label: "Export", desc: "Markdown, HTML & ZIP" },
  { icon: <FileText size={16} />, label: "Templates", desc: "Reusable entry templates" },
];

export function JournalGettingStarted({ tConfig, hasEntries, onNewEntry }: JournalGettingStartedProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-lg w-full space-y-6 text-center">
        <div className="space-y-2">
          <div className="h-12 w-12 rounded-xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}>
            <BookOpen size={24} />
          </div>
          <h2 className="text-lg font-semibold" style={{ color: tConfig.fgHex }}>
            {hasEntries ? "Select an entry" : "Welcome to your Journal"}
          </h2>
          <p className="text-sm" style={{ color: tConfig.fgHex + "70" }}>
            {hasEntries
              ? "Choose an entry from the list or create a new one."
              : "Start writing your first entry to begin capturing your days."}
          </p>
        </div>

        {!hasEntries && (
          <button type="button" onClick={onNewEntry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
            style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
            <BookOpen size={16} />
            Create your first entry
          </button>
        )}

        <div className="pt-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: tConfig.fgHex + "50" }}>
            What you can do
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-2 p-2 rounded"
                style={{ backgroundColor: tConfig.accentHex + "06" }}>
                <div className="mt-0.5 shrink-0" style={{ color: tConfig.accentHex }}>
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: tConfig.fgHex }}>{f.label}</p>
                  <p className="text-[11px] truncate" style={{ color: tConfig.fgHex + "50" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
