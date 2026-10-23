import { config } from "@/config";
import { useSeo } from "@/lib/seo";

export default function Imprint() {
  useSeo("Imprint – KiStack", "Legal notice for kistack.io.");
  return (
    <div className="max-w-[70ch] py-12">
      <h1 className="mb-4 text-4xl font-bold tracking-tight">Imprint</h1>
      <p className="mb-6 text-lg text-muted">Legal notice according to § 5 DDG (Germany).</p>
      <p className="mb-4">TODO full name<br />TODO street and number<br />TODO postcode and city<br />Germany</p>
      <p className="mb-4">Email: {config.contactEmail ? <a href={`mailto:${config.contactEmail}`} className="text-copper hover:underline">{config.contactEmail}</a> : "TODO"}<br />VAT ID: TODO (or "not subject to VAT under § 19 UStG")</p>
      <p className="mb-4">Responsible for content under § 18 Abs. 2 MStV: TODO name, address as above.</p>
      <p className="mb-4">EU dispute resolution: <a href="https://ec.europa.eu/consumers/odr/" className="text-copper hover:underline">ec.europa.eu/consumers/odr</a>. We are not obliged and not willing to take part in dispute resolution before a consumer arbitration board.</p>
      <p>KiCad is a trademark of the KiCad project. KiStack.io is not affiliated with the KiCad project, American-Embedded, Milind220, aklofas, or any fab named on this site.</p>
    </div>
  );
}
