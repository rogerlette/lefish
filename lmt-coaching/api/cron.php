<?php
/**
 * cron.php
 * Tâche planifiée quotidienne (voir README) :
 *   1. prolonge les cours récurrents jusqu'à l'horizon ;
 *   2. envoie les rappels e-mail dus aux clients.
 *
 * Appel : https://…/api/cron.php?key=CLE_CRON
 * Option : &dry=1 pour voir ce qui partirait sans rien envoyer.
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';
require_once __DIR__ . '/mailer.php';

runEndpoint(function () {
    $key = isset($_GET['key']) ? $_GET['key'] : '';
    if (!hash_equals(CRON_KEY, (string) $key) && !isLoggedIn()) {
        fail('Clé invalide.', 403);
    }

    $generated = generateAllOccurrences();

    if (!empty($_GET['dry'])) {
        $now  = date('Y-m-d H:i:s');
        $max  = date('Y-m-d H:i:s', strtotime('+' . (settingInt('reminder_days', 2) + 14) . ' days'));
        $stmt = db()->prepare(
            "SELECT s.`id`, s.`starts_at`, c.`email`, c.`reminder_days`, c.`reminder_email`
             FROM `sessions` s JOIN `clients` c ON c.`id` = s.`client_id`
             WHERE s.`status` = 'planned' AND s.`starts_at` BETWEEN ? AND ?
             ORDER BY s.`starts_at`"
        );
        $stmt->execute([$now, $max]);

        respond([
            'dryRun'            => true,
            'sessionsGenerated' => $generated,
            'candidates'        => $stmt->fetchAll(),
        ]);
    }

    $mails = sendDueReminders();

    respond([
        'ranAt'             => date('c'),
        'sessionsGenerated' => $generated,
        'remindersSent'     => $mails['sent'],
        'remindersSkipped'  => $mails['skipped'],
        'details'           => $mails['details'],
        'pendingAlerts'     => count(buildAlerts()),
    ]);
});
