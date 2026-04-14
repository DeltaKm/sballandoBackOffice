import type { JSX } from "react";
import type { IconType } from "react-icons";

interface InfoItemProps {
  icon: IconType;
  label: string;
  value: string | number | null | undefined;
}

export function InfoItem({ icon, label, value }: InfoItemProps): JSX.Element {
  const Icon = icon;

  return (
    <div className="flex items-start">
      <Icon className="text-xl mr-3 mt-0.5 shrink-0" />
      <div>
        <p className="text-white/60 text-sm">{label}</p>
        <p className="text-white">{value ?? '-'}</p>
      </div>
    </div>
  );
}
