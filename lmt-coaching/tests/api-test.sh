#!/bin/bash
# Test de bout en bout de l'API LMT Coaching
set -u
#
# Usage :
#   BASE_URL=http://127.0.0.1:8099/api APP_PASSWORD=lmt-coaching CRON_KEY=testcron \
#     bash tests/api-test.sh
#
# ⚠ Le script écrit dans la base configurée par api/config.php : à lancer
#   uniquement sur une base de test.

B=${BASE_URL:-http://127.0.0.1:8099/api}
PASSWORD=${APP_PASSWORD:-lmt-coaching}
CKEY=${CRON_KEY:-testcron}
J=$(mktemp)
trap 'rm -f $J' EXIT
FAILED=0

say()  { echo -e "\n=== $1 ==="; }
check() { # check "label" "json" "jq-expr" "expected"
  local got
  got=$(echo "$2" | python3 -c "import sys,json;d=json.load(sys.stdin);print($3)" 2>/dev/null)
  if [ "$got" == "$4" ]; then echo "  ok  $1 → $got"; else echo "  FAIL $1 → attendu '$4', obtenu '$got'"; echo "       $2" | head -c 400; FAILED=$((FAILED+1)); fi
}

api() { # api METHOD path [body]
  if [ $# -ge 3 ]; then
    curl -s -b $J -c $J -X "$1" -H 'Content-Type: application/json' -d "$3" "$B/$2"
  else
    curl -s -b $J -c $J -X "$1" "$B/$2"
  fi
}

say "1. Connexion"
R=$(api POST auth.php "{\"password\":\"$PASSWORD\"}"); check "login" "$R" "d['authenticated']" "True"
R=$(api POST auth.php '{"password":"mauvais"}');      check "mauvais mot de passe refusé" "$R" "'error' in d" "True"
R=$(api POST auth.php "{\"password\":\"$PASSWORD\"}")

say "2. Installation de la base"
R=$(api POST install.php); check "tables créées" "$R" "d['installed']" "True"

say "3. Création d'un client"
R=$(api POST clients.php '{"firstName":"Marie","lastName":"Dupont","email":"marie@example.com","phone":"0612345678","notes":"Porteuse d un pacemaker","healthFlag":true,"rateCents":4500,"defaultDuration":60}')
CID=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
check "client créé" "$R" "d['name']" "Marie Dupont"
check "solde initial" "$R" "d['stats']['balance']" "0"

say "4. Horaire récurrent (tous les mardis 14h)"
R=$(api POST recurrences.php "{\"clientId\":$CID,\"weekday\":2,\"startTime\":\"14:00\",\"intervalWeeks\":1,\"duration\":60,\"location\":\"Salle A\"}")
check "cours générés (16 semaines)" "$R" "d['sessionsCreated'] >= 15" "True"
RECID=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['recurrence']['id'])")

say "5. Agenda"
FROM=$(date +%Y-%m-%d); TO=$(date -d "+120 days" +%Y-%m-%d)
R=$(api GET "sessions.php?from=$FROM&to=$TO")
check "cours dans l'agenda" "$R" "len(d) >= 15" "True"
check "numérotation" "$R" "d[0]['ordinal']" "1"
check "12e séance = bilan" "$R" "d[11]['isMilestone']" "True"
check "1re séance non bilan" "$R" "d[0]['isMilestone']" "False"
check "fiche santé remontée" "$R" "d[0]['healthFlag']" "True"
SID1=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
SID12=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)[11]['id'])")

say "6. Détail d'un cours"
R=$(api GET "sessions.php?id=$SID1")
check "coordonnées client" "$R" "d['client']['phone']" "0612345678"
check "notes de la fiche" "$R" "d['client']['notes']" "Porteuse d un pacemaker"

say "7. Notes propres au cours"
R=$(api PUT "sessions.php?id=$SID1" '{"notes":"Test d effort leger"}')
check "note enregistrée" "$R" "d['session']['notes']" "Test d effort leger"

say "8. Déplacement d'un cours par le client"
NEW=$(date -d "+3 days" +%Y-%m-%d)
R=$(api PUT "sessions.php?id=$SID1" "{\"startsAt\":\"$NEW 10:30\",\"notifyClient\":false}")
check "cours déplacé" "$R" "d['moved']" "True"
check "compteur de déplacements" "$R" "d['session']['movedCount']" "1"

say "9. Résistance du bilan aux déplacements"
# On déplace la 12e séance très loin : elle doit cesser d'être la 12e,
# une autre séance prend le n°12 automatiquement.
FAR=$(date -d "+300 days" +%Y-%m-%d)
api PUT "sessions.php?id=$SID12" "{\"startsAt\":\"$FAR 14:00\",\"notifyClient\":false}" > /dev/null
R=$(api GET "sessions.php?from=$FROM&to=$TO")
check "un autre cours devient le n°12" "$R" "[s['id'] for s in d if s['ordinal']==12][0] != $SID12" "True"
R=$(api GET "sessions.php?id=$SID12")
check "l'ancien n°12 est renuméroté" "$R" "d['session']['ordinal'] > 12" "True"

say "10. Paiements et solde"
R=$(api POST payments.php "{\"clientId\":$CID,\"sessionsCount\":12,\"amountEuros\":\"540\"}")
check "paiement 12 séances" "$R" "d['sessionsCount']" "12"
R=$(api GET "clients.php?id=$CID")
check "solde après paiement" "$R" "d['client']['stats']['balance']" "12"
# 3 séances effectuées
for i in 0 1 2; do
  SID=$(api GET "sessions.php?from=$FROM&to=$TO" | python3 -c "import sys,json;print(json.load(sys.stdin)[$i]['id'])")
  api PUT "sessions.php?id=$SID" '{"status":"done"}' > /dev/null
done
R=$(api GET "clients.php?id=$CID")
check "3 séances consommées" "$R" "d['client']['stats']['sessionsConsumed']" "3"
check "solde décrémenté" "$R" "d['client']['stats']['balance']" "9"
check "progression bilan" "$R" "d['client']['stats']['milestoneProgress']" "3"

say "11. Alertes"
api PUT settings.php '{"milestone_call_days":400,"low_balance":1}' > /dev/null
R=$(api GET notifications.php)
check "alerte d'appel bilan" "$R" "len([a for a in d['alerts'] if a['type']=='milestone_call'])" "1"
KEY=$(echo "$R" | python3 -c "import sys,json;print([a['key'] for a in json.load(sys.stdin)['alerts'] if a['type']=='milestone_call'][0])")
R=$(api POST 'notifications.php?action=ack' "{\"key\":\"$KEY\"}")
check "alerte marquée traitée" "$R" "d['acked']" "True"
R=$(api GET notifications.php)
check "alerte masquée" "$R" "len([a for a in d['alerts'] if a['type']=='milestone_call'])" "0"

say "12. Alerte de paiement"
api PUT settings.php '{"low_balance":20}' > /dev/null
R=$(api GET notifications.php)
check "paiement à encaisser signalé" "$R" "len([a for a in d['alerts'] if a['type']=='payment_due'])" "1"
api PUT settings.php '{"low_balance":1}' > /dev/null

say "13. Liste d'horaires saisie à la main"
D1=$(date -d "+2 days" +%Y-%m-%d); D2=$(date -d "+9 days" +%Y-%m-%d)
R=$(api POST 'sessions.php?action=batch' "{\"clientId\":$CID,\"slots\":[{\"startsAt\":\"$D1 09:00\"},{\"startsAt\":\"$D2 09:00\"}]}")
check "2 cours créés en lot" "$R" "len(d['created'])" "2"

say "14. Suppression d'une occurrence récurrente"
R=$(api GET "sessions.php?from=$FROM&to=$TO")
SIDX=$(echo "$R" | python3 -c "import sys,json;print([s['id'] for s in json.load(sys.stdin) if s['recurrenceId']][-1])")
api DELETE "sessions.php?id=$SIDX" > /dev/null
R=$(api GET "cron.php?key=$CKEY")
check "cron : l'occurrence supprimée ne revient pas" "$R" "d['sessionsGenerated']" "0"

say "15. Tâche planifiée / rappels"
api PUT settings.php '{"reminder_days":400}' > /dev/null
R=$(api GET "cron.php?key=$CKEY")
check "rappels envoyés" "$R" "d['remindersSent'] > 0" "True"
R=$(api GET "cron.php?key=$CKEY")
check "pas de doublon au 2e passage" "$R" "d['remindersSent']" "0"
R=$(curl -s "$B/cron.php?key=mauvaise")
check "clé cron invalide refusée" "$R" "'error' in d" "True"
api PUT settings.php '{"reminder_days":2}' > /dev/null

say "16. Statistiques"
R=$(api GET stats.php)
check "séances faites ce mois" "$R" "d['sessions']['done'] >= 1" "True"
check "clients actifs" "$R" "d['clients']['active']" "1"

say "17. Flux iCal"
R=$(curl -s -b $J "$B/ical.php")
echo "$R" | grep -q "BEGIN:VCALENDAR" && echo "  ok  flux iCal généré" || { echo "  FAIL iCal"; FAILED=$((FAILED+1)); }
echo "$R" | grep -q "SUMMARY:Marie Dupont" && echo "  ok  événement client présent" || { echo "  FAIL événement iCal"; FAILED=$((FAILED+1)); }

say "18. Sécurité"
R=$(curl -s "$B/clients.php")
check "API protégée sans session" "$R" "d['error']" "Non authentifié."
R=$(api POST 'auth.php?action=logout')
check "déconnexion" "$R" "d['authenticated']" "False"

echo
if [ $FAILED -eq 0 ]; then echo "*** TOUS LES TESTS PASSENT ***"; else echo "*** $FAILED test(s) en échec ***"; fi
exit $FAILED
