/* Reproduit l'état d'un appareil où l'ancien exemple est déjà installé,
   puis vérifie que le nouveau planning le remplace. */
const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-lefish/cf0aa78f-b5a5-595b-a7d8-3d88a4a3f38d/scratchpad/solo';
const PAGE = 'file:///tmp/claude-0/-home-user-lefish/cf0aa78f-b5a5-595b-a7d8-3d88a4a3f38d/scratchpad/preview.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  let ko = 0;
  const check = (l, ok, d) => { console.log((ok ? '  ok  ' : '  ÉCHEC ') + l + (d !== undefined ? ' → ' + d : '')); if (!ok) ko++; };

  // 1. On simule l'ancien état : quelques cours et un repère de version périmé.
  await p.goto(PAGE);
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('lmt-coaching-seed', 'lmt-2026-08-08-c');
    localStorage.setItem('lmt-coaching-v1', JSON.stringify({
      seq: 50, clients: [{ id: 1, firstName: 'Ancien', lastName: 'Exemple', phone: null, email: null,
                           notes: null, healthFlag: false, status: 'active', defaultDuration: 60,
                           rateCents: 0, reminderDays: null, reminderEmail: true,
                           milestoneInterval: null, startedOn: null, createdAt: '2026-08-01 10:00' }],
      sessions: [{ id: 2, clientId: 1, recurrenceId: null, originDate: null,
                   startsAt: '2026-08-08 14:00', duration: 60, location: null, status: 'planned',
                   notes: null, isSpecial: false, movedCount: 0, movedAt: null }],
      recurrences: [], payments: [], skips: [], acks: {}, reminded: {}, settings: {},
    }));
  });
  await p.reload();
  await p.waitForTimeout(900);

  const r = await p.evaluate(() => {
    const lundi = weekStart(new Date());
    const semaine = (offset) => {
      const a = dateStr(addDays(lundi, offset * 7)), z = dateStr(addDays(lundi, offset * 7 + 6));
      return db.sessions.filter(s => s.startsAt.slice(0, 10) >= a && s.startsAt.slice(0, 10) <= z).length;
    };
    return {
      clients: db.clients.length,
      ancien: db.clients.some(c => c.firstName === 'Ancien'),
      total: db.sessions.length,
      s6: semaine(-6), s3: semaine(-3), s1: semaine(-1), s0: semaine(0), sp1: semaine(1), sp4: semaine(4),
      demo: db.demo,
    };
  });

  check('le nouvel exemple a remplacé l\'ancien', r.clients === 39 && !r.ancien, r.clients + ' clients');
  check('semaine en cours', r.s0 === 33, r.s0);
  check('semaine précédente', r.s1 === 33, r.s1);
  check('trois semaines avant', r.s3 === 33, r.s3);
  check('six semaines avant', r.s6 === 33, r.s6);
  check('semaine suivante', r.sp1 === 33, r.sp1);
  check('dans un mois', r.sp4 === 33, r.sp4);
  check('cours au total', r.total > 700, r.total);
  check('marque du jeu livré', !!r.demo, r.demo);

  // 2. Un second chargement ne doit rien réinstaller.
  await p.evaluate(() => { db.clients[0].firstName = 'Édité'; save(); });
  await p.reload();
  await p.waitForTimeout(700);
  const garde = await p.evaluate(() => db.clients[0].firstName);
  check('rien n\'est réinstallé au rechargement suivant', garde === 'Édité', garde);

  // 3. Vue sur une semaine passée
  await p.evaluate(() => { cursor = addDays(weekStart(new Date()), -35); agendaMode = 'week'; render(); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/21-semaine-passee.png' });
  await p.evaluate(() => { cursor = new Date(); agendaMode = 'day'; render(); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/22-jour.png' });

  await b.close();
  console.log('erreurs JS :', errs.length ? errs.join(' | ') : 'aucune');
  process.exit(ko || errs.length ? 1 : 0);
})();
