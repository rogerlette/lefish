"""Construit la page publiée : l'application, la liste de clients, le programme d'exemple."""
import json, sys

APP = '/home/user/lefish/lmt-coaching/autonome/index.html'
SRC = '/tmp/claude-0/-home-user-lefish/cf0aa78f-b5a5-595b-a7d8-3d88a4a3f38d/scratchpad/LMT-39-clients.json'

seed = json.load(open(SRC))
seed['version'] = 'lmt-2026-08-08-c'

# Les identifiants sont ceux du fichier de clients (1 à 39).
def cid(n):
    return seed['clients'][n]['id']

# ---- Semaine type : matins, fins de journée, deux créneaux le samedi ----
SEMAINE = [
    # lundi
    {'d': 1, 't': '09:00', 'c': cid(3),  'lieu': 'Salle'},
    {'d': 1, 't': '10:15', 'c': cid(6),  'lieu': 'Salle'},
    {'d': 1, 't': '17:30', 'c': cid(10), 'lieu': 'Salle'},
    {'d': 1, 't': '18:45', 'c': cid(13), 'lieu': 'Domicile'},
    # mardi
    {'d': 2, 't': '08:30', 'c': cid(7),  'lieu': 'Salle'},
    {'d': 2, 't': '14:00', 'c': cid(4),  'lieu': 'Salle'},
    {'d': 2, 't': '15:15', 'c': cid(16), 'lieu': 'Salle'},
    {'d': 2, 't': '19:00', 'c': cid(20), 'lieu': 'Salle'},
    # mercredi
    {'d': 3, 't': '09:30', 'c': cid(11), 'lieu': 'Salle'},
    {'d': 3, 't': '11:00', 'c': cid(14), 'lieu': 'Extérieur'},
    {'d': 3, 't': '17:00', 'c': cid(22), 'lieu': 'Salle'},
    {'d': 3, 't': '18:15', 'c': cid(24), 'lieu': 'Salle'},
    # jeudi
    {'d': 4, 't': '08:30', 'c': cid(17), 'lieu': 'Salle'},
    {'d': 4, 't': '12:30', 'c': cid(9),  'lieu': 'Salle'},
    {'d': 4, 't': '17:30', 'c': cid(26), 'lieu': 'Salle'},
    {'d': 4, 't': '19:00', 'c': cid(30), 'lieu': 'Domicile'},
    # vendredi — la 12e séance de ce client tombe ici
    {'d': 5, 't': '09:00', 'c': cid(3),  'lieu': 'Salle'},
    {'d': 5, 't': '10:15', 'c': cid(12), 'lieu': 'Salle'},
    {'d': 5, 't': '16:00', 'c': cid(28), 'lieu': 'Salle'},
    {'d': 5, 't': '17:15', 'c': cid(33), 'lieu': 'Salle'},
    # samedi
    {'d': 6, 't': '09:00', 'c': cid(19), 'lieu': 'Extérieur'},
    {'d': 6, 't': '10:30', 'c': cid(21), 'lieu': 'Salle'},
]

# ---- Historique : dix séances passées pour que la 12e arrive cette semaine ----
HISTORIQUE = []
for w in range(1, 6):                       # cinq semaines en arrière
    HISTORIQUE += [
        {'weeks': w, 'd': 1, 't': '09:00', 'c': cid(3),  'lieu': 'Salle'},
        {'weeks': w, 'd': 5, 't': '09:00', 'c': cid(3),  'lieu': 'Salle'},
        {'weeks': w, 'd': 2, 't': '14:00', 'c': cid(4),  'lieu': 'Salle'},
        {'weeks': w, 'd': 4, 't': '08:30', 'c': cid(17), 'lieu': 'Salle'},
    ]

# ---- Encaissements : forfaits en cours, un solde à zéro pour l'alerte ----
PAIEMENTS = [
    {'c': cid(3),  'n': 12, 'cents': 54000, 'ago': 40, 'method': 'Chèque'},
    {'c': cid(4),  'n': 4,  'cents': 18000, 'ago': 12, 'method': 'Virement'},
    {'c': cid(17), 'n': 4,  'cents': 18000, 'ago': 21, 'method': 'Espèces'},
    {'c': cid(10), 'n': 12, 'cents': 54000, 'ago': 6,  'method': 'Chèque'},
    {'c': cid(13), 'n': 4,  'cents': 18000, 'ago': 3,  'method': 'CB'},
]

# ---- Horaires récurrents : les semaines suivantes se remplissent seules ----
RECURRENCES = [
    {'c': cid(3),  'd': 1, 't': '09:00', 'lieu': 'Salle'},
    {'c': cid(3),  'd': 5, 't': '09:00', 'lieu': 'Salle'},
    {'c': cid(4),  'd': 2, 't': '14:00', 'lieu': 'Salle'},
    {'c': cid(6),  'd': 1, 't': '10:15', 'lieu': 'Salle'},
    {'c': cid(7),  'd': 2, 't': '08:30', 'lieu': 'Salle'},
    {'c': cid(10), 'd': 1, 't': '17:30', 'lieu': 'Salle'},
    {'c': cid(11), 'd': 3, 't': '09:30', 'lieu': 'Salle'},
    {'c': cid(13), 'd': 1, 't': '18:45', 'lieu': 'Domicile'},
    {'c': cid(14), 'd': 3, 't': '11:00', 'lieu': 'Extérieur', 'every': 2},
    {'c': cid(17), 'd': 4, 't': '08:30', 'lieu': 'Salle'},
    {'c': cid(19), 'd': 6, 't': '09:00', 'lieu': 'Extérieur'},
    {'c': cid(20), 'd': 2, 't': '19:00', 'lieu': 'Salle'},
    {'c': cid(22), 'd': 3, 't': '17:00', 'lieu': 'Salle'},
    {'c': cid(26), 'd': 4, 't': '17:30', 'lieu': 'Salle'},
    {'c': cid(28), 'd': 5, 't': '16:00', 'lieu': 'Salle'},
]

seed['sample'] = {
    'week': SEMAINE,
    'history': HISTORIQUE,
    'payments': PAIEMENTS,
    'recurrences': RECURRENCES,
}

# Une fiche porte un point de vigilance santé, pour montrer le signalement.
seed['clients'][3]['healthFlag'] = True
seed['clients'][3]['notes'] = (
    "Exemple de note de fiche : pacemaker — pas de travail en intensité maximale, "
    "surveiller la récupération entre les séries."
)
for i in (3, 4, 6, 10, 13, 17):
    seed['clients'][i]['rateCents'] = 4500

app = open(APP).read()
body = app.split('<body>', 1)[1].rsplit('</body>', 1)[0].strip()
assert 'const SEED = null;' in body
body = body.replace('const SEED = null;',
                    'const SEED = ' + json.dumps(seed, ensure_ascii=False, separators=(',', ':')) + ';')

out = '<title>LMT Coaching</title>\n' + body + '\n'
open(sys.argv[1], 'w').write(out)
print('page construite :', len(out), 'octets ·', len(seed['clients']), 'clients ·',
      len(SEMAINE), 'cours cette semaine ·', len(RECURRENCES), 'horaires récurrents')
