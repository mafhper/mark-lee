// SVG/CSS illustrations for feature stat cards

export const MarkdownIllustration = () => (
  <div className="relative w-full h-32 rounded-lg bg-secondary/30 border border-border/30 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
    <svg viewBox="0 0 200 100" className="w-full h-full" fill="none">
      {/* Markdown icon */}
      <rect x="60" y="20" width="80" height="55" rx="4" className="stroke-border/40" strokeWidth="1.5" fill="none" />
      <rect x="60" y="20" width="80" height="55" rx="4" className="fill-secondary/40" />
      {/* M symbol */}
      <path d="M78 55 L78 40 L88 50 L98 40 L98 55" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Down arrow */}
      <path d="M118 40 L118 55 M112 49 L118 55 L124 49" className="stroke-primary/70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Decorative lines */}
      <line x1="65" y1="82" x2="90" y2="82" className="stroke-muted-foreground/15" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="95" y1="82" x2="135" y2="82" className="stroke-muted-foreground/10" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </div>
);

export const MultiplatformIllustration = () => (
  <div className="relative w-full h-32 rounded-lg bg-secondary/30 border border-border/30 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
    <svg viewBox="0 0 200 100" className="w-full h-full" fill="none">
      {/* Desktop monitor */}
      <rect x="35" y="20" width="52" height="36" rx="3" className="stroke-muted-foreground/30" strokeWidth="1.5" />
      <rect x="38" y="23" width="46" height="28" rx="1" className="fill-secondary/60" />
      <line x1="55" y1="56" x2="67" y2="56" className="stroke-muted-foreground/20" strokeWidth="1.5" />
      <line x1="50" y1="60" x2="72" y2="60" className="stroke-muted-foreground/15" strokeWidth="8" strokeLinecap="round" />
      {/* Small screen indicator */}
      <rect x="44" y="28" width="14" height="2" rx="1" className="fill-primary/50" />
      <rect x="44" y="33" width="34" height="1.5" rx="0.75" className="fill-muted-foreground/20" />
      <rect x="44" y="37" width="28" height="1.5" rx="0.75" className="fill-muted-foreground/15" />
      <rect x="44" y="41" width="20" height="1.5" rx="0.75" className="fill-muted-foreground/10" />
      
      {/* Laptop */}
      <rect x="105" y="28" width="38" height="26" rx="2" className="stroke-muted-foreground/30" strokeWidth="1.2" />
      <rect x="108" y="31" width="32" height="19" rx="1" className="fill-secondary/60" />
      <rect x="100" y="54" width="48" height="4" rx="2" className="stroke-muted-foreground/20 fill-secondary/30" strokeWidth="1" />
      <rect x="112" y="34" width="10" height="1.5" rx="0.75" className="fill-primary/40" />
      <rect x="112" y="38" width="24" height="1" rx="0.5" className="fill-muted-foreground/15" />
      <rect x="112" y="41" width="18" height="1" rx="0.5" className="fill-muted-foreground/10" />
      
      {/* Connecting dots */}
      <circle cx="95" cy="45" r="2" className="fill-primary/30" />
      <line x1="87" y1="45" x2="93" y2="45" className="stroke-primary/20" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="97" y1="45" x2="105" y2="45" className="stroke-primary/20" strokeWidth="1" strokeDasharray="2,2" />
      
      {/* Labels */}
      <text x="61" y="78" textAnchor="middle" className="fill-muted-foreground/30" style={{ fontSize: '7px', fontFamily: 'monospace' }}>Win</text>
      <text x="100" y="78" textAnchor="middle" className="fill-muted-foreground/30" style={{ fontSize: '7px', fontFamily: 'monospace' }}>macOS</text>
      <text x="138" y="78" textAnchor="middle" className="fill-muted-foreground/30" style={{ fontSize: '7px', fontFamily: 'monospace' }}>Linux</text>
    </svg>
  </div>
);

export const OpenSourceIllustration = () => (
  <div className="relative w-full h-32 rounded-lg bg-secondary/30 border border-border/30 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
    <svg viewBox="0 0 200 100" className="w-full h-full" fill="none">
      {/* Git branch visualization */}
      <circle cx="60" cy="30" r="5" className="stroke-primary/60 fill-primary/15" strokeWidth="1.5" />
      <circle cx="100" cy="30" r="5" className="stroke-muted-foreground/40 fill-secondary/60" strokeWidth="1.5" />
      <circle cx="140" cy="30" r="5" className="stroke-muted-foreground/40 fill-secondary/60" strokeWidth="1.5" />
      <line x1="65" y1="30" x2="95" y2="30" className="stroke-muted-foreground/25" strokeWidth="1.5" />
      <line x1="105" y1="30" x2="135" y2="30" className="stroke-muted-foreground/25" strokeWidth="1.5" />
      
      {/* Branch */}
      <circle cx="80" cy="55" r="5" className="stroke-green-400/50 fill-green-400/10" strokeWidth="1.5" />
      <circle cx="120" cy="55" r="5" className="stroke-green-400/50 fill-green-400/10" strokeWidth="1.5" />
      <line x1="85" y1="55" x2="115" y2="55" className="stroke-green-400/25" strokeWidth="1.5" />
      <path d="M65 30 Q70 55 80 55" className="stroke-green-400/25" strokeWidth="1.5" fill="none" />
      <path d="M120 55 Q130 55 135 30" className="stroke-green-400/25" strokeWidth="1.5" fill="none" />
      
      {/* Merge indicator */}
      <text x="100" y="78" textAnchor="middle" className="fill-muted-foreground/25" style={{ fontSize: '8px', fontFamily: 'monospace' }}>MIT License</text>
    </svg>
  </div>
);

export const LightweightIllustration = () => (
  <div className="relative w-full h-32 rounded-lg bg-secondary/30 border border-border/30 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
    <svg viewBox="0 0 200 100" className="w-full h-full" fill="none">
      {/* Performance meter */}
      <path d="M60 70 A40 40 0 0 1 140 70" className="stroke-muted-foreground/15" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M60 70 A40 40 0 0 1 132 42" className="stroke-primary/60" strokeWidth="6" strokeLinecap="round" fill="none" />
      
      {/* Needle */}
      <line x1="100" y1="70" x2="125" y2="45" className="stroke-primary/80" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="70" r="4" className="fill-primary/40 stroke-primary/60" strokeWidth="1.5" />
      
      {/* Labels */}
      <text x="55" y="82" textAnchor="middle" className="fill-muted-foreground/25" style={{ fontSize: '7px' }}>0</text>
      <text x="100" y="28" textAnchor="middle" className="fill-muted-foreground/20" style={{ fontSize: '7px' }}>ms</text>
      <text x="145" y="82" textAnchor="middle" className="fill-muted-foreground/25" style={{ fontSize: '7px' }}>100</text>
      
      {/* Speed indicator */}
      <text x="100" y="92" textAnchor="middle" className="fill-primary/40" style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 600 }}>~12ms startup</text>
    </svg>
  </div>
);
