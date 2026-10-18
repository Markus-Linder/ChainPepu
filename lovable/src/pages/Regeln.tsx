export default function Regeln() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Regeln von ChainPepu</h1>
      <p className="muted">ChainPepu ist ein Ort, an dem jeder willkommen ist. Damit das so bleibt, gelten für alle Ketten und Glieder diese Regeln.</p>
      <section className="card space-y-3 p-5 text-sm">
        <h2 className="font-semibold">Nicht erlaubt</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Gewalt, Gewaltaufrufe oder Gewaltverherrlichung</li>
          <li>Hass oder Herabwürdigung wegen Herkunft, Religion, Geschlecht, Sexualität, Behinderung oder Alter</li>
          <li>Belästigung, Mobbing, Drohungen oder Veröffentlichen privater Daten</li>
          <li>Sexuelle Inhalte mit Minderjährigen, jede Form von Ausbeutung</li>
          <li>Verherrlichung von Selbstverletzung oder Essstörungen</li>
          <li>Terrorismus, Extremismus, verbotene Symbole</li>
          <li>Illegale Angebote wie Drogen, Waffen, gefälschte Dokumente</li>
          <li>Betrug, Spam, Abzocke, irreführende Gewinnversprechen</li>
          <li>Inhalte, an denen du keine Rechte hast</li>
        </ul>
      </section>
      <section className="card space-y-3 p-5 text-sm">
        <h2 className="font-semibold">So wird geprüft</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ein Wortfilter blockiert bekannte Begriffe schon beim Absenden.</li>
          <li>Eine automatische KI-Prüfung schaut sich jedes neue Glied an und sperrt eindeutige Verstöße.</li>
          <li>Jeder kann ein Glied melden. Ab mehreren Meldungen wird es bis zur Prüfung verborgen.</li>
          <li>Ein Moderationsteam entscheidet endgültig. Autoren werden per Mitteilung informiert.</li>
          <li>Wiederholte Verstöße führen zur Sperrung des Planeten.</li>
        </ul>
      </section>
      <section className="card space-y-3 p-5 text-sm">
        <h2 className="font-semibold">Sterne, Spenden, Auszahlung</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Die Nutzung von ChainPepu ist kostenlos. Sterne sind freiwillig.</li>
          <li>Von jeder Spende erhält der Creator 80 %, die Plattform 20 %.</li>
          <li>Verdiente Sterne können ab dem Mindestbetrag ausgezahlt oder selbst genutzt werden.</li>
        </ul>
      </section>
    </div>
  );
}
