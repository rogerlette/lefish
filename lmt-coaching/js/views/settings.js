/* ================================================================
   settings.js — Réglages généraux
   ================================================================ */

async function viewSettings(root) {
  root.innerHTML = '<div class="loader">Chargement…</div>';

  const data = await Api.settings();
  store.settings = data.settings;
  const s = data.settings;
  const base = location.href.replace(/[^/]*$/, '');

  root.innerHTML = `
    ${data.defaultPassword ? `
      <div class="health-box">
        <strong>${ico('alert')} Mot de passe par défaut actif</strong>
        <div class="small">Changez <span class="mono">AUTH_PASSWORD_HASH</span> dans
        <span class="mono">api/config.php</span> (voir le README).</div>
      </div>` : ''}

    <div class="card">
      <div class="card-title"><h2>Coach</h2></div>
      <label>Nom affiché dans les e-mails</label>
      <input type="text" name="coach_name" value="${esc(s.coach_name || '')}">
      <label>E-mail de réponse</label>
      <input type="email" name="coach_email" value="${esc(s.coach_email || '')}">
      <label>Téléphone (signature des e-mails)</label>
      <input type="tel" name="coach_phone" value="${esc(s.coach_phone || '')}">
    </div>

    <div class="card">
      <div class="card-title"><h2>Rappels aux clients</h2></div>
      <div class="check">
        <input type="checkbox" id="reminder_enabled" name="reminder_enabled" ${Number(s.reminder_enabled) ? 'checked' : ''}>
        <label for="reminder_enabled">Envoyer les rappels e-mail automatiques</label>
      </div>
      <label>Nombre de jours avant le cours</label>
      <input type="number" name="reminder_days" value="${esc(s.reminder_days || 2)}" min="0" max="30">
      <div class="small muted">Réglable client par client depuis sa fiche.</div>
      <div class="check">
        <input type="checkbox" id="notify_on_move" name="notify_on_move" ${Number(s.notify_on_move) ? 'checked' : ''}>
        <label for="notify_on_move">Prévenir le client quand un cours est déplacé ou annulé</label>
      </div>
      <div class="small muted">${data.mailEnabled ? 'Envoi des e-mails activé.' : 'Envoi désactivé dans config.php (MAIL_ENABLED).'}</div>
    </div>

    <div class="card">
      <div class="card-title"><h2>Séances bilan (mesures cardiaques)</h2></div>
      <label>Une séance bilan toutes les … séances</label>
      <input type="number" name="milestone_interval" value="${esc(s.milestone_interval || 12)}" min="1" max="60">
      <label>Me prévenir … jours avant, pour appeler le client</label>
      <input type="number" name="milestone_call_days" value="${esc(s.milestone_call_days || 7)}" min="1" max="60">
      <div class="small muted">
        Le numéro de séance est recalculé en permanence : si un client déplace un cours,
        la date du bilan et l'alerte d'appel suivent automatiquement.
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h2>Contrats et paiements</h2></div>
      <label>Premier contrat (nombre de séances)</label>
      <input type="number" name="first_contract" value="${esc(s.first_contract || 12)}" min="1">
      <label>Blocs suivants payés d'avance</label>
      <input type="number" name="payment_block" value="${esc(s.payment_block || 4)}" min="1">
      <label>M'alerter quand il reste … séance(s) payée(s)</label>
      <input type="number" name="low_balance" value="${esc(s.low_balance || 1)}" min="0">
      <label>Tarif par défaut d'une séance (€)</label>
      <input type="number" name="default_rate_euros" step="0.01" min="0"
             value="${s.default_rate_cents ? (Number(s.default_rate_cents) / 100).toFixed(2) : ''}">
    </div>

    <div class="card">
      <div class="card-title"><h2>Agenda</h2></div>
      <label>Durée type d'un cours (min)</label>
      <input type="number" name="default_duration" value="${esc(s.default_duration || 60)}" min="15" step="5">
      <label>Créer les cours récurrents … semaines à l'avance</label>
      <input type="number" name="horizon_weeks" value="${esc(s.horizon_weeks || 16)}" min="1" max="104">
    </div>

    <div class="spacer"></div>
    <button class="block primary" id="saveSettings">Enregistrer les réglages</button>
    <div class="spacer"></div>

    <div class="card">
      <div class="card-title"><h2>Automatisation</h2></div>
      <div class="small muted">
        Tâche planifiée quotidienne (rappels e-mail + prolongation des cours récurrents) :
        <div class="mono small" style="word-break:break-all;margin:6px 0">${esc(base)}api/cron.php?key=VOTRE_CLE</div>
        Abonnement calendrier (iPhone / Android) :
        <div class="mono small" style="word-break:break-all;margin:6px 0">${esc(base)}api/ical.php?token=VOTRE_TOKEN</div>
        Les clés se règlent dans <span class="mono">api/config.php</span>.
      </div>
      <button class="small" id="runCron">Lancer la tâche maintenant</button>
      <button class="small" id="runInstall">Vérifier / créer les tables</button>
    </div>
  `;

  el('saveSettings').onclick = guard(async () => {
    const f = readForm(root);
    const payload = { ...f };
    if (f.default_rate_euros !== undefined) {
      payload.default_rate_cents = f.default_rate_euros
        ? Math.round(parseFloat(String(f.default_rate_euros).replace(',', '.')) * 100) : 0;
      delete payload.default_rate_euros;
    }
    const res = await Api.saveSettings(payload);
    store.settings = res.settings;
    toast('Réglages enregistrés');
  });

  el('runCron').onclick = guard(async () => {
    const res = await request('cron.php', { method: 'GET' });
    toast(plural(res.remindersSent || 0, 'rappel envoyé', 'rappels envoyés')
          + ' · ' + plural(res.sessionsGenerated || 0, 'cours créé', 'cours créés'));
    refreshAlertCount();
  });

  el('runInstall').onclick = guard(async () => {
    const res = await Api.install();
    toast(res.installed ? 'Base à jour (' + res.statements + ' instructions)'
                        : 'Tables manquantes : ' + res.missing.join(', '), !res.installed);
  });
}
