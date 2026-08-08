<?php
/**
 * bootstrap.php
 * Socle commun à tous les points d'entrée de l'API :
 * connexion PDO, session, helpers JSON, authentification.
 */

require_once __DIR__ . '/config.php';

date_default_timezone_set(APP_TZ);
mb_internal_encoding('UTF-8');

/* ================================================================
   BASE DE DONNÉES
   ================================================================ */

/** 'sqlite' ou 'mysql'. */
function driver(): string {
    return defined('DB_DRIVER') ? DB_DRIVER : 'mysql';
}

function db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    if (driver() === 'sqlite') {
        $dir = dirname(DB_FILE);
        if (!is_dir($dir)) @mkdir($dir, 0770, true);
        $pdo = new PDO('sqlite:' . DB_FILE, null, null, $options);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA busy_timeout = 4000');
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    // Aligner le fuseau MySQL sur celui de PHP (NOW(), CURRENT_TIMESTAMP).
    $offset = (new DateTime('now', new DateTimeZone(APP_TZ)))->format('P');
    $pdo->exec("SET time_zone = '$offset'");
    return $pdo;
}

/* ================================================================
   FRAGMENTS SQL PORTABLES
   Les deux moteurs ne parlent pas tout à fait le même SQL.
   ================================================================ */

/** Insertion qui ignore les doublons de clé. */
function sqlInsertIgnore(): string {
    return driver() === 'sqlite' ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
}

/** Extraction « AAAA-MM » d'une colonne date. */
function sqlMonth(string $column): string {
    return driver() === 'sqlite'
        ? "strftime('%Y-%m', $column)"
        : "DATE_FORMAT($column, '%Y-%m')";
}

/** Horodatage courant, passé en paramètre plutôt qu'en fonction SQL. */
function sqlNow(): string {
    return date('Y-m-d H:i:s');
}

/* ================================================================
   RÉPONSES JSON
   ================================================================ */

function jsonHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
}

function respond($data, int $code = 200): void {
    jsonHeaders();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400): void {
    respond(['error' => $message], $code);
}

/** Corps JSON de la requête, sous forme de tableau. */
function input(): array {
    static $cache = null;
    if ($cache === null) {
        $raw   = file_get_contents('php://input');
        $data  = $raw === '' ? [] : json_decode($raw, true);
        $cache = is_array($data) ? $data : [];
    }
    return $cache;
}

function param(string $name, $default = null) {
    $in = input();
    if (array_key_exists($name, $in)) return $in[$name];
    if (isset($_GET[$name]))          return $_GET[$name];
    return $default;
}

function intParam(string $name, int $default = 0): int {
    $v = param($name, $default);
    return (int) $v;
}

/* ================================================================
   SESSION & AUTHENTIFICATION
   ================================================================ */

function startSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 30,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => !empty($_SERVER['HTTPS']),
    ]);
    session_name('LMTSESS');
    session_start();
}

function isLoggedIn(): bool {
    startSession();
    return !empty($_SESSION['auth']);
}

/** Coupe la requête avec un 401 si l'utilisateur n'est pas connecté. */
function requireAuth(): void {
    if (!isLoggedIn()) fail('Non authentifié.', 401);
}

/** true si le mot de passe livré par défaut est toujours en place. */
function usingDefaultPassword(): bool {
    return password_verify('lmt-coaching', AUTH_PASSWORD_HASH);
}

/* ================================================================
   RÉGLAGES
   ================================================================ */

function settings(bool $fresh = false): array {
    static $cache = null;
    if ($cache === null || $fresh) {
        $cache = [];
        foreach (db()->query('SELECT `skey`, `svalue` FROM `settings`') as $row) {
            $cache[$row['skey']] = $row['svalue'];
        }
    }
    return $cache;
}

function setting(string $key, $default = null) {
    $s = settings();
    return array_key_exists($key, $s) && $s[$key] !== null && $s[$key] !== ''
        ? $s[$key]
        : $default;
}

function settingInt(string $key, int $default = 0): int {
    return (int) setting($key, $default);
}

function saveSetting(string $key, $value): void {
    $sql = driver() === 'sqlite'
        ? 'INSERT INTO `settings` (`skey`, `svalue`) VALUES (?, ?)
           ON CONFLICT(`skey`) DO UPDATE SET `svalue` = excluded.`svalue`'
        : 'INSERT INTO `settings` (`skey`, `svalue`) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE `svalue` = VALUES(`svalue`)';
    db()->prepare($sql)->execute([$key, (string) $value]);
}

/* ================================================================
   OUTILS
   ================================================================ */

/** Vérifie qu'une chaîne est une date « Y-m-d » valide. */
function isDate(?string $s): bool {
    if (!$s) return false;
    $d = DateTime::createFromFormat('Y-m-d', $s);
    return $d && $d->format('Y-m-d') === $s;
}

/** Normalise un « 2026-03-04T14:00 » ou « 2026-03-04 14:00:00 » en DATETIME MySQL. */
function normalizeDateTime(?string $s): ?string {
    if (!$s) return null;
    $s = str_replace('T', ' ', trim($s));
    if (strlen($s) === 16) $s .= ':00';
    $d = DateTime::createFromFormat('Y-m-d H:i:s', $s);
    return ($d && $d->format('Y-m-d H:i:s') === $s) ? $s : null;
}

/** Attrape toutes les erreurs d'un endpoint et les renvoie en JSON. */
function runEndpoint(callable $fn): void {
    try {
        $fn();
    } catch (Throwable $e) {
        error_log('[LMT] ' . $e->getMessage());
        respond(['error' => 'Erreur serveur : ' . $e->getMessage()], 500);
    }
}

/** Rejette les méthodes non prévues et répond aux pré-vols CORS. */
function handlePreflight(string $methods): void {
    header('Allow: ' . $methods);
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
