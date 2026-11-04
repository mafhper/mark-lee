interface SectionHeadProps {
  id: string;
  label: string;
  title: string;
  index?: string;
  total?: string;
  tone?: "paper" | "stage";
}

const SectionHead = ({ id, label, title, index, total = "04", tone = "paper" }: SectionHeadProps) => (
  <div>
    <p className={`label-mono ${tone === "stage" ? "text-stage-muted" : "text-ink-soft"}`}>
      {index && (
        <>
          <span className={tone === "stage" ? "text-stage-accent" : "text-terracotta"}>
            {index} / {total}
          </span>
          <span className="mx-2" aria-hidden="true">
            —
          </span>
        </>
      )}
      {label}
    </p>
    <h2
      id={`${id}-titulo`}
      className={`font-heading mt-4 text-[clamp(1.85rem,3vw,2.85rem)] ${
        tone === "stage" ? "text-stage-foreground" : "text-ink"
      }`}
    >
      {title}
    </h2>
  </div>
);

export default SectionHead;
