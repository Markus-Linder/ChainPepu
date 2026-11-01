<?php
/**
 * kiwerbung.de – Konfiguration
 *
 * 1. Diese Datei nach config.php kopieren (gleiches Verzeichnis, AUSSERHALB von public/).
 * 2. Werte eintragen. config.php ist per .gitignore vom Repo ausgeschlossen.
 */
return [
    // Anthropic API-Key (https://platform.claude.com) – Pflicht für Chat & Anzeigen-Generator
    'anthropic_api_key' => 'sk-ant-...',

    // Optional: eigene Basis-URL (Proxy/Gateway). Leer lassen für die Standard-API.
    'anthropic_base_url' => '',

    // Modell für alle KI-Funktionen
    'model' => 'claude-opus-5-5',

    // Kontaktformular: Empfänger & Absender (Absender muss zur Domain passen, sonst landet es im Spam)
    'contact_to'   => 'kontakt@kiwerbung.de',
    'contact_from' => 'website@kiwerbung.de',

    // Rate-Limit pro IP (Anfragen pro Zeitfenster) – schützt vor Missbrauch des API-Keys
    'rate_limit'        => 20,
    'rate_limit_window' => 600, // Sekunden

    // Erlaubte Origins für die API (leer = nur gleiche Domain)
    'allowed_origins' => ['https://kiwerbung.de', 'https://www.kiwerbung.de'],

    // Cal.com-Link für Terminbuchung (z. B. "deinname/30min")
    'cal_link' => 'kiwerbung/erstgespraech',
];
