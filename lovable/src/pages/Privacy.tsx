import { Link } from "react-router-dom";
import { config } from "@/config";
import { useSeo } from "@/lib/seo";

export default function Privacy() {
  useSeo("Privacy – KiStack", "Privacy policy for kistack.io.");
  return (
    <div className="max-w-[70ch] py-12">
      <h1 className="mb-4 text-4xl font-bold tracking-tight">Privacy</h1>
      <p className="mb-6 text-lg text-muted">Short version: no tracking cookies, no ads. We process your email if you subscribe or buy, and your project files if you order a review.</p>
      <h2 className="mb-3 mt-8 text-2xl font-bold tracking-tight">Controller</h2>
      <p className="mb-4">TODO: name, address, email of the site operator (same as the imprint). <strong>Replace this page with a policy generated for your business before going live.</strong> This draft only lists what the site technically does.</p>
      <h2 className="mb-3 mt-8 text-2xl font-bold tracking-tight">What this site does</h2>
      <ul className="mb-4 list-disc space-y-2 pl-5">
        <li><strong>Hosting.</strong> Static pages served by the hosting provider. Server logs with IP address are kept by the host for security for a limited time.</li>
        <li><strong>Analytics.</strong> None.</li>
        <li><strong>Newsletter.</strong> If you subscribe, your email goes to Buttondown (USA) with double opt-in. Unsubscribe link in every email. Legal basis: consent.</li>
        <li><strong>Purchases.</strong> Checkout and payment run through Lemon Squeezy as merchant of record. They process name, email, billing country and payment data under their own policy. We receive name, email and order details to deliver the product and provide support. Legal basis: contract.</li>
        <li><strong>Review service.</strong> Project files you send are stored encrypted, used only for the review, shared with no one, and deleted 30 days after delivery unless agreed otherwise. Legal basis: contract.</li>
      </ul>
      <h2 className="mb-3 mt-8 text-2xl font-bold tracking-tight">Your rights</h2>
      <p>Access, rectification, erasure, restriction, portability, objection, and complaint to a supervisory authority. Contact: {config.contactEmail ? <a href={`mailto:${config.contactEmail}`} className="text-copper hover:underline">{config.contactEmail}</a> : <Link to="/imprint" className="text-copper hover:underline">see imprint</Link>}.</p>
    </div>
  );
}
