# Changelog

Toutes les évolutions notables du jeu sont décrites ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

## [1.1.0] - 2026-10-25

Une gare plus vivante et plus longue à maîtriser : nouveaux services, nouveaux métiers, travaux d'entretien
et défis de fréquentation après les 8 objectifs. Le jeu se joue aussi en ligne sur GitHub Pages.

### Ajouté

- **Jeu en ligne** : https://jargoud.github.io/gare-aligato/
- **Sons** générés par Web Audio : ambiance du hall, tintement des recettes de billets, sons d'amélioration,
  d'embauche, de licenciement et de stocks ; coupés par défaut, choix mémorisé.
- **Onglets** pour passer d'une fenêtre à l'autre sans les fermer ; barre du bas en trois zones (vitesse, actions,
  son et nouvelle partie) avec infobulles.
- **Tarifs** : billet le plus rentable et résultat prévu du lendemain ; **prix des chambres** réglable, avec le prix
  le plus rentable et les demandes prévues.
- **Nouveaux métiers** : **baristas** du café du quai, **contrôleurs** contre la **fraude** (objectif 3), qui augmente
  avec le prix du billet.
- **Nouveaux services** : **accueil voyageurs** (objectif 2), **hôtel partenaire** (objectif 6), **café du quai**
  à 3 niveaux (café, terrasse, grand café), **extension des abris** sur tout le quai, **seconde voie** à 2 niveaux
  avec des trains de renfort.
- **Travaux d'entretien** à partir de 4,5 ★ : machines, tags, quai, étage d'hôtel, sanitaires ou salle d'attente,
  à lancer depuis le bilan du soir ; les reporter coûte de l'appréciation.
- **Défis de fréquentation** après les 8 objectifs : 8 000, 10 000 puis 12 000 voyageurs en une journée, puis
  records de la semaine (dès 60 000 voyageurs), récompensés en points.
- **Décor** : chambres occupées (rideaux, lumière le soir), autolaveuses conduites par un agent, tables de la terrasse,
  contrôleurs, barrières de chantier, voitures garées au parking, seconde voie.

### Modifié

- **Équilibrage** :
  - la grève des guichetiers dure 3 heures et les guichetiers vendent encore la moitié des billets ;
  - le bilan conseille le billet le plus rentable au lieu de « baissez le prix » ;
  - environ 35 % des clients préfèrent les distributeurs aux comptoirs pour les cafés et les repas ;
  - la boutique vend des goodies avant les distributeurs ;
  - les saisons durent une semaine au lieu de deux.
- **Améliorations liées** : bancs, abris, café du quai, spa et salon 1re classe demandent un quai, un hôtel ou une
  gare assez grands. L'agent de sécurité rend les travaux 25 % moins chers.
- **Abris** plus grands (60 voyageurs) avec un banc dessous (+0,05 ★) ; les voyageurs à l'abri s'y placent sur la scène.
- **Quai** réorganisé : bancs alignés, coins d'attente avec abri, banc et distributeurs café-repas-goodies.
- **Conseils et effectifs** : effectif conseillé fixé pour la journée, plafonné à 10 par métier, recalculé après un
  achat ou un changement de prix ; les conseils ne proposent plus d'amélioration déjà au maximum ; quand l'hôtel est
  plein, ils proposent le prix des chambres ou l'hôtel partenaire.
- La fenêtre **Stocks** indique ce que servent café, cafétéria et boutique ; les cartes d'**améliorations** ont des
  tailles plus homogènes.

### Corrigé

- Alertes de personnel « en trop » ou « il manque » qui changeaient au fil de la journée sans raison.
- Quai sale le soir malgré l'effectif conseillé en agents d'entretien (environ 80 % de propreté au lieu de 50 %).
- Véhicules de la route qui ne suivaient pas la vitesse du jeu.
- Café du quai qui chevauchait la boutique ; navette visible entre les commerces ; verrière qui passait devant la gare.

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
