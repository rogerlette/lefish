<?php
/**
 * sessions.php
 * Cours de l'agenda.
 *
 * GET    api/sessions.php?from=…&to=…      → cours d'une période (agenda)
 * GET    api/sessions.php?id=X             → détail d'un cours (client, notes, n° de séance)
 * POST   api/sessions.php                  → création d'un cours
 * POST   api/sessions.php?action=batch     → création d'une liste d'horaires d'un coup
 * POST   api/sessions.php?action=remind&id=X → envoi immédiat du rappel au client
 * PUT    api/sessions.php?id=X             → déplacement, statut, notes…
 * DELETE api/sessions.php?id=X             → suppression
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';
require_once __DIR__ . '/mailer.php';

handlePreflight('GET, POST, PUT, DELETE, OPTIONS');
requireAuth();

const SESSION_JOIN =
    'SELECT s.*, c.`first_name`, c.`last_name`, c.`phone`, c.`email`,
            c.`health_flag`, c.`milestone_interval`, c.`notes` AS client_notes
     FROM `sessions` s JOIN `clients` c ON c.`id` = s.`client_id` ';

/** Cours qui chevauchent un créneau (hors cours $exceptId). */
function findConflicts(string $startsAt, int $duration, int $exceptId = 0): array {
    $end  = date('Y-m-d H:i:s', strtotime($startsAt) + $duration * 60);
    $stmt = db()->prepare(
        "SELECT s.`id`, s.`starts_at`, s.`duration`, c.`first_name`, c.`last_name`
         FROM `sessions` s JOIN `clients` c ON c.`id` = s.`client_id`
         WHERE s.`status` IN ('planned','done')
           AND s.`id` <> ?
           AND s.`starts_at` < ?
           AND DATE_ADD(s.`starts_at`, INTERVAL s.`duration` MINUTE) > ?"
    );
    $stmt->execute([$exceptId, $end, $startsAt]);

    return array_map(function ($r) {
        return [
            'id'         => (int) $r['id'],
            'startsAt'   => $r['starts_at'],
            'clientName' => trim($r['first_name'] . ' ' . $r['last_name']),
        ];
    }, $stmt->fetchAll());
}

function loadSession(int $id): ?array {
    $stmt = db()->prepare(SESSION_JOIN . 'WHERE s.`id` = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

runEndpoint(function () {
    $db     = db();
    $method = $_SERVER['REQUEST_METHOD'];
    $id     = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    /* ================= LECTURE ================= */
    if ($method === 'GET') {
        if ($id > 0) {
            $row = loadSession($id);
            if (!$row) fail('Cours introuvable.', 404);

            $stmt = $db->prepare('SELECT * FROM `clients` WHERE `id` = ?');
            $stmt->execute([(int) $row['client_id']]);
            $client = $stmt->fetch();

            $stmt = $db->prepare(
                'SELECT `kind`, `sent_for`, `recipient`, `ok`, `sent_at`
                 FROM `reminder_log` WHERE `session_id` = ? ORDER BY `sent_at` DESC'
            );
            $stmt->execute([$id]);

            respond([
                'session'  => serializeSession($row),
                'client'   => serializeClient($client),
                'reminders'=> $stmt->fetchAll(),
                'conflicts'=> findConflicts($row['starts_at'], (int) $row['duration'], $id),
            ]);
        }

        $from = isset($_GET['from']) && isDate($_GET['from']) ? $_GET['from'] : date('Y-m-d');
        $to   = isset($_GET['to'])   && isDate($_GET['to'])   ? $_GET['to']   : date('Y-m-d', strtotime($from . ' +6 days'));

        $sql    = SESSION_JOIN . 'WHERE s.`starts_at` >= ? AND s.`starts_at` < ?';
        $params = [$from . ' 00:00:00', date('Y-m-d', strtotime($to . ' +1 day')) . ' 00:00:00'];
        if (!empty($_GET['clientId'])) {
            $sql     .= ' AND s.`client_id` = ?';
            $params[] = (int) $_GET['clientId'];
        }
        $sql .= ' ORDER BY s.`starts_at`, s.`id`';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $ordinals = sessionOrdinals();

        respond(array_map(function ($r) use ($ordinals) {
            return serializeSession($r, $ordinals);
        }, $stmt->fetchAll()));
    }

    /* ================= CRÉATION ================= */
    if ($method === 'POST') {
        // Envoi manuel du rappel, sans attendre la tâche planifiée.
        if ($action === 'remind') {
            if ($id <= 0) fail('Paramètre « id » manquant.');
            $row = loadSessionWithClient($id);
            if (!$row) fail('Cours introuvable.', 404);
            respond(sendReminderFor($row, true));
        }

        $in       = input();
        $clientId = (int) (isset($in['clientId']) ? $in['clientId'] : 0);
        if ($clientId <= 0) fail('Client manquant.');

        $stmt = $db->prepare('SELECT * FROM `clients` WHERE `id` = ?');
        $stmt->execute([$clientId]);
        $client = $stmt->fetch();
        if (!$client) fail('Client introuvable.', 404);

        $defaultDuration = (int) $client['default_duration'];
        $insert = $db->prepare(
            'INSERT INTO `sessions` (`client_id`, `starts_at`, `duration`, `location`, `notes`, `is_special`)
             VALUES (?, ?, ?, ?, ?, ?)'
        );

        // Création en lot : une liste d'horaires saisie d'un coup.
        if ($action === 'batch') {
            $slots = isset($in['slots']) && is_array($in['slots']) ? $in['slots'] : [];
            if (!$slots) fail('Aucun horaire fourni.');
            if (count($slots) > 200) fail('Trop d\'horaires en une fois (200 maximum).');

            $created = [];
            $errors  = [];
            foreach ($slots as $slot) {
                $startsAt = normalizeDateTime(is_array($slot) ? (isset($slot['startsAt']) ? $slot['startsAt'] : null) : $slot);
                if (!$startsAt) { $errors[] = 'Horaire invalide : ' . json_encode($slot); continue; }

                $duration = is_array($slot) && !empty($slot['duration']) ? (int) $slot['duration'] : $defaultDuration;
                $insert->execute([
                    $clientId, $startsAt, $duration,
                    isset($in['location']) ? $in['location'] : null,
                    null, 0,
                ]);
                $created[] = (int) $db->lastInsertId();
            }

            $ordinals = sessionOrdinals(true);
            $out      = [];
            foreach ($created as $cid) {
                $row = loadSession($cid);
                if ($row) $out[] = serializeSession($row, $ordinals);
            }
            respond(['created' => $out, 'errors' => $errors], 201);
        }

        $startsAt = normalizeDateTime(isset($in['startsAt']) ? $in['startsAt'] : null);
        if (!$startsAt) fail('Date et heure invalides.');

        $duration = !empty($in['duration']) ? (int) $in['duration'] : $defaultDuration;
        $insert->execute([
            $clientId,
            $startsAt,
            $duration,
            isset($in['location']) ? $in['location'] : null,
            isset($in['notes']) ? $in['notes'] : null,
            !empty($in['isSpecial']) ? 1 : 0,
        ]);
        $newId = (int) $db->lastInsertId();

        sessionOrdinals(true);
        respond([
            'session'   => serializeSession(loadSession($newId)),
            'conflicts' => findConflicts($startsAt, $duration, $newId),
        ], 201);
    }

    /* ================= MODIFICATION ================= */
    if ($method === 'PUT') {
        if ($id <= 0) fail('Paramètre « id » manquant.');
        $current = loadSession($id);
        if (!$current) fail('Cours introuvable.', 404);

        $in       = input();
        $sets     = [];
        $vals     = [];
        $oldStart = $current['starts_at'];
        $moved    = false;

        if (array_key_exists('startsAt', $in)) {
            $startsAt = normalizeDateTime($in['startsAt']);
            if (!$startsAt) fail('Date et heure invalides.');
            if ($startsAt !== $oldStart) {
                $moved  = true;
                $sets[] = '`starts_at` = ?';       $vals[] = $startsAt;
                $sets[] = '`moved_count` = `moved_count` + 1';
                $sets[] = '`moved_at` = NOW()';
            }
        }
        if (array_key_exists('duration', $in)) {
            $sets[] = '`duration` = ?';  $vals[] = max(5, (int) $in['duration']);
        }
        if (array_key_exists('location', $in)) {
            $sets[] = '`location` = ?';  $vals[] = $in['location'] !== '' ? $in['location'] : null;
        }
        if (array_key_exists('notes', $in)) {
            $sets[] = '`notes` = ?';     $vals[] = $in['notes'] !== '' ? $in['notes'] : null;
        }
        if (array_key_exists('isSpecial', $in)) {
            $sets[] = '`is_special` = ?'; $vals[] = !empty($in['isSpecial']) ? 1 : 0;
        }
        if (array_key_exists('status', $in)) {
            $allowed = ['planned', 'done', 'cancelled', 'late_cancel', 'no_show'];
            if (!in_array($in['status'], $allowed, true)) fail('Statut inconnu.');
            $sets[] = '`status` = ?';    $vals[] = $in['status'];
        }
        if (array_key_exists('clientId', $in) && (int) $in['clientId'] !== (int) $current['client_id']) {
            $sets[] = '`client_id` = ?'; $vals[] = (int) $in['clientId'];
        }
        if (!$sets) fail('Aucun champ à mettre à jour.');

        $vals[] = $id;
        $stmt = $db->prepare('UPDATE `sessions` SET ' . implode(', ', $sets) . ' WHERE `id` = ?');
        $stmt->execute($vals);

        $updated  = loadSession($id);
        $notified = null;

        // Prévenir le client d'un déplacement / d'une annulation.
        $notify = array_key_exists('notifyClient', $in)
            ? !empty($in['notifyClient'])
            : (bool) settingInt('notify_on_move', 1);

        if ($notify && $moved && $updated['status'] === 'planned') {
            $notified = sendMovedNotice($id, $oldStart);
        } elseif ($notify && array_key_exists('status', $in)
                  && in_array($in['status'], ['cancelled'], true)
                  && $current['status'] !== 'cancelled') {
            $notified = sendCancelNotice($id);
        }

        sessionOrdinals(true);
        respond([
            'session'   => serializeSession($updated),
            'moved'     => $moved,
            'notified'  => $notified,
            'conflicts' => findConflicts($updated['starts_at'], (int) $updated['duration'], $id),
        ]);
    }

    /* ================= SUPPRESSION ================= */
    if ($method === 'DELETE') {
        if ($id <= 0) fail('Paramètre « id » manquant.');
        $current = loadSession($id);
        if (!$current) fail('Cours introuvable.', 404);

        // Occurrence issue d'une règle : mémoriser qu'elle ne doit pas revenir.
        if ($current['recurrence_id'] && $current['origin_date']) {
            $stmt = $db->prepare(
                'INSERT IGNORE INTO `occurrence_skips` (`recurrence_id`, `origin_date`) VALUES (?, ?)'
            );
            $stmt->execute([(int) $current['recurrence_id'], $current['origin_date']]);
        }

        $stmt = $db->prepare('DELETE FROM `sessions` WHERE `id` = ?');
        $stmt->execute([$id]);
        respond(['deleted' => $stmt->rowCount() > 0]);
    }

    fail('Méthode non supportée.', 405);
});
