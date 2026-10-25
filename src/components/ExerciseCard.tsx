import { posterUrl, type Exercise } from "@/data/exercises";

export function ExerciseCard({ ex, onOpen }: { ex: Exercise; onOpen: (id: Exercise["id"]) => void }) {
  return (
    <button className="ex-card" onClick={() => onOpen(ex.id)}>
      <img className="thumb" src={posterUrl(ex.id)} alt="" loading="lazy" />
      <span className="cap">
        {ex.name}
        <small>{ex.muscles}</small>
      </span>
    </button>
  );
}
