<?php
/**
 * KI-Anzeigen-Generator für kiwerbung.de
 * POST { product, audience, platform, tone, goal }
 * -> { ok:true, result:{ variants:[...], tiktok_script:{...}, tips:[...] } }
 */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

apply_cors($config);
require_post();
rate_limit($config, 'generate');

$body = read_json_body();

$field = static function (string $key, int $max, string $default = '') use ($body): string {
    $v = is_string($body[$key] ?? null) ? trim($body[$key]) : '';
    return $v === '' ? $default : mb_substr($v, 0, $max);
};

$product  = $field('product', 600);
$audience = $field('audience', 300, 'Allgemeine Zielgruppe');
$platform = $field('platform', 40, 'Meta (Facebook/Instagram)');
$tone     = $field('tone', 40, 'Direkt & selbstbewusst');
$goal     = $field('goal', 40, 'Anfragen / Leads');

if (mb_strlen($product) < 10) {
    json_error(400, 'Bitte beschreibe dein Produkt oder Angebot etwas genauer (mind. 10 Zeichen).');
}

$allowedPlatforms = ['Meta (Facebook/Instagram)', 'Google Ads', 'TikTok Ads', 'LinkedIn'];
if (!in_array($platform, $allowedPlatforms, true)) {
    $platform = $allowedPlatforms[0];
}

$system = <<<TXT
Du bist ein erfahrener Performance-Marketer und Werbetexter für den deutschsprachigen Markt (DACH).
Du schreibst Anzeigen, die verkaufen: klare Hooks, konkreter Nutzen, ein Call-to-Action.
Regeln:
- Deutsch, Ansprache passend zur Zielgruppe (B2B: Sie oder Du je nach Branche, B2C meist Du).
- Keine erfundenen Zahlen, Rabatte, Testimonials oder Garantien, die nicht im Input stehen.
- Keine Superlative ohne Beleg, keine irreführenden Heilversprechen; beachte Werberecht (UWG) und Plattformrichtlinien.
- Headlines max. 40 Zeichen, Primärtexte 60–180 Wörter, CTA max. 5 Wörter.
- Drei deutlich unterschiedliche Ansätze: 1) Problem/Lösung, 2) Nutzen/Ergebnis, 3) Story oder Einwand-Behandlung.
- Das TikTok-Skript ist für 20–35 Sekunden, gesprochen, mit Hook in den ersten 2 Sekunden und Szenenanweisungen.
TXT;

$prompt = <<<TXT
Erstelle Werbeanzeigen mit folgenden Angaben:
Produkt/Angebot: {$product}
Zielgruppe: {$audience}
Plattform: {$platform}
Tonalität: {$tone}
Ziel der Kampagne: {$goal}
TXT;

$schema = [
    'type' => 'object',
    'properties' => [
        'variants' => [
            'type' => 'array',
            'minItems' => 3,
            'maxItems' => 3,
            'items' => [
                'type' => 'object',
                'properties' => [
                    'angle'    => ['type' => 'string', 'description' => 'Kurzname des Ansatzes, z. B. Problem/Lösung'],
                    'hook'     => ['type' => 'string', 'description' => 'Erste Zeile, die Aufmerksamkeit erzeugt'],
                    'primary'  => ['type' => 'string', 'description' => 'Primärtext der Anzeige'],
                    'headline' => ['type' => 'string'],
                    'cta'      => ['type' => 'string'],
                ],
                'required' => ['angle', 'hook', 'primary', 'headline', 'cta'],
                'additionalProperties' => false,
            ],
        ],
        'tiktok_script' => [
            'type' => 'object',
            'properties' => [
                'hook'   => ['type' => 'string'],
                'scenes' => [
                    'type' => 'array',
                    'minItems' => 3,
                    'maxItems' => 6,
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'visual' => ['type' => 'string', 'description' => 'Was im Bild passiert'],
                            'voice'  => ['type' => 'string', 'description' => 'Gesprochener Text'],
                        ],
                        'required' => ['visual', 'voice'],
                        'additionalProperties' => false,
                    ],
                ],
                'cta' => ['type' => 'string'],
            ],
            'required' => ['hook', 'scenes', 'cta'],
            'additionalProperties' => false,
        ],
        'tips' => [
            'type' => 'array',
            'minItems' => 2,
            'maxItems' => 4,
            'items' => ['type' => 'string'],
            'description' => 'Konkrete Tipps zu Creative, Targeting oder Test-Setup für diese Kampagne',
        ],
    ],
    'required' => ['variants', 'tiktok_script', 'tips'],
    'additionalProperties' => false,
];

$client = anthropic_client($config);

$message = call_claude(fn() => $client->beta->messages->create(
    model: (string) $config['model'],
    maxTokens: 4000,
    system: [['type' => 'text', 'text' => $system, 'cacheControl' => ['type' => 'ephemeral']]],
    messages: [['role' => 'user', 'content' => $prompt]],
    outputConfig: [
        'effort' => 'medium',
        'format' => ['type' => 'json_schema', 'schema' => $schema],
    ],
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
));

$text = first_text($message);
$result = json_decode($text, true);
if (!is_array($result) || !isset($result['variants'])) {
    error_log('[kiwerbung] generate: unparseable output: ' . mb_substr($text, 0, 300));
    json_error(502, 'Die KI hat ein unerwartetes Format geliefert. Bitte erneut versuchen.');
}

json_out(200, ['ok' => true, 'result' => $result]);
