<?php
/**
 * business.php
 * Règles métier de LMT Coaching : comptage des séances, soldes, séances
 * spéciales (mesures cardiaques), génération des cours récurrents, alertes.
 *
 * Principe directeur : rien n'est figé. Les numéros de séance, les séances
 * spéciales et les alertes sont TOUJOURS recalculés à partir de l'agenda réel.
 * Un cours déplacé par un client décale automatiquement tout ce qui suit.
 */

require_once __DIR__ . '/bootstrap.php';

/** Statuts qui consomment une séance payée. */
const CONSUMED_STATUSES = ['done', 'late_cancel', 'no_show'];
/** Statuts comptés dans la numérotation des séances (les annulations excusées ne comptent pas). */
const COUNTED_STATUSES  = ['planned', 'done', 'late_cancel', 'no_show'];

/* ================================================================
   NUMÉROTATION DES SÉANCES
   ================================================================ */

/**
 * Numéro de chaque séance dans le parcours de son client (1, 2, 3, …),
 * calculé dans l'ordre chronologique réel.
 *
 * @return array<int,int> session_id => numéro
 */
function sessionOrdinals(bool $fresh = false): array {
    static $cache = null;
    if ($cache !== null && !$fresh) return $cache;

    $in   = "'" . implode("','", COUNTED_STATUSES) . "'";
    $rows = db()->query(
        "SELECT `id`, `client_id` FROM `sessions`
         WHERE `status` IN ($in)
         ORDER BY `client_id`, `starts_at`, `id`"
    )->fetchAll();

    $cache = [];
    $count = [];
    foreach ($rows as $r) {
        $cid = (int) $r['client_id'];
        $count[$cid] = (isset($count[$cid]) ? $count[$cid] : 0) + 1;
        $cache[(int) $r['id']] = $count[$cid];
    }
    return $cache;
}

/** Intervalle entre deux séances spéciales pour un client (défaut : 12). */
function milestoneInterval(array $client): int {
    $v = isset($client['milestone_interval']) ? $client['milestone_interval'] : null;
    $n = $v !== null && $v !== '' ? (int) $v : settingInt('milestone_interval', 12);
    return $n > 0 ? $n : 12;
}

/** Nombre de jours d'avance pour prévenir le client d'un cours. */
function reminderDays(array $client): int {
    $v = isset($client['reminder_days']) ? $client['reminder_days'] : null;
    $n = $v !== null && $v !== '' ? (int) $v : settingInt('reminder_days', 2);
    return max(0, $n);
}

/* ================================================================
   CLIENTS : SOLDE, PROGRESSION, PROCHAINE SÉANCE SPÉCIALE
   ================================================================ */

/**
 * Photographie complète d'un client : séances consommées, solde payé,
 * prochaine séance, prochaine séance spéciale.
 */
function clientStats(array $client): array {
    $db  = db();
    $cid = (int) $client['id'];
    $now = date('Y-m-d H:i:s');

    $inConsumed = "'" . implode("','", CONSUMED_STATUSES) . "'";
    $stmt = $db->prepare(
        "SELECT
            SUM(`status` IN ($inConsumed))                                  AS consumed,
            SUM(`status` = 'done')                                          AS done,
            SUM(`status` = 'no_show')                                       AS no_show,
            SUM(`status` = 'planned' AND `starts_at` >= ?)                  AS upcoming,
            SUM(`status` = 'planned' AND `starts_at` <  ?)                  AS to_confirm
         FROM `sessions` WHERE `client_id` = ?"
    );
    $stmt->execute([$now, $now, $cid]);
    $agg = $stmt->fetch() ?: [];

    $stmt = $db->prepare(
        'SELECT COALESCE(SUM(`sessions_count`),0) AS paid,
                COALESCE(SUM(`amount_cents`),0)   AS amount,
                MAX(`paid_on`)                    AS last_paid_on
         FROM `payments` WHERE `client_id` = ?'
    );
    $stmt->execute([$cid]);
    $pay = $stmt->fetch() ?: [];

    $consumed = (int) (isset($agg['consumed']) ? $agg['consumed'] : 0);
    $paid     = (int) (isset($pay['paid']) ? $pay['paid'] : 0);
    $interval = milestoneInterval($client);

    // Prochaine séance planifiée
    $stmt = $db->prepare(
        "SELECT * FROM `sessions`
         WHERE `client_id` = ? AND `status` = 'planned' AND `starts_at` >= ?
         ORDER BY `starts_at` LIMIT 1"
    );
    $stmt->execute([$cid, $now]);
    $next = $stmt->fetch() ?: null;

    // Dernière séance effectuée
    $stmt = $db->prepare(
        "SELECT * FROM `sessions`
         WHERE `client_id` = ? AND `status` = 'done'
         ORDER BY `starts_at` DESC LIMIT 1"
    );
    $stmt->execute([$cid]);
    $last = $stmt->fetch() ?: null;

    $milestone = nextMilestoneSession($client);

    return [
        'sessionsConsumed'  => $consumed,
        'sessionsDone'      => (int) (isset($agg['done']) ? $agg['done'] : 0),
        'noShows'           => (int) (isset($agg['no_show']) ? $agg['no_show'] : 0),
        'sessionsUpcoming'  => (int) (isset($agg['upcoming']) ? $agg['upcoming'] : 0),
        'sessionsToConfirm' => (int) (isset($agg['to_confirm']) ? $agg['to_confirm'] : 0),
        'sessionsPaid'      => $paid,
        'balance'           => $paid - $consumed,
        'amountPaidCents'   => (int) (isset($pay['amount']) ? $pay['amount'] : 0),
        'lastPaidOn'        => isset($pay['last_paid_on']) ? $pay['last_paid_on'] : null,
        'milestoneInterval' => $interval,
        'milestoneProgress' => $consumed % $interval,
        'nextSessionAt'     => $next ? $next['starts_at'] : null,
        'nextSessionId'     => $next ? (int) $next['id'] : null,
        'lastSessionAt'     => $last ? $last['starts_at'] : null,
        'nextMilestone'     => $milestone,
    ];
}

/**
 * Prochaine séance spéciale du client : la prochaine séance planifiée dont le
 * numéro est un multiple de l'intervalle (12 par défaut).
 * Recalculée à chaque appel → insensible aux déplacements de cours.
 */
function nextMilestoneSession(array $client): ?array {
    $interval = milestoneInterval($client);
    $ordinals = sessionOrdinals();
    $now      = date('Y-m-d H:i:s');

    $stmt = db()->prepare(
        "SELECT * FROM `sessions`
         WHERE `client_id` = ? AND `status` = 'planned' AND `starts_at` >= ?
         ORDER BY `starts_at`"
    );
    $stmt->execute([(int) $client['id'], $now]);

    foreach ($stmt as $row) {
        $ord = isset($ordinals[(int) $row['id']]) ? $ordinals[(int) $row['id']] : null;
        if ($ord !== null && $ord % $interval === 0) {
            return [
                'sessionId' => (int) $row['id'],
                'startsAt'  => $row['starts_at'],
                'ordinal'   => $ord,
            ];
        }
    }
    return null;
}

/** Un cours est-il une séance spéciale ? (numéro multiple de l'intervalle ou drapeau manuel) */
function isMilestoneSession(array $session, array $client, ?array $ordinals = null): bool {
    if (!empty($session['is_special'])) return true;
    if (!in_array($session['status'], COUNTED_STATUSES, true)) return false;
    $ordinals = $ordinals === null ? sessionOrdinals() : $ordinals;
    $ord      = isset($ordinals[(int) $session['id']]) ? $ordinals[(int) $session['id']] : null;
    return $ord !== null && $ord % milestoneInterval($client) === 0;
}

/* ================================================================
   GÉNÉRATION DES COURS RÉCURRENTS
   ================================================================ */

/**
 * Crée les cours manquants d'une règle de récurrence jusqu'à l'horizon.
 * Idempotent : une occurrence déjà créée (même déplacée) ou supprimée
 * manuellement n'est jamais recréée.
 *
 * @return int nombre de cours créés
 */
function generateOccurrences(int $recurrenceId, ?int $horizonWeeks = null): int {
    $db   = db();
    $stmt = $db->prepare('SELECT * FROM `recurrences` WHERE `id` = ?');
    $stmt->execute([$recurrenceId]);
    $rec = $stmt->fetch();
    if (!$rec || !$rec['active']) return 0;

    $horizonWeeks = $horizonWeeks !== null ? $horizonWeeks : settingInt('horizon_weeks', 16);
    $horizon      = new DateTime('today +' . max(1, $horizonWeeks) . ' weeks');
    if (!empty($rec['until_date'])) {
        $until = new DateTime($rec['until_date'] . ' 23:59:59');
        if ($until < $horizon) $horizon = $until;
    }

    // Première occurrence : le jour de la semaine demandé, à partir de l'ancrage.
    $cursor  = new DateTime($rec['anchor_date']);
    $weekday = max(1, min(7, (int) $rec['weekday']));
    $shift   = ($weekday - (int) $cursor->format('N') + 7) % 7;
    if ($shift > 0) $cursor->modify("+$shift days");

    $step    = max(1, (int) $rec['interval_weeks']) * 7;
    $today   = new DateTime('today');
    $insert  = $db->prepare(
        sqlInsertIgnore() . ' INTO `sessions`
            (`client_id`, `recurrence_id`, `origin_date`, `starts_at`, `duration`, `location`, `status`)
         VALUES (?, ?, ?, ?, ?, ?, "planned")'
    );
    $skipped = $db->prepare(
        'SELECT 1 FROM `occurrence_skips` WHERE `recurrence_id` = ? AND `origin_date` = ?'
    );

    $created = 0;
    $guard   = 0;
    while ($cursor <= $horizon && $guard++ < 500) {
        $date = $cursor->format('Y-m-d');
        if ($cursor >= $today) {
            $skipped->execute([$recurrenceId, $date]);
            if (!$skipped->fetchColumn()) {
                $insert->execute([
                    (int) $rec['client_id'],
                    $recurrenceId,
                    $date,
                    $date . ' ' . substr($rec['start_time'], 0, 8),
                    (int) $rec['duration'],
                    $rec['location'],
                ]);
                $created += $insert->rowCount();
            }
        }
        $cursor->modify("+$step days");
    }
    return $created;
}

/** Régénère toutes les règles actives (appelé par le cron quotidien). */
function generateAllOccurrences(): int {
    $total = 0;
    foreach (db()->query('SELECT `id` FROM `recurrences` WHERE `active` = 1') as $r) {
        $total += generateOccurrences((int) $r['id']);
    }
    return $total;
}

/* ================================================================
   ALERTES
   ================================================================ */

/**
 * Recalcule toutes les alertes du coach à partir de l'état actuel de l'agenda.
 * Chaque alerte porte une clé stable : marquer « c'est fait » la masque, mais
 * une alerte dont les données changent (nouveau paiement, cours déplacé au-delà
 * du délai) réapparaît d'elle-même.
 */
function buildAlerts(bool $includeAcked = false): array {
    $db        = db();
    $now       = new DateTime('now');
    $today     = new DateTime('today');
    $ordinals  = sessionOrdinals(true);
    $callDays  = settingInt('milestone_call_days', 7);
    $lowBal    = settingInt('low_balance', 1);
    $alerts    = [];

    $acks = [];
    foreach ($db->query('SELECT `alert_key`, `acked_at` FROM `alert_acks`') as $row) {
        $acks[$row['alert_key']] = $row['acked_at'];
    }

    $clients = $db->query(
        "SELECT * FROM `clients` WHERE `status` <> 'archived' ORDER BY `last_name`, `first_name`"
    )->fetchAll();

    foreach ($clients as $client) {
        $cid   = (int) $client['id'];
        $name  = trim($client['first_name'] . ' ' . $client['last_name']);
        $stats = clientStats($client);

        // ---- 1. Appel à passer avant une séance spéciale ----
        $ms = $stats['nextMilestone'];
        if ($ms) {
            $when     = new DateTime($ms['startsAt']);
            $callFrom = (clone $when)->modify("-$callDays days");
            if ($now >= $callFrom) {
                $days = (int) $today->diff(new DateTime($when->format('Y-m-d')))->format('%r%a');
                $alerts[] = [
                    'key'       => 'milestone:' . $ms['sessionId'],
                    'type'      => 'milestone_call',
                    'severity'  => $days <= 2 ? 'high' : 'medium',
                    'title'     => 'Appeler ' . $name . ' — mesures cardiaques',
                    'message'   => 'Séance n°' . $ms['ordinal'] . ' (spéciale) le '
                                   . $when->format('d/m/Y à H\hi')
                                   . ($days >= 0 ? ' — dans ' . $days . ' j' : ' — passée')
                                   . '. Lui demander de prendre ses mesures de fréquence cardiaque avant la séance.',
                    'clientId'  => $cid,
                    'clientName'=> $name,
                    'phone'     => $client['phone'],
                    'sessionId' => $ms['sessionId'],
                    'date'      => $ms['startsAt'],
                ];
            }
        }

        // ---- 2. Paiement à demander ----
        // Clé indexée sur le total payé ET le total consommé : « c'est fait » ne
        // masque l'alerte que jusqu'à la séance suivante, ou jusqu'au paiement.
        if ($stats['balance'] <= $lowBal && ($stats['sessionsUpcoming'] > 0 || $stats['balance'] < 0)) {
            $bal = $stats['balance'];
            $alerts[] = [
                'key'       => 'payment:' . $cid . ':' . $stats['sessionsPaid'] . ':' . $consumed,
                'type'      => 'payment_due',
                'severity'  => $bal < 0 ? 'high' : 'medium',
                'title'     => 'Paiement à encaisser — ' . $name,
                'message'   => $bal < 0
                    ? abs($bal) . ' séance(s) déjà faite(s) au-delà du forfait payé.'
                    : 'Il reste ' . $bal . ' séance(s) payée(s). Encaisser le prochain bloc de '
                      . settingInt('payment_block', 4) . '.',
                'clientId'  => $cid,
                'clientName'=> $name,
                'phone'     => $client['phone'],
                'sessionId' => null,
                'date'      => $stats['nextSessionAt'],
            ];
        }

        // ---- 3. Client actif sans cours à venir ----
        if ($client['status'] === 'active' && $stats['sessionsUpcoming'] === 0) {
            $ref = $stats['lastSessionAt'] ? substr($stats['lastSessionAt'], 0, 10) : 'jamais';
            $alerts[] = [
                'key'       => 'noupcoming:' . $cid . ':' . $ref,
                'type'      => 'no_upcoming',
                'severity'  => 'low',
                'title'     => 'Aucun cours planifié — ' . $name,
                'message'   => $stats['lastSessionAt']
                    ? 'Dernière séance le ' . date('d/m/Y', strtotime($stats['lastSessionAt'])) . '. À replanifier ?'
                    : 'Aucune séance planifiée pour ce client.',
                'clientId'  => $cid,
                'clientName'=> $name,
                'phone'     => $client['phone'],
                'sessionId' => null,
                'date'      => $stats['lastSessionAt'],
            ];
        }

        // ---- 4. E-mail manquant alors que les rappels sont activés ----
        if ($client['reminder_email'] && !$client['email'] && $stats['sessionsUpcoming'] > 0) {
            $alerts[] = [
                'key'       => 'noemail:' . $cid,
                'type'      => 'missing_email',
                'severity'  => 'low',
                'title'     => 'E-mail manquant — ' . $name,
                'message'   => 'Les rappels automatiques sont activés mais aucune adresse e-mail n\'est renseignée.',
                'clientId'  => $cid,
                'clientName'=> $name,
                'phone'     => $client['phone'],
                'sessionId' => null,
                'date'      => null,
            ];
        }
    }

    // ---- 5. Cours passés encore « à confirmer » ----
    $stmt = $db->prepare(
        "SELECT s.*, c.`first_name`, c.`last_name`
         FROM `sessions` s JOIN `clients` c ON c.`id` = s.`client_id`
         WHERE s.`status` = 'planned' AND s.`starts_at` < ?
         ORDER BY s.`starts_at`"
    );
    $stmt->execute([$now->format('Y-m-d H:i:s')]);
    foreach ($stmt as $row) {
        $name = trim($row['first_name'] . ' ' . $row['last_name']);
        $alerts[] = [
            'key'       => 'confirm:' . (int) $row['id'],
            'type'      => 'to_confirm',
            'severity'  => 'medium',
            'title'     => 'Séance à pointer — ' . $name,
            'message'   => 'Le cours du ' . date('d/m/Y à H\hi', strtotime($row['starts_at']))
                           . ' est toujours « prévu ». Le marquer effectué, annulé ou absent'
                           . ' pour garder le décompte juste.',
            'clientId'  => (int) $row['client_id'],
            'clientName'=> $name,
            'phone'     => null,
            'sessionId' => (int) $row['id'],
            'date'      => $row['starts_at'],
        ];
    }

    // ---- Marquage « traité » + tri ----
    $out = [];
    foreach ($alerts as $a) {
        $a['acked']   = isset($acks[$a['key']]);
        $a['ackedAt'] = $a['acked'] ? $acks[$a['key']] : null;
        if ($a['acked'] && !$includeAcked) continue;
        $out[] = $a;
    }

    $rank = ['high' => 0, 'medium' => 1, 'low' => 2];
    usort($out, function ($a, $b) use ($rank) {
        $ra = $rank[$a['severity']];
        $rb = $rank[$b['severity']];
        if ($ra !== $rb) return $ra - $rb;
        $da = $a['date'] !== null ? $a['date'] : '9999';
        $dbb = $b['date'] !== null ? $b['date'] : '9999';
        return strcmp($da, $dbb);
    });

    return $out;
}

/* ================================================================
   SÉRIALISATION
   ================================================================ */

/** Transforme une ligne SQL « sessions » (jointe aux clients) en objet JSON. */
function serializeSession(array $r, ?array $ordinals = null): array {
    $ordinals = $ordinals === null ? sessionOrdinals() : $ordinals;
    $client   = [
        'id'                 => (int) $r['client_id'],
        'first_name'         => isset($r['first_name']) ? $r['first_name'] : '',
        'last_name'          => isset($r['last_name']) ? $r['last_name'] : '',
        'milestone_interval' => isset($r['milestone_interval']) ? $r['milestone_interval'] : null,
    ];

    $ord = isset($ordinals[(int) $r['id']]) ? $ordinals[(int) $r['id']] : null;
    $end = date('Y-m-d H:i:s', strtotime($r['starts_at']) + ((int) $r['duration']) * 60);

    return [
        'id'           => (int) $r['id'],
        'clientId'     => (int) $r['client_id'],
        'clientName'   => trim($client['first_name'] . ' ' . $client['last_name']),
        'clientPhone'  => isset($r['phone']) ? $r['phone'] : null,
        'clientEmail'  => isset($r['email']) ? $r['email'] : null,
        'clientNotes'  => isset($r['client_notes']) ? $r['client_notes'] : null,
        'healthFlag'   => isset($r['health_flag']) ? (bool) $r['health_flag'] : false,
        'startsAt'     => $r['starts_at'],
        'endsAt'       => $end,
        'duration'     => (int) $r['duration'],
        'location'     => $r['location'],
        'status'       => $r['status'],
        'notes'        => $r['notes'],
        'ordinal'      => $ord,
        'isMilestone'  => $ord !== null && $ord % milestoneInterval($client) === 0,
        'isSpecial'    => (bool) $r['is_special'],
        'recurrenceId' => $r['recurrence_id'] !== null ? (int) $r['recurrence_id'] : null,
        'movedCount'   => (int) $r['moved_count'],
        'movedAt'      => $r['moved_at'],
    ];
}

/** Transforme une ligne SQL « clients » en objet JSON (avec ses compteurs). */
function serializeClient(array $r, bool $withStats = true): array {
    $out = [
        'id'                => (int) $r['id'],
        'firstName'         => $r['first_name'],
        'lastName'          => $r['last_name'],
        'name'              => trim($r['first_name'] . ' ' . $r['last_name']),
        'email'             => $r['email'],
        'phone'             => $r['phone'],
        'address'           => $r['address'],
        'notes'             => $r['notes'],
        'healthFlag'        => (bool) $r['health_flag'],
        'status'            => $r['status'],
        'defaultDuration'   => (int) $r['default_duration'],
        'rateCents'         => (int) $r['rate_cents'],
        'reminderDays'      => $r['reminder_days'] !== null ? (int) $r['reminder_days'] : null,
        'reminderEmail'     => (bool) $r['reminder_email'],
        'milestoneInterval' => $r['milestone_interval'] !== null ? (int) $r['milestone_interval'] : null,
        'startedOn'         => $r['started_on'],
        'createdAt'         => $r['created_at'],
    ];
    if ($withStats) $out['stats'] = clientStats($r);
    return $out;
}
