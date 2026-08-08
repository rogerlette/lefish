/* ================================================================
   config.js — Constantes de l'application
   ================================================================ */

const API = 'api/';

/** Libellés et couleurs des statuts de séance. */
const STATUS = {
  planned:     { label: 'Prévu',            short: 'Prévu' },
  done:        { label: 'Effectué',         short: 'Fait' },
  cancelled:   { label: 'Annulé (excusé)',  short: 'Annulé' },
  late_cancel: { label: 'Annulé tardif',    short: 'Tardif' },
  no_show:     { label: 'Absent',           short: 'Absent' },
};

/** Les statuts qui consomment une séance payée (miroir du back). */
const CONSUMING = ['done', 'late_cancel', 'no_show'];

const WEEKDAYS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const WEEKDAYS_SHORT = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const CLIENT_STATUS = {
  active:   'Actif',
  paused:   'En pause',
  archived: 'Archivé',
};
