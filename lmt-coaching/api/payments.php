<?php
/**
 * payments.php
 * Encaissements par blocs de séances payés d'avance (12 au premier contrat,
 * puis 4 par 4).
 *
 * GET    api/payments.php?clientId=X → paiements d'un client
 * GET    api/payments.php            → tous les paiements (?from=&to=)
 * POST   api/payments.php            → enregistrement d'un encaissement
 * DELETE api/payments.php?id=X       → suppression
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';

handlePreflight('GET, POST, DELETE, OPTIONS');
requireAuth();

function serializePayment(array $p): array {
    return [
        'id'            => (int) $p['id'],
        'clientId'      => (int) $p['client_id'],
        'clientName'    => isset($p['first_name']) ? trim($p['first_name'] . ' ' . $p['last_name']) : null,
        'sessionsCount' => (int) $p['sessions_count'],
        'amountCents'   => (int) $p['amount_cents'],
        'method'        => $p['method'],
        'paidOn'        => $p['paid_on'],
        'note'          => $p['note'],
        'createdAt'     => $p['created_at'],
    ];
}

runEndpoint(function () {
    $db     = db();
    $method = $_SERVER['REQUEST_METHOD'];
    $id     = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($method === 'GET') {
        $sql    = 'SELECT p.*, c.`first_name`, c.`last_name`
                   FROM `payments` p JOIN `clients` c ON c.`id` = p.`client_id`';
        $where  = [];
        $params = [];

        if (!empty($_GET['clientId'])) { $where[] = 'p.`client_id` = ?'; $params[] = (int) $_GET['clientId']; }
        if (!empty($_GET['from']) && isDate($_GET['from'])) { $where[] = 'p.`paid_on` >= ?'; $params[] = $_GET['from']; }
        if (!empty($_GET['to'])   && isDate($_GET['to']))   { $where[] = 'p.`paid_on` <= ?'; $params[] = $_GET['to']; }

        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY p.`paid_on` DESC, p.`id` DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        respond(array_map('serializePayment', $stmt->fetchAll()));
    }

    if ($method === 'POST') {
        $in       = input();
        $clientId = (int) (isset($in['clientId']) ? $in['clientId'] : 0);
        if ($clientId <= 0) fail('Client manquant.');

        $count = (int) (isset($in['sessionsCount']) ? $in['sessionsCount'] : settingInt('payment_block', 4));
        if ($count <= 0) fail('Nombre de séances invalide.');

        $amount = 0;
        if (isset($in['amountCents']) && $in['amountCents'] !== '') {
            $amount = max(0, (int) $in['amountCents']);
        } elseif (isset($in['amountEuros']) && $in['amountEuros'] !== '') {
            $amount = (int) round(((float) str_replace(',', '.', (string) $in['amountEuros'])) * 100);
        } else {
            // Par défaut : nombre de séances × tarif du client.
            $stmt = $db->prepare('SELECT `rate_cents` FROM `clients` WHERE `id` = ?');
            $stmt->execute([$clientId]);
            $amount = $count * (int) $stmt->fetchColumn();
        }

        $paidOn = isset($in['paidOn']) && isDate($in['paidOn']) ? $in['paidOn'] : date('Y-m-d');

        $stmt = $db->prepare(
            'INSERT INTO `payments` (`client_id`, `sessions_count`, `amount_cents`, `method`, `paid_on`, `note`)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $clientId, $count, $amount,
            isset($in['method']) ? $in['method'] : null,
            $paidOn,
            isset($in['note']) ? $in['note'] : null,
        ]);

        $newId = (int) $db->lastInsertId();
        $stmt  = $db->prepare(
            'SELECT p.*, c.`first_name`, c.`last_name`
             FROM `payments` p JOIN `clients` c ON c.`id` = p.`client_id` WHERE p.`id` = ?'
        );
        $stmt->execute([$newId]);
        respond(serializePayment($stmt->fetch()), 201);
    }

    if ($method === 'DELETE') {
        if ($id <= 0) fail('Paramètre « id » manquant.');
        $stmt = $db->prepare('DELETE FROM `payments` WHERE `id` = ?');
        $stmt->execute([$id]);
        respond(['deleted' => $stmt->rowCount() > 0]);
    }

    fail('Méthode non supportée.', 405);
});
