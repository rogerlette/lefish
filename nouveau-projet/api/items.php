<?php
/**
 * items.php
 * API REST pour gérer les éléments.
 *
 * GET    api/items.php        → liste tous les éléments
 * POST   api/items.php        → crée un élément
 * PUT    api/items.php?id=X   → met à jour un élément
 * DELETE api/items.php?id=X   → supprime un élément
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

/** Convertit une ligne SQL en objet attendu par le front. */
function rowToItem(array $r): array {
    return [
        'id'          => (int) $r['id'],
        'name'        => $r['name'],
        'description' => $r['description'],
        'quantity'    => (int) $r['quantity'],
        'createdAt'   => $r['created_at'],
        'updatedAt'   => $r['updated_at'],
    ];
}

try {
    $db     = getDb();
    $method = $_SERVER['REQUEST_METHOD'];
    $id     = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    // ── GET — Lister ──
    if ($method === 'GET') {
        $rows = $db->query('SELECT * FROM `items` ORDER BY `id`')->fetchAll();
        echo json_encode(array_map('rowToItem', $rows));
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    // ── POST — Créer ──
    if ($method === 'POST') {
        $name = trim($input['name'] ?? '');
        if ($name === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Le champ "name" est obligatoire.']);
            exit;
        }

        $stmt = $db->prepare(
            'INSERT INTO `items` (`name`, `description`, `quantity`) VALUES (?, ?, ?)'
        );
        $stmt->execute([
            $name,
            $input['description'] ?? null,
            (int) ($input['quantity'] ?? 0),
        ]);

        $newId = (int) $db->lastInsertId();
        $stmt  = $db->prepare('SELECT * FROM `items` WHERE `id` = ?');
        $stmt->execute([$newId]);

        http_response_code(201);
        echo json_encode(rowToItem($stmt->fetch()));
        exit;
    }

    // ── PUT — Mettre à jour ──
    if ($method === 'PUT') {
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Paramètre "id" manquant.']);
            exit;
        }

        $stmt = $db->prepare('SELECT * FROM `items` WHERE `id` = ?');
        $stmt->execute([$id]);
        $current = $stmt->fetch();
        if (!$current) {
            http_response_code(404);
            echo json_encode(['error' => 'Élément introuvable.']);
            exit;
        }

        $stmt = $db->prepare(
            'UPDATE `items` SET `name` = ?, `description` = ?, `quantity` = ? WHERE `id` = ?'
        );
        $stmt->execute([
            $input['name']        ?? $current['name'],
            $input['description'] ?? $current['description'],
            (int) ($input['quantity'] ?? $current['quantity']),
            $id,
        ]);

        $stmt = $db->prepare('SELECT * FROM `items` WHERE `id` = ?');
        $stmt->execute([$id]);
        echo json_encode(rowToItem($stmt->fetch()));
        exit;
    }

    // ── DELETE — Supprimer ──
    if ($method === 'DELETE') {
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Paramètre "id" manquant.']);
            exit;
        }

        $stmt = $db->prepare('DELETE FROM `items` WHERE `id` = ?');
        $stmt->execute([$id]);

        echo json_encode(['deleted' => $stmt->rowCount() > 0]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Méthode non supportée.']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
