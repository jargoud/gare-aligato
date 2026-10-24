# Changelog

Toutes les évolutions notables du jeu sont décrites ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/).

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
