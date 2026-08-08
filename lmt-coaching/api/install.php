<?php
/**
 * install.php
 * Crée les tables de la base à partir de schema.sql.
 * Protégé par le mot de passe de l'application : connectez-vous d'abord.
 *
 * GET  api/install.php → état des tables
 * POST api/install.php → création / mise à jour des tables
 */

require_once __DIR__ . '/bootstrap.php';

handlePreflight('GET, POST, OPTIONS');
requireAuth();

runEndpoint(function () {
    $db     = db();
    $tables = ['clients', 'recurrences', 'sessions', 'occurrence_skips',
               'payments', 'reminder_log', 'alert_acks', 'settings'];

    $existing = [];
    foreach ($db->query('SHOW TABLES') as $row) {
        $existing[] = array_values($row)[0];
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        respond([
            'installed' => count(array_diff($tables, $existing)) === 0,
            'missing'   => array_values(array_diff($tables, $existing)),
            'database'  => DB_NAME,
        ]);
    }

    $sql = file_get_contents(__DIR__ . '/schema.sql');
    if ($sql === false) fail('schema.sql introuvable.', 500);

    // Retirer les commentaires puis découper sur les points-virgules de fin d'instruction.
    $sql   = preg_replace('/^--.*$/m', '', $sql);
    $parts = array_filter(array_map('trim', explode(";\n", $sql . "\n")));

    $done = 0;
    foreach ($parts as $stmt) {
        $stmt = rtrim(trim($stmt), ';');
        if ($stmt === '') continue;
        $db->exec($stmt);
        $done++;
    }

    $existing = [];
    foreach ($db->query('SHOW TABLES') as $row) {
        $existing[] = array_values($row)[0];
    }

    respond([
        'statements' => $done,
        'installed'  => count(array_diff($tables, $existing)) === 0,
        'missing'    => array_values(array_diff($tables, $existing)),
    ]);
});
