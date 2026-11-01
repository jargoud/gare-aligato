# Changelog

Toutes les évolutions notables du jeu sont décrites ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté

- **Extension des commerces** : commerces, cafétéria et relais colis sont regroupés dans un seul bâtiment en briques collé à la gare,
  plus large à chaque enseigne et plus haut à 3 puis 5 (une porte, une enseigne et une icône par commerce) ; les toilettes sont
  une porte annexe sur son côté ; des passants entrent et sortent des commerces.
- **Chômage technique** : serveurs, baristas, personnel d'hôtel ou guichetiers inactifs quand leur équipement est fermé
  ou en grève, signalés dans la fenêtre Personnel (salaire toujours payé).
- **Supérette à 3 niveaux** : épicerie (objectif 5), supérette (objectif 6) et supermarché (objectif 7), avec un loyer
  croissant ; chaque niveau reprend une part de la demande de repas.
- **Campagnes de publicité** (objectif 7) : journal, radio ou télévision, achetées le soir pour plus de clientèle
  pendant la journée qui commence seulement.
- **Défis de fréquentation** à 15 000 et 20 000 voyageurs en une journée.
- **Nouveaux services** : piano du hall, car de substitution en cas de retard ou de grève (objectif 4),
  salle d'attente climatisée (objectif 5).
- **Petits travaux** imprévus de quelques heures qui ferment un équipement, dès l'objectif 2.
- **Arrêt de la navette** visible (abribus) ; les voyageurs qu'elle dépose rejoignent la gare à pied.
- **Sons** : chant du coq, hululement du hibou, jingle d'arrivée des trains, sons des événements ;
  panneau de réglages avec une case par catégorie.
- **Mobile** : mise en page adaptée aux petits écrans, infobulles au toucher, invite à passer en paysage.
- **Chantiers d'amélioration** : un achat est livré après un temps de construction proportionnel à son prix (2 h minimum),
  avec des barrières « TRAVAUX » à l'emplacement de l'ouvrage et un état « 🚧 Fin jour N à H h » dans la liste.
  Seules les vraies constructions en ont ; matériel et services (wifi, piano, bornes, wagons…) s'installent en 1 h.
- **Onglet « 🌙 Fin de journée »** : le bilan du soir reste consultable en premier onglet tant que la journée suivante
  n'a pas commencé ; le jeu reste en pause jusqu'au bouton « Commencer le jour N ».
- **Voyageurs animés** : les nouveaux voyageurs sortent de la gare ou des commerces et marchent jusqu'à leur place sur le
  quai ; les portes coulissantes s'ouvrent à leur passage.

### Modifié

- **Onglets réordonnés** : Bilan, Objectifs, Améliorations, Tarifs, Personnel, Stocks (dans les fenêtres et la barre du bas).
- **Liste des améliorations** triée par objectif requis, puis par prix.
- **Prix du soir** : changer le prix du billet en fin de journée recalcule les voyageurs prévus de la journée qui commence.
- **Alertes de personnel en journée supprimées** : l'effectif ne change plus qu'en fin de journée, où le bilan conseille.
- **Piano du hall** : en ombre chinoise derrière une fenêtre de la gare, avec des notes de musique qui s'élèvent quand
  quelqu'un en joue, au lieu d'un son.
- **Goodies renommés « Souvenirs »** (les sauvegardes restent compatibles).
- **Objectif atteint** : fanfare plus longue (catégorie sonore « Événements ») et cotillons sur la notification.
- **Achats et personnel en fin de journée** : améliorations, embauches et licenciements ne se font qu'en fin de journée
  (« 🌙 Ce soir » en journée) ; les tarifs (billets et chambres) sont aussi figés en journée. Les stocks restent modifiables
  à tout moment.
- **Panneau « Début de journée »** : à chaque nouvelle partie, les tarifs (billets et chambres) se règlent avant l'ouverture
  du jour 1, avec accès aux autres onglets.
- **Départ moins difficile** : Wi-Fi, piano du hall et ligne téléphonique sont disponibles dès le début pour aider à
  atteindre l'objectif 1.
- **Objectif 2 abaissé à 10 clients à l'hôtel** : 12 imposait un hôtel plein, souvent atteint seulement le premier samedi.
- **Progression plus lente** : objectifs relevés d'environ 25 %, améliorations 25 % plus chères, budget de départ
  ramené à 30 000 €.
- **Saisons de 4 jours**, indépendantes de la semaine.
- L'**extension des abris** demande d'avoir construit les abris du quai (2 pour le niveau 1, 3 pour le niveau 2).
- Encart d'état plus compact : les jauges tiennent sur une ligne.

### Corrigé

- La **capacité** affichée ne comptait pas les express des travailleurs : les voyageurs prévus pouvaient la dépasser.
- Les **agents d'entretien** en action étaient cachés par les voyageurs en attente placés plus haut sur le quai.

## [1.1.1] - 2026-10-25

### Corrigé

- Le bouton **nouvelle partie** reprenait la partie abandonnée au lieu d'en commencer une nouvelle.

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
