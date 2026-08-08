<?php
/**
 * notifications.php
 * Alertes du coach : appels à passer avant une séance spéciale, paiements à
 * encaisser, séances à pointer, clients sans cours planifié.
 *
 * GET  api/notifications.php            → alertes en attente
 * GET  api/notifications.php?all=1      → alertes traitées comprises
 * POST api/notifications.php?action=ack   → { key } : marquer comme fait
 * POST api/notifications.php?action=unack → { key } : remettre en attente
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';

handlePreflight('GET, POST, OPTIONS');
requireAuth();

runEndpoint(function () {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if ($method === 'GET') {
        $alerts = buildAlerts(!empty($_GET['all']));
        $counts = ['high' => 0, 'medium' => 0, 'low' => 0];
        foreach ($alerts as $a) {
            if (!$a['acked']) $counts[$a['severity']]++;
        }
        respond([
            'alerts'  => $alerts,
            'counts'  => $counts,
            'pending' => array_sum($counts),
        ]);
    }

    if ($method === 'POST') {
        $key = trim((string) param('key', ''));
        if ($key === '') fail('Clé d\'alerte manquante.');

        if ($action === 'unack') {
            $stmt = db()->prepare('DELETE FROM `alert_acks` WHERE `alert_key` = ?');
            $stmt->execute([$key]);
            respond(['acked' => false]);
        }

        $stmt = db()->prepare(
            'INSERT INTO `alert_acks` (`alert_key`) VALUES (?)
             ON DUPLICATE KEY UPDATE `acked_at` = NOW()'
        );
        $stmt->execute([$key]);
        respond(['acked' => true]);
    }

    fail('Méthode non supportée.', 405);
});
