import { LegalPage } from "@/components/layout/LegalPage";
import { OWNER, PRICES } from "@/data/legal";

export default function AGB() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen" path="/agb">
      <h2>§ 1 Geltungsbereich und Anbieter</h2>
      <p>Diese AGB gelten für alle Verträge zwischen {OWNER.name}, {OWNER.street}, {OWNER.zip} {OWNER.city} (nachfolgend "Profiangebot") und Nutzern der Plattform profiangebot.de. Teil A gilt für private Auftraggeber (Verbraucher), Teil B für Handwerksbetriebe (Unternehmer).</p>

      <h2>Teil A: Leistungen für Kunden</h2>
      <h3>§ 2 Leistungsbeschreibung</h3>
      <p>Profiangebot bietet (1) einen kostenlosen Angebots-Check mit Kurzauswertung, (2) einen kostenpflichtigen vollständigen Prüfbericht, (3) die kostenlose Erstellung eines Leistungsverzeichnisses aus Nutzerangaben, (4) den kostenlosen Vergleich mehrerer geprüfter Angebote und (5) die kostenlose Vermittlung von Kontakt zu maximal drei Handwerksbetrieben auf ausdrücklichen Wunsch des Nutzers.</p>
      <p>Alle Auswertungen werden automatisiert mit Hilfe künstlicher Intelligenz erstellt und beruhen auf Richtwerten und anonymisierten Marktdaten. Sie sind Orientierungshilfen und stellen keine Rechtsberatung, Steuerberatung, Bauberatung im Einzelfall oder ein Sachverständigengutachten dar. Profiangebot übernimmt keine Gewähr für Vollständigkeit und Richtigkeit der Auswertung, insbesondere nicht für die Angemessenheit konkreter Preise, die regional und projektbezogen abweichen können.</p>
      <h3>§ 3 Vertragsschluss und Preise</h3>
      <p>Der Vertrag über den vollständigen Prüfbericht kommt durch Klick auf "Freischalten" und erfolgreichen Abschluss der Zahlung zustande. Der Preis beträgt {PRICES.premiumReportEUR.toFixed(2).replace(".", ",")} € inkl. MwSt. pro Angebot. Die Zahlung erfolgt über Stripe. Der Bericht wird unmittelbar nach Zahlungseingang freigeschaltet.</p>
      <h3>§ 4 Widerrufsrecht</h3>
      <p>Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Einzelheiten ergeben sich aus der <a className="underline" href="/widerruf">Widerrufsbelehrung</a>. Bei digitalen Inhalten erlischt das Widerrufsrecht, wenn der Nutzer ausdrücklich zugestimmt hat, dass mit der Ausführung vor Ablauf der Widerrufsfrist begonnen wird, und seine Kenntnis vom Erlöschen bestätigt hat.</p>
      <h3>§ 5 Vermittlung an Betriebe</h3>
      <p>Die Weitergabe von Kontaktdaten an Betriebe erfolgt nur nach ausdrücklicher Einwilligung des Nutzers und an maximal drei Betriebe. Profiangebot ist nicht Partei eines zwischen Nutzer und Betrieb geschlossenen Werkvertrags und haftet nicht für dessen Erfüllung. Die Betriebe sind eigenverantwortlich; eine Verifizierung durch Profiangebot bezieht sich auf die Plausibilität der Registrierungsdaten.</p>
      <h3>§ 6 Pflichten des Nutzers</h3>
      <p>Der Nutzer lädt nur Dokumente hoch, zu deren Verarbeitung er berechtigt ist, und macht wahrheitsgemäße Angaben. Der Berichtslink ist vertraulich zu behandeln.</p>

      <h2>Teil B: Leistungen für Betriebe</h2>
      <h3>§ 7 Registrierung</h3>
      <p>Die Registrierung ist kostenlos und steht gewerblichen Handwerks- und Bauunternehmen offen. Der Betrieb macht vollständige und richtige Angaben, insbesondere zu Gewerken und Regionen, und hält diese aktuell.</p>
      <h3>§ 8 Anfragen und Preise</h3>
      <p>Der Betrieb kann Kundenanfragen gegen Entgelt freischalten. Der Preis beträgt {PRICES.leadEUR} € zzgl. MwSt. pro Anfrage, für Mitglieder {PRICES.leadMemberEUR} € zzgl. MwSt. Eine Anfrage wird an maximal drei Betriebe vergeben. Mit der Freischaltung erhält der Betrieb die Kontaktdaten des Kunden und verpflichtet sich, sich zeitnah und ausschließlich zum angefragten Vorhaben zu melden. Ein Anspruch auf Auftragserteilung besteht nicht.</p>
      <p>Die Mitgliedschaft kostet {PRICES.membershipEUR} € zzgl. MwSt. pro Monat, verlängert sich automatisch um je einen Monat und ist jederzeit zum Ende des laufenden Abrechnungsmonats kündbar (über das Kundenportal von Stripe oder per E-Mail).</p>
      <h3>§ 9 Erstattung bei fehlerhaften Anfragen</h3>
      <p>Ist eine Anfrage nachweislich fehlerhaft (falsche Kontaktdaten, Kunde bestreitet die Anfrage, Vorhaben außerhalb der angegebenen Gewerke), erstattet Profiangebot das Entgelt als Gutschrift, wenn der Betrieb dies innerhalb von 7 Tagen nach Freischaltung unter Angabe des Grundes meldet.</p>
      <h3>§ 10 Datenschutz und Nutzung der Kontaktdaten</h3>
      <p>Der Betrieb verarbeitet die erhaltenen Kundendaten als eigener Verantwortlicher ausschließlich zur Bearbeitung der konkreten Anfrage. Eine Weitergabe an Dritte oder werbliche Nutzung außerhalb der Anfrage ist untersagt.</p>

      <h2>Teil C: Allgemeine Bestimmungen</h2>
      <h3>§ 11 Haftung</h3>
      <p>Profiangebot haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie für Schäden aus der Verletzung von Leben, Körper und Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung ausgeschlossen. Insbesondere haftet Profiangebot nicht für Entscheidungen, die der Nutzer auf Grundlage einer automatisierten Auswertung trifft.</p>
      <h3>§ 12 Verfügbarkeit</h3>
      <p>Profiangebot bemüht sich um eine hohe Verfügbarkeit, schuldet jedoch keine ununterbrochene Erreichbarkeit. Wartungsarbeiten und Störungen bei Drittanbietern (KI-Dienste, Zahlungsdienste) können die Nutzung zeitweise einschränken.</p>
      <h3>§ 13 Schlussbestimmungen</h3>
      <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern gilt dies nur, soweit zwingende Verbraucherschutzvorschriften des Aufenthaltsstaats nicht entgegenstehen. Gerichtsstand gegenüber Unternehmern ist der Sitz von Profiangebot. Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.</p>
    </LegalPage>
  );
}
