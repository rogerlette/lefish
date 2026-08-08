<?php
/**
 * auth.php
 * Connexion / déconnexion / état de session.
 *
 * GET    api/auth.php              → état de la session
 * POST   api/auth.php              → { password } : connexion
 * POST   api/auth.php?action=logout → déconnexion
 */

require_once __DIR__ . '/bootstrap.php';

handlePreflight('GET, POST, OPTIONS');

runEndpoint(function () {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if ($method === 'GET') {
        respond([
            'authenticated'   => isLoggedIn(),
            'defaultPassword' => usingDefaultPassword(),
        ]);
    }

    if ($method !== 'POST') fail('Méthode non supportée.', 405);

    startSession();

    if ($action === 'logout') {
        $_SESSION = [];
        session_destroy();
        respond(['authenticated' => false]);
    }

    // Anti force brute basique : une tentative par seconde et par session.
    $last = isset($_SESSION['last_try']) ? (int) $_SESSION['last_try'] : 0;
    if (time() - $last < 1) {
        fail('Trop de tentatives, réessayez dans un instant.', 429);
    }
    $_SESSION['last_try'] = time();

    $password = (string) param('password', '');
    if (!password_verify($password, AUTH_PASSWORD_HASH)) {
        usleep(400000);
        fail('Mot de passe incorrect.', 401);
    }

    session_regenerate_id(true);
    $_SESSION['auth']    = true;
    $_SESSION['auth_at'] = time();

    respond([
        'authenticated'   => true,
        'defaultPassword' => usingDefaultPassword(),
    ]);
});
