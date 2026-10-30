import { LegalPage } from "@/components/layout/LegalPage";
import { OWNER } from "@/data/legal";

export default function Impressum() {
  return (
    <LegalPage title="Impressum" path="/impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>{OWNER.name}<br />{OWNER.street}<br />{OWNER.zip} {OWNER.city}<br />{OWNER.country}</p>
      <h2>Kontakt</h2>
      <p>Telefon (Supportanfragen): <a className="underline" href={`tel:${OWNER.phone.replace(/\s/g, "")}`}>{OWNER.phoneDisplay}</a><br />E-Mail: <a className="underline" href={`mailto:${OWNER.email}`}>{OWNER.email}</a></p>
      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: {OWNER.vatId}<br />Zuständiges Finanzamt: {OWNER.taxOffice}</p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>{OWNER.name}, {OWNER.street}, {OWNER.zip} {OWNER.city}</p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a className="underline" href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">https://ec.europa.eu/consumers/odr/</a>. Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      <h2>Haftung für Inhalte</h2>
      <p>Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Die von Profiangebot erstellten Prüfberichte, Leistungsverzeichnisse und Vergleiche sind automatisierte, KI-gestützte Orientierungshilfen. Sie stellen keine Rechtsberatung, keine Steuerberatung und kein Sachverständigengutachten dar. Angaben zu Preisen sind Richtwerte ohne Gewähr.</p>
      <h2>Haftung für Links</h2>
      <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.</p>
      <h2>Urheberrecht</h2>
      <p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet.</p>
    </LegalPage>
  );
}
