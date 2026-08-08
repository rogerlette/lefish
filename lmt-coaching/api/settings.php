<?php
/**
 * settings.php
 * Réglages généraux de l'application.
 *
 * GET api/settings.php → tous les réglages
 * PUT api/settings.php → { clé: valeur, … }
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';

handlePreflight('GET, PUT, OPTIONS');
requireAuth();

/** Réglages modifiables et leur type. */
const EDITABLE_SETTINGS = [
    'coach_name'          => 'text',
    'coach_email'         => 'text',
    'coach_phone'         => 'text',
    'reminder_days'       => 'int',
    'reminder_enabled'    => 'bool',
    'notify_on_move'      => 'bool',
    'milestone_interval'  => 'int',
    'milestone_call_days' => 'int',
    'first_contract'      => 'int',
    'payment_block'       => 'int',
    'low_balance'         => 'int',
    'horizon_weeks'       => 'int',
    'default_duration'    => 'int',
    'default_rate_cents'  => 'int',
];

runEndpoint(function () {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        respond([
            'settings'        => settings(true),
            'defaultPassword' => usingDefaultPassword(),
            'mailEnabled'     => MAIL_ENABLED,
        ]);
    }

    if ($method === 'PUT') {
        $in      = input();
        $applied = [];

        foreach (EDITABLE_SETTINGS as $key => $type) {
            if (!array_key_exists($key, $in)) continue;
            $raw = $in[$key];
            switch ($type) {
                case 'int':  $value = max(0, (int) $raw); break;
                case 'bool': $value = !empty($raw) ? 1 : 0; break;
                default:     $value = mb_substr(trim((string) $raw), 0, 500);
            }
            saveSetting($key, $value);
            $applied[$key] = $value;
        }

        if (!$applied) fail('Aucun réglage reconnu.');

        // Un horizon plus large peut créer de nouveaux cours récurrents.
        if (isset($applied['horizon_weeks'])) generateAllOccurrences();

        respond(['settings' => settings(true), 'applied' => $applied]);
    }

    fail('Méthode non supportée.', 405);
});
