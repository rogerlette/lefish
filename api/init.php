<?php
/**
 * init.php
 * Initialise la base de données AquaStock :
 *   - Crée la base si elle n'existe pas
 *   - Crée la table `lots`
 *   - Insère les données de démonstration si la table est vide
 *
 * Usage : appeler une seule fois via le navigateur → api/init.php
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // ── Connexion SANS sélectionner de base ──
    $dsn = sprintf('mysql:host=%s;port=%d;charset=%s', DB_HOST, DB_PORT, DB_CHARSET);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    // ── Création de la base ──
    $pdo->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $pdo->exec('USE `' . DB_NAME . '`');

    // ── Table lots ──
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS `lots` (
            `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `name`           VARCHAR(50)    NOT NULL,
            `species_key`    VARCHAR(30)    NOT NULL,
            `calibre_key`    VARCHAR(30)    NOT NULL,
            `quantity`       DECIMAL(10,2)  NOT NULL DEFAULT 0,
            `current_weight` DECIMAL(10,2)  NOT NULL DEFAULT 0,
            `cost_price`     DECIMAL(8,2)   NOT NULL DEFAULT 0,
            `sale_price`     DECIMAL(8,2)   NOT NULL DEFAULT 0,
            `to_remove`      TINYINT(1)     NOT NULL DEFAULT 0,
            `created_at`     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
            `updated_at`     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ');

    // ── Données de démonstration (uniquement si table vide) ──
    $count = (int) $pdo->query('SELECT COUNT(*) FROM `lots`')->fetchColumn();

    if ($count === 0) {
        $demo = [
            // Truite Arc-en-ciel
            ['A1', 'truite-arc', 'e200400',   620, 430,  7.80,  9.50],
            ['A2', 'truite-arc', 'e200400',   480, 310,  7.80,  9.50],
            ['A3', 'truite-arc', 'e200400',   390, 460,  7.80,  9.50],
            ['A4', 'truite-arc', 'e200400',   310, 140,  7.80,  9.50],
            ['B1', 'truite-arc', 'e8001200',  850, 980,  7.80,  9.50],
            ['B2', 'truite-arc', 'e8001200',  490, 1100, 7.80,  9.50],
            ['B3', 'truite-arc', 'e8001200',  360, 1340, 7.80,  9.50],
            ['B4', 'truite-arc', 'e8001200',  700, 600,  7.80,  9.50],
            ['C1', 'truite-arc', 'e15002500', 280, 1800, 8.10,  9.90],
            ['C2', 'truite-arc', 'e15002500', 200, 1100, 8.10,  9.90],
            ['D1', 'truite-arc', 'f200400',   300, 280,  9.50,  11.40],
            ['D2', 'truite-arc', 'f200400',   180, 430,  9.50,  11.40],
            ['D3', 'truite-arc', 'f400600',   220, 510,  9.80,  11.60],
            // Truite Fario
            ['F1', 'truite-fario', 'e200400',  280, 250,  11.20, 13.00],
            ['F2', 'truite-fario', 'e200400',  190, 380,  11.20, 13.00],
            ['F3', 'truite-fario', 'e200400',  160, 460,  11.20, 13.00],
            ['F4', 'truite-fario', 'e200400',  220, 110,  11.20, 13.00],
            ['G1', 'truite-fario', 'e8001200', 150, 950,  11.20, 13.00],
            ['G2', 'truite-fario', 'e8001200', 120, 1150, 11.20, 13.00],
            ['G3', 'truite-fario', 'e8001200', 200, 500,  11.20, 13.00],
            ['H1', 'truite-fario', 'f160200',  100, 185,  13.10, 15.00],
            // Saumon de Fontaine
            ['R1', 'saumon-fontaine', 'e8001200',  410, 1050, 12.30, 14.00],
            ['R2', 'saumon-fontaine', 'e8001200',  290, 870,  12.30, 14.00],
            ['R3', 'saumon-fontaine', 'e8001200',  350, 1340, 12.30, 14.00],
            ['R4', 'saumon-fontaine', 'e8001200',  500, 580,  12.30, 14.00],
            ['S1', 'saumon-fontaine', 'e15002500', 340, 1900, 12.30, 14.00],
            ['S2', 'saumon-fontaine', 'e15002500', 260, 2300, 12.30, 14.00],
            ['S3', 'saumon-fontaine', 'e15002500', 180, 2750, 12.30, 14.00],
            ['S4', 'saumon-fontaine', 'e15002500', 500, 900,  12.30, 14.00],
            ['T1', 'saumon-fontaine', 'f400600',   200, 490,  15.10, 17.00],
            ['T2', 'saumon-fontaine', 'f400600',   150, 650,  15.10, 17.00],
            // Omble Chevalier
            ['N1', 'omble', 'e8001200',  180, 950,  16.20, 18.00],
            ['N2', 'omble', 'e8001200',  140, 1100, 16.20, 18.00],
            ['N3', 'omble', 'e8001200',  200, 600,  16.20, 18.00],
            ['O1', 'omble', 'e15002500', 220, 1600, 16.20, 18.00],
            ['O2', 'omble', 'e15002500', 150, 2200, 16.20, 18.00],
            ['O3', 'omble', 'e15002500', 110, 2800, 16.20, 18.00],
            ['O4', 'omble', 'e15002500', 300, 900,  16.20, 18.00],
            ['P1', 'omble', 'f200400',   80,  250,  20.10, 22.00],
            // Lavaret
            ['L1', 'lavaret', 'e200400',  460, 310,  9.30, 11.00],
            ['L2', 'lavaret', 'e200400',  310, 260,  9.30, 11.00],
            ['L3', 'lavaret', 'e200400',  200, 430,  9.30, 11.00],
            ['L4', 'lavaret', 'e200400',  380, 130,  9.30, 11.00],
            ['M1', 'lavaret', 'e8001200', 250, 900,  9.30, 11.00],
            ['M2', 'lavaret', 'e8001200', 180, 650,  9.30, 11.00],
            ['K1', 'lavaret', 'f160200',  200, 175,  11.50, 13.30],
            ['K2', 'lavaret', 'f160200',  140, 125,  11.50, 13.30],
        ];

        $stmt = $pdo->prepare('
            INSERT INTO `lots` (`name`, `species_key`, `calibre_key`, `quantity`, `current_weight`, `cost_price`, `sale_price`)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');

        foreach ($demo as $row) {
            $stmt->execute($row);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Base aquastock créée avec ' . count($demo) . ' lots de démonstration.',
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'Base aquastock déjà initialisée (' . $count . ' lots existants).',
        ]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
