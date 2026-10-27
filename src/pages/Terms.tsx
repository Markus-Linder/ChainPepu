import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

/**
 * Nutzungsbedingungen – ENTWURF.
 * Vor dem öffentlichen Verkauf von einer Anwältin / einem Anwalt prüfen lassen.
 * Impressum und Datenschutzerklärung (DSGVO) müssen zusätzlich ergänzt werden.
 */
export default function Terms() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-mono font-semibold">redteamly</span>
          </Link>
        </div>
      </header>
      <main className="container max-w-3xl py-12">
        <h1 className="mb-2 text-3xl font-bold">Nutzungsbedingungen</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Entwurf, Stand Oktober 2026. Diese Fassung ist ein Platzhalter und ersetzt keine
          anwaltliche Prüfung.
        </p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="mb-1 font-semibold">1. Leistung</h2>
            <p>
              redteamly stellt eine Software bereit, mit der Nutzer automatisierte
              Sicherheitstests gegen KI-Assistenten durchführen und daraus Prüfberichte
              erstellen können.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold">2. Nur autorisierte Ziele</h2>
            <p>
              Der Nutzer darf ausschließlich Systeme testen, die ihm gehören oder für die er
              eine ausdrückliche, schriftliche Erlaubnis des Betreibers besitzt. Der Nutzer
              bestätigt dies vor jedem Test. Tests gegen fremde Systeme ohne Erlaubnis sind
              untersagt, können strafbar sein und führen zur sofortigen Sperrung des Kontos.
              Der Nutzer stellt redteamly von allen Ansprüchen Dritter frei, die aus einem
              Verstoß gegen diese Pflicht entstehen.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold">3. Keine Zertifizierung, keine Garantie</h2>
            <p>
              Prüfberichte von redteamly sind automatisierte Momentaufnahmen. Sie stellen
              keine Zertifizierung, keine Konformitätsbewertung im Sinne des EU AI Act und keine
              Zusicherung der Sicherheit eines Systems dar. redteamly ist keine akkreditierte
              Zertifizierungsstelle und keine notifizierte Stelle. Ein bestandener Test schließt
              das Vorhandensein anderer Schwachstellen nicht aus. Die Verantwortung für den
              sicheren Betrieb des getesteten Systems verbleibt beim Nutzer.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold">4. Haftung</h2>
            <p>
              redteamly haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie nach
              dem Produkthaftungsgesetz. Bei leichter Fahrlässigkeit haftet redteamly nur bei
              Verletzung wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren,
              vertragstypischen Schaden. Eine Haftung für Schäden am getesteten System, die
              durch die Testanfragen selbst entstehen, ist ausgeschlossen, soweit gesetzlich
              zulässig; der Nutzer ist dafür verantwortlich, Tests nicht gegen Produktivsysteme
              ohne Sicherung durchzuführen.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold">5. Daten</h2>
            <p>
              Testanfragen und Antworten des getesteten Systems werden gespeichert, um den
              Prüfbericht zu erstellen. Der Nutzer darf keine personenbezogenen Daten Dritter
              in Zielkonfigurationen oder System-Prompts hinterlegen, soweit dies nicht
              erforderlich ist. Einzelheiten regelt die Datenschutzerklärung.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold">6. Laufzeit und Kündigung</h2>
            <p>
              Abonnements laufen monatlich und sind jederzeit zum Ende des Abrechnungszeitraums
              kündbar. redteamly kann Konten bei Verstößen gegen Ziffer 2 fristlos sperren.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold">7. Anwendbares Recht</h2>
            <p>Es gilt deutsches Recht. Gerichtsstand ist, soweit zulässig, der Sitz von redteamly.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
