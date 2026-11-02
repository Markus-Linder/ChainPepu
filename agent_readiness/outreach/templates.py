"""Email templates in German and English. Plain text, no HTML, no tracking pixels.
Placeholders are filled by draft.build_email()."""

SUBJECTS = {
    "de": [
        "{brand}: {score}/100 bei KI-Assistenten – drei konkrete Punkte",
        "Kurze Analyse: So sehen ChatGPT und Claude {domain}",
        "{brand} in KI-Antworten – was ich bei {domain} gefunden habe",
    ],
    "en": [
        "{brand}: {score}/100 with AI assistants – three concrete points",
        "Quick analysis: how ChatGPT and Claude see {domain}",
        "{brand} in AI answers – what I found on {domain}",
    ],
}

BODY = {
    "de": """{salutation}

ich habe mir {domain} aus einem bestimmten Blickwinkel angesehen: Wie gut können KI-Assistenten wie ChatGPT, Claude oder Perplexity Ihre Seite lesen und Sie empfehlen? Immer mehr Kunden fragen zuerst dort, bevor sie googeln.

Ergebnis: {score} von 100 Punkten ({grade}). Die drei Punkte mit dem größten Hebel:

{findings}

{strength_line}Jeder dieser Punkte ist in wenigen Stunden lösbar, und zusammen entscheiden sie darüber, ob {brand} in KI-Antworten auftaucht oder ein Wettbewerber.

Den vollständigen Bericht mit allen {n_findings} Befunden schicke ich Ihnen gern kostenlos zu. Wenn Sie möchten, gehen wir ihn in 20 Minuten am Telefon durch.

Passt Ihnen {proposed_slot}?

Freundliche Grüße
{sender_name}
{sender_title}
{sender_company} · {sender_site}
{sender_phone}

--
Sie erhalten diese E-Mail einmalig, weil {legal_reason}. Wenn Sie keine weitere Nachricht wünschen, antworten Sie kurz mit "Nein" oder nutzen Sie diesen Link: {unsubscribe_url}
{imprint_line}""",
    "en": """{salutation}

I looked at {domain} from one specific angle: how well can AI assistants such as ChatGPT, Claude or Perplexity read your site and recommend you? More and more customers ask there first, before they search.

Result: {score} out of 100 ({grade}). The three points with the biggest leverage:

{findings}

{strength_line}Each of these can be fixed in a few hours, and together they decide whether {brand} shows up in AI answers or a competitor does.

I am happy to send you the full report with all {n_findings} findings free of charge. If you like, we can walk through it in a 20-minute call.

Would {proposed_slot} work for you?

Best regards
{sender_name}
{sender_title}
{sender_company} · {sender_site}
{sender_phone}

--
You receive this one-time email because {legal_reason}. If you do not want to hear from me again, reply with "No" or use this link: {unsubscribe_url}
{imprint_line}""",
}

SALUTATION = {
    "de": {"named": "Guten Tag {name},", "anonymous": "Guten Tag,"},
    "en": {"named": "Hello {name},", "anonymous": "Hello,"},
}

STRENGTH = {
    "de": "Was bereits gut funktioniert: {strength}. Darauf lässt sich aufbauen.\n\n",
    "en": "What already works well: {strength}. That is a solid base.\n\n",
}

LEGAL_REASON = {
    "de": {
        "consent": "Sie dem Kontakt zugestimmt haben",
        "existing-customer": "Sie Kunde bei uns sind und das Angebot an Ihre bisherige Leistung anknüpft (§ 7 Abs. 3 UWG)",
        "inquiry": "Sie uns über unsere Website oder den kostenlosen Schnellcheck kontaktiert haben",
        "b2b-allowed-jurisdiction": "Ihr Unternehmen in einem Land sitzt, in dem geschäftliche Erstkontakte per E-Mail mit Abmeldemöglichkeit zulässig sind",
        "other": "ich einen sachlichen Bezug zwischen Ihrem Unternehmen und diesem Thema sehe",
    },
    "en": {
        "consent": "you agreed to be contacted",
        "existing-customer": "you are an existing customer and this relates to services you already use",
        "inquiry": "you contacted us through our website or the free quick check",
        "b2b-allowed-jurisdiction": "your business is located in a jurisdiction that permits business-to-business first contact by email with an opt-out",
        "other": "I see a direct connection between your business and this topic",
    },
}

PROPOSED_SLOT = {
    "de": "Dienstag oder Donnerstag nächster Woche vormittags",
    "en": "Tuesday or Thursday morning next week",
}

IMPRINT = {
    "de": "{sender_company}, {sender_address}. Verantwortlich: {sender_name}.",
    "en": "{sender_company}, {sender_address}. Responsible: {sender_name}.",
}
