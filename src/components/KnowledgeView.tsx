import { KNOWLEDGE } from "@/data/knowledge";

export function KnowledgeView() {
  return (
    <section className="view">
      <header className="hero">
        <p className="eyebrow">Was wirklich zählt</p>
        <h1>Bauchfett verstehen</h1>
        <p className="muted">Training ist ein Teil. Essen, Schlaf und Alltag machen den Rest.</p>
      </header>
      {KNOWLEDGE.map((k, i) => (
        <details className="faq" key={i} open={i === 0}>
          <summary>{k.title}</summary>
          <p className="small">{k.text}</p>
        </details>
      ))}
      <div className="card">
        <p className="eyebrow">Hinweis</p>
        <p className="small">Dieses Programm ersetzt keine ärztliche Beratung. Bei Rückenbeschwerden, Schwangerschaft, nach einer Geburt (Rektusdiastase) oder bei Herz-Kreislauf-Erkrankungen bitte vorher mit einer Ärztin oder einem Arzt sprechen.</p>
      </div>
    </section>
  );
}
