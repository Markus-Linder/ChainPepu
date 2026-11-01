<?php
/**
 * Gemeinsamer Bootstrap für alle API-Endpunkte:
 * Konfiguration, CORS, JSON-Helfer, Rate-Limit, Anthropic-Client.
 */
declare(strict_types=1);

$root = dirname(__DIR__, 3);

// Jeder unerwartete Fehler wird als JSON ausgegeben (nie als leere 500-Seite)
set_exception_handler(static function (\Throwable $e): void {
    error_log('[kiwerbung] Unerwarteter Fehler: ' . $e::class . ': ' . $e->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['ok' => false, 'error' => 'Interner Fehler. Bitte später erneut versuchen.'], JSON_UNESCAPED_UNICODE);
    exit;
});

$autoload = $root . '/vendor/autoload.php';
if (!is_file($autoload)) {
    json_error(500, 'Server nicht fertig eingerichtet: vendor/ fehlt (composer install ausführen).');
}
require $autoload;

$configFile = $root . '/config.php';
$config = is_file($configFile) ? require $configFile : [];
$config = array_merge([
    'anthropic_api_key' => getenv('ANTHROPIC_API_KEY') ?: '',
    'anthropic_base_url' => getenv('ANTHROPIC_BASE_URL') ?: '',
    'model'             => 'claude-opus-5-5',
    'contact_to'        => '',
    'contact_from'      => '',
    'rate_limit'        => 20,
    'rate_limit_window' => 600,
    'allowed_origins'   => [],
    'cal_link'          => '',
], is_array($config) ? $config : []);

// ---------- Helfer ----------

function json_out(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(int $status, string $message): never
{
    json_out($status, ['ok' => false, 'error' => $message]);
}

function read_json_body(int $maxBytes = 64 * 1024): array
{
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) {
        json_error(413, 'Anfrage zu groß.');
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error(400, 'Ungültiges JSON.');
    }
    return $data;
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function apply_cors(array $config): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $config['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        json_error(405, 'Nur POST erlaubt.');
    }
}

/**
 * Einfaches dateibasiertes Rate-Limit pro IP (ohne Datenbank, läuft auf jedem Shared-Hosting).
 */
function rate_limit(array $config, string $bucket): void
{
    $limit  = (int) $config['rate_limit'];
    $window = (int) $config['rate_limit_window'];
    if ($limit <= 0) {
        return;
    }
    $dir = dirname(__DIR__, 3) . '/storage/ratelimit';
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) {
        $dir = sys_get_temp_dir();
    }
    $file = $dir . '/' . $bucket . '_' . hash('sha256', client_ip()) . '.json';
    $now  = time();
    $fp   = fopen($file, 'c+');
    if ($fp === false) {
        return;
    }
    flock($fp, LOCK_EX);
    $content = stream_get_contents($fp);
    $hits = $content ? (json_decode($content, true) ?: []) : [];
    $hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - $window));
    if (count($hits) >= $limit) {
        flock($fp, LOCK_UN);
        fclose($fp);
        header('Retry-After: ' . $window);
        json_error(429, 'Zu viele Anfragen. Bitte in ein paar Minuten erneut versuchen.');
    }
    $hits[] = $now;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($hits));
    flock($fp, LOCK_UN);
    fclose($fp);
}

function anthropic_client(array $config): \Anthropic\Client
{
    $key = (string) $config['anthropic_api_key'];
    if ($key === '' || str_starts_with($key, 'sk-ant-...')) {
        json_error(503, 'KI-Funktion noch nicht aktiviert (API-Key fehlt in config.php).');
    }
    $baseUrl = (string) ($config['anthropic_base_url'] ?? '');
    return $baseUrl !== ''
        ? new \Anthropic\Client(apiKey: $key, baseUrl: $baseUrl)
        : new \Anthropic\Client(apiKey: $key);
}

/** Erste Textantwort aus einer Message holen; Refusals sauber behandeln. */
function first_text(object $message): string
{
    if (($message->stopReason ?? null) === 'refusal') {
        json_error(422, 'Diese Anfrage kann die KI nicht bearbeiten. Bitte formuliere sie anders.');
    }
    foreach ($message->content as $block) {
        if ($block->type === 'text') {
            return trim($block->text);
        }
    }
    return '';
}

/** Einheitliche Fehlerbehandlung für API-Aufrufe. */
function call_claude(callable $fn): mixed
{
    try {
        return $fn();
    } catch (\Anthropic\Core\Exceptions\RateLimitException $e) {
        json_error(503, 'Die KI ist gerade stark ausgelastet. Bitte gleich noch einmal versuchen.');
    } catch (\Anthropic\Core\Exceptions\AuthenticationException $e) {
        json_error(503, 'KI-Zugang ungültig (API-Key prüfen).');
    } catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
        error_log('[kiwerbung] Claude API status error: ' . $e->getMessage());
        json_error(502, 'Die KI hat einen Fehler gemeldet. Bitte später erneut versuchen.');
    } catch (\Anthropic\Core\Exceptions\APIConnectionException $e) {
        error_log('[kiwerbung] Claude API connection error: ' . $e->getMessage());
        json_error(504, 'Keine Verbindung zur KI. Bitte später erneut versuchen.');
    }
}
