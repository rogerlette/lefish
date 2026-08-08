# LMT Coaching — application de gestion

Application mobile (PWA installable sur iPhone et Android) pour gérer les
clients, l'agenda des séances, les paiements par blocs et les rappels
automatiques de LMT Coaching.

Front statique (HTML/CSS/JS, sans build ni dépendance) + API PHP/MySQL :
elle tourne sur n'importe quel hébergement mutualisé (OVH, o2switch, Ionos…).

## Deux versions

| | `autonome/index.html` | Version complète (ce dossier) |
| --- | --- | --- |
| Mise en route | aucune — le fichier suffit | base MySQL + config + CRON |
| Données | dans le navigateur de l'appareil | base MySQL, partagée entre appareils |
| Rappels clients | message pré-rédigé, ouvert dans Mail ou SMS | e-mails envoyés automatiquement |
| Sauvegarde | export/import d'un fichier JSON | sauvegarde de l'hébergeur |

Les deux appliquent exactement les mêmes règles métier (numérotation des
séances, séances bilan, soldes, alertes). `autonome/index.html` est un fichier
unique : il s'ouvre depuis n'importe où — un hébergement statique, une clé USB,
ou directement le fichier — et fonctionne sans réseau.

---

## 1. Ce que fait l'application

### Agenda
- Vue **semaine** et vue **jour**, navigation par flèches ou par balayage.
- Un cours affiche l'heure, le client, la durée, le lieu, le **numéro de séance**,
  le statut et les pastilles de vigilance.
- Appui sur un cours → fiche détaillée : coordonnées du client (appel / SMS /
  e-mail en un geste), notes de la fiche client (ex. « porteuse d'un
  pacemaker », affichées en rouge), **notes propres à ce cours**, statut,
  déplacement, envoi du rappel, suppression.

### Clients
- Liste avec recherche, solde de séances payées, prochain cours, alerte santé.
- Fiche : coordonnées, notes de santé/objectifs, tarif, durée type,
  compteurs (séances faites, solde, cours à venir, progression vers le bilan).
- **Horaires récurrents** : « tous les mardis à 14h », « un mardi sur deux »,
  avec date de début et de fin facultative. Les cours sont posés dans l'agenda
  jusqu'à l'horizon réglé (16 semaines par défaut).
- **Liste d'horaires libre** : saisie de plusieurs créneaux d'un coup
  (`2026-03-04 14:00`, `04/03/2026 14h00`… une ligne par cours).
- **Paiements** : blocs payés d'avance (12 séances au premier contrat, puis 4),
  montant, moyen de paiement, solde calculé automatiquement.

### Séances bilan (mesures de fréquence cardiaque)
- Toutes les 12 séances (réglable, y compris client par client), la séance
  concernée est marquée **★ bilan cardio** dans l'agenda.
- Une alerte vous dit **quand appeler le client** — 7 jours avant par défaut —
  pour lui demander de prendre ses mesures, avec le numéro en appel direct.

### Alertes du coach
Recalculées en permanence à partir de l'agenda réel :
| Alerte | Déclenchement |
| --- | --- |
| 📞 Appel bilan cardio | N jours avant la séance n°12, 24, 36… |
| 💶 Paiement à encaisser | Solde de séances payées au plancher ou négatif |
| ✓ Séance à pointer | Un cours passé est resté « prévu » |
| 📅 Aucun cours planifié | Client actif sans séance à venir |
| ✉ E-mail manquant | Rappels activés mais pas d'adresse |

Chaque alerte se marque « c'est fait » ; elle revient d'elle-même si la
situation évolue (nouvelle séance consommée, cours déplacé…).

### Rappels e-mail automatiques
- Envoi N jours avant le cours (réglage global, surchargeable par client).
- Mention automatique des mesures cardiaques quand c'est une séance bilan.
- E-mail de prévenance quand vous **déplacez** ou **annulez** un cours.
- Aucun doublon : un rappel n'est envoyé qu'une fois par horaire visé.

### Suivi
Séances faites / annulées / absences du mois, encaissements, séances faites non
payées, histogramme sur 12 mois, charge de la semaine.

### En plus
- **Installable** sur l'écran d'accueil (PWA), thème clair/sombre, utilisable
  d'une main.
- **Flux iCal** en lecture seule à abonner dans le calendrier du téléphone.
- Détection des **créneaux qui se chevauchent** à la création et au déplacement.
- Application protégée par mot de passe ; toute l'API refuse les accès anonymes.

---

## 2. Résistance aux changements de date

C'est le point central : **rien n'est figé à l'avance**.

- Le **numéro de séance** d'un cours n'est pas stocké, il est recalculé à chaque
  affichage à partir de l'ordre chronologique réel des séances du client.
  Si un client déplace son cours de mardi au jeudi de la semaine suivante,
  les numéros se réordonnent tout seuls.
- La **séance bilan** est donc toujours la prochaine séance dont le numéro est
  un multiple de 12 — et l'alerte d'appel suit sa date, quelle qu'elle soit.
- Le **rappel e-mail** est indexé sur l'horaire visé : déplacer un cours déjà
  annoncé déclenche un nouveau rappel corrigé, et jamais un doublon.
- Un cours **déplacé à la main n'est jamais réécrasé** par la règle récurrente ;
  un cours supprimé n'est jamais recréé.
- Les **annulations excusées ne consomment pas** de séance payée ; les
  annulations tardives et les absences la décomptent (réglable par statut lors
  du pointage).

---

## 3. Installation

### 3.1 Base de données
Créez une base MySQL chez votre hébergeur, puis renseignez `api/config.php` :

```php
define('DB_HOST', 'xxx.mysql.db');
define('DB_NAME', 'lmt_coaching');
define('DB_USER', 'lmt_coaching');
define('DB_PASS', '…');
```

Créez ensuite les tables, au choix :
- depuis un terminal : `mysql -u USER -p BASE < api/schema.sql` ;
- ou depuis l'application : à la première connexion, un bandeau propose
  **« Créer les tables »** (également dans Réglages → Automatisation).

### 3.2 Mot de passe d'accès
Le mot de passe livré est `lmt-coaching` — **changez-le** :

```sh
php -r 'echo password_hash("votre-mot-de-passe", PASSWORD_DEFAULT), "\n";'
```

Recopiez le résultat dans `AUTH_PASSWORD_HASH` (`api/config.php`).
Tant que le mot de passe par défaut est en place, un bandeau d'avertissement
s'affiche dans l'application.

### 3.3 Clés d'automatisation
Toujours dans `api/config.php` :

```php
define('CRON_KEY',   'une-longue-chaine-aleatoire');
define('ICAL_TOKEN', 'une-autre-chaine-aleatoire');
define('MAIL_FROM',  'contact@votre-domaine.fr');
```

### 3.4 Tâche planifiée (indispensable pour les rappels)
Une fois par jour, par exemple à 8h, appelez :

```
https://votre-domaine.fr/lmt-coaching/api/cron.php?key=VOTRE_CLE_CRON
```

Chez OVH : *Hébergement → Tâches planifiées (CRON)*, commande
`wget -q -O /dev/null "https://…/api/cron.php?key=…"`.

La tâche fait deux choses : elle prolonge les cours récurrents jusqu'à
l'horizon et elle envoie les rappels dus.
`&dry=1` permet de voir ce qui partirait sans rien envoyer.

### 3.5 Installer l'application sur le téléphone
- **iPhone** : ouvrir le site dans Safari → Partager → *Sur l'écran d'accueil*.
- **Android** : Chrome → menu → *Installer l'application*.

### 3.6 Abonner son calendrier (facultatif)
`https://votre-domaine.fr/lmt-coaching/api/ical.php?token=VOTRE_TOKEN`
à ajouter comme calendrier par abonnement (iOS : Réglages → Calendrier →
Comptes → Ajouter un abonnement).

---

## 4. Réglages disponibles

| Réglage | Défaut | Effet |
| --- | --- | --- |
| Rappel — jours avant | 2 | Délai d'envoi du rappel e-mail |
| Rappels activés | oui | Coupe tous les envois automatiques |
| Prévenir en cas de déplacement | oui | E-mail au client si le cours bouge |
| Bilan toutes les … séances | 12 | Rythme des séances de mesures cardiaques |
| Me prévenir … jours avant | 7 | Délai de l'alerte d'appel |
| Premier contrat | 12 | Taille du premier bloc payé |
| Blocs suivants | 4 | Taille des blocs suivants |
| Alerte solde | 1 | Seuil de relance de paiement |
| Horizon | 16 semaines | Profondeur de création des cours récurrents |
| Durée type / tarif | 60 min | Valeurs proposées à la création |

Les délais de rappel et le rythme des bilans se surchargent **client par
client** depuis sa fiche.

---

## 5. Organisation du code

```
lmt-coaching/
├── index.html               Coquille de l'application
├── manifest.webmanifest     Installation sur l'écran d'accueil
├── sw.js                    Service worker (lancement hors connexion)
├── .htaccess                HTTPS forcé, fichiers sensibles bloqués
├── assets/                  Icônes
├── css/styles.css           Thème clair/sombre, mobile d'abord
├── js/
│   ├── config.js            Libellés et constantes
│   ├── utils.js             Dates, formatage, échappement HTML
│   ├── api.js               Appels à l'API
│   ├── store.js             État partagé
│   ├── ui.js                Feuille modale, messages, étiquettes
│   ├── views/               Une vue par écran
│   └── app.js               Démarrage, connexion, navigation
├── api/
│   ├── config.php           ⚙ à personnaliser (identifiants, clés)
│   ├── bootstrap.php        PDO, session, helpers JSON, réglages
│   ├── business.php         ★ règles métier (numérotation, bilans, alertes)
│   ├── mailer.php           Modèles et envoi des e-mails
│   ├── auth.php             Connexion / déconnexion
│   ├── clients.php          Fiches clients
│   ├── sessions.php         Cours de l'agenda
│   ├── recurrences.php      Horaires récurrents
│   ├── payments.php         Encaissements
│   ├── notifications.php    Alertes du coach
│   ├── settings.php         Réglages
│   ├── stats.php            Suivi d'activité
│   ├── cron.php             Tâche planifiée
│   ├── ical.php             Flux calendrier
│   ├── install.php          Création des tables
│   └── schema.sql           Schéma de la base
└── tests/api-test.sh        Test de bout en bout de l'API
```

---

## 6. Tests

`tests/api-test.sh` déroule un scénario complet sur une base jetable :
création de client, règle récurrente, déplacement de cours, renumérotation
des séances, séance bilan, paiements et solde, alertes, rappels sans doublon,
statistiques, flux iCal, contrôle d'accès.

```sh
# 1. une base MySQL de test + une copie de config.php pointant dessus
# 2. lancer le serveur PHP intégré à la racine du projet
php -S 127.0.0.1:8099 -t .
# 3. dans un autre terminal
BASE_URL=http://127.0.0.1:8099/api bash tests/api-test.sh
```

---

## 7. Données personnelles

L'application stocke des informations de santé (le champ « notes » de la fiche
client). Quelques règles simples :

- servir le site **en HTTPS** (le `.htaccess` force la redirection) ;
- changer le mot de passe par défaut et les deux clés d'automatisation ;
- ne pas versionner un `api/config.php` contenant les vrais identifiants ;
- limiter les notes de santé au strict nécessaire à la sécurité des séances ;
- prévenir les clients que leurs coordonnées et notes sont conservées, et
  supprimer une fiche sur demande (la suppression efface aussi ses cours et
  paiements).
