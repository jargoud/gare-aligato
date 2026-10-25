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
- **Café du quai à 3 niveaux** (café, terrasse, grand café) avec un nouveau métier, les **baristas**.
- **Fraude et contrôleurs** (objectif 3) : la fraude augmente avec le prix du billet ; les contrôleurs la dissuadent
  et verbalisent. Fraudeurs et amendes dans le bilan du soir.
- La **boutique** vend des goodies avant les distributeurs ; la fenêtre Stocks indique ce que servent café,
  cafétéria et boutique.
- **Chambres occupées** visibles sur l'hôtel : rideaux tirés, lumière allumée en soirée et au réveil, éteinte la nuit ;
  les chambres vides restent sombres.
- **Prix des chambres** réglable dans Tarifs, avec le prix le plus rentable et les demandes prévues.
- **Hôtel partenaire** (objectif 6) : une partie des clients refusés accepte le trajet en ville, contre une commission.
- Le bilan du soir conseille le prix des chambres ou l'hôtel partenaire quand l'hôtel est plein, au lieu d'un étage de plus.
- Environ 35 % des clients **préfèrent les distributeurs** aux comptoirs pour les cafés et les repas : les distributeurs
  restent utiles avec une cafétéria ou un grand café.
- **Extension des abris** à deux niveaux : abris sur tout le quai niveau 2 (+120 voyageurs à l'abri), puis sur tout
  le grand quai (+250 au total).
- Les voyageurs à l'abri se placent **sous les abris** sur la scène.
- **Travaux d'entretien** (à partir de 4,5 ★) : machines, tags, quai, étage d'hôtel, sanitaires, salle d'attente ;
  frais immédiats ou chantier de quelques jours qui réduit la capacité ; les reporter coûte de l'appréciation.
  L'agent de sécurité les rend 25 % moins chers.
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
- Les cartes de la fenêtre **Améliorations** placent le prix ou l'état sous la description : tailles plus homogènes.
- La **boutique** commence après le **café du quai**, qui ne la chevauche plus ; la tour de l'horloge est centrée dessus.
- Les **commerces voisins** sont reliés par un mur : la navette ne se voit plus entre les façades.
- Le **parking** montre des voitures garées de profil, dessinées comme celles de la route.
- L'**effectif conseillé** est fixé pour la journée : plus d'alertes « en trop » ou « il manque » qui changent au fil
  des heures sans que le joueur ait rien fait. Il est recalculé après un achat qui le modifie.
- L'effectif conseillé en **agents d'entretien** tient compte des heures de passage des trains : le quai reste
  propre toute la journée (environ 80 % au lieu de 50 % le soir).
- Les **véhicules** de la route roulent au rythme du jeu (2×, 4×).
- Les robots nettoyeurs deviennent des **autolaveuses** conduites par un agent d'entretien, qui passent derrière les bancs.
- Les **bancs** sont alignés sur une même rangée et les **distributeurs** regroupés par trois (café, repas, goodies)
  dans des coins d'attente, à côté du banc de chaque abri.

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
