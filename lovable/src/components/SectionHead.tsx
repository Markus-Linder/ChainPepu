type Props = { eyebrow?: string; title: string; sub?: string; id?: string };

export default function SectionHead({ eyebrow, title, sub }: Props) {
  return (
    <div className="mb-8">
      {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
      <h2 className="h2">{title}</h2>
      {sub && <p className="sub !mb-0">{sub}</p>}
    </div>
  );
}
