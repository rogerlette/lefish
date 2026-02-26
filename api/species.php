<?php
/**
 * species.php
 * API REST pour gérer les espèces AquaStock.
 *
 * GET    api/species.php              → liste toutes les espèces
 * PUT    api/species.php?key=X        → met à jour une espèce (paramètres de croissance/coût)
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $db     = getDb();
    $method = $_SERVER['REQUEST_METHOD'];

    // ── GET — Lister toutes les espèces ──
    if ($method === 'GET') {
        $rows = $db->query('SELECT * FROM `species` ORDER BY `sort_order`, `key`')->fetchAll();
        $result = array_map(function ($r) {
            return [
                'key'           => $r['key'],
                'name'          => $r['name'],
                'latin'         => $r['latin'],
                'color'         => $r['color'],
                'defaults'      => [
                    'costPrice'  => (float) $r['cost_price_default'],
                    'salePrice'  => (float) $r['sale_price_default'],
                ],
                'growthA'       => (float) $r['growth_a'],
                'growthK'       => (float) $r['growth_k'],
                'costHigh'      => (float) $r['cost_high'],
                'costMin'       => (float) $r['cost_min'],
                'costMature'    => (float) $r['cost_mature'],
                'optimalWeight' => (int) $r['optimal_weight'],
            ];
        }, $rows);
        echo json_encode($result);
        exit;
    }

    // ── PUT — Mettre à jour une espèce ──
    if ($method === 'PUT') {
        $key = isset($_GET['key']) ? $_GET['key'] : '';
        if (!$key) {
            http_response_code(400);
            echo json_encode(['error' => 'key manquant']);
            exit;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'JSON invalide']);
            exit;
        }

        $stmt = $db->prepare('
            UPDATE `species` SET
                `name`               = :name,
                `latin`              = :latin,
                `color`              = :color,
                `cost_price_default` = :cost_price_default,
                `sale_price_default` = :sale_price_default,
                `growth_a`           = :growth_a,
                `growth_k`           = :growth_k,
                `cost_high`          = :cost_high,
                `cost_min`           = :cost_min,
                `cost_mature`        = :cost_mature,
                `optimal_weight`     = :optimal_weight
            WHERE `key` = :key
        ');
        $stmt->execute([
            ':key'                => $key,
            ':name'               => $data['name'] ?? '',
            ':latin'              => $data['latin'] ?? '',
            ':color'              => $data['color'] ?? '#0ea5e9',
            ':cost_price_default' => $data['defaults']['costPrice'] ?? 0,
            ':sale_price_default' => $data['defaults']['salePrice'] ?? 0,
            ':growth_a'           => $data['growthA'] ?? 4000,
            ':growth_k'           => $data['growthK'] ?? 0.004,
            ':cost_high'          => $data['costHigh'] ?? 14,
            ':cost_min'           => $data['costMin'] ?? 6,
            ':cost_mature'        => $data['costMature'] ?? 7.5,
            ':optimal_weight'     => $data['optimalWeight'] ?? 300,
        ]);

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Méthode non supportée']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
