<?php
/**
 * Kontaktformular für kiwerbung.de
 * POST { name, email, company?, phone?, message, website (Honeypot, muss leer sein) }
 */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

apply_cors($config);
require_post();
rate_limit($config, 'contact');

$body = read_json_body();

$get = static fn(string $k, int $max): string => mb_substr(trim((string) ($body[$k] ?? '')), 0, $max);

// Honeypot: Bots füllen das versteckte Feld aus
if ($get('website', 200) !== '') {
    json_out(200, ['ok' => true]);
}

$name    = $get('name', 120);
$email   = $get('email', 200);
$company = $get('company', 160);
$phone   = $get('phone', 60);
$message = $get('message', 4000);

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($message) < 10) {
    json_error(400, 'Bitte Name, gültige E-Mail und eine Nachricht (mind. 10 Zeichen) angeben.');
}

$to   = (string) $config['contact_to'];
$from = (string) $config['contact_from'];
if ($to === '' || $from === '') {
    json_error(503, 'Kontaktformular noch nicht konfiguriert (contact_to / contact_from in config.php).');
}

$clean = static fn(string $s): string => str_replace(["\r", "\n"], ' ', $s);

$subject = '=?UTF-8?B?' . base64_encode('Neue Anfrage über kiwerbung.de von ' . $clean($name)) . '?=';
$text = "Neue Anfrage über kiwerbung.de\n\n"
      . "Name:       {$name}\n"
      . "E-Mail:     {$email}\n"
      . "Firma:      {$company}\n"
      . "Telefon:    {$phone}\n"
      . "Zeit:       " . date('d.m.Y H:i') . "\n"
      . "IP:         " . client_ip() . "\n\n"
      . "Nachricht:\n{$message}\n";

$headers = [
    'From: kiwerbung.de <' . $clean($from) . '>',
    'Reply-To: ' . $clean($name) . ' <' . $clean($email) . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: kiwerbung.de',
];

$sent = @mail($to, $subject, $text, implode("\r\n", $headers), '-f' . $clean($from));
if (!$sent) {
    error_log('[kiwerbung] contact: mail() failed');
    json_error(500, 'E-Mail konnte nicht gesendet werden. Bitte direkt an ' . $to . ' schreiben.');
}

json_out(200, ['ok' => true]);
