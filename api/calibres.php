<?php
/**
 * calibres.php
 * API REST pour gérer les calibres AquaStock.
 *
 * GET    api/calibres.php          → liste tous les calibres
 * POST   api/calibres.php          → crée un nouveau calibre
 * PUT    api/calibres.php?id=X     → met à jour un calibre
 * DELETE api/calibres.php?id=X     → supprime un calibre
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $db     = getDb();
    $method = $_SERVER['REQUEST_METHOD'];

    // ── GET — Lister tous les calibres ──
    if ($method === 'GET') {
        $rows = $db->query('SELECT * FROM `calibres` ORDER BY `sort_order`, `id`')->fetchAll();
        $result = array_map(function ($r) {
            $species = $r['species'] ? json_decode($r['species'], true) : [];
            return [
                'id'        => (int) $r['id'],
                'key'       => $r['key'],
                'label'     => $r['label'],
                'type'      => $r['type'],
                'min'       => (int) $r['min'],
                'max'       => (int) $r['max'],
                'targetMin' => (int) $r['target_min'],
                'targetMax' => (int) $r['target_max'],
                'species'   => $species,
            ];
        }, $rows);
        echo json_encode($result);
        exit;
    }

    // ── POST — Créer un calibre ──
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'JSON invalide']);
            exit;
        }

        $stmt = $db->prepare('
            INSERT INTO `calibres` (`key`, `label`, `type`, `min`, `max`, `target_min`, `target_max`, `species`, `sort_order`)
            VALUES (:key, :label, :type, :min, :max, :target_min, :target_max, :species, :sort_order)
        ');
        $stmt->execute([
            ':key'        => $data['key'] ?? '',
            ':label'      => $data['label'] ?? '',
            ':type'       => $data['type'] ?? 'entier',
            ':min'        => $data['min'] ?? 0,
            ':max'        => $data['max'] ?? 500,
            ':target_min' => $data['targetMin'] ?? 0,
            ':target_max' => $data['targetMax'] ?? 500,
            ':species'    => json_encode($data['species'] ?? []),
            ':sort_order' => $data['sortOrder'] ?? 0,
        ]);

        $newId = (int) $db->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId]);
        exit;
    }

    // ── PUT — Mettre à jour un calibre ──
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
            UPDATE `calibres` SET
                `key`        = :key,
                `label`      = :label,
                `type`       = :type,
                `min`        = :min,
                `max`        = :max,
                `target_min` = :target_min,
                `target_max` = :target_max,
                `species`    = :species
            WHERE `id` = :id
        ');
        $stmt->execute([
            ':id'         => $id,
            ':key'        => $data['key'] ?? '',
            ':label'      => $data['label'] ?? '',
            ':type'       => $data['type'] ?? 'entier',
            ':min'        => $data['min'] ?? 0,
            ':max'        => $data['max'] ?? 500,
            ':target_min' => $data['targetMin'] ?? 0,
            ':target_max' => $data['targetMax'] ?? 500,
            ':species'    => json_encode($data['species'] ?? []),
        ]);

        echo json_encode(['success' => true]);
        exit;
    }

    // ── DELETE — Supprimer un calibre ──
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'id manquant']);
            exit;
        }

        $stmt = $db->prepare('DELETE FROM `calibres` WHERE `id` = :id');
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
