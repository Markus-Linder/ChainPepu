<?php
/**
 * KI-Chat-Assistent für kiwerbung.de
 * POST { messages: [{role:"user"|"assistant", content:"..."}] }
 * -> { ok:true, reply:"..." }
 */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

apply_cors($config);
require_post();
rate_limit($config, 'chat');

$body = read_json_body();
$incoming = $body['messages'] ?? null;
if (!is_array($incoming) || $incoming === []) {
    json_error(400, 'messages fehlt.');
}

// Verlauf begrenzen & bereinigen (max. 20 Nachrichten, je max. 2000 Zeichen)
$messages = [];
foreach (array_slice($incoming, -20) as $m) {
    $role = $m['role'] ?? '';
    $content = is_string($m['content'] ?? null) ? trim($m['content']) : '';
    if (!in_array($role, ['user', 'assistant'], true) || $content === '') {
        continue;
    }
    $messages[] = ['role' => $role, 'content' => mb_substr($content, 0, 2000)];
}
if ($messages === [] || $messages[0]['role'] !== 'user' || end($messages)['role'] !== 'user') {
    json_error(400, 'Ungültiger Verlauf.');
}

$calLink = $config['cal_link'] ? 'https://cal.com/' . $config['cal_link'] : '#kontakt';

$system = <<<TXT
Du bist der KI-Assistent von kiwerbung.de – einer Agentur für KI-Werbung und Automatisierung für Unternehmer und kleine bis mittlere Betriebe im deutschsprachigen Raum.

Dein Ziel: Besucher freundlich beraten, herausfinden, welches Problem sie haben, und sie zu einem kostenlosen 30-Minuten-Erstgespräch führen. Buchungslink: {$calLink}

Angebot von kiwerbung.de:
- KI-Werbeanzeigen: Anzeigentexte, Hooks, Creatives und laufende Optimierung für Meta (Facebook/Instagram), Google und TikTok Ads.
- KI-Video-Ads & UGC-Content: KI-generierte Werbevideos, Avatare und Voice-over, in Serie statt Einzelstück.
- KI-Telefonassistent: nimmt Anrufe rund um die Uhr entgegen, beantwortet Fragen, qualifiziert Anfragen, bucht Termine.
- KI-Chatbot & Lead-Qualifizierung: auf Website und WhatsApp, übergibt nur warme Leads.
- Content-Autopilot: Social-Media-Posts, Reels-Skripte und Newsletter automatisch aus dem Wissen des Unternehmens.
- Automatisierung: Angebote, Follow-ups, CRM-Pflege, Rechnungs- und Onboarding-Prozesse, damit das Unternehmen auch ohne den Inhaber läuft.
Ablauf: 1) kostenloses Erstgespräch & Analyse, 2) Umsetzung in ca. 14 Tagen, 3) Betrieb, Betreuung und Optimierung.
Preise: individuell nach Umfang; Einstieg typischerweise ab einigen hundert Euro monatlich, konkrete Zahlen nur im Erstgespräch.

Regeln:
- Antworte auf Deutsch, per Du, kurz (max. 4 Sätze oder eine kurze Liste), konkret und ohne Floskeln.
- Stelle höchstens eine Rückfrage pro Antwort (z. B. Branche, aktuelle Werbekanäle, größtes Zeitfresser-Problem).
- Verspreche keine konkreten Umsatz- oder Ergebniszahlen und erfinde keine Kunden oder Referenzen.
- Wenn der Besucher Interesse zeigt oder nach Preisen/Ablauf fragt, biete das Erstgespräch mit dem Buchungslink an.
- Beantworte nur Themen rund um Werbung, Marketing, KI und Automatisierung für Unternehmen. Bei anderen Themen freundlich zurück zum Thema lenken.
- Keine Rechts-, Steuer- oder Medizinberatung.
TXT;

$client = anthropic_client($config);

$message = call_claude(fn() => $client->beta->messages->create(
    model: (string) $config['model'],
    maxTokens: 800,
    system: [['type' => 'text', 'text' => $system, 'cacheControl' => ['type' => 'ephemeral']]],
    messages: $messages,
    outputConfig: ['effort' => 'low'],
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
));

$reply = first_text($message);
if ($reply === '') {
    $reply = 'Entschuldige, da ist etwas schiefgelaufen. Magst du deine Frage noch einmal stellen?';
}

json_out(200, ['ok' => true, 'reply' => $reply]);
