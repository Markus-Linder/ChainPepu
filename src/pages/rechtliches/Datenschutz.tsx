import { LegalPage } from "@/components/layout/LegalPage";
import { OWNER } from "@/data/legal";

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung" path="/datenschutz">
      <h2>1. Verantwortlicher</h2>
      <p>{OWNER.name}, {OWNER.street}, {OWNER.zip} {OWNER.city}, E-Mail: <a className="underline" href={`mailto:${OWNER.email}`}>{OWNER.email}</a>, Telefon: {OWNER.phoneDisplay}.</p>

      <h2>2. Überblick der Verarbeitungen</h2>
      <p>Wir verarbeiten personenbezogene Daten, um die Website bereitzustellen, Handwerker-Angebote in Ihrem Auftrag auszuwerten, Leistungsverzeichnisse und Vergleiche zu erstellen, auf Ihren Wunsch Kontakt zu Handwerksbetrieben herzustellen, Zahlungen abzuwickeln und Betriebskonten zu verwalten.</p>

      <h2>3. Hosting und Infrastruktur</h2>
      <p>Die Website wird über einen Hosting-Dienst ausgeliefert. Datenbank, Dateispeicher, Authentifizierung und serverseitige Funktionen betreiben wir bei Supabase Inc. (Rechenzentrumsregion Europäische Union, Frankfurt am Main). Dabei werden Server-Logdaten (IP-Adresse, Zeitpunkt, aufgerufene Ressource, Browser) verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb). Mit Supabase besteht ein Auftragsverarbeitungsvertrag; für etwaige Übermittlungen in Drittländer gelten Standardvertragsklauseln.</p>

      <h2>4. Angebots-Check, Leistungsverzeichnis und Vergleich</h2>
      <p>Wenn Sie ein Angebot hochladen oder ein Vorhaben beschreiben, verarbeiten wir die hochgeladene Datei bzw. Ihre Eingaben (einschließlich darin enthaltener Daten wie Name und Anschrift des Betriebs und ggf. Ihre eigenen Daten), das gewählte Gewerk, optional PLZ, Projektbezeichnung und E-Mail-Adresse. Die Auswertung erfolgt automatisiert durch ein KI-Sprachmodell des Anbieters Anthropic PBC (USA). Die Übermittlung erfolgt auf Grundlage von Standardvertragsklauseln und des EU-US Data Privacy Framework; Anthropic verwendet API-Daten nicht zum Training seiner Modelle. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), hinsichtlich der Daten Dritter im Dokument Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Prüfung des Angebots in Ihrem Auftrag).</p>
      <p>Einzelpreise aus Angeboten übernehmen wir in anonymisierter Form (Gewerk, Positionsbezeichnung, Einheit, Preis, PLZ-Region) in unsere Preisdatenbank, ohne Firmennamen, Adressen oder Ihre Daten. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
      <p>Hochgeladene Dateien und Berichte werden 12 Monate nach Erstellung gelöscht, sofern Sie nicht früher die Löschung verlangen. Der Zugriff auf Ihren Bericht erfolgt über einen persönlichen Link mit Zugriffsschlüssel; bitte geben Sie diesen Link nicht weiter.</p>

      <h2>5. Vermittlung an Handwerksbetriebe</h2>
      <p>Nur wenn Sie ausdrücklich Vergleichsangebote anfordern, speichern wir Name, E-Mail, Telefon, PLZ, Ort, Zeitrahmen und eine Zusammenfassung Ihres Vorhabens und geben diese an maximal drei registrierte Handwerksbetriebe weiter, die die Anfrage annehmen. Diese Betriebe sind eigenständige Verantwortliche. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Sie können die Einwilligung jederzeit mit Wirkung für die Zukunft per E-Mail an {OWNER.email} widerrufen; dann wird Ihre Anfrage deaktiviert. Anfragen laufen nach 30 Tagen automatisch aus.</p>

      <h2>6. Konten für Betriebe</h2>
      <p>Bei der Registrierung als Betrieb verarbeiten wir E-Mail, Passwort (gehasht), Firmendaten, Ansprechpartner, Telefon, Anschrift, Gewerke, Regionen, Website und Handwerksrollen-Nummer. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Die Authentifizierung erfolgt über Supabase Auth. Wir senden Ihnen Benachrichtigungen über neue passende Anfragen per E-Mail (Art. 6 Abs. 1 lit. b DSGVO); diese können Sie in Ihrem Profil durch Entfernen der Gewerke oder Löschung des Kontos beenden.</p>

      <h2>7. Zahlungsabwicklung</h2>
      <p>Zahlungen wickeln wir über Stripe Payments Europe Ltd. (Irland) ab. Stripe verarbeitet Zahlungsdaten, E-Mail und Rechnungsanschrift als eigener Verantwortlicher und zum Teil als Auftragsverarbeiter. Wir erhalten keine vollständigen Kartendaten. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Datenschutzhinweise von Stripe: <a className="underline" href="https://stripe.com/de/privacy" target="_blank" rel="noreferrer">stripe.com/de/privacy</a>.</p>

      <h2>8. E-Mail-Versand</h2>
      <p>Transaktionale E-Mails (Berichtslink, Zahlungsbestätigung, Anfragebenachrichtigung) versenden wir über den Dienst Resend (Resend Inc., USA) auf Grundlage von Standardvertragsklauseln. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>

      <h2>9. Kontaktformular</h2>
      <p>Ihre Angaben aus dem Kontaktformular speichern wir zur Bearbeitung der Anfrage (Art. 6 Abs. 1 lit. b und f DSGVO) und löschen sie, sobald die Anfrage abgeschlossen ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>

      <h2>10. Cookies und lokale Speicherung</h2>
      <p>Wir verwenden keine Tracking-Cookies und keine Werbenetzwerke. Technisch notwendig sind: ein Sitzungs-Token für eingeloggte Betriebe (Supabase Auth) sowie die lokale Speicherung Ihrer geprüften Angebote in Ihrem Browser (localStorage), damit Sie diese vergleichen können. Diese Daten verlassen Ihren Browser nicht. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG, Art. 6 Abs. 1 lit. f DSGVO. Beim Bezahlvorgang setzt Stripe eigene, für die Betrugsprävention notwendige Cookies.</p>

      <h2>11. Schriftarten</h2>
      <p>Wir binden die Schriftart Inter über Google Fonts ein. Dabei wird Ihre IP-Adresse an Google Ireland Ltd. übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Sie können dies durch einen Schriftarten-Blocker in Ihrem Browser verhindern; die Seite bleibt nutzbar.</p>

      <h2>12. Speicherdauer</h2>
      <ul>
        <li>Hochgeladene Angebote, Berichte, Leistungsverzeichnisse: 12 Monate</li>
        <li>Vermittlungsanfragen: 30 Tage aktiv, danach 12 Monate zur Nachweisführung</li>
        <li>Betriebskonten: bis zur Löschung des Kontos</li>
        <li>Zahlungs- und Rechnungsdaten: 10 Jahre (§ 147 AO, § 257 HGB)</li>
        <li>Server-Logs: 14 Tage</li>
      </ul>

      <h2>13. Ihre Rechte</h2>
      <p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Einwilligungen können Sie jederzeit widerrufen. Wenden Sie sich dazu an {OWNER.email}. Sie haben zudem das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren, zum Beispiel beim Landesbeauftragten für den Datenschutz und die Informationsfreiheit Baden-Württemberg.</p>

      <h2>14. Automatisierte Entscheidungsfindung</h2>
      <p>Die KI-gestützte Auswertung von Angeboten ist eine Orientierungshilfe. Sie hat keine rechtliche Wirkung Ihnen gegenüber und trifft keine Entscheidung über Sie im Sinne von Art. 22 DSGVO. Die Entscheidung über die Beauftragung eines Betriebs treffen ausschließlich Sie.</p>

      <h2>15. Sicherheit</h2>
      <p>Alle Übertragungen erfolgen TLS-verschlüsselt. Dateien liegen in einem nicht öffentlichen Speicher, der Zugriff erfolgt ausschließlich über serverseitige Funktionen und persönliche Zugriffsschlüssel.</p>
    </LegalPage>
  );
}
