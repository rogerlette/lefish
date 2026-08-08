/* ================================================================
   clients.js — Liste des clients
   ================================================================ */

async function viewClients(root) {
  root.innerHTML = `
    <div class="searchbar">
      <input type="search" id="clSearch" placeholder="Rechercher un client…" value="${esc(store.clientQuery)}">
    </div>
    <div class="row wrap" style="margin-bottom:12px">
      <div class="segmented" id="clFilter">
        <button data-f=""        class="${store.clientFilter === '' ? 'on' : ''}">Suivis</button>
        <button data-f="active"  class="${store.clientFilter === 'active' ? 'on' : ''}">Actifs</button>
        <button data-f="paused"  class="${store.clientFilter === 'paused' ? 'on' : ''}">En pause</button>
        <button data-f="all"     class="${store.clientFilter === 'all' ? 'on' : ''}">Tous</button>
      </div>
      <span class="right small muted" id="clCount"></span>
    </div>
    <div id="clList"><div class="loader">Chargement…</div></div>
    <button class="fab" id="clAdd" title="Nouveau client">+</button>
  `;

  let timer = null;
  el('clSearch').oninput = (e) => {
    store.clientQuery = e.target.value;
    clearTimeout(timer);
    timer = setTimeout(() => loadClients(), 250);
  };
  qsa('#clFilter button').forEach(b => {
    b.onclick = () => { store.clientFilter = b.dataset.f; viewClients(root); };
  });
  el('clAdd').onclick = () => openClientForm(null);

  await loadClients();
}

const loadClients = guard(async function () {
  const list = await Api.clients(store.clientQuery, store.clientFilter);
  store.clients = list;
  el('clCount').textContent = plural(list.length, 'client');
  el('clList').innerHTML = list.length
    ? '<div class="list">' + list.map(clientRowHtml).join('') + '</div>'
    : emptyState('Aucun client ne correspond.');

  qsa('#clList .list-item').forEach(node => {
    node.onclick = () => { location.hash = '#/client/' + node.dataset.id; };
  });
});

function clientRowHtml(c) {
  const st = c.stats;
  const next = st.nextSessionAt;
  const milestoneSoon = st.nextMilestone
    && (st.milestoneInterval - st.milestoneProgress) <= 2;

  return `
    <button class="list-item" data-id="${c.id}">
      <span class="avatar ${c.healthFlag ? 'warn' : ''}">${esc(initials(c.name))}</span>
      <span class="grow">
        <span class="row" style="gap:6px">
          <span style="font-weight:600" class="truncate">${esc(c.name)}</span>
          ${c.status !== 'active' ? '<span class="badge b-neutral">' + esc(CLIENT_STATUS[c.status]) + '</span>' : ''}
          ${c.healthFlag ? '<span class="badge b-health">' + ico('alert') + '</span>' : ''}
        </span>
        <span class="small muted truncate">
          ${next ? 'Prochain : ' + fmtShortDate(next) + ' à ' + fmtTime(next) : 'Aucun cours planifié'}
          · ${st.sessionsDone} faite(s)
          ${milestoneSoon ? ' · bilan cardio proche' : ''}
        </span>
      </span>
      <span>${balanceBadge(st.balance)}</span>
    </button>`;
}

/* ================================================================
   FORMULAIRE CLIENT (création / modification)
   ================================================================ */

function openClientForm(client) {
  const c = client || {};
  const isNew = !client;

  openSheet(isNew ? 'Nouveau client' : 'Modifier la fiche', `
    <div class="field-row">
      <div>
        <label>Prénom *</label>
        <input type="text" name="firstName" value="${esc(c.firstName || '')}" required>
      </div>
      <div>
        <label>Nom</label>
        <input type="text" name="lastName" value="${esc(c.lastName || '')}">
      </div>
    </div>

    <label>Téléphone</label>
    <input type="tel" name="phone" value="${esc(c.phone || '')}" placeholder="06 12 34 56 78">

    <label>E-mail (pour les rappels automatiques)</label>
    <input type="email" name="email" value="${esc(c.email || '')}" placeholder="client@exemple.fr">

    <label>Adresse</label>
    <input type="text" name="address" value="${esc(c.address || '')}">

    <label>Notes de la fiche (santé, objectifs, contre-indications)</label>
    <textarea name="notes" rows="4" placeholder="Ex. : porteur d'un pacemaker — pas de travail en intensité maximale.">${esc(c.notes || '')}</textarea>

    <div class="check">
      <input type="checkbox" id="healthFlag" name="healthFlag" ${c.healthFlag ? 'checked' : ''}>
      <label for="healthFlag">Point de vigilance santé — signalé sur chacun de ses cours</label>
    </div>

    <div class="field-row">
      <div>
        <label>Statut</label>
        <select name="status">${selectOptions(CLIENT_STATUS, c.status || 'active')}</select>
      </div>
      <div>
        <label>Durée type (min)</label>
        <input type="number" name="defaultDuration" value="${c.defaultDuration || 60}" min="15" step="5">
      </div>
    </div>

    <div class="field-row">
      <div>
        <label>Tarif par séance (€)</label>
        <input type="number" name="rateEuros" step="0.01" min="0"
               value="${c.rateCents ? (c.rateCents / 100).toFixed(2) : ''}">
      </div>
      <div>
        <label>Début du suivi</label>
        <input type="date" name="startedOn" value="${esc(c.startedOn || '')}">
      </div>
    </div>

    <div class="check">
      <input type="checkbox" id="reminderEmail" name="reminderEmail" ${c.reminderEmail !== false ? 'checked' : ''}>
      <label for="reminderEmail">Rappels e-mail automatiques</label>
    </div>

    <div class="field-row">
      <div>
        <label>Rappel — jours avant (vide = réglage général)</label>
        <input type="number" name="reminderDays" min="0" max="30" value="${c.reminderDays !== null && c.reminderDays !== undefined ? c.reminderDays : ''}">
      </div>
      <div>
        <label>Bilan cardio toutes les … séances</label>
        <input type="number" name="milestoneInterval" min="1" max="60"
               value="${c.milestoneInterval !== null && c.milestoneInterval !== undefined ? c.milestoneInterval : ''}"
               placeholder="${esc(store.settings.milestone_interval || 12)}">
      </div>
    </div>

    <div class="spacer"></div>
    <button class="block primary" id="saveClient">${isNew ? 'Créer le client' : 'Enregistrer'}</button>
    ${isNew ? '' : '<div class="spacer"></div><button class="block danger" id="deleteClient">Supprimer le client</button>'}
  `, (body) => {

    el('saveClient').onclick = guard(async () => {
      const f = readForm(body);
      if (!f.firstName.trim()) { toast('Le prénom est obligatoire', true); return; }

      const payload = {
        firstName: f.firstName,
        lastName: f.lastName,
        phone: f.phone,
        email: f.email,
        address: f.address,
        notes: f.notes,
        healthFlag: f.healthFlag,
        status: f.status,
        defaultDuration: Number(f.defaultDuration) || 60,
        rateCents: f.rateEuros ? Math.round(parseFloat(String(f.rateEuros).replace(',', '.')) * 100) : 0,
        startedOn: f.startedOn || null,
        reminderEmail: f.reminderEmail,
        reminderDays: f.reminderDays === '' ? null : Number(f.reminderDays),
        milestoneInterval: f.milestoneInterval === '' ? null : Number(f.milestoneInterval),
      };

      if (isNew) {
        const created = await Api.createClient(payload);
        toast('Client créé');
        closeSheet();
        location.hash = '#/client/' + created.id;
      } else {
        await Api.updateClient(c.id, payload);
        toast('Fiche enregistrée');
        closeSheet();
        rerenderCurrent();
      }
      refreshAlertCount();
    });

    if (!isNew) {
      el('deleteClient').onclick = guard(async () => {
        if (!confirmAction('Supprimer ' + c.name + ' ainsi que tous ses cours et paiements ?')) return;
        await Api.deleteClient(c.id);
        toast('Client supprimé');
        closeSheet();
        location.hash = '#/clients';
      });
    }
  });
}
