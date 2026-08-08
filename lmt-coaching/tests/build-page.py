"""Construit la page publiée : l'application, la liste de clients, le programme d'exemple."""
import json, sys

APP = '/home/user/lefish/lmt-coaching/autonome/index.html'
SRC = '/tmp/claude-0/-home-user-lefish/cf0aa78f-b5a5-595b-a7d8-3d88a4a3f38d/scratchpad/LMT-39-clients.json'

seed = json.load(open(SRC))
seed['version'] = 'lmt-2026-08-08-e'

def cid(n):
    return seed['clients'][n]['id']

# Les trois premières fiches ne sont pas des clients (contact pro, entreprise) :
# le planning tourne sur les suivantes.
POOL = list(range(3, 39))

# ---- Semaine type : cinq cours du lundi au vendredi, quatre le week-end ----
HORAIRES = {
    1: ['08:30', '10:00', '12:30', '17:00', '18:30'],
    2: ['08:30', '10:00', '12:30', '17:00', '18:30'],
    3: ['09:00', '10:30', '12:00', '17:00', '18:30'],
    4: ['08:30', '10:00', '12:30', '17:30', '19:00'],
    5: ['08:30', '10:00', '12:00', '16:30', '18:00'],
    6: ['09:00', '10:30', '12:00', '14:00'],
    7: ['09:30', '11:00', '15:00', '17:00'],
}
LIEUX = ['Salle', 'Salle', 'Salle', 'Domicile', 'Extérieur']

TEMPLATE = []
i = 0
for jour in sorted(HORAIRES):
    for heure in HORAIRES[jour]:
        TEMPLATE.append({
            'd': jour,
            't': heure,
            'c': cid(POOL[i % len(POOL)]),
            'lieu': LIEUX[i % len(LIEUX)],
        })
        i += 1

# ---- Semaines matérialisées : trois semaines passées, la semaine en cours ----
SEMAINES = []
for decalage in (-3, -2, -1, 0):
    for x in TEMPLATE:
        SEMAINES.append({'w': decalage, 'd': x['d'], 't': x['t'], 'c': x['c'], 'lieu': x['lieu']})

# ---- Les semaines suivantes sont tenues par les horaires récurrents ----
RECURRENCES = [{'c': x['c'], 'd': x['d'], 't': x['t'], 'lieu': x['lieu']} for x in TEMPLATE]

# ---- Encaissements : un forfait par client, trois soldes à sec pour l'alerte ----
PAIEMENTS = []
for n, index in enumerate(POOL):
    if index in (POOL[2], POOL[7], POOL[13]):        # trois clients à relancer
        continue
    PAIEMENTS.append({
        'c': cid(index),
        'n': 12 if n % 3 == 0 else 4,
        'cents': 54000 if n % 3 == 0 else 18000,
        'ago': 5 + (n * 3) % 40,
        'method': ['Chèque', 'Virement', 'Espèces', 'CB'][n % 4],
    })

seed['sample'] = {
    'weeks': SEMAINES,
    'payments': PAIEMENTS,
    'recurrences': RECURRENCES,
}

# Une fiche porte un point de vigilance santé, pour montrer le signalement.
seed['clients'][3]['healthFlag'] = True
seed['clients'][3]['notes'] = (
    "Exemple de note de fiche : pacemaker — pas de travail en intensité maximale, "
    "surveiller la récupération entre les séries."
)
for index in POOL:
    seed['clients'][index]['rateCents'] = 4500

app = open(APP).read()
body = app.split('<body>', 1)[1].rsplit('</body>', 1)[0].strip()
assert 'const SEED = null;' in body
body = body.replace('const SEED = null;',
                    'const SEED = ' + json.dumps(seed, ensure_ascii=False, separators=(',', ':')) + ';')

out = '<title>LMT Coaching</title>\n' + body + '\n'
open(sys.argv[1], 'w').write(out)
print('page construite :', len(out), 'octets ·', len(seed['clients']), 'clients ·',
      len(TEMPLATE), 'cours par semaine ·', len(SEMAINES), 'cours posés ·',
      len(RECURRENCES), 'horaires récurrents ·', len(PAIEMENTS), 'encaissements')
