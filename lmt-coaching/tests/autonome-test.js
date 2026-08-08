/* Test de la version autonome (sans serveur) */
const { chromium } = require('playwright');

const OUT = '/tmp/claude-0/-home-user-lefish/cf0aa78f-b5a5-595b-a7d8-3d88a4a3f38d/scratchpad/solo';
const FILE = 'file:///home/user/lefish/lmt-coaching/autonome/index.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    locale: 'fr-FR', timezoneId: 'Europe/Paris',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('dialog', d => d.accept());

  const step = async (name, fn) => {
    try { await fn(); console.log('  ok  ' + name); }
    catch (e) { console.log('  ÉCHEC ' + name + ' → ' + e.message.split('\n')[0]); errors.push(name); }
  };

  await page.goto(FILE);
  await page.waitForTimeout(400);

  await step('démarrage sans données', async () => {
    if (!(await page.textContent('#screen')).includes('Commencez par ajouter un client'))
      throw new Error('accueil vide absent');
    await page.screenshot({ path: OUT + '/01-accueil.png' });
  });

  await step('création d\'un client', async () => {
    await page.click('[data-new-client]');
    await page.fill('#fFirst', 'Marie');
    await page.fill('#fLast', 'Dupont');
    await page.fill('#fPhone', '0612345678');
    await page.fill('#fMail', 'marie@example.com');
    await page.fill('#fNotes', "Porteuse d'un pacemaker — pas d'intensité maximale.");
    await page.check('#fHealth');
    await page.fill('#fRate', '45');
    await page.click('#okClient');
    await page.waitForTimeout(300);
    if (!(await page.textContent('#screen')).includes('Marie Dupont')) throw new Error('fiche non ouverte');
  });

  await step('horaire récurrent tous les mardis 14h', async () => {
    await page.click('[data-new-rec]');
    await page.selectOption('#rDay', '2');
    await page.fill('#rTime', '14:00');
    await page.click('#okRec');
    await page.waitForTimeout(400);
    const n = await page.evaluate(() => db.sessions.length);
    if (n < 15) throw new Error('seulement ' + n + ' cours posés');
  });

  await step('numérotation et séance bilan', async () => {
    const r = await page.evaluate(() => {
      const ord = ordinals();
      const list = db.sessions.slice().sort((a, b) => a.startsAt < b.startsAt ? -1 : 1);
      const c = db.clients[0];
      return { first: ord[list[0].id], twelfth: ord[list[11].id],
               isMilestone: isMilestone(list[11], c, ord),
               firstIsMilestone: isMilestone(list[0], c, ord),
               milestoneDate: stats(c, ord).milestone.session.startsAt };
    });
    if (r.first !== 1 || r.twelfth !== 12 || !r.isMilestone || r.firstIsMilestone)
      throw new Error('numérotation incorrecte : ' + JSON.stringify(r));
  });

  await step('paiement et solde', async () => {
    await page.click('[data-new-pay]');
    await page.waitForTimeout(200);
    await page.click('#okPay');
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => stats(db.clients[0]));
    if (st.paid !== 12 || st.balance !== 12) throw new Error('solde ' + st.balance);
  });

  await step('pointer 3 séances', async () => {
    await page.evaluate(() => {
      const list = db.sessions.slice().sort((a, b) => a.startsAt < b.startsAt ? -1 : 1);
      list.slice(0, 3).forEach(s => { s.status = 'done'; });
      save();
    });
    const st = await page.evaluate(() => stats(db.clients[0]));
    if (st.consumed !== 3 || st.balance !== 9 || st.progress !== 3)
      throw new Error('compteurs faux : ' + JSON.stringify(st));
  });

  await step('résistance au déplacement de la 12e séance', async () => {
    const r = await page.evaluate(() => {
      const ord = ordinals();
      const list = db.sessions.slice().sort((a, b) => a.startsAt < b.startsAt ? -1 : 1);
      const twelfth = list.find(s => ord[s.id] === 12);
      const oldId = twelfth.id;
      // Le client repousse sa séance de 300 jours.
      const d = new Date(); d.setDate(d.getDate() + 300);
      twelfth.startsAt = dateStr(d) + ' 14:00';
      twelfth.movedCount = 1;
      save();
      const ord2 = ordinals();
      const c = db.clients[0];
      return { oldId, newTwelfthId: db.sessions.find(s => ord2[s.id] === 12).id,
               oldOrdinal: ord2[oldId],
               milestoneId: stats(c, ord2).milestone.session.id };
    });
    if (r.newTwelfthId === r.oldId) throw new Error('la 12e séance n\'a pas changé');
    if (r.oldOrdinal <= 12) throw new Error('ancienne séance mal renumérotée');
    if (r.milestoneId !== r.newTwelfthId) throw new Error('bilan désynchronisé');
  });

  await step('agenda de la semaine', async () => {
    await page.click('[data-go=agenda]');
    await page.waitForTimeout(300);
    let tries = 0;
    while (await page.locator('.slot').count() === 0 && tries++ < 6) {
      await page.click('[data-shift="1"]');
      await page.waitForTimeout(150);
    }
    if (await page.locator('.slot').count() === 0) throw new Error('aucun cours affiché');
    await page.screenshot({ path: OUT + '/02-agenda.png' });
  });

  await step('détail d\'un cours', async () => {
    await page.click('.slot');
    await page.waitForTimeout(300);
    const txt = await page.textContent('#sheetBody');
    if (!/pacemaker/.test(txt)) throw new Error('notes de la fiche absentes');
    if (!/Séance/.test(txt)) throw new Error('numéro de séance absent');
    await page.screenshot({ path: OUT + '/03-cours.png' });
  });

  await step('déplacement depuis la feuille', async () => {
    const before = await page.evaluate(() => db.sessions.map(s => s.startsAt).join('|'));
    await page.fill('#mWhen', (await page.inputValue('#mWhen')).slice(0, 11) + '18:45');
    await page.click('#okMove');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => db.sessions.map(s => s.startsAt).join('|'));
    if (before === after) throw new Error('rien n\'a bougé');
    // Le déplacement propose d'en informer le client : la feuille message s'ouvre.
    const sheetTxt = await page.textContent('#sheetBody');
    if (!/déplacée|déplacé/i.test(sheetTxt)) throw new Error('message de déplacement absent');
    await page.click('#sheetX');
    await page.waitForTimeout(200);
  });

  await step('liste de créneaux libres', async () => {
    await page.click('[data-go=agenda]');
    await page.click('.fab');
    await page.waitForTimeout(200);
    await page.click('#toggleMany');
    const y = new Date().getFullYear() + 1;
    await page.fill('#sList', `04/03/${y} 14h00\n11/03/${y} 14h00\n${y}-03-18 09:30`);
    await page.click('#okSession');
    await page.waitForTimeout(300);
    const n = await page.evaluate(() => db.sessions.filter(s => !s.recurrenceId).length);
    if (n !== 3) throw new Error(n + ' cours créés au lieu de 3');
  });

  await step('alertes des quatre types', async () => {
    // On provoque chaque situation : cours passé non pointé, délais élargis.
    await page.evaluate(() => {
      const d = new Date(); d.setDate(d.getDate() - 2);
      db.sessions.push({ id: nextId(), clientId: db.clients[0].id, recurrenceId: null,
        originDate: null, startsAt: dateStr(d) + ' 11:00', duration: 60, location: null,
        status: 'planned', notes: null, isSpecial: false, movedCount: 0, movedAt: null });
      db.settings.milestoneCallDays = 400;   // l'appel bilan devient dû
      db.settings.reminderDays = 400;        // les rappels de cours deviennent dus
      db.settings.lowBalance = 20;           // le paiement devient à relancer
      save();
    });
    await page.click('[data-go=alerts]');
    await page.waitForTimeout(300);
    const kinds = await page.evaluate(() => {
      const set = new Set(alerts(false).map(a => a.type));
      return [...set];
    });
    ['call', 'remind', 'pay', 'confirm'].forEach(k => {
      if (!kinds.includes(k)) throw new Error('alerte « ' + k + ' » absente (' + kinds.join(',') + ')');
    });
    await page.screenshot({ path: OUT + '/04-alertes.png', fullPage: true });
  });

  await step('rappel marqué envoyé après préparation du message', async () => {
    const before = await page.evaluate(() => alerts(false).filter(a => a.type === 'remind').length);
    await page.click('[data-send-mail]');
    await page.waitForTimeout(300);
    const sheet = await page.textContent('#sheetBody');
    if (!/Petit rappel de votre séance/.test(sheet)) throw new Error('message non pré-rédigé');
    if (!/Bonjour Marie/.test(sheet)) throw new Error('message non personnalisé');
    if (!/mailto:/.test(await page.innerHTML('#sheetBody'))) throw new Error('lien Mail absent');
    await page.screenshot({ path: OUT + '/10-message.png' });
    await page.click('#msgDone');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => alerts(false).filter(a => a.type === 'remind').length);
    if (after !== before - 1) throw new Error('rappel non marqué : ' + before + ' → ' + after);
  });

  await step('marquer une alerte traitée', async () => {
    const before = await page.evaluate(() => alerts(false).length);
    await page.click('[data-ack]');
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => alerts(false).length);
    if (after !== before - 1) throw new Error(before + ' → ' + after);
  });

  await step('suivi', async () => {
    await page.click('[data-go=suivi]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/05-suivi.png', fullPage: true });
  });

  await step('réglages et sauvegarde', async () => {
    await page.click('[data-go=reglages]');
    await page.waitForTimeout(200);
    await page.fill('#coachName', 'LMT Coaching');
    await page.fill('#milestoneCallDays', '7');
    await page.click('[data-save-settings]');
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => db.settings.milestoneCallDays);
    if (s !== 7) throw new Error('réglage non enregistré');
    await page.screenshot({ path: OUT + '/06-reglages.png', fullPage: true });
  });

  await step('persistance après rechargement', async () => {
    const before = await page.evaluate(() => db.clients.length + ':' + db.sessions.length);
    await page.reload();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => db.clients.length + ':' + db.sessions.length);
    if (before !== after) throw new Error(before + ' ≠ ' + after);
  });

  await step('fiche client complète', async () => {
    await page.click('[data-go=clients]');
    await page.waitForTimeout(200);
    await page.click('.item');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/07-fiche.png', fullPage: true });
  });

  await step('thème sombre', async () => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(300);
    await page.click('[data-go=agenda]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/08-sombre.png' });
    await page.emulateMedia({ colorScheme: 'light' });
  });

  await step('grand écran', async () => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + '/09-bureau.png' });
  });

  await browser.close();
  console.log('\n--- erreurs JS ---');
  console.log(errors.length ? errors.join('\n') : 'aucune');
  process.exit(errors.length ? 1 : 0);
})();
