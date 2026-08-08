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

/**
 * Découpe un fichier SQL en instructions.
 * Les déclencheurs SQLite contiennent des points-virgules entre BEGIN et END :
 * on ne coupe donc pas à l'intérieur de ces blocs.
 */
function splitSql(string $sql): array {
    $sql   = preg_replace('/^\s*--.*$/m', '', $sql);
    $out   = [];
    $buf   = '';
    $block = false;

    foreach (preg_split('/\R/', $sql) as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' && $buf === '') continue;
        $buf .= $line . "\n";

        if (!$block && preg_match('/\bBEGIN\s*$/i', $trimmed)) {
            $block = true;
            continue;
        }
        if ($block) {
            if (preg_match('/^END\s*;?$/i', $trimmed)) {
                $block = false;
                $out[] = trim($buf);
                $buf   = '';
            }
            continue;
        }
        if (substr($trimmed, -1) === ';') {
            $out[] = rtrim(trim($buf), ';');
            $buf   = '';
        }
    }
    if (trim($buf) !== '') $out[] = rtrim(trim($buf), ';');

    return array_values(array_filter($out, function ($s) { return trim($s) !== ''; }));
}

/** Tables présentes, quel que soit le moteur. */
function listTables(PDO $db): array {
    $out = [];
    $sql = driver() === 'sqlite'
        ? "SELECT `name` FROM `sqlite_master` WHERE `type` = 'table'"
        : 'SHOW TABLES';
    foreach ($db->query($sql) as $row) $out[] = array_values($row)[0];
    return $out;
}

runEndpoint(function () {
    $db     = db();
    $tables = ['clients', 'recurrences', 'sessions', 'occurrence_skips',
               'payments', 'reminder_log', 'alert_acks', 'settings'];

    $existing = listTables($db);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        respond([
            'installed' => count(array_diff($tables, $existing)) === 0,
            'missing'   => array_values(array_diff($tables, $existing)),
            'driver'    => driver(),
            'database'  => driver() === 'sqlite' ? DB_FILE : DB_NAME,
        ]);
    }

    $file = driver() === 'sqlite' ? '/schema.sqlite.sql' : '/schema.sql';
    $sql  = file_get_contents(__DIR__ . $file);
    if ($sql === false) fail('Fichier de schéma introuvable : ' . $file, 500);

    $done = 0;
    foreach (splitSql($sql) as $stmt) {
        $db->exec($stmt);
        $done++;
    }

    $existing = listTables($db);

    respond([
        'statements' => $done,
        'installed'  => count(array_diff($tables, $existing)) === 0,
        'missing'    => array_values(array_diff($tables, $existing)),
    ]);
});
