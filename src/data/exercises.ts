export type ExerciseId =
  | "plank" | "mountain" | "deadbug" | "bicycle" | "bridge" | "squat"
  | "jacks" | "twist" | "sideplank" | "birddog" | "legraise" | "lunge";

export interface Exercise {
  id: ExerciseId;
  name: string;
  type: "hold" | "reps";
  muscles: string;
  summary: string;
  steps: string[];
  mistakes: string[];
  easier: string;
  harder: string;
  sides?: boolean;
}

export const videoUrl = (id: ExerciseId) => `/media/videos/${id}.mp4`;
export const posterUrl = (id: ExerciseId) => `/media/posters/${id}.jpg`;
export const audioUrl = (id: ExerciseId, kind: "anleitung" | "kurz") => `/media/audio/${id}_${kind}.mp3`;

export const EXERCISES: Record<ExerciseId, Exercise> = {
  plank: {
    id: "plank",
    name: "Unterarmstütz (Plank)",
    type: "hold",
    muscles: "Gerade & tiefe Bauchmuskeln, Rücken, Schultern",
    summary: "Der Klassiker für einen stabilen Rumpf. Du hältst den Körper wie ein Brett.",
    steps: [
      "Ellbogen direkt unter die Schultern, Unterarme parallel auf die Matte.",
      "Füße hüftbreit, Zehen aufstellen, Beine strecken.",
      "Bauchnabel leicht nach innen ziehen, Po anspannen, Becken leicht nach vorn kippen.",
      "Kopf in Verlängerung der Wirbelsäule, Blick auf die Matte.",
      "Ruhig weiteratmen und die Linie von Kopf bis Fersen halten.",
    ],
    mistakes: ["Hüfte hängt durch (Hohlkreuz)", "Po zu hoch in der Luft", "Luft anhalten", "Schultern hochziehen"],
    easier: "Knie auf der Matte absetzen (Knie-Plank).",
    harder: "Abwechselnd ein Bein ein paar Zentimeter anheben.",
  },
  mountain: {
    id: "mountain",
    name: "Bergsteiger (Mountain Climbers)",
    type: "reps",
    muscles: "Bauch, Hüftbeuger, Schultern, Herz-Kreislauf",
    summary: "Bringt den Puls hoch und fordert den Bauch gleichzeitig als Stabilisator.",
    steps: [
      "Hohe Stützposition: Hände unter den Schultern, Arme gestreckt.",
      "Körper bildet eine gerade Linie, Bauch fest.",
      "Ein Knie zügig Richtung Brust ziehen, Fuß wieder zurück.",
      "Beine im Wechsel, Hüfte bleibt dabei ruhig und tief.",
      "Tempo so wählen, dass die Form sauber bleibt.",
    ],
    mistakes: ["Po wandert nach oben", "Schultern vor den Händen", "Oberkörper schaukelt"],
    easier: "Langsamer laufen statt springen, oder Hände auf eine Stufe stellen.",
    harder: "Tempo steigern oder Knie diagonal zum gegenüberliegenden Ellbogen.",
  },
  deadbug: {
    id: "deadbug",
    name: "Dead Bug",
    type: "reps",
    muscles: "Tiefe Bauchmuskeln, Rumpfstabilität",
    summary: "Sanft für den Rücken, aber sehr effektiv für die tiefe Bauchmuskulatur.",
    steps: [
      "Rückenlage, Arme senkrecht zur Decke, Knie im 90-Grad-Winkel über der Hüfte.",
      "Unteren Rücken fest auf die Matte drücken.",
      "Rechten Arm nach hinten über den Kopf senken und gleichzeitig das linke Bein Richtung Boden strecken.",
      "Kurz vor dem Boden stoppen, langsam zurück und Seite wechseln.",
      "Beim Ausstrecken ausatmen.",
    ],
    mistakes: ["Rücken hebt von der Matte ab", "Zu schnell und schwungvoll", "Bein berührt den Boden"],
    easier: "Nur die Beine bewegen, Arme bleiben oben.",
    harder: "Bein nur wenige Zentimeter über dem Boden halten und 2 Sekunden stoppen.",
  },
  bicycle: {
    id: "bicycle",
    name: "Fahrrad-Crunch",
    type: "reps",
    muscles: "Schräge & gerade Bauchmuskeln",
    summary: "Eine der wirksamsten Übungen für die seitlichen Bauchmuskeln.",
    steps: [
      "Rückenlage, Hände locker an den Hinterkopf, Beine angehoben.",
      "Schulterblätter leicht von der Matte lösen.",
      "Rechten Ellbogen zum linken Knie drehen, rechtes Bein dabei strecken.",
      "Seite wechseln wie beim Radfahren, Bewegung kommt aus dem Rumpf.",
      "Langsam und kontrolliert, nicht am Kopf ziehen.",
    ],
    mistakes: ["Am Nacken ziehen", "Nur die Ellbogen bewegen statt den Oberkörper drehen", "Hohlkreuz"],
    easier: "Füße zwischen den Wiederholungen kurz auf der Matte absetzen.",
    harder: "Gestrecktes Bein tiefer halten und jede Position 1 Sekunde halten.",
  },
  bridge: {
    id: "bridge",
    name: "Beckenheben (Glute Bridge)",
    type: "reps",
    muscles: "Po, hintere Oberschenkel, unterer Rücken",
    summary: "Stärkt die Rückseite und entlastet so den unteren Rücken beim Bauchtraining.",
    steps: [
      "Rückenlage, Knie gebeugt, Füße hüftbreit flach auf der Matte.",
      "Arme neben dem Körper ablegen.",
      "Fersen in den Boden drücken und die Hüfte heben, bis Schultern, Hüfte und Knie eine Linie bilden.",
      "Oben den Po für eine Sekunde fest anspannen.",
      "Langsam absenken, ohne ganz abzulegen.",
    ],
    mistakes: ["Hüfte zu hoch drücken (Hohlkreuz)", "Knie fallen nach außen", "Schwung nutzen"],
    easier: "Bewegung kleiner machen.",
    harder: "Ein Bein strecken und mit nur einem Bein heben.",
  },
  squat: {
    id: "squat",
    name: "Kniebeuge",
    type: "reps",
    muscles: "Oberschenkel, Po, Rumpf",
    summary: "Große Muskeln verbrauchen viel Energie. Deshalb gehören Kniebeugen in jedes Bauch-weg-Programm.",
    steps: [
      "Füße schulterbreit, Zehen leicht nach außen.",
      "Arme nach vorn strecken, Brust aufrecht.",
      "Po nach hinten und unten schieben, als würdest du dich setzen.",
      "Knie zeigen in Richtung der Zehen, Fersen bleiben am Boden.",
      "Über die Fersen wieder hochdrücken.",
    ],
    mistakes: ["Knie kippen nach innen", "Fersen heben ab", "Oberkörper fällt nach vorn"],
    easier: "Nur bis auf Stuhlhöhe gehen.",
    harder: "Am tiefsten Punkt 2 Sekunden halten oder mit kleinem Sprung hochkommen.",
  },
  jacks: {
    id: "jacks",
    name: "Hampelmann",
    type: "reps",
    muscles: "Ganzkörper, Herz-Kreislauf",
    summary: "Einfach, aber ein guter Kalorienverbrenner und perfekt zum Aufwärmen.",
    steps: [
      "Aufrecht stehen, Füße zusammen, Arme seitlich.",
      "Beine beim Sprung grätschen und gleichzeitig Arme über den Kopf führen.",
      "Zurückspringen in die Ausgangsposition.",
      "Weich auf dem Vorfuß landen.",
      "Gleichmäßiges Tempo halten.",
    ],
    mistakes: ["Hart auf den Fersen landen", "Oberkörper nach vorn beugen"],
    easier: "Ohne Sprung: abwechselnd ein Bein zur Seite tippen.",
    harder: "Tempo erhöhen.",
  },
  twist: {
    id: "twist",
    name: "Russian Twist",
    type: "reps",
    muscles: "Schräge Bauchmuskeln",
    summary: "Rotation fordert die seitliche Bauchmuskulatur, die die Taille formt.",
    steps: [
      "Sitzen, Knie gebeugt, Oberkörper leicht nach hinten lehnen, Rücken gerade.",
      "Hände vor der Brust zusammenlegen.",
      "Oberkörper nach rechts drehen, Hände Richtung Matte führen.",
      "Zur anderen Seite drehen, die Bewegung kommt aus dem Rumpf.",
      "Brust bleibt offen, Rücken bleibt lang.",
    ],
    mistakes: ["Runder Rücken", "Nur die Arme schwingen", "Zu weit nach hinten lehnen"],
    easier: "Füße auf dem Boden lassen.",
    harder: "Füße anheben oder eine Wasserflasche in den Händen halten.",
  },
  sideplank: {
    id: "sideplank",
    name: "Seitstütz",
    type: "hold",
    muscles: "Seitliche Bauchmuskeln, Hüfte",
    summary: "Stabilisiert die Taille und den unteren Rücken.",
    steps: [
      "Seitlage, Ellbogen direkt unter der Schulter.",
      "Füße übereinander oder hintereinander.",
      "Hüfte anheben, bis der Körper eine gerade Linie bildet.",
      "Obere Hand auf die Hüfte oder zur Decke strecken.",
      "Halten und ruhig atmen, dann Seite wechseln.",
    ],
    mistakes: ["Hüfte sinkt ab", "Oberkörper dreht nach vorn", "Schulter sackt ein"],
    easier: "Unteres Knie auf der Matte absetzen.",
    harder: "Oberes Bein anheben.",
    sides: true,
  },
  birddog: {
    id: "birddog",
    name: "Bird Dog",
    type: "reps",
    muscles: "Tiefe Rumpfmuskulatur, Rücken, Po",
    summary: "Ruhige Übung für Balance und Rumpfstabilität, ideal auch bei Rückenproblemen.",
    steps: [
      "Vierfüßlerstand: Hände unter den Schultern, Knie unter der Hüfte.",
      "Rücken gerade, Blick auf die Matte.",
      "Rechten Arm nach vorn und linkes Bein nach hinten strecken.",
      "Kurz halten, Hüfte bleibt waagerecht.",
      "Zurück und Seite wechseln.",
    ],
    mistakes: ["Hüfte dreht auf", "Hohlkreuz beim Beinstrecken", "Kopf in den Nacken legen"],
    easier: "Nur Arm oder nur Bein strecken.",
    harder: "Ellbogen und Knie unter dem Körper zusammenführen, dann wieder strecken.",
  },
  legraise: {
    id: "legraise",
    name: "Beinheben",
    type: "reps",
    muscles: "Untere Bauchmuskeln, Hüftbeuger",
    summary: "Zielt auf den unteren Bauch, der oft am hartnäckigsten ist.",
    steps: [
      "Rückenlage, Hände flach unter dem Po, Beine gestreckt.",
      "Unteren Rücken auf die Matte drücken.",
      "Beine gestreckt bis senkrecht anheben.",
      "Langsam absenken, kurz über dem Boden stoppen.",
      "Beim Senken ausatmen und Bauch fest halten.",
    ],
    mistakes: ["Hohlkreuz beim Absenken", "Schwung holen", "Beine ganz ablegen"],
    easier: "Knie leicht beugen oder nur bis 45 Grad absenken.",
    harder: "Am tiefsten Punkt 3 Sekunden halten.",
  },
  lunge: {
    id: "lunge",
    name: "Ausfallschritt rückwärts",
    type: "reps",
    muscles: "Oberschenkel, Po, Gleichgewicht",
    summary: "Fordert die großen Beinmuskeln und damit viel Energie, schont dabei die Knie.",
    steps: [
      "Aufrecht stehen, Hände an der Hüfte.",
      "Einen großen Schritt nach hinten machen.",
      "Beide Knie auf etwa 90 Grad beugen, vorderes Knie über dem Fußgelenk.",
      "Oberkörper aufrecht, Bauch fest.",
      "Über die vordere Ferse hochdrücken und Bein wechseln.",
    ],
    mistakes: ["Vorderes Knie schiebt weit über die Zehen", "Oberkörper kippt nach vorn", "Zu kurzer Schritt"],
    easier: "Mit einer Hand an der Wand oder Stuhllehne festhalten.",
    harder: "Am tiefsten Punkt kurz halten.",
  },
};

export const EXERCISE_LIST = Object.values(EXERCISES);
