<?php
/**
 * config.php
 * Configuration de l'application LMT Coaching.
 *
 * ⚠ À personnaliser avant la mise en ligne (voir README.md).
 * Ce fichier contient des identifiants : ne le versionnez pas avec les vraies
 * valeurs, remplissez-le directement sur le serveur.
 */

// ---- Base de données ----
// 'sqlite' : aucun serveur à installer, tout tient dans un fichier (recommandé).
// 'mysql'  : pour un hébergement qui impose MySQL.
define('DB_DRIVER', 'sqlite');

// Emplacement du fichier SQLite (créé automatiquement au premier lancement).
define('DB_FILE', __DIR__ . '/../data/lmt-coaching.sqlite');

// ---- Réglages MySQL (ignorés si DB_DRIVER vaut 'sqlite') ----
define('DB_HOST',    'localhost');
define('DB_PORT',    3306);
define('DB_NAME',    'a_renseigner');
define('DB_USER',    'a_renseigner');
define('DB_PASS',    'a_renseigner');
define('DB_CHARSET', 'utf8mb4');

// ---- Fuseau horaire de l'agenda ----
define('APP_TZ', 'Europe/Paris');

// ---- Accès à l'application ----
// Mot de passe par défaut : « lmt-coaching » — À CHANGER.
// Générer un nouveau hash :
//   php -r 'echo password_hash("mon-mot-de-passe", PASSWORD_DEFAULT), "\n";'
define('AUTH_PASSWORD_HASH', '$2y$12$BNB58NsRkL5vgAWSg1ka/.hDGElSxxjI.DvTd6JvPVMd5A7GTdpMe');

// ---- Clés d'accès aux points d'entrée automatiques ----
// Tâche planifiée (rappels e-mail) : api/cron.php?key=…
define('CRON_KEY', 'changez-cette-cle-cron');
// Flux iCal en lecture seule : api/ical.php?token=…
define('ICAL_TOKEN', 'changez-ce-token-ical');

// ---- Expéditeur des e-mails ----
define('MAIL_FROM',      'contact@example.com');
define('MAIL_FROM_NAME', 'LMT Coaching');
// Mettre à false pour tester sans rien envoyer (les envois sont seulement journalisés).
define('MAIL_ENABLED', true);
