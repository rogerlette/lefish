<?php
/**
 * stats.php
 * Chiffres de pilotage : activité du mois, encaissements, charge de la semaine.
 *
 * GET api/stats.php?month=YYYY-MM
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';

handlePreflight('GET, OPTIONS');
requireAuth();

runEndpoint(function () {
    $db    = db();
    $month = isset($_GET['month']) && preg_match('/^\d{4}-\d{2}$/', $_GET['month'])
        ? $_GET['month']
        : date('Y-m');

    $start = $month . '-01';
    $end   = date('Y-m-d', strtotime($start . ' +1 month'));

    // ---- Activité du mois ----
    $stmt = $db->prepare(
        "SELECT
            SUM(`status` = 'done')        AS done,
            SUM(`status` = 'cancelled')   AS cancelled,
            SUM(`status` = 'late_cancel') AS late_cancel,
            SUM(`status` = 'no_show')     AS no_show,
            SUM(`status` = 'planned')     AS planned,
            COUNT(DISTINCT `client_id`)   AS clients
         FROM `sessions` WHERE `starts_at` >= ? AND `starts_at` < ?"
    );
    $stmt->execute([$start . ' 00:00:00', $end . ' 00:00:00']);
    $month_agg = $stmt->fetch() ?: [];

    // ---- Encaissements du mois ----
    $stmt = $db->prepare(
        'SELECT COALESCE(SUM(`amount_cents`),0) AS amount,
                COALESCE(SUM(`sessions_count`),0) AS sessions,
                COUNT(*) AS payments
         FROM `payments` WHERE `paid_on` >= ? AND `paid_on` < ?'
    );
    $stmt->execute([$start, $end]);
    $money = $stmt->fetch() ?: [];

    // ---- 12 derniers mois ----
    $stmt = $db->prepare(
        "SELECT DATE_FORMAT(`starts_at`, '%Y-%m') AS m, COUNT(*) AS n
         FROM `sessions`
         WHERE `status` = 'done' AND `starts_at` >= ?
         GROUP BY m ORDER BY m"
    );
    $stmt->execute([date('Y-m-01', strtotime($start . ' -11 months'))]);
    $history = $stmt->fetchAll();

    $stmt = $db->prepare(
        "SELECT DATE_FORMAT(`paid_on`, '%Y-%m') AS m, SUM(`amount_cents`) AS cents
         FROM `payments` WHERE `paid_on` >= ? GROUP BY m ORDER BY m"
    );
    $stmt->execute([date('Y-m-01', strtotime($start . ' -11 months'))]);
    $revenue = $stmt->fetchAll();

    // ---- Semaine en cours ----
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $weekEnd   = date('Y-m-d', strtotime($weekStart . ' +7 days'));
    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM `sessions`
         WHERE `starts_at` >= ? AND `starts_at` < ? AND `status` IN ('planned','done')"
    );
    $stmt->execute([$weekStart . ' 00:00:00', $weekEnd . ' 00:00:00']);
    $weekCount = (int) $stmt->fetchColumn();

    // ---- Portefeuille clients ----
    $clients = $db->query("SELECT * FROM `clients` WHERE `status` <> 'archived'")->fetchAll();
    $active = 0; $paused = 0; $owed = 0; $unpaidSessions = 0;
    foreach ($clients as $c) {
        if ($c['status'] === 'active') $active++;
        if ($c['status'] === 'paused') $paused++;
        $s = clientStats($c);
        if ($s['balance'] < 0) {
            $unpaidSessions += -$s['balance'];
            $owed           += -$s['balance'] * (int) $c['rate_cents'];
        }
    }

    respond([
        'month'    => $month,
        'sessions' => [
            'done'       => (int) (isset($month_agg['done']) ? $month_agg['done'] : 0),
            'planned'    => (int) (isset($month_agg['planned']) ? $month_agg['planned'] : 0),
            'cancelled'  => (int) (isset($month_agg['cancelled']) ? $month_agg['cancelled'] : 0),
            'lateCancel' => (int) (isset($month_agg['late_cancel']) ? $month_agg['late_cancel'] : 0),
            'noShow'     => (int) (isset($month_agg['no_show']) ? $month_agg['no_show'] : 0),
            'clients'    => (int) (isset($month_agg['clients']) ? $month_agg['clients'] : 0),
        ],
        'money'    => [
            'cashedCents'    => (int) (isset($money['amount']) ? $money['amount'] : 0),
            'sessionsPaid'   => (int) (isset($money['sessions']) ? $money['sessions'] : 0),
            'payments'       => (int) (isset($money['payments']) ? $money['payments'] : 0),
            'outstandingCents'   => $owed,
            'outstandingSessions'=> $unpaidSessions,
        ],
        'clients'  => [
            'active' => $active,
            'paused' => $paused,
            'total'  => count($clients),
        ],
        'week'     => ['start' => $weekStart, 'sessions' => $weekCount],
        'history'  => $history,
        'revenue'  => $revenue,
    ]);
});
