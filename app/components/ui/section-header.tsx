interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="col-span-12">
      <h4 className="text-sm font-semibold text-base-content/80">{title}</h4>
      <div className="mt-1 border-t border-base-300" />
    </div>
  );
}
