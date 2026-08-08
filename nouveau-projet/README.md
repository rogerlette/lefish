# Nouveau projet

Squelette d'application web : front statique (HTML/CSS/JS) + API PHP/MySQL,
sur le même modèle qu'AquaStock à la racine du dépôt.

## Structure

```
nouveau-projet/
├── index.html          Page principale
├── css/styles.css      Styles (thème clair/sombre via variables CSS)
├── js/
│   ├── config.js       Constantes et configuration front
│   ├── api.js          Appels HTTP vers api/items.php
│   ├── state.js        État applicatif en mémoire
│   └── app.js          Rendu et initialisation
└── api/
    ├── config.php      Identifiants MySQL (à renseigner)
    ├── db.php          Connexion PDO
    ├── items.php       API REST CRUD
    └── schema.sql      Création de la table
```

## Installation

1. Créer la base et la table :

   ```sh
   mysql -u <user> -p <base> < api/schema.sql
   ```

2. Renseigner les identifiants dans `api/config.php` (les valeurs livrées sont
   des placeholders).

3. Servir le dossier avec PHP :

   ```sh
   php -S localhost:8000 -t nouveau-projet
   ```

   Puis ouvrir <http://localhost:8000>.

## API

| Méthode | Route                  | Effet                    |
| ------- | ---------------------- | ------------------------ |
| GET     | `api/items.php`        | Liste les éléments       |
| POST    | `api/items.php`        | Crée un élément          |
| PUT     | `api/items.php?id=X`   | Met à jour un élément    |
| DELETE  | `api/items.php?id=X`   | Supprime un élément      |
