<?php
/**
 * mailer.php
 * Envoi des e-mails aux clients (rappel de cours, cours déplacé, cours annulé)
 * et journalisation dans `reminder_log`.
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/business.php';

/** Envoi brut. Retourne ['ok' => bool, 'error' => string|null]. */
function mailSend(string $to, string $subject, string $body): array {
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Adresse e-mail invalide.'];
    }

    $from    = MAIL_FROM;
    $replyTo = setting('coach_email', MAIL_FROM);
    $headers = implode("\r\n", [
        'From: ' . mb_encode_mimeheader(MAIL_FROM_NAME, 'UTF-8') . ' <' . $from . '>',
        'Reply-To: ' . $replyTo,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: LMT-Coaching',
    ]);

    if (!MAIL_ENABLED) {
        error_log("[LMT][mail désactivé] à $to : $subject");
        return ['ok' => true, 'error' => null];
    }

    $ok = @mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, $headers);
    return ['ok' => (bool) $ok, 'error' => $ok ? null : "L'envoi a échoué (fonction mail())."];
}

/** Signature commune à tous les e-mails. */
function mailSignature(): string {
    $lines = ['', '— ' . setting('coach_name', 'LMT Coaching')];
    if (setting('coach_phone')) $lines[] = setting('coach_phone');
    if (setting('coach_email')) $lines[] = setting('coach_email');
    return implode("\n", $lines);
}

function frDateTime(string $sql): string {
    $days   = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    $months = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
               'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    $d = new DateTime($sql);
    return sprintf(
        '%s %d %s à %dh%s',
        $days[(int) $d->format('N')],
        (int) $d->format('j'),
        $months[(int) $d->format('n')],
        (int) $d->format('G'),
        $d->format('i')
    );
}

/* ================================================================
   MODÈLES
   ================================================================ */

function tplReminder(array $s, array $client, bool $isMilestone): array {
    $prenom  = $client['first_name'];
    $quand   = frDateTime($s['starts_at']);
    $lieu    = $s['location'] ? "\nLieu : " . $s['location'] : '';
    $subject = 'Rappel : votre séance ' . frDateTime($s['starts_at']);

    $body = "Bonjour $prenom,\n\n"
          . "Petit rappel de votre séance de coaching :\n"
          . "$quand (" . (int) $s['duration'] . " min)$lieu\n";

    if ($isMilestone) {
        $body .= "\nCette séance est une séance de bilan : pensez à prendre vos mesures "
               . "de fréquence cardiaque avant de venir, comme convenu.\n";
    }

    $body .= "\nSi vous avez un empêchement, prévenez-moi au plus tôt afin que l'on "
           . "trouve un autre créneau.\n\nÀ très vite !\n"
           . mailSignature();

    return [$subject, $body];
}

function tplMoved(array $s, array $client, string $oldStart): array {
    $body = "Bonjour " . $client['first_name'] . ",\n\n"
          . "Votre séance initialement prévue le " . frDateTime($oldStart) . " est déplacée.\n"
          . "Nouveau créneau : " . frDateTime($s['starts_at']) . " (" . (int) $s['duration'] . " min)"
          . ($s['location'] ? "\nLieu : " . $s['location'] : '') . "\n\n"
          . "Merci de me confirmer que cela vous convient.\n"
          . mailSignature();

    return ['Séance déplacée au ' . frDateTime($s['starts_at']), $body];
}

function tplCancelled(array $s, array $client): array {
    $body = "Bonjour " . $client['first_name'] . ",\n\n"
          . "Votre séance du " . frDateTime($s['starts_at']) . " est annulée.\n"
          . "Je vous recontacte pour convenir d'un nouveau créneau.\n"
          . mailSignature();

    return ['Séance annulée — ' . frDateTime($s['starts_at']), $body];
}

/* ================================================================
   ENVOIS + JOURNALISATION
   ================================================================ */

/**
 * Journalise un envoi. La clé (session, type, horaire visé) garantit qu'un même
 * rappel n'part qu'une fois — mais qu'un cours déplacé redéclenche un rappel
 * corrigé, puisque l'horaire visé change.
 *
 * @return bool false si ce message a déjà été envoyé
 */
function logReminder(int $sessionId, string $kind, string $sentFor, ?string $to, array $res): bool {
    $stmt = db()->prepare(
        'INSERT IGNORE INTO `reminder_log` (`session_id`, `kind`, `sent_for`, `recipient`, `ok`, `error`)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$sessionId, $kind, $sentFor, $to, $res['ok'] ? 1 : 0, $res['error']]);
    return $stmt->rowCount() > 0;
}

function alreadySent(int $sessionId, string $kind, string $sentFor): bool {
    $stmt = db()->prepare(
        'SELECT 1 FROM `reminder_log`
         WHERE `session_id` = ? AND `kind` = ? AND `sent_for` = ? AND `ok` = 1'
    );
    $stmt->execute([$sessionId, $kind, $sentFor]);
    return (bool) $stmt->fetchColumn();
}

/** Cours + client, pour les envois. */
function loadSessionWithClient(int $sessionId): ?array {
    $stmt = db()->prepare(
        'SELECT s.*, c.`first_name`, c.`last_name`, c.`email`, c.`reminder_email`,
                c.`reminder_days`, c.`milestone_interval`, c.`status` AS client_status
         FROM `sessions` s JOIN `clients` c ON c.`id` = s.`client_id`
         WHERE s.`id` = ?'
    );
    $stmt->execute([$sessionId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** Envoie le rappel d'un cours si les conditions sont réunies. */
function sendReminderFor(array $row, bool $force = false): array {
    if (!$row['email'])                        return ['sent' => false, 'reason' => 'pas d\'e-mail'];
    if (!$row['reminder_email'] && !$force)    return ['sent' => false, 'reason' => 'rappels désactivés'];
    if ($row['status'] !== 'planned' && !$force) return ['sent' => false, 'reason' => 'cours non planifié'];
    if (!$force && alreadySent((int) $row['id'], 'reminder', $row['starts_at'])) {
        return ['sent' => false, 'reason' => 'déjà envoyé'];
    }

    $client = [
        'first_name'         => $row['first_name'],
        'milestone_interval' => $row['milestone_interval'],
    ];
    list($subject, $body) = tplReminder($row, $client, isMilestoneSession($row, $client));
    $res = mailSend($row['email'], $subject, $body);
    logReminder((int) $row['id'], 'reminder', $row['starts_at'], $row['email'], $res);

    return ['sent' => $res['ok'], 'reason' => $res['error'], 'to' => $row['email']];
}

/** Prévient le client qu'un cours a été déplacé. */
function sendMovedNotice(int $sessionId, string $oldStart): array {
    $row = loadSessionWithClient($sessionId);
    if (!$row || !$row['email'] || !$row['reminder_email']) {
        return ['sent' => false, 'reason' => 'destinataire indisponible'];
    }
    list($subject, $body) = tplMoved($row, ['first_name' => $row['first_name']], $oldStart);
    $res = mailSend($row['email'], $subject, $body);
    logReminder($sessionId, 'moved', $row['starts_at'], $row['email'], $res);
    return ['sent' => $res['ok'], 'reason' => $res['error'], 'to' => $row['email']];
}

/** Prévient le client qu'un cours est annulé. */
function sendCancelNotice(int $sessionId): array {
    $row = loadSessionWithClient($sessionId);
    if (!$row || !$row['email'] || !$row['reminder_email']) {
        return ['sent' => false, 'reason' => 'destinataire indisponible'];
    }
    list($subject, $body) = tplCancelled($row, ['first_name' => $row['first_name']]);
    $res = mailSend($row['email'], $subject, $body);
    logReminder($sessionId, 'cancelled', $row['starts_at'], $row['email'], $res);
    return ['sent' => $res['ok'], 'reason' => $res['error'], 'to' => $row['email']];
}

/**
 * Passe en revue les cours à venir et envoie les rappels dus.
 * Le délai est celui du client s'il en a un, sinon le réglage global.
 */
function sendDueReminders(): array {
    if (!settingInt('reminder_enabled', 1)) {
        return ['sent' => 0, 'skipped' => 0, 'details' => ['rappels désactivés']];
    }

    $now  = new DateTime('now');
    $max  = (clone $now)->modify('+' . max(1, settingInt('reminder_days', 2) + 14) . ' days');

    $stmt = db()->prepare(
        "SELECT s.*, c.`first_name`, c.`last_name`, c.`email`, c.`reminder_email`,
                c.`reminder_days`, c.`milestone_interval`
         FROM `sessions` s JOIN `clients` c ON c.`id` = s.`client_id`
         WHERE s.`status` = 'planned'
           AND s.`starts_at` BETWEEN ? AND ?
           AND c.`status` <> 'archived'
         ORDER BY s.`starts_at`"
    );
    $stmt->execute([$now->format('Y-m-d H:i:s'), $max->format('Y-m-d H:i:s')]);

    $sent = 0; $skipped = 0; $details = [];
    foreach ($stmt->fetchAll() as $row) {
        $days      = reminderDays($row);
        $threshold = (clone $now)->modify('+' . $days . ' days');
        if (new DateTime($row['starts_at']) > $threshold) { $skipped++; continue; }

        $res = sendReminderFor($row);
        if ($res['sent']) {
            $sent++;
            $details[] = 'rappel envoyé à ' . $row['email'] . ' pour le ' . $row['starts_at'];
        } else {
            $skipped++;
            if ($res['reason'] && $res['reason'] !== 'déjà envoyé') {
                $details[] = 'non envoyé (' . $res['reason'] . ') — séance ' . $row['id'];
            }
        }
    }

    return ['sent' => $sent, 'skipped' => $skipped, 'details' => $details];
}
