<?php
/**
 * recurrences.php
 * Règles d'horaires récurrents (« tous les mardis à 14h », « un mardi sur deux »).
 *
 * GET    api/recurrences.php?clientId=X   → règles d'un client
 * POST   api/recurrences.php              → création + génération des cours
 * PUT    api/recurrences.php?id=X         → modification (+ régénération des cours non déplacés)
 * DELETE api/recurrences.php?id=X         → suppression (?keepSessions=1 pour garder les cours déjà posés)
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';

handlePreflight('GET, POST, PUT, DELETE, OPTIONS');
requireAuth();

function serializeRecurrence(array $r): array {
    return [
        'id'            => (int) $r['id'],
        'clientId'      => (int) $r['client_id'],
        'weekday'       => (int) $r['weekday'],
        'startTime'     => substr($r['start_time'], 0, 5),
        'duration'      => (int) $r['duration'],
        'intervalWeeks' => (int) $r['interval_weeks'],
        'anchorDate'    => $r['anchor_date'],
        'untilDate'     => $r['until_date'],
        'location'      => $r['location'],
        'active'        => (bool) $r['active'],
    ];
}

/** Supprime les cours à venir issus de la règle et jamais déplacés. */
function clearFutureOccurrences(int $recurrenceId): int {
    $stmt = db()->prepare(
        "DELETE FROM `sessions`
         WHERE `recurrence_id` = ? AND `status` = 'planned'
           AND `starts_at` >= NOW() AND `moved_count` = 0"
    );
    $stmt->execute([$recurrenceId]);
    return $stmt->rowCount();
}

function normalizeTime($raw): ?string {
    if (!is_string($raw)) return null;
    $raw = trim($raw);
    if (preg_match('/^([01]?\d|2[0-3])[:h]([0-5]\d)$/', $raw, $m)) {
        return sprintf('%02d:%02d:00', $m[1], $m[2]);
    }
    if (preg_match('/^([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)$/', $raw, $m)) {
        return sprintf('%02d:%02d:%02d', $m[1], $m[2], $m[3]);
    }
    return null;
}

runEndpoint(function () {
    $db     = db();
    $method = $_SERVER['REQUEST_METHOD'];
    $id     = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($method === 'GET') {
        $clientId = isset($_GET['clientId']) ? (int) $_GET['clientId'] : 0;
        if ($clientId > 0) {
            $stmt = $db->prepare(
                'SELECT * FROM `recurrences` WHERE `client_id` = ? ORDER BY `active` DESC, `weekday`, `start_time`'
            );
            $stmt->execute([$clientId]);
        } else {
            $stmt = $db->query(
                'SELECT * FROM `recurrences` ORDER BY `active` DESC, `weekday`, `start_time`'
            );
        }
        respond(array_map('serializeRecurrence', $stmt->fetchAll()));
    }

    if ($method === 'POST') {
        $in       = input();
        $clientId = (int) (isset($in['clientId']) ? $in['clientId'] : 0);
        $weekday  = (int) (isset($in['weekday']) ? $in['weekday'] : 0);
        $time     = normalizeTime(isset($in['startTime']) ? $in['startTime'] : null);

        if ($clientId <= 0)                fail('Client manquant.');
        if ($weekday < 1 || $weekday > 7)  fail('Jour de la semaine invalide (1 = lundi … 7 = dimanche).');
        if (!$time)                        fail('Heure invalide (format attendu : 14:00).');

        $stmt = $db->prepare('SELECT * FROM `clients` WHERE `id` = ?');
        $stmt->execute([$clientId]);
        $client = $stmt->fetch();
        if (!$client) fail('Client introuvable.', 404);

        $anchor = isset($in['anchorDate']) && isDate($in['anchorDate']) ? $in['anchorDate'] : date('Y-m-d');
        $until  = isset($in['untilDate'])  && isDate($in['untilDate'])  ? $in['untilDate']  : null;

        $stmt = $db->prepare(
            'INSERT INTO `recurrences`
                (`client_id`, `weekday`, `start_time`, `duration`, `interval_weeks`,
                 `anchor_date`, `until_date`, `location`, `active`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
        );
        $stmt->execute([
            $clientId,
            $weekday,
            $time,
            !empty($in['duration']) ? (int) $in['duration'] : (int) $client['default_duration'],
            max(1, (int) (isset($in['intervalWeeks']) ? $in['intervalWeeks'] : 1)),
            $anchor,
            $until,
            isset($in['location']) ? $in['location'] : null,
        ]);

        $newId   = (int) $db->lastInsertId();
        $created = generateOccurrences($newId);

        $stmt = $db->prepare('SELECT * FROM `recurrences` WHERE `id` = ?');
        $stmt->execute([$newId]);
        respond(['recurrence' => serializeRecurrence($stmt->fetch()), 'sessionsCreated' => $created], 201);
    }

    if ($method === 'PUT') {
        if ($id <= 0) fail('Paramètre « id » manquant.');
        $in   = input();
        $sets = []; $vals = [];

        if (array_key_exists('weekday', $in)) {
            $w = (int) $in['weekday'];
            if ($w < 1 || $w > 7) fail('Jour de la semaine invalide.');
            $sets[] = '`weekday` = ?'; $vals[] = $w;
        }
        if (array_key_exists('startTime', $in)) {
            $t = normalizeTime($in['startTime']);
            if (!$t) fail('Heure invalide.');
            $sets[] = '`start_time` = ?'; $vals[] = $t;
        }
        if (array_key_exists('duration', $in))      { $sets[] = '`duration` = ?';       $vals[] = max(5, (int) $in['duration']); }
        if (array_key_exists('intervalWeeks', $in)) { $sets[] = '`interval_weeks` = ?'; $vals[] = max(1, (int) $in['intervalWeeks']); }
        if (array_key_exists('location', $in))      { $sets[] = '`location` = ?';       $vals[] = $in['location'] !== '' ? $in['location'] : null; }
        if (array_key_exists('active', $in))        { $sets[] = '`active` = ?';         $vals[] = !empty($in['active']) ? 1 : 0; }
        if (array_key_exists('anchorDate', $in) && isDate($in['anchorDate'])) {
            $sets[] = '`anchor_date` = ?'; $vals[] = $in['anchorDate'];
        }
        if (array_key_exists('untilDate', $in)) {
            $sets[] = '`until_date` = ?';
            $vals[] = isDate($in['untilDate']) ? $in['untilDate'] : null;
        }
        if (!$sets) fail('Aucun champ à mettre à jour.');

        $vals[] = $id;
        $stmt = $db->prepare('UPDATE `recurrences` SET ' . implode(', ', $sets) . ' WHERE `id` = ?');
        $stmt->execute($vals);

        // Les cours à venir non déplacés suivent la nouvelle règle ; ceux que le
        // client a déjà fait bouger restent où ils sont.
        $removed = clearFutureOccurrences($id);
        $db->prepare('DELETE FROM `occurrence_skips` WHERE `recurrence_id` = ?')->execute([$id]);
        $created = generateOccurrences($id);

        $stmt = $db->prepare('SELECT * FROM `recurrences` WHERE `id` = ?');
        $stmt->execute([$id]);
        $rec = $stmt->fetch();
        if (!$rec) fail('Règle introuvable.', 404);

        respond([
            'recurrence'      => serializeRecurrence($rec),
            'sessionsRemoved' => $removed,
            'sessionsCreated' => $created,
        ]);
    }

    if ($method === 'DELETE') {
        if ($id <= 0) fail('Paramètre « id » manquant.');
        $keep    = !empty($_GET['keepSessions']);
        $removed = $keep ? 0 : clearFutureOccurrences($id);

        $stmt = $db->prepare('DELETE FROM `recurrences` WHERE `id` = ?');
        $stmt->execute([$id]);

        respond(['deleted' => $stmt->rowCount() > 0, 'sessionsRemoved' => $removed]);
    }

    fail('Méthode non supportée.', 405);
});
