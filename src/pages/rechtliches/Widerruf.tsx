import { LegalPage } from "@/components/layout/LegalPage";
import { OWNER } from "@/data/legal";

export default function Widerruf() {
  return (
    <LegalPage title="Widerrufsbelehrung" path="/widerruf">
      <h2>Widerrufsrecht</h2>
      <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.</p>
      <p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({OWNER.name}, {OWNER.street}, {OWNER.zip} {OWNER.city}, E-Mail: {OWNER.email}, Telefon: {OWNER.phoneDisplay}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>
      <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>
      <h2>Folgen des Widerrufs</h2>
      <p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</p>
      <h2>Vorzeitiges Erlöschen des Widerrufsrechts bei digitalen Inhalten</h2>
      <p>Der vollständige Prüfbericht ist ein digitaler Inhalt, der nicht auf einem körperlichen Datenträger geliefert wird. Das Widerrufsrecht erlischt, wenn wir mit der Ausführung des Vertrags begonnen haben, nachdem Sie ausdrücklich zugestimmt haben, dass wir mit der Ausführung vor Ablauf der Widerrufsfrist beginnen, und Sie Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit Beginn der Ausführung Ihr Widerrufsrecht verlieren. Diese Zustimmung erteilen Sie im Bezahlvorgang; der Bericht wird unmittelbar nach Zahlung freigeschaltet.</p>
      <h2>Muster-Widerrufsformular</h2>
      <p>(Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
      <div className="rounded-md border p-4 text-sm">
        <p>An {OWNER.name}, {OWNER.street}, {OWNER.zip} {OWNER.city}, {OWNER.email}</p>
        <p>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung (*)</p>
        <p>Bestellt am (*)/erhalten am (*)</p>
        <p>Name des/der Verbraucher(s)</p>
        <p>Anschrift des/der Verbraucher(s)</p>
        <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</p>
        <p>Datum</p>
        <p>(*) Unzutreffendes streichen.</p>
      </div>
    </LegalPage>
  );
}
