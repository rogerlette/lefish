<?php
/**
 * ical.php
 * Flux iCal en lecture seule, à abonner depuis le calendrier du téléphone.
 *
 * Abonnement : https://…/api/ical.php?token=TOKEN_ICAL
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';

$token = isset($_GET['token']) ? $_GET['token'] : '';
if (!hash_equals(ICAL_TOKEN, (string) $token) && !isLoggedIn()) {
    header('Content-Type: text/plain; charset=utf-8');
    http_response_code(403);
    echo "Token invalide.";
    exit;
}

function icalEscape(string $s): string {
    return str_replace(["\\", "\n", ",", ";"], ["\\\\", "\\n", "\\,", "\\;"], $s);
}

/** Repli les lignes à 75 octets comme l'exige la RFC 5545. */
function icalFold(string $line): string {
    if (strlen($line) <= 74) return $line;
    $out = substr($line, 0, 74);
    $rest = substr($line, 74);
    foreach (str_split($rest, 73) as $chunk) $out .= "\r\n " . $chunk;
    return $out;
}

$stmt = db()->prepare(
    "SELECT s.*, c.`first_name`, c.`last_name`, c.`phone`, c.`health_flag`
     FROM `sessions` s JOIN `clients` c ON c.`id` = s.`client_id`
     WHERE s.`starts_at` >= ? AND s.`starts_at` < ? AND s.`status` <> 'cancelled'
     ORDER BY s.`starts_at`"
);
$stmt->execute([date('Y-m-d', strtotime('-6 months')), date('Y-m-d', strtotime('+18 months'))]);

$ordinals = sessionOrdinals();
$utc      = new DateTimeZone('UTC');
$lines    = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LMT Coaching//Agenda//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' . icalEscape(setting('coach_name', 'LMT Coaching')),
];

foreach ($stmt->fetchAll() as $r) {
    $start = new DateTime($r['starts_at'], new DateTimeZone(APP_TZ));
    $end   = (clone $start)->modify('+' . (int) $r['duration'] . ' minutes');
    $name  = trim($r['first_name'] . ' ' . $r['last_name']);
    $ord   = isset($ordinals[(int) $r['id']]) ? $ordinals[(int) $r['id']] : null;

    $summary = $name;
    if ($ord !== null) $summary .= ' — séance n°' . $ord;
    if (!empty($r['is_special'])) $summary .= ' ★';

    $desc = [];
    if ($ord !== null)          $desc[] = 'Séance n°' . $ord;
    if ($r['phone'])            $desc[] = 'Tél. : ' . $r['phone'];
    if (!empty($r['health_flag'])) $desc[] = '⚠ Point de vigilance santé — voir la fiche client';
    if ($r['notes'])            $desc[] = 'Notes : ' . $r['notes'];
    $desc[] = 'Statut : ' . $r['status'];

    $lines[] = 'BEGIN:VEVENT';
    $lines[] = 'UID:lmt-session-' . (int) $r['id'] . '@lmt-coaching';
    $lines[] = 'DTSTAMP:' . (new DateTime('now', $utc))->format('Ymd\THis\Z');
    $lines[] = 'DTSTART:' . (clone $start)->setTimezone($utc)->format('Ymd\THis\Z');
    $lines[] = 'DTEND:'   . $end->setTimezone($utc)->format('Ymd\THis\Z');
    $lines[] = 'SUMMARY:' . icalEscape($summary);
    $lines[] = 'DESCRIPTION:' . icalEscape(implode("\n", $desc));
    if ($r['location']) $lines[] = 'LOCATION:' . icalEscape($r['location']);
    $lines[] = 'END:VEVENT';
}

$lines[] = 'END:VCALENDAR';

header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename="lmt-coaching.ics"');
echo implode("\r\n", array_map('icalFold', $lines)), "\r\n";
