<?php
/**
 * clients.php
 * Fiches clients.
 *
 * GET    api/clients.php                → liste (filtres ?q= et ?status=)
 * GET    api/clients.php?id=X           → fiche détaillée (stats, récurrences, paiements, historique)
 * POST   api/clients.php                → création
 * PUT    api/clients.php?id=X           → modification
 * DELETE api/clients.php?id=X           → suppression (cours et paiements inclus)
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';

handlePreflight('GET, POST, PUT, DELETE, OPTIONS');
requireAuth();

/** Champs modifiables : nom JSON => [colonne, filtre]. */
function clientFields(): array {
    return [
        'firstName'         => ['first_name',         'text'],
        'lastName'          => ['last_name',          'text'],
        'email'             => ['email',              'email'],
        'phone'             => ['phone',              'text'],
        'address'           => ['address',            'text'],
        'notes'             => ['notes',              'text'],
        'healthFlag'        => ['health_flag',        'bool'],
        'status'            => ['status',             'status'],
        'defaultDuration'   => ['default_duration',   'int'],
        'rateCents'         => ['rate_cents',         'int'],
        'reminderDays'      => ['reminder_days',      'nullint'],
        'reminderEmail'     => ['reminder_email',     'bool'],
        'milestoneInterval' => ['milestone_interval', 'nullint'],
        'startedOn'         => ['started_on',         'date'],
    ];
}

function clientValue(string $filter, $raw) {
    switch ($filter) {
        case 'bool':    return !empty($raw) ? 1 : 0;
        case 'int':     return max(0, (int) $raw);
        case 'nullint': return ($raw === null || $raw === '') ? null : max(0, (int) $raw);
        case 'date':    return isDate($raw) ? $raw : null;
        case 'email':   return $raw ? mb_substr(trim($raw), 0, 190) : null;
        case 'status':  return in_array($raw, ['active', 'paused', 'archived'], true) ? $raw : 'active';
        default:        return $raw === null ? null : mb_substr(trim((string) $raw), 0, 5000);
    }
}

runEndpoint(function () {
    $db     = db();
    $method = $_SERVER['REQUEST_METHOD'];
    $id     = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    /* ---- LISTE / FICHE ---- */
    if ($method === 'GET') {
        if ($id > 0) {
            $stmt = $db->prepare('SELECT * FROM `clients` WHERE `id` = ?');
            $stmt->execute([$id]);
            $client = $stmt->fetch();
            if (!$client) fail('Client introuvable.', 404);

            $stmt = $db->prepare(
                'SELECT * FROM `recurrences` WHERE `client_id` = ? ORDER BY `active` DESC, `weekday`, `start_time`'
            );
            $stmt->execute([$id]);
            $recurrences = array_map(function ($r) {
                return [
                    'id'            => (int) $r['id'],
                    'weekday'       => (int) $r['weekday'],
                    'startTime'     => substr($r['start_time'], 0, 5),
                    'duration'      => (int) $r['duration'],
                    'intervalWeeks' => (int) $r['interval_weeks'],
                    'anchorDate'    => $r['anchor_date'],
                    'untilDate'     => $r['until_date'],
                    'location'      => $r['location'],
                    'active'        => (bool) $r['active'],
                ];
            }, $stmt->fetchAll());

            $stmt = $db->prepare('SELECT * FROM `payments` WHERE `client_id` = ? ORDER BY `paid_on` DESC, `id` DESC');
            $stmt->execute([$id]);
            $payments = array_map(function ($p) {
                return [
                    'id'            => (int) $p['id'],
                    'sessionsCount' => (int) $p['sessions_count'],
                    'amountCents'   => (int) $p['amount_cents'],
                    'method'        => $p['method'],
                    'paidOn'        => $p['paid_on'],
                    'note'          => $p['note'],
                ];
            }, $stmt->fetchAll());

            $stmt = $db->prepare(
                'SELECT s.*, c.`first_name`, c.`last_name`, c.`phone`, c.`email`,
                        c.`health_flag`, c.`milestone_interval`, c.`notes` AS client_notes
                 FROM `sessions` s JOIN `clients` c ON c.`id` = s.`client_id`
                 WHERE s.`client_id` = ? ORDER BY s.`starts_at` DESC'
            );
            $stmt->execute([$id]);
            $ordinals = sessionOrdinals();
            $sessions = array_map(function ($s) use ($ordinals) {
                return serializeSession($s, $ordinals);
            }, $stmt->fetchAll());

            respond([
                'client'      => serializeClient($client),
                'recurrences' => $recurrences,
                'payments'    => $payments,
                'sessions'    => $sessions,
            ]);
        }

        $where  = [];
        $params = [];
        $status = isset($_GET['status']) ? $_GET['status'] : '';
        if (in_array($status, ['active', 'paused', 'archived'], true)) {
            $where[]  = '`status` = ?';
            $params[] = $status;
        } elseif ($status !== 'all') {
            $where[] = "`status` <> 'archived'";
        }
        if (!empty($_GET['q'])) {
            $where[]  = '(`first_name` LIKE ? OR `last_name` LIKE ? OR `email` LIKE ? OR `phone` LIKE ?)';
            $like     = '%' . $_GET['q'] . '%';
            $params   = array_merge($params, [$like, $like, $like, $like]);
        }
        $sql = 'SELECT * FROM `clients`'
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY `last_name`, `first_name`';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        respond(array_map('serializeClient', $stmt->fetchAll()));
    }

    /* ---- CRÉATION ---- */
    if ($method === 'POST') {
        $in = input();
        if (empty(trim((string) (isset($in['firstName']) ? $in['firstName'] : '')))) {
            fail('Le prénom est obligatoire.');
        }

        $cols = []; $marks = []; $vals = [];
        foreach (clientFields() as $json => $def) {
            list($col, $filter) = $def;
            if (!array_key_exists($json, $in)) continue;
            $cols[]  = "`$col`";
            $marks[] = '?';
            $vals[]  = clientValue($filter, $in[$json]);
        }
        if (!in_array('`default_duration`', $cols, true)) {
            $cols[] = '`default_duration`'; $marks[] = '?'; $vals[] = settingInt('default_duration', 60);
        }
        if (!in_array('`rate_cents`', $cols, true)) {
            $cols[] = '`rate_cents`'; $marks[] = '?'; $vals[] = settingInt('default_rate_cents', 0);
        }

        $stmt = $db->prepare('INSERT INTO `clients` (' . implode(',', $cols) . ') VALUES (' . implode(',', $marks) . ')');
        $stmt->execute($vals);
        $newId = (int) $db->lastInsertId();

        $stmt = $db->prepare('SELECT * FROM `clients` WHERE `id` = ?');
        $stmt->execute([$newId]);
        respond(serializeClient($stmt->fetch()), 201);
    }

    /* ---- MODIFICATION ---- */
    if ($method === 'PUT') {
        if ($id <= 0) fail('Paramètre « id » manquant.');
        $in = input();

        $sets = []; $vals = [];
        foreach (clientFields() as $json => $def) {
            list($col, $filter) = $def;
            if (!array_key_exists($json, $in)) continue;
            $sets[] = "`$col` = ?";
            $vals[] = clientValue($filter, $in[$json]);
        }
        if (!$sets) fail('Aucun champ à mettre à jour.');

        $vals[] = $id;
        $stmt = $db->prepare('UPDATE `clients` SET ' . implode(', ', $sets) . ' WHERE `id` = ?');
        $stmt->execute($vals);

        $stmt = $db->prepare('SELECT * FROM `clients` WHERE `id` = ?');
        $stmt->execute([$id]);
        $client = $stmt->fetch();
        if (!$client) fail('Client introuvable.', 404);

        respond(serializeClient($client));
    }

    /* ---- SUPPRESSION ---- */
    if ($method === 'DELETE') {
        if ($id <= 0) fail('Paramètre « id » manquant.');
        $stmt = $db->prepare('DELETE FROM `clients` WHERE `id` = ?');
        $stmt->execute([$id]);
        respond(['deleted' => $stmt->rowCount() > 0]);
    }

    fail('Méthode non supportée.', 405);
});
