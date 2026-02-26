<?php
/**
 * lots.php
 * API REST pour gérer les lots AquaStock.
 *
 * GET    api/lots.php          → liste tous les lots
 * POST   api/lots.php          → crée un nouveau lot
 * PUT    api/lots.php?id=X     → met à jour un lot
 * DELETE api/lots.php?id=X     → supprime un lot
 * PATCH  api/lots.php?action=bulk_update  → mise à jour en masse (poids après navigation temporelle)
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $db     = getDb();
    $method = $_SERVER['REQUEST_METHOD'];

    // ── GET — Lister tous les lots ──
    if ($method === 'GET') {
        $rows = $db->query('SELECT * FROM `lots` ORDER BY `id`')->fetchAll();
        // Convertir en format JS attendu
        $result = array_map(function ($r) {
            return [
                'id'            => (int) $r['id'],
                'name'          => $r['name'],
                'speciesKey'    => $r['species_key'],
                'calibreKey'    => $r['calibre_key'],
                'quantity'      => (float) $r['quantity'],
                'currentWeight' => (float) $r['current_weight'],
                'costPrice'     => (float) $r['cost_price'],
                'salePrice'     => (float) $r['sale_price'],
                'toRemove'      => (bool) $r['to_remove'],
            ];
        }, $rows);
        echo json_encode($result);
        exit;
    }

    // ── POST — Créer un lot ──
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'JSON invalide']);
            exit;
        }

        $stmt = $db->prepare('
            INSERT INTO `lots` (`name`, `species_key`, `calibre_key`, `quantity`, `current_weight`, `cost_price`, `sale_price`, `to_remove`)
            VALUES (:name, :species_key, :calibre_key, :quantity, :current_weight, :cost_price, :sale_price, :to_remove)
        ');
        $stmt->execute([
            ':name'           => $data['name'],
            ':species_key'    => $data['speciesKey'],
            ':calibre_key'    => $data['calibreKey'],
            ':quantity'       => $data['quantity'],
            ':current_weight' => $data['currentWeight'],
            ':cost_price'     => $data['costPrice'],
            ':sale_price'     => $data['salePrice'],
            ':to_remove'      => !empty($data['toRemove']) ? 1 : 0,
        ]);

        $newId = (int) $db->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId]);
        exit;
    }

    // ── PUT — Mettre à jour un lot ──
    if ($method === 'PUT') {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'id manquant']);
            exit;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'JSON invalide']);
            exit;
        }

        $stmt = $db->prepare('
            UPDATE `lots` SET
                `name`           = :name,
                `species_key`    = :species_key,
                `calibre_key`    = :calibre_key,
                `quantity`       = :quantity,
                `current_weight` = :current_weight,
                `cost_price`     = :cost_price,
                `sale_price`     = :sale_price,
                `to_remove`      = :to_remove
            WHERE `id` = :id
        ');
        $stmt->execute([
            ':id'             => $id,
            ':name'           => $data['name'],
            ':species_key'    => $data['speciesKey'],
            ':calibre_key'    => $data['calibreKey'],
            ':quantity'       => $data['quantity'],
            ':current_weight' => $data['currentWeight'],
            ':cost_price'     => $data['costPrice'],
            ':sale_price'     => $data['salePrice'],
            ':to_remove'      => !empty($data['toRemove']) ? 1 : 0,
        ]);

        echo json_encode(['success' => true]);
        exit;
    }

    // ── PATCH — Mise à jour en masse (après navigation temporelle) ──
    if ($method === 'PATCH') {
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        if ($action === 'bulk_update') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data || !isset($data['lots'])) {
                http_response_code(400);
                echo json_encode(['error' => 'JSON invalide']);
                exit;
            }

            $stmt = $db->prepare('UPDATE `lots` SET `current_weight` = :w, `to_remove` = :tr WHERE `id` = :id');
            $db->beginTransaction();
            foreach ($data['lots'] as $lot) {
                $stmt->execute([
                    ':id' => (int) $lot['id'],
                    ':w'  => (float) $lot['currentWeight'],
                    ':tr' => !empty($lot['toRemove']) ? 1 : 0,
                ]);
            }
            $db->commit();

            echo json_encode(['success' => true, 'updated' => count($data['lots'])]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['error' => 'action inconnue']);
        exit;
    }

    // ── DELETE — Supprimer un lot ──
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'id manquant']);
            exit;
        }

        $stmt = $db->prepare('DELETE FROM `lots` WHERE `id` = :id');
        $stmt->execute([':id' => $id]);

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Méthode non supportée']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
