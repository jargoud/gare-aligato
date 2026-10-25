# Changelog

Toutes les évolutions notables du jeu sont décrites ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté

- **Sons** générés par Web Audio : ambiance du hall, tintement des recettes de billets,
  sons d'amélioration, d'embauche, de licenciement et de stocks ;
  bouton pour couper le son, coupé par défaut, choix mémorisé.
- **Onglets** dans les fenêtres pour passer de l'une à l'autre sans les fermer.
- **Accueil voyageurs** (objectif 2) : moins d'abandons quand un train est en retard, billets vendus sur tablette
  même en grève, une partie des voyageurs sans billet attendent le train suivant.
- **Billet le plus rentable** et résultat prévu du lendemain dans la fenêtre Tarifs.

### Modifié

- La **grève des guichetiers** dure 3 heures au lieu de toute la journée, et les guichetiers vendent encore la moitié
  des billets (30 % auparavant).
- Le bilan du soir ne conseille plus de baisser le prix quand la gare n'est pas pleine : il conseille le prix le plus
  rentable.
- Certaines améliorations en demandent une autre : bancs supplémentaires, 2ᵉ abri et café du quai (quai niveau 2),
  3ᵉ abri (grand quai), spa (hôtel de 3 étages), salon 1re classe (gare nationale).
- Les **saisons** durent une semaine au lieu de deux.
- Les **abris** sont plus grands (60 voyageurs au lieu de 40) et accueillent un banc dessous : +0,05 ★ par abri équipé.
- Les **véhicules** de la route roulent au rythme du jeu (2×, 4×).
- Les robots nettoyeurs deviennent des **autolaveuses** conduites par un agent d'entretien, qui passent derrière les bancs.
- Les **bancs** sont alignés sur une même rangée et les **distributeurs** répartis en coins café-repas-goodies le long du quai.

## [1.0.0] - 2026-10-24

Première version jouable de *Gare de train Aligato*, clone hommage du jeu de René Paradis.

### Ajouté

- **Scène animée** : forêt, route et voitures, gare et hôtel en briques, quai, trains, cycle jour/nuit, pluie et neige.
- **Fréquentation stable** fixée chaque soir : clientèle attirée (prix, appréciation, bonus) limitée par la capacité de la gare.
- **Semaine et saisons** : express des travailleurs du lundi au vendredi, week-ends de loisir, 4 saisons de 14 jours
  avec leur météo et les vacances d'été.
- **Trains** : régional, Intercités et TGV selon la catégorie de la gare ; wagons, rénovation et voiture-bar.
- **Personnel** : guichetiers, entretien, hôtel, serveurs, avec effectif conseillé et alertes.
- **Hôtel** : file d'attente à la réception, étages, bornes de check-in, spa.
- **Stocks** : distributeurs de cafés, repas et goodies, remplissage manuel ou automatique ; cafétéria et café du quai.
- **Améliorations** : quai, gare, salle d'attente, bancs, abris, commerces, services et machines, débloquées par
  8 objectifs, une par type et par jour.
- **Météo et confort** : les voyageurs sans abri par mauvais temps font baisser l'appréciation.
- **Incidents** : trains en retard, pannes de distributeurs, grève ; atelier de maintenance pour s'en protéger.
- **Économie** : frais quotidiens, bilan et prévisions, découvert toléré trois soirs, faillite.
- **Appréciation** détaillée critère par critère, **score** quotidien sur 200 et record.
- **Interface** : bandeau d'informations, encart d'état de la gare, fenêtres modales qui mettent le jeu en pause,
  notifications cliquables, bilan du soir avec conseils, historique sur 14 jours, visite guidée.
- **Sauvegarde automatique** dans le navigateur et bouton de nouvelle partie.
- **Simulation d'équilibrage** sans navigateur : `node sim.mjs`.
