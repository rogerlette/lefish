-- ================================================================
-- LMT Coaching — Schéma de la base
-- Exécuter une fois :  mysql -u USER -p BASE < api/schema.sql
-- (ou passer par api/install.php depuis le navigateur)
-- ================================================================

-- ---- CLIENTS ----
CREATE TABLE IF NOT EXISTS `clients` (
  `id`                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name`         VARCHAR(80)  NOT NULL,
  `last_name`          VARCHAR(80)  NOT NULL DEFAULT '',
  `email`              VARCHAR(190) NULL,
  `phone`              VARCHAR(40)  NULL,
  `address`            VARCHAR(255) NULL,
  -- Fiche client : santé, objectifs, contre-indications (ex. pacemaker)
  `notes`              TEXT         NULL,
  -- 1 = point de vigilance santé, affiché en rouge partout
  `health_flag`        TINYINT(1)   NOT NULL DEFAULT 0,
  `status`             ENUM('active','paused','archived') NOT NULL DEFAULT 'active',
  `default_duration`   SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  `rate_cents`         INT UNSIGNED NOT NULL DEFAULT 0,
  -- Surcharges des réglages globaux (NULL = valeur globale)
  `reminder_days`      TINYINT UNSIGNED NULL,
  `reminder_email`     TINYINT(1)   NOT NULL DEFAULT 1,
  `milestone_interval` SMALLINT UNSIGNED NULL,
  `started_on`         DATE         NULL,
  `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clients_status` (`status`),
  KEY `idx_clients_name` (`last_name`, `first_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- RÈGLES DE RÉCURRENCE (ex. tous les mardis à 14h) ----
CREATE TABLE IF NOT EXISTS `recurrences` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`      INT UNSIGNED NOT NULL,
  -- 1 = lundi … 7 = dimanche (ISO-8601)
  `weekday`        TINYINT UNSIGNED NOT NULL,
  `start_time`     TIME         NOT NULL,
  `duration`       SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  -- 1 = toutes les semaines, 2 = une semaine sur deux, …
  `interval_weeks` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `anchor_date`    DATE         NOT NULL,
  `until_date`     DATE         NULL,
  `location`       VARCHAR(120) NULL,
  `active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rec_client` (`client_id`),
  CONSTRAINT `fk_rec_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- SÉANCES (cours placés dans l'agenda) ----
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`     INT UNSIGNED NOT NULL,
  `recurrence_id` INT UNSIGNED NULL,
  -- Date théorique de l'occurrence : sert à ne pas régénérer un cours déplacé
  `origin_date`   DATE         NULL,
  `starts_at`     DATETIME     NOT NULL,
  `duration`      SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  `location`      VARCHAR(120) NULL,
  -- late_cancel et no_show sont décomptés comme une séance consommée
  `status`        ENUM('planned','done','cancelled','late_cancel','no_show') NOT NULL DEFAULT 'planned',
  `notes`         TEXT         NULL,
  -- Séance spéciale (mesures de fréquence cardiaque)
  `is_special`    TINYINT(1)   NOT NULL DEFAULT 0,
  `moved_count`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `moved_at`      DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_occurrence` (`recurrence_id`, `origin_date`),
  KEY `idx_sessions_start` (`starts_at`),
  KEY `idx_sessions_client` (`client_id`, `starts_at`),
  CONSTRAINT `fk_sess_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sess_rec` FOREIGN KEY (`recurrence_id`) REFERENCES `recurrences` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- OCCURRENCES SUPPRIMÉES ----
-- Un cours généré par une règle puis supprimé ne doit pas réapparaître
-- à la prochaine génération.
CREATE TABLE IF NOT EXISTS `occurrence_skips` (
  `recurrence_id` INT UNSIGNED NOT NULL,
  `origin_date`   DATE         NOT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recurrence_id`, `origin_date`),
  CONSTRAINT `fk_skip_rec` FOREIGN KEY (`recurrence_id`) REFERENCES `recurrences` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- PAIEMENTS (par blocs de séances, payés d'avance) ----
CREATE TABLE IF NOT EXISTS `payments` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`      INT UNSIGNED NOT NULL,
  `sessions_count` SMALLINT UNSIGNED NOT NULL DEFAULT 4,
  `amount_cents`   INT UNSIGNED NOT NULL DEFAULT 0,
  `method`         VARCHAR(40)  NULL,
  `paid_on`        DATE         NOT NULL,
  `note`           VARCHAR(255) NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_client` (`client_id`, `paid_on`),
  CONSTRAINT `fk_pay_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- JOURNAL DES E-MAILS ENVOYÉS ----
-- sent_for = l'horaire du cours au moment de l'envoi. Si le client déplace
-- le cours, la clé change et un rappel corrigé peut repartir.
CREATE TABLE IF NOT EXISTS `reminder_log` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` INT UNSIGNED NOT NULL,
  `kind`       VARCHAR(30)  NOT NULL,
  `sent_for`   DATETIME     NOT NULL,
  `recipient`  VARCHAR(190) NULL,
  `ok`         TINYINT(1)   NOT NULL DEFAULT 1,
  `error`      VARCHAR(255) NULL,
  `sent_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_reminder` (`session_id`, `kind`, `sent_for`),
  KEY `idx_rem_session` (`session_id`),
  CONSTRAINT `fk_rem_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- ALERTES TRAITÉES ----
-- Les alertes sont recalculées à chaque affichage (donc toujours à jour même
-- si un cours bouge) ; cette table ne mémorise que « celle-ci, c'est fait ».
CREATE TABLE IF NOT EXISTS `alert_acks` (
  `alert_key` VARCHAR(120) NOT NULL,
  `acked_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`alert_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- RÉGLAGES ----
CREATE TABLE IF NOT EXISTS `settings` (
  `skey`  VARCHAR(60)  NOT NULL,
  `svalue` TEXT        NULL,
  PRIMARY KEY (`skey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `settings` (`skey`, `svalue`) VALUES
  ('coach_name',           'LMT Coaching'),
  ('coach_email',          ''),
  ('coach_phone',          ''),
  ('reminder_days',        '2'),
  ('reminder_enabled',     '1'),
  ('notify_on_move',       '1'),
  ('milestone_interval',   '12'),
  ('milestone_call_days',  '7'),
  ('first_contract',       '12'),
  ('payment_block',        '4'),
  ('low_balance',          '1'),
  ('horizon_weeks',        '16'),
  ('default_duration',     '60'),
  ('default_rate_cents',   '0');
