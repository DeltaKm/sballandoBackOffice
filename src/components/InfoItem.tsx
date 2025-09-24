interface InfoItemProps {
  icon: string;
  label: string;
  value: string | number | null | undefined;
}

export function InfoItem({ icon, label, value }: InfoItemProps): JSX.Element {
  return (
    <div className="flex items-start">
      <span className="text-xl mr-3">{icon}</span>
      <div>
        <p className="text-white/60 text-sm">{label}</p>
        <p className="text-white">{value ?? '-'}</p>
      </div>
    </div>
  );
}
