<?php
/**
 * init.php
 * Initialise la base de données SQLite AquaStock :
 *   - Crée le fichier SQLite si nécessaire
 *   - Crée les tables `species`, `calibres`, `lots`
 *   - Insère les données de démonstration si les tables sont vides
 *
 * Usage : appeler une seule fois via le navigateur → api/init.php
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = new PDO('sqlite:' . DB_PATH, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA foreign_keys=ON');

    // ── Table species ──
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS species (
            key              TEXT PRIMARY KEY,
            name             TEXT NOT NULL,
            latin            TEXT NOT NULL DEFAULT "",
            color            TEXT NOT NULL DEFAULT "#0ea5e9",
            cost_price_default REAL NOT NULL DEFAULT 0,
            sale_price_default REAL NOT NULL DEFAULT 0,
            growth_a         REAL NOT NULL DEFAULT 4000,
            growth_k         REAL NOT NULL DEFAULT 0.004,
            cost_high        REAL NOT NULL DEFAULT 14,
            cost_min         REAL NOT NULL DEFAULT 6,
            cost_mature      REAL NOT NULL DEFAULT 7.5,
            optimal_weight   INTEGER NOT NULL DEFAULT 300,
            sort_order       INTEGER NOT NULL DEFAULT 0,
            created_at       TEXT DEFAULT (datetime("now")),
            updated_at       TEXT DEFAULT (datetime("now"))
        )
    ');

    // ── Table calibres ──
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS calibres (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            key         TEXT NOT NULL UNIQUE,
            label       TEXT NOT NULL,
            type        TEXT NOT NULL DEFAULT "entier" CHECK(type IN ("entier","filet")),
            min         INTEGER NOT NULL DEFAULT 0,
            max         INTEGER NOT NULL DEFAULT 500,
            target_min  INTEGER NOT NULL DEFAULT 0,
            target_max  INTEGER NOT NULL DEFAULT 500,
            species     TEXT,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT DEFAULT (datetime("now")),
            updated_at  TEXT DEFAULT (datetime("now"))
        )
    ');

    // ── Table lots ──
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS lots (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            name           TEXT NOT NULL,
            species_key    TEXT NOT NULL,
            calibre_key    TEXT NOT NULL,
            quantity       REAL NOT NULL DEFAULT 0,
            current_weight REAL NOT NULL DEFAULT 0,
            cost_price     REAL NOT NULL DEFAULT 0,
            sale_price     REAL NOT NULL DEFAULT 0,
            to_remove      INTEGER NOT NULL DEFAULT 0,
            created_at     TEXT DEFAULT (datetime("now")),
            updated_at     TEXT DEFAULT (datetime("now"))
        )
    ');

    // ── Données de démonstration ──
    $messages = [];

    // -- Species --
    $spCount = (int) $pdo->query('SELECT COUNT(*) FROM species')->fetchColumn();
    if ($spCount === 0) {
        $speciesData = [
            ['truite-arc',      'Truite Arc-en-ciel', 'Oncorhynchus mykiss',    '#0ea5e9',  7.80,  9.50, 4200, 0.0045, 14.0,  6.2,  7.5,  300, 0],
            ['truite-fario',    'Truite Fario',       'Salmo trutta fario',      '#7c3aed', 11.20, 13.00, 2200, 0.0032, 18.0,  9.5, 11.0,  300, 1],
            ['saumon-fontaine', 'Saumon de Fontaine',  'Salvelinus fontinalis',  '#f97316', 12.30, 14.00, 3000, 0.0038, 18.0, 10.0, 12.0,  300, 2],
            ['omble',           'Omble Chevalier',     'Salvelinus alpinus',     '#0d9488', 16.20, 18.00, 3500, 0.0025, 24.0, 13.5, 16.0,  300, 3],
            ['lavaret',         'Lavaret',             'Coregonus lavaretus',    '#6366f1',  9.30, 11.00, 1600, 0.0028, 15.0,  7.8,  9.2,  300, 4],
        ];
        $stmt = $pdo->prepare('
            INSERT INTO species (key, name, latin, color, cost_price_default, sale_price_default, growth_a, growth_k, cost_high, cost_min, cost_mature, optimal_weight, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        foreach ($speciesData as $row) {
            $stmt->execute($row);
        }
        $messages[] = count($speciesData) . ' espèces';
    }

    // -- Calibres --
    $calCount = (int) $pdo->query('SELECT COUNT(*) FROM calibres')->fetchColumn();
    if ($calCount === 0) {
        $calibresData = [
            ['e200400',   'Entier 200/400',   'entier', 200,  400,  200,  400,  '["truite-arc","truite-fario","saumon-fontaine","lavaret"]', 0],
            ['e8001200',  'Entier 800/1200',  'entier', 800,  1200, 800,  1200, '["truite-arc","truite-fario","saumon-fontaine","omble","lavaret"]', 1],
            ['e15002500', 'Entier 1500/2500', 'entier', 1500, 2500, 1500, 2500, '["truite-arc","saumon-fontaine","omble"]', 2],
            ['e25003500', 'Entier 2500/3500', 'entier', 2500, 3500, 2500, 3500, '["truite-arc","saumon-fontaine"]', 3],
            ['f160200',   'Filet 160/200',    'filet',  160,  200,  160,  200,  '["truite-arc","truite-fario","lavaret"]', 4],
            ['f200400',   'Filet 200/400',    'filet',  200,  400,  200,  400,  '["truite-arc","truite-fario","saumon-fontaine"]', 5],
            ['f400600',   'Filet 400/600',    'filet',  400,  600,  400,  600,  '["truite-arc","saumon-fontaine","omble"]', 6],
        ];
        $stmt = $pdo->prepare('
            INSERT INTO calibres (key, label, type, min, max, target_min, target_max, species, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        foreach ($calibresData as $row) {
            $stmt->execute($row);
        }
        $messages[] = count($calibresData) . ' calibres';
    }

    // -- Lots --
    $lotCount = (int) $pdo->query('SELECT COUNT(*) FROM lots')->fetchColumn();
    if ($lotCount === 0) {
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
            INSERT INTO lots (name, species_key, calibre_key, quantity, current_weight, cost_price, sale_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');

        foreach ($demo as $row) {
            $stmt->execute($row);
        }
        $messages[] = count($demo) . ' lots';
    }

    if (count($messages) > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Base aquastock créée avec ' . implode(', ', $messages) . ' de démonstration.',
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'Base aquastock déjà initialisée.',
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
