/* Test de l'interface mobile avec Chromium */
const { chromium } = require('playwright');

const OUT = '/tmp/claude-0/-home-user-lefish/cf0aa78f-b5a5-595b-a7d8-3d88a4a3f38d/scratchpad/shots';
const BASE = 'http://127.0.0.1:8099/';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  const step = async (name, fn) => {
    try { await fn(); console.log('  ok  ' + name); }
    catch (e) { console.log('  FAIL ' + name + ' → ' + e.message); errors.push(name + ': ' + e.message); }
  };

  await page.goto(BASE, { waitUntil: 'networkidle' });

  await step('écran de connexion', async () => {
    await page.waitForSelector('#loginForm', { state: 'visible' });
    await page.screenshot({ path: OUT + '/01-login.png' });
  });

  await step('connexion', async () => {
    await page.fill('#loginPassword', 'lmt-coaching');
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#shell:not(.hidden)');
    await page.waitForTimeout(800);
    // L'agenda ouvre sur la journée : on passe en semaine et on avance
    // jusqu'à trouver des cours (le jeu de test démarre plus tard).
    await page.click('[data-view="week"]');
    await page.waitForTimeout(500);
    for (let i = 0; i < 6 && await page.locator('.slot').count() === 0; i++) {
      await page.click('#agNext');
      await page.waitForTimeout(400);
    }
    await page.waitForSelector('.slot', { timeout: 6000 });
    await page.screenshot({ path: OUT + '/02-agenda-semaine.png' });
  });

  await step('vue jour', async () => {
    await page.click('[data-view="day"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + '/03-agenda-jour.png' });
    await page.click('[data-view="week"]');
    await page.waitForTimeout(600);
  });

  await step('détail d\'un cours', async () => {
    await page.click('.slot');
    await page.waitForSelector('#sheet:not(.hidden)');
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + '/04-detail-cours.png' });
    const txt = await page.textContent('#sheetBody');
    if (!/pacemaker/i.test(txt)) throw new Error('notes de la fiche client absentes du détail');
    await page.click('#sheetClose');
  });

  await step('liste clients', async () => {
    await page.click('[data-tab=clients]');
    await page.waitForSelector('.list-item');
    await page.screenshot({ path: OUT + '/05-clients.png' });
  });

  await step('fiche client', async () => {
    await page.click('.list-item');
    await page.waitForSelector('.progress');
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + '/06-fiche-client.png', fullPage: true });
    const txt = await page.textContent('#app');
    if (!/bilan/i.test(txt)) throw new Error('bloc bilan cardio absent');
  });

  await step('formulaire horaire récurrent', async () => {
    await page.click('#addRec');
    await page.waitForSelector('#sheet:not(.hidden)');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/07-recurrence.png' });
    await page.click('#sheetClose');
  });

  await step('encaissement', async () => {
    await page.click('#addPay');
    await page.waitForSelector('#savePay');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/08-paiement.png' });
    await page.click('#sheetClose');
  });

  await step('alertes', async () => {
    await page.click('[data-tab=alerts]');
    await page.waitForSelector('#alList');
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + '/09-alertes.png', fullPage: true });
  });

  await step('suivi', async () => {
    await page.click('[data-tab=stats]');
    await page.waitForSelector('.tiles');
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + '/10-suivi.png', fullPage: true });
  });

  await step('réglages', async () => {
    await page.click('[data-tab=settings]');
    await page.waitForSelector('#saveSettings');
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + '/11-reglages.png', fullPage: true });
  });

  await step('création d\'un cours', async () => {
    await page.click('[data-tab=agenda]');
    await page.waitForSelector('#agAdd');
    await page.click('#agAdd');
    await page.waitForSelector('#saveSession');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/12-nouveau-cours.png' });
    await page.click('#toggleMode');           // mode « plusieurs créneaux »
    await page.waitForTimeout(200);
    await page.screenshot({ path: OUT + '/13-creneaux-multiples.png' });
    await page.click('#sheetClose');
  });

  await step('thème sombre', async () => {
    await page.click('#btnTheme');
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + '/14-sombre.png' });
    await page.click('#btnTheme');
  });

  await step('affichage tablette / bureau', async () => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + '/15-bureau.png' });
  });

  await browser.close();

  console.log('\n--- erreurs JS ---');
  if (errors.length === 0) console.log('aucune');
  else errors.forEach(e => console.log('  ' + e));
  process.exit(errors.length ? 1 : 0);
})();
