-- ================================================================
-- LMT Coaching — schéma SQLite
-- Aucun serveur de base à installer : le fichier est créé au premier
-- lancement (voir DB_FILE dans config.php).
-- ================================================================

-- ---- CLIENTS ----
CREATE TABLE IF NOT EXISTS `clients` (
  `id`                 INTEGER PRIMARY KEY AUTOINCREMENT,
  `first_name`         TEXT    NOT NULL,
  `last_name`          TEXT    NOT NULL DEFAULT '',
  `email`              TEXT,
  `phone`              TEXT,
  `address`            TEXT,
  -- Fiche client : santé, objectifs, contre-indications (ex. pacemaker)
  `notes`              TEXT,
  -- 1 = point de vigilance santé, signalé sur chacun de ses cours
  `health_flag`        INTEGER NOT NULL DEFAULT 0,
  `status`             TEXT    NOT NULL DEFAULT 'active'
                               CHECK (`status` IN ('active','paused','archived')),
  `default_duration`   INTEGER NOT NULL DEFAULT 60,
  `rate_cents`         INTEGER NOT NULL DEFAULT 0,
  -- Surcharges des réglages globaux (NULL = valeur globale)
  `reminder_days`      INTEGER,
  `reminder_email`     INTEGER NOT NULL DEFAULT 1,
  `milestone_interval` INTEGER,
  `started_on`         TEXT,
  `created_at`         TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  `updated_at`         TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS `idx_clients_status` ON `clients` (`status`);
CREATE INDEX IF NOT EXISTS `idx_clients_name` ON `clients` (`last_name`, `first_name`);

CREATE TRIGGER IF NOT EXISTS `trg_clients_updated`
AFTER UPDATE ON `clients` FOR EACH ROW BEGIN
  UPDATE `clients` SET `updated_at` = datetime('now','localtime') WHERE `id` = OLD.`id`;
END;

-- ---- RÈGLES DE RÉCURRENCE (ex. tous les mardis à 14h) ----
CREATE TABLE IF NOT EXISTS `recurrences` (
  `id`             INTEGER PRIMARY KEY AUTOINCREMENT,
  `client_id`      INTEGER NOT NULL REFERENCES `clients` (`id`) ON DELETE CASCADE,
  -- 1 = lundi … 7 = dimanche (ISO-8601)
  `weekday`        INTEGER NOT NULL,
  `start_time`     TEXT    NOT NULL,
  `duration`       INTEGER NOT NULL DEFAULT 60,
  -- 1 = toutes les semaines, 2 = une semaine sur deux, …
  `interval_weeks` INTEGER NOT NULL DEFAULT 1,
  `anchor_date`    TEXT    NOT NULL,
  `until_date`     TEXT,
  `location`       TEXT,
  `active`         INTEGER NOT NULL DEFAULT 1,
  `created_at`     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS `idx_rec_client` ON `recurrences` (`client_id`);

-- ---- SÉANCES (cours placés dans l'agenda) ----
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`            INTEGER PRIMARY KEY AUTOINCREMENT,
  `client_id`     INTEGER NOT NULL REFERENCES `clients` (`id`) ON DELETE CASCADE,
  `recurrence_id` INTEGER REFERENCES `recurrences` (`id`) ON DELETE SET NULL,
  -- Date théorique de l'occurrence : sert à ne pas régénérer un cours déplacé
  `origin_date`   TEXT,
  `starts_at`     TEXT    NOT NULL,
  `duration`      INTEGER NOT NULL DEFAULT 60,
  `location`      TEXT,
  -- late_cancel et no_show sont décomptés comme une séance consommée
  `status`        TEXT    NOT NULL DEFAULT 'planned'
                          CHECK (`status` IN ('planned','done','cancelled','late_cancel','no_show')),
  `notes`         TEXT,
  -- Séance spéciale (mesures de fréquence cardiaque)
  `is_special`    INTEGER NOT NULL DEFAULT 0,
  `moved_count`   INTEGER NOT NULL DEFAULT 0,
  `moved_at`      TEXT,
  `created_at`    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  `updated_at`    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE UNIQUE INDEX IF NOT EXISTS `uniq_occurrence` ON `sessions` (`recurrence_id`, `origin_date`);
CREATE INDEX IF NOT EXISTS `idx_sessions_start` ON `sessions` (`starts_at`);
CREATE INDEX IF NOT EXISTS `idx_sessions_client` ON `sessions` (`client_id`, `starts_at`);

CREATE TRIGGER IF NOT EXISTS `trg_sessions_updated`
AFTER UPDATE ON `sessions` FOR EACH ROW BEGIN
  UPDATE `sessions` SET `updated_at` = datetime('now','localtime') WHERE `id` = OLD.`id`;
END;

-- ---- OCCURRENCES SUPPRIMÉES ----
-- Un cours généré par une règle puis supprimé ne doit pas réapparaître.
CREATE TABLE IF NOT EXISTS `occurrence_skips` (
  `recurrence_id` INTEGER NOT NULL REFERENCES `recurrences` (`id`) ON DELETE CASCADE,
  `origin_date`   TEXT    NOT NULL,
  `created_at`    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (`recurrence_id`, `origin_date`)
);

-- ---- PAIEMENTS (par blocs de séances, payés d'avance) ----
CREATE TABLE IF NOT EXISTS `payments` (
  `id`             INTEGER PRIMARY KEY AUTOINCREMENT,
  `client_id`      INTEGER NOT NULL REFERENCES `clients` (`id`) ON DELETE CASCADE,
  `sessions_count` INTEGER NOT NULL DEFAULT 4,
  `amount_cents`   INTEGER NOT NULL DEFAULT 0,
  `method`         TEXT,
  `paid_on`        TEXT    NOT NULL,
  `note`           TEXT,
  `created_at`     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS `idx_pay_client` ON `payments` (`client_id`, `paid_on`);

-- ---- JOURNAL DES E-MAILS ENVOYÉS ----
-- sent_for = l'horaire du cours au moment de l'envoi. Si le client déplace
-- le cours, la clé change et un rappel corrigé peut repartir.
CREATE TABLE IF NOT EXISTS `reminder_log` (
  `id`         INTEGER PRIMARY KEY AUTOINCREMENT,
  `session_id` INTEGER NOT NULL REFERENCES `sessions` (`id`) ON DELETE CASCADE,
  `kind`       TEXT    NOT NULL,
  `sent_for`   TEXT    NOT NULL,
  `recipient`  TEXT,
  `ok`         INTEGER NOT NULL DEFAULT 1,
  `error`      TEXT,
  `sent_at`    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE UNIQUE INDEX IF NOT EXISTS `uniq_reminder` ON `reminder_log` (`session_id`, `kind`, `sent_for`);

-- ---- ALERTES TRAITÉES ----
-- Les alertes sont recalculées à chaque affichage ; cette table ne mémorise
-- que « celle-ci, c'est fait ».
CREATE TABLE IF NOT EXISTS `alert_acks` (
  `alert_key` TEXT PRIMARY KEY,
  `acked_at`  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---- RÉGLAGES ----
CREATE TABLE IF NOT EXISTS `settings` (
  `skey`   TEXT PRIMARY KEY,
  `svalue` TEXT
);

INSERT OR IGNORE INTO `settings` (`skey`, `svalue`) VALUES
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
