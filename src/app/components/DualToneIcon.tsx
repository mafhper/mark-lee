import { LucideIcon } from "lucide-react";

type DualToneIconProps = {
  icon: LucideIcon;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export default function DualToneIcon({
  icon: Icon,
  size = 14,
  className = "",
  strokeWidth = 1.9,
}: DualToneIconProps) {
  return (
    <span className={`ml-duotone-icon ${className}`.trim()} aria-hidden="true">
      <span className="ml-duotone-icon__back">
        <Icon size={size} strokeWidth={Math.max(1.2, strokeWidth - 0.5)} />
      </span>
      <span className="ml-duotone-icon__front">
        <Icon size={size} strokeWidth={strokeWidth} />
      </span>
    </span>
  );
}
