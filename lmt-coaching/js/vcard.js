/* ================================================================
   vcard.js — Import du carnet d'adresses (.vcf)
   Le fichier est analysé dans le navigateur ; seules les fiches
   retenues par le coach sont envoyées à l'API.
   ================================================================ */

/** Déplie les lignes coupées par le format vCard. */
function unfoldVcf(text) {
  return String(text).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function unescapeVcf(v) {
  return String(v).replace(/\\n/gi, '\n').replace(/\\,/g, ',')
                  .replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}

/** @return [{firstName, lastName, phone, email, notes}] */
function parseVcf(text) {
  const out = [];

  unfoldVcf(text).split(/BEGIN:VCARD/i).slice(1).forEach(block => {
    const card = { firstName: '', lastName: '', phone: '', email: '', notes: '' };
    const extras = [];
    let fn = '';

    block.split('\n').forEach(line => {
      const sep = line.indexOf(':');
      if (sep < 0) return;
      const key = line.slice(0, sep).toUpperCase();
      const value = unescapeVcf(line.slice(sep + 1));
      if (!value) return;

      if (key === 'FN') {
        fn = value;
      } else if (key === 'N') {
        const p = value.split(';');
        card.lastName = unescapeVcf(p[0] || '');
        card.firstName = unescapeVcf(p[1] || '');
      } else if (key.startsWith('TEL')) {
        const tel = value.replace(/[^\d+ .-]/g, '').trim();
        if (!card.phone) card.phone = tel;
        else if (tel && tel !== card.phone) extras.push('Autre téléphone : ' + tel);
      } else if (key.startsWith('EMAIL')) {
        if (!card.email) card.email = value;
        else extras.push('Autre e-mail : ' + value);
      } else if (key.startsWith('ADR')) {
        const adr = value.split(';').filter(Boolean).join(', ');
        if (adr) extras.push('Adresse : ' + adr);
      } else if (key.startsWith('NOTE')) {
        extras.push(value);
      } else if (key.startsWith('BDAY')) {
        extras.push('Anniversaire : ' + value);
      }
    });

    // Fiches sans nom structuré : on découpe le nom affiché.
    if (!card.firstName && !card.lastName && fn) {
      const parts = fn.trim().split(/\s+/);
      card.firstName = parts.shift() || fn;
      card.lastName = parts.join(' ');
    }
    if (!card.firstName && !card.lastName) return;

    card.notes = extras.join('\n');
    out.push(card);
  });

  return out;
}

const vcfDigits = (v) => String(v || '').replace(/\D/g, '');

/** Une fiche existe déjà si le téléphone ou le nom complet correspond. */
function findExistingClient(card) {
  const tel = vcfDigits(card.phone).slice(-9);
  const name = (card.firstName + ' ' + card.lastName).trim().toLowerCase();
  return store.clients.find(c =>
    (tel && vcfDigits(c.phone).slice(-9) === tel) || c.name.toLowerCase() === name) || null;
}

/** Feuille de revue : le coach décoche ce qui n'est pas un client. */
async function openVcfImport(cards) {
  if (!cards.length) { toast('Aucun contact lisible dans ce fichier', true); return; }

  // La liste complète sert à repérer les doublons, y compris les archivés.
  store.clients = await Api.clients('', 'all');

  const rows = cards.map((card, i) => ({ card, dup: findExistingClient(card), i }));
  const newCount = rows.filter(r => !r.dup).length;

  openSheet('Importer des contacts', `
    <div class="small muted">
      ${plural(cards.length, 'contact')} dans le fichier ·
      ${newCount} à ajouter · ${cards.length - newCount} déjà dans vos fiches.
      Décochez ce qui n'est pas un client.
    </div>

    <div class="row wrap" style="margin:14px 0">
      <button class="small" id="vcfAll">Tout cocher</button>
      <button class="small" id="vcfNone">Tout décocher</button>
    </div>

    <div class="list" style="border-top:1px solid var(--border-soft)">
      ${rows.map(r => `
        <label class="list-item pick-row">
          <input type="checkbox" class="vcf-pick" data-i="${r.i}"
                 style="width:20px;height:20px;min-height:20px;flex:none;accent-color:var(--brand)"
                 ${r.dup ? '' : 'checked'}>
          <span class="grow">
            <b style="display:block">${esc((r.card.firstName + ' ' + r.card.lastName).trim())}</b>
            <span class="small muted">
              ${esc(r.card.phone || 'sans téléphone')}${r.card.email ? ' · ' + esc(r.card.email) : ''}
            </span>
          </span>
          ${r.dup ? '<span class="badge b-neutral">déjà présent</span>' : ''}
        </label>`).join('')}
    </div>

    <div class="spacer"></div>
    <button class="primary block" id="vcfGo">Ajouter les contacts cochés</button>
  `, (body) => {
    const boxes = () => qsa('.vcf-pick', body);
    el('vcfAll').onclick = () => boxes().forEach(b => { b.checked = true; });
    el('vcfNone').onclick = () => boxes().forEach(b => { b.checked = false; });

    el('vcfGo').onclick = guard(async () => {
      const picked = boxes().filter(b => b.checked).map(b => cards[Number(b.dataset.i)]);
      if (!picked.length) { toast('Aucun contact coché', true); return; }

      el('vcfGo').disabled = true;
      el('vcfGo').textContent = 'Ajout en cours…';

      let added = 0;
      for (const card of picked) {
        if (findExistingClient(card)) continue;
        await Api.createClient({
          firstName: card.firstName || card.lastName,
          lastName: card.firstName ? card.lastName : '',
          phone: card.phone || null,
          email: card.email || null,
          notes: card.notes || null,
        });
        added++;
      }

      closeSheet();
      toast(plural(added, 'client ajouté', 'clients ajoutés'));
      store.clients = await Api.clients('', '');
      location.hash = '#/clients';
      rerenderCurrent();
    });
  });
}
