'use strict';

// ---------- Helpers ----------
const W = 1280, H = 520;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
// ex. « 150 000,00 € » ; l'espace fine insécable des milliers est remplacée par une espace insécable, que le canvas affiche bien
const money = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }).replace(/\u202f/g, '\u00a0');
const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
const pad = (n) => String(n).padStart(2, '0');
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixA = (A, B, t) => A.map((v, i) => lerp(v, B[i], t));
const css = (A) => `rgb(${A.map(Math.round)})`;
const mix = (a, b, t) => css(mixA(hex(a), hex(b), t));
const binom = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k; };
function rng(seed) { // mulberry32, pour un décor stable
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Constantes de jeu ----------
const MS_PER_MIN = 400;          // 1 minute de jeu = 400 ms à vitesse 1× (une journée ≈ 10 min)
const MARKET = 2800;             // clientèle potentielle par jour (tarif moyen, appréciation moyenne)
const SEATS_PER_WAGON = 55, SEAT_SHARE = 0.75; // part des places libérées à chaque arrêt
const PLATFORM_MAX = [0, 120, 200, 350];       // voyageurs par train selon le niveau du quai
const PLATFORM_X = [0, 560, 260, 0];
const PRICE_PER_POINT = 1.2;     // tarif 50/100 => billet à 60 €
const TICKETS_PER_AGENT = 45, KIOSK_TICKETS = 30;
const ROOMS_PER_FLOOR = 12, ROOMS_PER_STAFF = 8, CHECKIN_ROOMS = 6;
const STAFF_CLEAN = 1.2, ROBOT_CLEAN = 2.5;    // saleté retirée par heure
const HIRE_FEE = 5000, SEVERANCE = 8000;
const MACHINE_UPKEEP = { kiosk: 300, robot: 400, checkin: 250 }; // par jour
const PUB_INCOME = 15000;
const WAITROOM = [0, 80, 160];            // places supplémentaires par train selon le niveau de la salle d'attente
const MEALS_PER_WAITER = 200, CAFETERIA_PRICE = 18, CAFETERIA_COST = 5;
const VANDAL_COST = 15000;
// Types de trains : multiplicateur du billet (distance), des places, wagons en plus à l'écran
const TRAIN_TYPES = {
  regional: { name: 'Régional', price: 1, seats: 1, extraCars: 0 },
  national: { name: 'Intercités', price: 1.6, seats: 1.3, extraCars: 1 },
  tgv: { name: 'TGV', price: 2.5, seats: 1.6, extraCars: 2 },
};
const TGV_HOURS = [7, 9, 17, 19];
// Catégorie de la gare : clientèle attirée et redevance quotidienne d'accès au réseau
const CATEGORIES = [null,
  { name: 'Gare régionale', market: 1, fee: 0 },
  { name: 'Gare nationale', market: 1.15, fee: 8000 },
  { name: 'Gare grande vitesse', market: 1.4, fee: 20000 },
];
// Gare nationale : un Intercités toutes les deux heures ; grande vitesse : TGV aux heures de pointe
const typeForHour = (h) => (S.category >= 3 && TGV_HOURS.includes(h) ? 'tgv' : S.category >= 2 && h % 2 ? 'national' : 'regional');
// Météo du jour : gêne pour les voyageurs qui attendent dehors (0 = aucune) et effet sur la clientèle
const WEATHERS = {
  sun: { icon: '☀️', name: 'Soleil', p: 0.45, severity: 0, demand: 1 },
  cloud: { icon: '⛅', name: 'Nuageux', p: 0.25, severity: 0, demand: 1 },
  rain: { icon: '🌧️', name: 'Pluie', p: 0.18, severity: 0.8, demand: 0.95 },
  heat: { icon: '🥵', name: 'Forte chaleur', p: 0.07, severity: 0.5, demand: 1, misc: 1.6 }, // on boit et on mange davantage
  snow: { icon: '❄️', name: 'Neige', p: 0.05, severity: 1.2, demand: 0.85 },
};
const SHELTER_SEATS = 60;
// emplacements des abris le long du quai (bord gauche) ; le banc de même rang se place dessous
const SHELTER_X = [1120, 980, 840], SHELTER_W = 110, BENCH_UNDER = 0.05;
// Saisons d'une semaine : météo probable, clientèle de loisir, chambres et travailleurs (vacances d'été)
const SEASON_DAYS = 7; // une saison par semaine, du lundi au dimanche
const SEASONS = [
  { name: 'Printemps', icon: '🌸', weather: { sun: 0.4, cloud: 0.3, rain: 0.25, heat: 0.03, snow: 0.02 }, demand: 1, rooms: 1, commuters: 1 },
  { name: 'Été', icon: '🌻', weather: { sun: 0.6, cloud: 0.15, rain: 0.07, heat: 0.18, snow: 0 }, demand: 1.2, rooms: 1.5, commuters: 0.7 },
  { name: 'Automne', icon: '🍂', weather: { sun: 0.3, cloud: 0.35, rain: 0.32, heat: 0.01, snow: 0.02 }, demand: 1, rooms: 1, commuters: 1 },
  { name: 'Hiver', icon: '⛄', weather: { sun: 0.25, cloud: 0.3, rain: 0.2, heat: 0, snow: 0.25 }, demand: 0.9, rooms: 0.8, commuters: 1 },
];
const seasonOf = (day = S.day) => SEASONS[Math.floor((day - 1) / SEASON_DAYS) % SEASONS.length];
function rollWeather(day) {
  let r = Math.random();
  for (const [k, p] of Object.entries(seasonOf(day).weather)) if ((r -= p) < 0) return k;
  return 'sun';
}
// Café du quai : 600 cafés par jour sans personnel ; la terrasse (niveau 2) et le grand café (niveau 3) servent plus,
// avec des baristas, des cafés et viennoiseries plus chers
const CAFE_CAPS = [0, 600, 1500, 2700], BARISTA_CUPS = 600, CAFE_NAMES = ['', 'Café du quai', 'Terrasse', 'Grand café'];
const cafePrice = () => (S.cafe >= 2 ? 6 : 3.5), cafeCost = () => (S.cafe >= 2 ? 1.5 : 1);
const BOUTIQUE_GOODIES = 200; // la boutique de la gare vend des goodies avant les distributeurs
// Services : bonus d'appréciation et coût d'entretien par jour
const SERVICES = {
  wifi: { icon: '📶', name: 'Wi-Fi gratuit', desc: 'Appréciation +0,15', req: 1, cost: 20000, upkeep: 600, rep: 0.15 },
  security: { icon: '👮', name: 'Agent de sécurité', desc: 'Protège contre le vandalisme', req: 1, cost: 25000, upkeep: 2500, rep: 0.1 },
  screens: { icon: '📺', name: 'Écrans d\'information', desc: 'Guichets et bornes 25 % plus efficaces', req: 2, cost: 30000, upkeep: 300, rep: 0.1 },
  cafeteria: { icon: '🍽️', name: 'Cafétéria', desc: `Repas à ${CAFETERIA_PRICE} € servis par des serveurs, dîner des clients de l'hôtel`, req: 3, cost: 90000, upkeep: 1500, rep: 0.2 },
  lockers: { icon: '🧳', name: 'Consigne à bagages', desc: 'Recette sur les voyageurs de loisir', req: 3, cost: 25000, upkeep: 200, rep: 0.05 },
  relay: { icon: '📦', name: 'Point relais colis', desc: 'Recette sur les travailleurs', req: 4, cost: 40000, upkeep: 300, rep: 0.05 },
  spa: { icon: '🧖', name: 'Spa de l\'hôtel', desc: 'Chambres 30 % plus chères le week-end', req: 6, cost: 120000, upkeep: 1500, rep: 0.1,
    pre: () => S.hotel >= 3, preText: () => 'Hôtel de 3 étages requis' },
  workshop: { icon: '🔧', name: 'Atelier de maintenance', desc: 'Retards et pannes 4 fois plus rares, distributeurs réparés dans l\'heure', req: 2, cost: 60000, upkeep: 1500, rep: 0.05 },
  welcome: { icon: '🙋', name: 'Accueil voyageurs', desc: 'Moins d\'abandons en cas de retard, 20 billets par train même en grève, une partie des voyageurs sans billet attendent le train suivant', req: 2, cost: 35000, upkeep: 1500, rep: 0.1 },
  lounge: { icon: '💎', name: 'Salon 1re classe', desc: 'Billet double pour 10 % des voyageurs dès 4 ★ (3 % sinon)', req: 6, cost: 150000, upkeep: 1000, rep: 0.1,
    pre: () => S.category >= 2, preText: () => 'Gare nationale requise' },
};
const ROOMS = [['Une Chambre Simple', 350], ['Une Chambre Double', 600], ['Une Suite', 1500]];
// Distributeurs : demande par visiteur, prix de vente, coût d'achat, contenance d'un distributeur
const PRODUCTS = {
  coffee: { icon: '☕', name: 'Cafés', rate: 0.22, price: 3, cost: 1, cap: 320, color: '#8d5a3b' },
  meal: { icon: '🥪', name: 'Repas', rate: 0.1, price: 9, cost: 4, cap: 170, color: '#e67e22' },
  goodies: { icon: '🎁', name: 'Goodies', rate: 0.04, price: 18, cost: 8, cap: 80, color: '#8e44ad' },
};
const VENDING_PRICE = 8000, VENDING_MAX = 4, VENDING_UPKEEP = 100;
// Commerces loués : part des visiteurs qui achètent, recette pour la gare par achat, bonus d'appréciation
const SHOPS = {
  news: { icon: '📰', name: 'Marchand de journaux', label: 'PRESSE', rate: 0.1, spend: 4, rep: 0.1, color: '#2f6fd6', req: 1, cost: 35000 },
  bakery: { icon: '🥐', name: 'Boulangerie', label: 'BOULANGERIE', rate: 0.12, spend: 8, rep: 0.2, color: '#c98b3a', req: 3, cost: 60000 },
  books: { icon: '📚', name: 'Librairie', label: 'LIBRAIRIE', rate: 0.03, spend: 25, rep: 0.15, color: '#8e44ad', req: 4, cost: 70000 },
  market: { icon: '🛒', name: 'Mini-supermarché', label: 'SUPÉRETTE', rate: 0.06, spend: 30, rep: 0.15, color: '#27ae60', req: 5, cost: 110000 },
  wc: { icon: '🚻', name: 'Sanitaires', label: 'TOILETTES', rate: 0, spend: 0, rep: 0.3, color: '#7f8c8d', req: 2, cost: 30000 },
};
const SHOP_UPKEEP = 600;
const TRAIN_HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // de 5 h à 23 h

// Répartition douce de la journée : légers pics matin et soir, normalisée sur le nombre de trains
const SHAPE = (() => {
  const raw = Object.fromEntries(TRAIN_HOURS.map((h) => [h, 1 + 0.3 * Math.exp(-((h - 8) ** 2) / 2) + 0.3 * Math.exp(-((h - 18) ** 2) / 2.5) - (h < 6 || h > 21 ? 0.25 : 0)]));
  const k = TRAIN_HOURS.length / sum(Object.values(raw));
  for (const h of TRAIN_HOURS) raw[h] *= k;
  return raw;
})();

const newDay = (rep = 3) => ({ passengers: 0, visitors: 0, rooms: 0, refused: 0, missed: 0, revenue: 0, commuters: 0, counter: { meal: 0, coffee: 0, goodies: 0 }, fraud: 0, caught: 0, fines: 0, demand: 0, served: 0, restock: 0, empty: {}, low: {}, bought: {}, goals: [], repStart: rep });
const DEBT_DAYS = 3; // jours de découvert tolérés avant la faillite
const S = {
  budget: 150000, day: 1, minutes: 4 * 60, // départ à 4 h : les voyageurs du premier train ont le temps d'arriver
  tarif: 50, rep: 3, dirt: 10, lastSat: 0.9,
  stock: { coffee: 320, meal: 170, goodies: 80 }, vending: { coffee: 1, meal: 1, goodies: 1 }, autoRefill: true,
  shops: Object.fromEntries(Object.keys(SHOPS).map((k) => [k, 0])), hotelQueue: 0, checkinAcc: 0,
  waiting: 0, waitingCommuters: 0, pendingBoard: 0, disembark: 0, boarding: 0,
  wagons: 4, hotel: 1, station: 1, platform: 1, phone: 0, shuttle: 0, cafe: 0, parking: 0, pub: 0,
  staff: { guichet: 3, entretien: 2, hotel: 2, cafe: 0, barista: 0, controleur: 0 }, waitroom: 0, benches: 0, shelters: 0, comfort: 0, barCar: 0, category: 1,
  svc: Object.fromEntries(Object.keys(SERVICES).map((k) => [k, 0])), machines: { kiosk: 0, robot: 0, checkin: 0 },
  plan: null, today: newDay(), report: null, lastNet: 0, score: 0, history: [], lastMiss: 0, lastExposure: 0, lastFraud: 0, lastDelay: 0, broken: {}, strike: 0, debtDays: 0, event: null, goal: 0, speed: 1, over: false,
};

const STAFF = {
  guichet: { icon: '🎫', name: 'Guichetiers', one: 'un guichetier', min: () => (S.machines.kiosk ? 0 : 1), salary: 3500,
    info: () => `${ticketCap()} billets par train` },
  entretien: { icon: '🧹', name: 'Agents d\'entretien', one: 'un agent d\'entretien', min: () => 0, salary: 2500,
    info: () => `propreté ${Math.round(100 - S.dirt)} %` },
  hotel: { icon: '🛎️', name: 'Personnel d\'hôtel', one: 'un employé d\'hôtel', min: () => 0, salary: 3000,
    info: () => `${roomCap()} chambres par jour` },
  cafe: { icon: '🍽️', name: 'Serveurs', one: 'un serveur', min: () => 0, salary: 2000, available: () => S.svc.cafeteria,
    info: () => `${cafeteriaCap()} repas par jour` },
  controleur: { icon: '🕵️', name: 'Contrôleurs', one: 'un contrôleur', min: () => 0, salary: 2500, available: () => S.goal >= FRAUD_GOAL,
    info: () => `${fmt(S.staff.controleur * CONTROL_PAX)} voyageurs contrôlés par jour · fraude ${Math.round(fraudRate() * 100)} %` },
  barista: { icon: '☕', name: 'Baristas', one: 'un barista', min: () => 0, salary: 1200, available: () => S.cafe >= 2,
    info: () => `${fmt(cafeCap())} cafés par jour au ${CAFE_NAMES[S.cafe].toLowerCase()}` },
};
const staffRoles = () => Object.entries(STAFF).filter(([, r]) => r.available?.() ?? true);
const cafeteriaCap = () => (S.svc.cafeteria ? S.staff.cafe * MEALS_PER_WAITER : 0);
// Fraude (à partir de l'objectif 3) : plus le billet est cher, plus de voyageurs montent sans payer.
// Les contrôleurs en dissuadent une partie et verbalisent ceux qu'ils prennent.
const FRAUD_GOAL = 3, CONTROL_PAX = 600, FINE = 50, DETERRENCE = 0.7, JUMP_SHARE = 0.4;
const controlCoverage = (n = S.staff.controleur, plan = S.plan) => Math.min(1, (n * CONTROL_PAX) / Math.max(1, plan.classic));
const fraudRate = (n = S.staff.controleur, plan = S.plan) => (S.goal >= FRAUD_GOAL
  ? (0.02 + 0.1 * (S.tarif / 100)) * (1 - DETERRENCE * controlCoverage(n, plan)) : 0);
const cafeCap = () => (S.cafe ? Math.min(CAFE_CAPS[S.cafe], CAFE_CAPS[1] + S.staff.barista * BARISTA_CUPS) : 0);
const COMFORT = ['Sièges confortables', 'Climatisation', 'Prises et Wi-Fi à bord'];
const BAR = { rate: 0.15, spend: 7, share: 0.85, upkeep: 1200 }; // voiture-bar : achats à bord, moins de demande aux distributeurs
const shelterCap = () => S.shelters * SHELTER_SEATS + WAITROOM[S.waitroom]; // voyageurs à l'abri : abris + salle d'attente
const weather = () => WEATHERS[S.plan.weather];
const screensMult = () => (S.svc.screens ? 1.25 : 1);
// en cas de grève (S.strike = minute de fin), les guichetiers vendent deux fois moins : les bornes tournent normalement
const STRIKE_HOURS = 3;
const striking = () => S.strike > S.minutes;
const WELCOME_TICKETS = 20; // billets vendus sur tablette par les agents d'accueil, à chaque train
const welcomeTickets = () => (S.svc.welcome ? WELCOME_TICKETS : 0);
const ticketCap = () => Math.round((S.staff.guichet * TICKETS_PER_AGENT * (striking() ? 0.5 : 1) + S.machines.kiosk * KIOSK_TICKETS + welcomeTickets()) * screensMult());
const cleanRate = () => S.staff.entretien * STAFF_CLEAN + S.machines.robot * ROBOT_CLEAN;
const roomCap = () => Math.min(S.hotel * ROOMS_PER_FLOOR, S.staff.hotel * ROOMS_PER_STAFF + S.machines.checkin * CHECKIN_ROOMS);
const seatsPerTrain = () => Math.round(S.wagons * SEATS_PER_WAGON * SEAT_SHARE);
const platformCap = () => PLATFORM_MAX[S.platform] + WAITROOM[S.waitroom]; // quai + salle d'attente
const capPerTrain = () => Math.min(platformCap(), seatsPerTrain());
const ticketPrice = () => S.tarif * PRICE_PER_POINT;

// Objectifs : chacun débloque de nouvelles améliorations (S.goal = nombre d'objectifs atteints)
const GOALS = [
  { text: 'Transporter 2 000 voyageurs en une journée', value: () => S.today.passengers, target: 2000, unlocks: 'Wagons · Agrandir le quai · Marchand de journaux · Wi-Fi · Agent de sécurité' },
  { text: 'Accueillir 10 clients à l\'hôtel en une journée', value: () => S.today.rooms, target: 10, unlocks: 'Étages d\'hôtel · Bornes de check-in · Sanitaires · Écrans d\'information · Salle d\'attente · Atelier de maintenance · Accueil voyageurs' },
  { text: 'Atteindre une appréciation de 3,5 ★', value: () => S.rep, target: 3.5, unlocks: 'Bornes de billets · Ligne téléphonique · Boulangerie · Cafétéria · Consigne à bagages · Gare nationale' },
  { text: 'Transporter 3 000 voyageurs en une journée', value: () => S.today.passengers, target: 3000, unlocks: 'Boutique · Autolaveuses · Grand quai · Wagons 7 et 8 · Librairie · Point relais colis' },
  { text: `Faire ${money(150000)} de bénéfice en une journée`, value: () => S.lastNet, target: 150000, money: true, unlocks: 'Navette · Café du quai · Mini-supermarché · Grande salle d\'attente' },
  { text: 'Accueillir 30 clients à l\'hôtel en une journée', value: () => S.today.rooms, target: 30, unlocks: 'Parking · Dernier étage d\'hôtel · Spa · Salon 1re classe · Gare grande vitesse' },
  { text: 'Transporter 5 000 voyageurs en une journée', value: () => S.today.passengers, target: 5000, unlocks: 'Tour de l\'horloge · Panneau publicitaire' },
  { text: 'Atteindre une appréciation de 4,5 ★', value: () => S.rep, target: 4.5, unlocks: 'Le titre de Légende du rail' },
];

// req[niveau] = nombre d'objectifs à atteindre pour acheter ce niveau
const UPGRADES = [
  { id: 'category', icon: '🚄', name: 'Catégorie de la gare', level: () => S.category - 1, max: 2, req: [3, 6],
    cost: (l) => [150000, 400000][l], buy: () => S.category++,
    pre: () => S.platform >= S.category + 1, preText: () => (S.category === 1 ? 'Quai niveau 2 requis' : 'Grand quai requis'),
    desc: () => (S.category === 1
      ? `Gare nationale : un Intercités toutes les deux heures (billet ×1,6, +30 % de places), clientèle +15 % · redevance ${money(8000)} / jour`
      : `Gare grande vitesse : TGV à 7 h, 9 h, 17 h et 19 h (billet ×2,5, +60 % de places, 4 ★ conseillées), clientèle +25 % · redevance ${money(20000)} / jour`) },
  { id: 'comfort', icon: '🛋️', name: 'Rénovation des wagons', desc: () => `${COMFORT[Math.min(2, S.comfort)]} : appréciation +0,1, clientèle +5 %`
      + (S.comfort === 1 ? ', moins de gêne par forte chaleur' : ''),
    level: () => S.comfort, max: 3, req: [1, 3, 5], cost: (l) => [40000, 80000, 140000][l], buy: () => S.comfort++ },
  { id: 'barCar', icon: '🍷', name: 'Voiture-bar', desc: () => `Ventes à bord, 15 % de demande en moins aux distributeurs · ${money(BAR.upkeep)} / jour`,
    level: () => S.barCar, max: 1, req: [4], cost: () => 70000, buy: () => S.barCar++ },
  { id: 'wagon', icon: '🚃', name: 'Wagon', desc: () => `+${Math.round(SEATS_PER_WAGON * SEAT_SHARE)} places par train`, level: () => S.wagons - 4, max: 4, req: [1, 1, 4, 4], cost: (l) => 50000 * (l + 1), buy: () => S.wagons++ },
  { id: 'quai', icon: '🛤️', name: 'Agrandir le quai', desc: () => `${PLATFORM_MAX[Math.min(3, S.platform + 1)]} voyageurs par train`, level: () => S.platform - 1, max: 2, req: [1, 4], cost: (l) => [60000, 150000][l], buy: () => S.platform++ },
  { id: 'hotel', icon: '🏨', name: 'Étage d\'hôtel', desc: () => `+${ROOMS_PER_FLOOR} chambres`, level: () => S.hotel - 1, max: 3, req: [2, 2, 6], cost: (l) => 80000 * (l + 1), buy: () => S.hotel++ },
  { id: 'checkin', icon: '🛎️', name: 'Borne de check-in', desc: () => `+${CHECKIN_ROOMS} chambres par jour, sans salaire`, level: () => S.machines.checkin, max: 3, req: [2], cost: () => 45000, buy: () => S.machines.checkin++ },
  { id: 'kiosk', icon: '🎫', name: 'Borne de billets', desc: () => `+${KIOSK_TICKETS} billets par train, sans salaire`, level: () => S.machines.kiosk, max: 4, req: [3], cost: () => 40000, buy: () => S.machines.kiosk++ },
  { id: 'phone', icon: '☎️', name: 'Ligne téléphonique', desc: () => 'Réservations : +10 % de clientèle', level: () => S.phone, max: 1, req: [3], cost: () => 40000, buy: () => S.phone++ },
  { id: 'gare', icon: '🏛️', name: 'Agrandir la gare', desc: () => (S.station === 1 ? 'Boutique' : 'Tour de l\'horloge') + ' : ventes +40 %, clientèle +10 %', level: () => S.station - 1, max: 2, req: [4, 7], cost: (l) => [90000, 200000][l], buy: () => S.station++ },
  { id: 'robot', icon: '🧽', name: 'Autolaveuse', desc: () => 'Conduite par un agent d\'entretien, elle nettoie comme 2 agents', level: () => S.machines.robot, max: 3, req: [4], cost: () => 50000, buy: () => S.machines.robot++ },
  { id: 'shuttle', icon: '🚌', name: 'Navette', desc: () => '+15 % de clientèle', level: () => S.shuttle, max: 1, req: [5], cost: () => 90000, buy: () => S.shuttle++ },
  { id: 'cafe', icon: '☕', name: 'Café du quai', level: () => S.cafe, max: 3, req: [5, 6, 7], cost: (l) => [70000, 50000, 90000][l], buy: () => S.cafe++,
    desc: () => [`Sert ${CAFE_CAPS[1]} cafés par jour avant les distributeurs, sans personnel, appréciation +0,4`,
      `Terrasse : jusqu'à ${fmt(CAFE_CAPS[2])} cafés et viennoiseries par jour à ${money(6)}, avec des baristas, appréciation +0,1`,
      `Grand café : jusqu'à ${fmt(CAFE_CAPS[3])} cafés par jour, avec des baristas, appréciation +0,1`][Math.min(2, S.cafe)],
    pre: () => (S.cafe < 2 ? S.platform >= 2 : S.station >= 2), preText: () => (S.cafe < 2 ? 'Quai niveau 2 requis' : 'Boutique requise') },
  { id: 'parking', icon: '🅿️', name: 'Parking', desc: () => '+20 % de clientèle', level: () => S.parking, max: 1, req: [6], cost: () => 120000, buy: () => S.parking++ },
  { id: 'pub', icon: '📢', name: 'Panneau publicitaire', desc: () => `+${money(PUB_INCOME)} par jour`, level: () => S.pub, max: 1, req: [7], cost: () => 60000, buy: () => S.pub++ },
  { id: 'benches', icon: '🪑', name: 'Bancs sur le quai', desc: () => 'Appréciation +0,05 par niveau, +0,05 de plus sous un abri',
    level: () => S.benches, max: 3, req: [0], cost: (l) => 8000 * (l + 1), buy: () => S.benches++,
    pre: () => !S.benches || S.platform >= 2, preText: () => 'Quai niveau 2 requis' }, // il faut de la place sur le quai
  { id: 'shelters', icon: '⛱️', name: 'Abri voyageurs', desc: () => `Abrite ${SHELTER_SEATS} voyageurs de la pluie, de la neige et du soleil ; avec un banc dessous, appréciation +0,05`,
    level: () => S.shelters, max: 3, req: [1], cost: (l) => 25000 * (l + 1), buy: () => S.shelters++,
    pre: () => !S.shelters || S.platform > S.shelters, preText: () => (S.shelters === 1 ? 'Quai niveau 2 requis' : 'Grand quai requis') },
  { id: 'waitroom', icon: '🚪', name: 'Salle d\'attente', desc: () => `+${WAITROOM[Math.min(2, S.waitroom + 1)]} voyageurs par train, appréciation +0,1`,
    level: () => S.waitroom, max: 2, req: [2, 5], cost: (l) => [70000, 140000][l], buy: () => S.waitroom++ },
  ...Object.entries(SERVICES).map(([k, v]) => ({
    id: k, icon: v.icon, name: v.name, level: () => S.svc[k], max: 1, req: [v.req], cost: () => v.cost, buy: () => S.svc[k]++, pre: v.pre, preText: v.preText,
    desc: () => `${v.desc} · ${money(v.upkeep)} / jour`,
  })),
  ...Object.entries(SHOPS).map(([k, sh]) => ({
    id: k, icon: sh.icon, name: sh.name, level: () => S.shops[k], max: 1, req: [sh.req], cost: () => sh.cost, buy: () => S.shops[k]++,
    desc: () => (sh.rate ? `Loyer sur les ventes · appréciation +${String(sh.rep).replace('.', ',')}` : 'Appréciation +0,3 · quai moins sale'),
  })),
];
const upReq = (u) => u.req[Math.min(u.level(), u.req.length - 1)];
// une seule amélioration de chaque type par jour (les travaux prennent la journée)
const upState = (u) => (u.level() >= u.max ? 'max' : S.goal < upReq(u) ? 'locked' : u.pre && !u.pre() ? 'pre' : S.today.bought[u.id] ? 'today'
  : S.budget < u.cost(u.level()) ? 'poor' : 'ok');

const EVENTS = [
  { msg: '🚍 Un car de touristes arrive sur le quai !', kind: 'good', run: () => { S.waiting += 40 + rand(40); } },
  { msg: '🎤 Congrès en ville : l\'hôtel est très demandé', kind: 'good', rooms: 2.5 },
  { msg: `⚡ Panne de courant : réparation ${money(8000)}`, kind: 'bad', run: () => { S.budget -= 8000; } },
  { msg: '📰 Un journal vante la gare Aligato !', kind: 'good', run: () => { S.rep = Math.min(5, S.rep + 0.3); } },
  { msg: '🔨 Des vandales rôdent autour de la gare…', run: () => {
    if (S.svc.security) toast('👮 L\'agent de sécurité a fait fuir les vandales', 'good');
    else { S.budget -= VANDAL_COST; S.dirt = Math.min(100, S.dirt + 20); toast(`Vandalisme : ${money(VANDAL_COST)} de dégâts`, 'bad', 'upgrades'); }
  } },
  { msg: `✊ Grève des guichetiers pendant ${STRIKE_HOURS} heures : ils vendent deux fois moins de billets, les bornes fonctionnent`, kind: 'bad', run: () => { S.strike = S.minutes + STRIKE_HOURS * 60; } },
  { msg: '🔍 Inspection sanitaire…', run: () => {
    if (S.dirt > 50) { S.budget -= 25000; S.rep -= 0.4; toast(`Quai sale : amende de ${money(25000)}`, 'bad'); }
    else toast('Quai impeccable : félicitations de l\'inspecteur', 'good');
  } },
];

const clockStr = () => `${pad(Math.floor(S.minutes / 60))}:${pad(S.minutes % 60)}`;

// ---------- Semaine et types de voyageurs ----------
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const weekday = (day = S.day) => (day - 1) % 7; // la partie commence un lundi
const SPECIAL_HOURS = [6, 7, 17, 18]; // express des travailleurs, à h:30, du lundi au vendredi
const SPECIAL_WAGONS = 5;
const EXPRESS_SEATS = SPECIAL_WAGONS * 55; // places de l'express (wagons entièrement libres)
const SUB_SHARE = 0.5;                // un abonné paie la moitié d'un billet
// Multiplicateurs d'achat selon le type de voyageur
const PROFILES = {
  classic: { coffee: 1, meal: 1, goodies: 1, rooms: 1, lockers: 1, relay: 0, shops: {} },
  weekend: { coffee: 1, meal: 1.8, goodies: 1.3, rooms: 2, lockers: 3, relay: 0, shops: { bakery: 1.5, books: 1.5 } },
  commuter: { coffee: 2.2, meal: 1.5, goodies: 0, rooms: 0, lockers: 0, relay: 1, shops: { news: 2, bakery: 2, books: 0.5 } },
};
// Petites recettes par visiteur : [taux, montant]
const LOCKER = [0.03, 8], RELAY = [0.15, 6];
const loungeShare = () => (S.svc.lounge ? (S.rep >= 4 ? 0.1 : 0.03) : 0);
const spaMult = (weekend) => (weekend && S.svc.spa ? 1.3 : 1);
const commuterBase = () => 90 * (0.7 + S.rep / 10) * marketBonus();
const hasSpecial = (h) => (S.plan?.commuters[h] ?? 0) > 0;

// ---------- Modèle de fréquentation ----------
const marketBonus = () => 1 + 0.05 * S.comfort + 0.1 * S.phone + 0.15 * S.shuttle + 0.2 * S.parking + 0.1 * (S.station - 1);
// Clientèle potentielle : plus le prix est bas et la gare appréciée, plus il y a de monde
const potential = () => MARKET * (1.6 - (S.tarif / 100) * 1.2) * (0.5 + (S.rep / 5) * 0.7) * marketBonus() * CATEGORIES[S.category].market;

// Plan de la journée, fixé à minuit : nombre de voyageurs par train, limité par la capacité de la gare
// Le week-end attire plus de voyageurs de loisir ; en semaine, des express transportent les travailleurs
function makePlan(noise = true, day = S.day) {
  const weekend = weekday(day) >= 5, wx = noise ? rollWeather(day) : 'sun', season = seasonOf(day);
  const pot = potential() * (weekend ? 1.15 : 1) * WEATHERS[wx].demand * season.demand, trains = {}, commuters = {}, types = {}, caps = {};
  const jitter = () => (noise ? 0.95 + Math.random() * 0.1 : 1);
  // les grands trains attirent une plus grande part des voyageurs ; le TGV boude une gare sous 4 ★
  const weight = (h) => SHAPE[h] * TRAIN_TYPES[types[h]].seats * (types[h] === 'tgv' && S.rep < 4 ? 0.6 : 1);
  for (const h of TRAIN_HOURS) {
    types[h] = typeForHour(h);
    caps[h] = Math.min(platformCap(), Math.round(seatsPerTrain() * TRAIN_TYPES[types[h]].seats));
  }
  const totalWeight = sum(TRAIN_HOURS.map(weight));
  for (const h of TRAIN_HOURS) trains[h] = Math.round(Math.min(caps[h], ((pot * weight(h)) / totalWeight) * jitter()));
  // l'express part à h:30, quand le quai accueille déjà la moitié des voyageurs du train suivant
  if (!weekend) for (const h of SPECIAL_HOURS) {
    const room = Math.max(0, platformCap() - Math.round((trains[h + 1] ?? 0) / 2));
    commuters[h] = Math.round(Math.min(room, EXPRESS_SEATS, commuterBase() * season.commuters * jitter()));
  }
  const per = Object.values(trains), classic = sum(per), commuterTotal = sum(Object.values(commuters));
  return { day, weekend, weather: wx, rooms: season.rooms, potential: pot, capacity: sum(Object.values(caps)), trains, types, commuters, classic, commuterTotal,
    total: classic + commuterTotal, peak: Math.max(...per) };
}

// Tarif qui maximise le résultat prévu du lendemain (par pas de 5 points)
function bestTarif() {
  const keep = S.tarif;
  let best = keep, bestNet = -Infinity;
  for (let t = 5; t <= 100; t += 5) {
    S.tarif = t;
    const e = expect(makePlan(false, S.day + 1));
    if (e.revenue - e.costs > bestNet) { bestNet = e.revenue - e.costs; best = t; }
  }
  S.tarif = keep;
  return best;
}

const satisfaction = () => (S.today.demand > 20 ? S.today.served / S.today.demand : S.lastSat);
const roomRate = () => 0.007 * (0.5 + satisfaction()) * (0.4 + S.rep / 5);
const stockCap = (k) => S.vending[k] * PRODUCTS[k].cap;
const productRate = (k) => PRODUCTS[k].rate * (WEATHERS[S.plan?.weather]?.misc ?? 1);
// Comptoirs servis avant les distributeurs : la cafétéria pour les repas, le café du quai pour les cafés,
// la boutique de la gare pour les goodies
const COUNTERS = {
  meal: { name: 'la cafétéria', owned: () => S.svc.cafeteria, cap: () => cafeteriaCap(), price: () => CAFETERIA_PRICE, cost: () => CAFETERIA_COST },
  coffee: { name: 'le café du quai', owned: () => S.cafe, cap: cafeCap, price: cafePrice, cost: cafeCost },
  goodies: { name: 'la boutique', owned: () => S.station >= 2, cap: () => BOUTIQUE_GOODIES, price: () => PRODUCTS.goodies.price, cost: () => PRODUCTS.goodies.cost },
};
const shopMult = () => 1 + 0.4 * (S.station - 1); // la boutique et la tour attirent les flâneurs
const shopRep = () => sum(Object.entries(SHOPS).map(([k, sh]) => S.shops[k] * sh.rep));
const dirtFactor = () => (S.shops.wc ? 0.7 : 1);
function refill(k) {
  const n = stockCap(k) - S.stock[k];
  S.stock[k] += n;
  S.today.restock += n * PRODUCTS[k].cost; // payé à minuit
}
const roomPrice = () => { // prix moyen d'une chambre selon la répartition de sell()
  const k = 1 + S.hotel * 0.15;
  return (0.55 * ROOMS[0][1] + 0.4 * ROOMS[1][1] + (k - 0.95) * ROOMS[2][1]) / k;
};

function dailyCosts(rooms, restock) {
  return [
    ['Électricité', 4000 + 2500 * S.station + 2000 * S.hotel + 1000 * S.platform + 400 * S.wagons + (S.cafe ? 1000 + 500 * S.cafe : 0) + SHOP_UPKEEP * sum(Object.values(S.shops))],
    ['Réapprovisionnement', Math.round(restock)],
    ['Blanchisserie', Math.round(rooms * 60)],
    ['Salaires', sum(Object.entries(STAFF).map(([k, r]) => S.staff[k] * r.salary))],
    ['Redevance réseau', CATEGORIES[S.category].fee],
    ['Services', sum(Object.entries(SERVICES).map(([k, v]) => S.svc[k] * v.upkeep)) + 800 * S.waitroom + BAR.upkeep * S.barCar],
    ['Entretien machines', sum(Object.entries(MACHINE_UPKEEP).map(([k, v]) => S.machines[k] * v)) + VENDING_UPKEEP * sum(Object.values(S.vending))],
  ];
}

// Valeurs moyennes attendues pour un plan donné, et effectif nécessaire pour le servir
function expect(plan) {
  const prof = plan.weekend ? PROFILES.weekend : PROFILES.classic, cp = PROFILES.commuter;
  const dis = plan.classic * 0.6, commuters = plan.commuterTotal, cVis = commuters * 2;
  const boarded = sum(Object.values(plan.trains).map((d) => Math.min(d, ticketCap())));
  const roomDemand = dis * roomRate() * prof.rooms * (plan.rooms ?? 1);
  const rooms = Math.min(roomDemand, roomCap());
  const visitors = boarded + dis;
  let products = 0, restock = 0;
  const demandBy = {}, counterBy = {}, stockShort = [];
  let cafeteriaDemand = 0, coffeeDemand = 0;
  for (const [k, p] of Object.entries(PRODUCTS)) {
    let d = (demandBy[k] = (visitors * prof[k] * barShare(k) + cVis * cp[k]) * productRate(k));
    const c = COUNTERS[k];
    if (c?.owned()) { // le comptoir sert d'abord, les distributeurs prennent le relais
      const want = d + (k === 'meal' ? rooms * 0.8 : 0), served = (counterBy[k] = Math.min(want, c.cap()));
      if (k === 'meal') cafeteriaDemand = want;
      if (k === 'coffee') coffeeDemand = want;
      products += served * c.price();
      restock += served * c.cost();
      d = Math.max(0, d - served);
    }
    const sold = Math.min(d, stockCap(k));
    if (d > stockCap(k)) stockShort.push(k);
    products += sold * p.price;
    restock += sold * p.cost;
  }
  const extras = (S.svc.lockers ? visitors * LOCKER[0] * prof.lockers * LOCKER[1] : 0) + (S.svc.relay ? cVis * RELAY[0] * RELAY[1] : 0);
  const shops = shopMult() * sum(Object.entries(SHOPS).map(([k, sh]) => S.shops[k] * sh.rate * sh.spend
    * (visitors * (prof.shops[k] ?? 1) + cVis * (cp.shops[k] ?? 1))));
  const bar = S.barCar ? boarded * BAR.rate * BAR.spend : 0;
  // recette des billets, pondérée par le type de chaque train (Intercités, TGV plus chers)
  // les fraudeurs ne paient pas leur billet ; ceux que les contrôleurs prennent paient l'amende
  const fareIncome = (n) => {
    const f = fraudRate(n, plan);
    const paid = sum(TRAIN_HOURS.map((h) => Math.min(plan.trains[h] * (1 - f), ticketCap()) * TRAIN_TYPES[plan.types[h]].price));
    return paid * (1 + loungeShare()) * ticketPrice() + f * controlCoverage(n, plan) * plan.classic * FINE;
  };
  // effectif de contrôleurs le plus rentable (recettes sauvées et amendes moins les salaires)
  let controllers = 0;
  if (S.goal >= FRAUD_GOAL) {
    const gain = (n) => fareIncome(n) - n * STAFF.controleur.salary;
    for (let n = 1; n <= 10; n++) if (gain(n) > gain(controllers)) controllers = n;
  }
  const revenue = fareIncome(S.staff.controleur) + commuters * SUB_SHARE * ticketPrice() + rooms * roomPrice() * spaMult(plan.weekend)
    + bar + products + shops + extras + S.pub * PUB_INCOME;
  const costs = sum(dailyCosts(rooms, restock).map(([, v]) => v));
  return {
    revenue, costs, demandBy, counterBy, stockShort,
    need: {
      guichet: Math.max(STAFF.guichet.min(), Math.ceil((plan.peak / screensMult() - S.machines.kiosk * KIOSK_TICKETS - welcomeTickets()) / TICKETS_PER_AGENT)),
      entretien: Math.max(0, Math.ceil((((visitors + cVis) * dirtFactor()) / 35 / 24 - S.machines.robot * ROBOT_CLEAN) / STAFF_CLEAN)),
      hotel: Math.max(0, Math.ceil((Math.min(roomDemand, S.hotel * ROOMS_PER_FLOOR) - S.machines.checkin * CHECKIN_ROOMS) / ROOMS_PER_STAFF)),
      cafe: S.svc.cafeteria ? Math.ceil(cafeteriaDemand / MEALS_PER_WAITER) : 0,
      controleur: controllers,
      barista: S.cafe >= 2 ? Math.ceil(clamp(coffeeDemand - CAFE_CAPS[1], 0, CAFE_CAPS[S.cafe] - CAFE_CAPS[1]) / BARISTA_CUPS) : 0,
    },
  };
}

// Qualité de service : l'appréciation s'en rapproche doucement à chaque train
// exposure : part des voyageurs qui attendent sans abri, pondérée par la gêne de la météo
// Critères de l'appréciation, avec leur effet en étoiles (affichés dans l'infobulle de la note)
function qualityFactors(missRatio = S.lastMiss, exposure = S.lastExposure) {
  const clean = 100 - S.dirt, sat = satisfaction(), sv = (k) => S.svc[k] * SERVICES[k].rep;
  const others = sum(Object.keys(SERVICES).filter((k) => k !== 'cafeteria' && k !== 'wifi').map(sv));
  return [
    [sat >= 0.8 ? 'Clients bien servis' : 'Clients mal servis (distributeurs ou hôtel)', (sat - 0.8) * 3],
    [clean >= 80 ? 'Quai propre' : 'Quai trop sale', clean >= 80 ? 0.5 : clean < 50 ? -1 : 0],
    ['Bonne restauration (café, cafétéria)', (S.cafe ? 0.3 + 0.1 * S.cafe : 0) + sv('cafeteria')],
    ['Confort (bancs, abris équipés, salle d\'attente, wagons, Wi-Fi)', 0.05 * S.benches + BENCH_UNDER * Math.min(S.benches, S.shelters) + 0.1 * S.waitroom + 0.1 * S.comfort + sv('wifi')],
    ['Commerces', shopRep()],
    ['Services (sécurité, écrans, consigne…)', others],
    ['Gare agrandie', 0.25 * (S.station - 1)],
    ['Voyageurs restés sans billet', -missRatio * 4],
    ['Fraude visible sur le quai', -Math.max(0, S.lastFraud - 0.08) * 5],
    ['Train en retard', -S.lastDelay * 3],
    [`Attente dehors sans abri (${weather().name.toLowerCase()})`, -exposure],
  ].filter(([, v]) => Math.abs(v) >= 0.01);
}
function quality(missRatio, exposure = 0) {
  return clamp(2.2 + sum(qualityFactors(missRatio, exposure).map(([, v]) => v)), 0, 5);
}

// ---------- Simulation ----------
const hasTrain = (h) => h >= 5 && h <= 23;
let acc = 0; // fraction de minute en cours, pour des animations fluides

// [phase, progression, express ?] : train normal à h:00, express des travailleurs à h:30
// 4e valeur : type du train affiché (régional, Intercités, TGV ou express)
function trainPhase() {
  const h = Math.floor(S.minutes / 60), m = (S.minutes % 60) + acc;
  const type = (hh) => S.plan?.types?.[hh] ?? 'regional';
  if (m >= 50 && hasTrain((h + 1) % 24)) return ['arriving', (m - 50) / 10, false, type((h + 1) % 24)];
  if (m < 15 && hasTrain(h)) return ['stopped', m / 15, false, type(h)];
  if (m < 25 && hasTrain(h)) return ['leaving', (m - 15) / 10, false, type(h)];
  if (hasSpecial(h)) {
    if (m >= 22 && m < 30) return ['arriving', (m - 22) / 8, true, 'express'];
    if (m >= 30 && m < 40) return ['stopped', (m - 30) / 10, true, 'express'];
    if (m >= 40 && m < 48) return ['leaving', (m - 40) / 8, true, 'express'];
  }
  return ['away', 0, false, 'regional'];
}

const peakFactor = (h) => Math.exp(-((h - 8) ** 2) / 2) + Math.exp(-((h - 18) ** 2) / 2.5) + (h >= 6 && h <= 22 ? 0.25 : 0.03);

function stepMinute() {
  S.minutes++;
  if (S.minutes >= 1440) { closeDay(); S.minutes = 0; S.day++; save(); }
  const h = Math.floor(S.minutes / 60), m = S.minutes % 60;

  // les voyageurs du prochain train arrivent régulièrement pendant l'heure qui précède
  S.waiting += (S.plan.trains[m === 0 ? h : (h + 1) % 24] ?? 0) / 60;
  // les travailleurs arrivent dans les 20 minutes qui précèdent leur express
  if (hasSpecial(h) && m > 10 && m <= 30) S.waitingCommuters += S.plan.commuters[h] / 20;

  if (S.shuttle && m % 30 === 0 && h >= 6 && h <= 22) {
    cars.push({ kind: 'bus', len: 92, color: '#f5b82e', lane: 1, dir: 1, x: -100, speed: 110, stopAt: 600, wait: 2.5 });
  }

  // la réception de l'hôtel enregistre les clients en file d'attente
  if (m % 10 === 0 && S.hotelQueue > 0) {
    S.checkinAcc += (S.staff.hotel * ROOMS_PER_STAFF + S.machines.checkin * CHECKIN_ROOMS) / 12 / 6;
    const n = Math.min(Math.floor(S.checkinAcc), S.hotelQueue);
    if (n) {
      let rev = 0;
      for (let i = 0; i < n; i++) {
        const r = Math.random() * (1 + S.hotel * 0.15);
        rev += ROOMS[r < 0.55 ? 0 : r < 0.95 ? 1 : 2][1] * spaMult(S.plan.weekend);
      }
      rev += serveCounter('meal', Math.round(n * 0.8)) * CAFETERIA_PRICE; // les clients de l'hôtel dînent à la cafétéria
      S.checkinAcc -= n;
      S.hotelQueue -= n;
      S.today.rooms += n;
      S.today.served += n;
      S.today.revenue += rev;
      S.budget += rev;
    }
  }
  if (!S.hotelQueue) S.checkinAcc = Math.min(S.checkinAcc, 1);

  if (m === 0) {
    S.dirt = Math.max(0, S.dirt - cleanRate());
    if (h >= 6 && h <= 21) {
      for (const k of Object.keys(S.broken)) {
        if (S.broken[k] && S.svc.workshop) {
          S.broken[k] = false;
          toast(`🔧 L'atelier a réparé le distributeur de ${PRODUCTS[k].name.toLowerCase()}`, 'good');
        }
      }
      const k = pick(Object.keys(PRODUCTS));
      if (!S.broken[k] && Math.random() < (S.svc.workshop ? 0.004 : 0.015)) {
        S.broken[k] = true;
        toast(`⚠️ Un distributeur de ${PRODUCTS[k].name.toLowerCase()} est en panne : réparez-le`, 'bad', 'stocks');
      }
    }
    if (!S.event && h >= 7 && h <= 20 && Math.random() < 0.05) {
      S.event = pick(EVENTS);
      toast(S.event.msg, S.event.kind);
      S.event.run?.();
    }
    if (hasTrain(h)) exchange(h);
  }
  if (m === 30 && hasSpecial(h)) exchangeSpecial(h);
  if (m === 30 && h >= 5 && h <= 21) checkStaff();
  S.rep = clamp(S.rep, 0, 5);
}

function exchange(h) {
  S.disembark = Math.round((S.plan.trains[h] ?? 0) * (0.5 + Math.random() * 0.2));
  // incident : train en retard, une partie des voyageurs abandonne
  const delayed = Math.random() < (S.svc.workshop ? 0.01 : 0.04);
  const giveUp = delayed ? Math.round(S.waiting * (S.svc.welcome ? 0.05 : 0.15)) : 0; // les agents d'accueil rassurent
  const present = Math.round(S.waiting) - giveUp;
  S.lastDelay = giveUp / Math.max(1, present + giveUp);
  if (delayed) toast(`🕒 Train de ${pad(h)}:00 en retard : ${giveUp} voyageur(s) abandonnent`, 'bad', 'upgrades');
  const type = TRAIN_TYPES[S.plan.types[h]], seats = Math.round(seatsPerTrain() * type.seats);
  // fraudeurs : ils montent sans passer au guichet, rejoints par une partie des voyageurs restés sans billet
  const cheats = binom(present, fraudRate());
  const walkins = Math.max(0, Math.min(present - cheats, seats - cheats, ticketCap()));
  const noTicket = present - cheats - walkins;
  const jumpers = S.goal >= FRAUD_GOAL ? Math.min(Math.round(noTicket * JUMP_SHARE), Math.max(0, seats - walkins - cheats)) : 0;
  const fraud = cheats + jumpers, caught = binom(fraud, controlCoverage());
  // les agents d'accueil font patienter la moitié des voyageurs sans billet jusqu'au train suivant, s'il reste de la place à quai
  const next = (h + 1) % 24;
  const kept = S.svc.welcome && hasTrain(next) ? Math.min(Math.round((noTicket - jumpers) / 2), Math.max(0, platformCap() - (S.plan.trains[next] ?? 0))) : 0;
  const missed = noTicket - jumpers - kept;
  S.waiting = kept;
  S.boarding = walkins + fraud;
  S.pendingBoard = walkins + fraud;

  // les clients du salon paient double ; les fraudeurs pris paient l'amende
  const tickets = (walkins + binom(walkins, loungeShare())) * ticketPrice() * type.price + caught * FINE;
  S.budget += tickets;
  S.today.passengers += walkins + fraud;
  S.today.missed += missed;
  S.today.fraud += fraud;
  S.today.caught += caught;
  S.today.fines += caught * FINE;
  S.lastFraud = fraud / Math.max(1, present);
  S.today.visitors += walkins + fraud + S.disembark;
  S.dirt = Math.min(100, S.dirt + ((walkins + fraud + S.disembark) / 35) * dirtFactor());
  if (missed > 0) toast(`${missed} voyageur(s) n'ont pas eu de billet${kept ? ` · ${kept} attendent le train suivant` : ''}`, 'bad', 'staff');

  const extra = sell(S.plan.weekend ? PROFILES.weekend : PROFILES.classic, true);
  S.today.revenue += tickets + extra;
  // la climatisation des wagons rend la forte chaleur plus supportable
  const severity = weather().severity * (S.plan.weather === 'heat' && S.comfort >= 2 ? 0.5 : 1);
  const exposure = (severity * Math.max(0, present - shelterCap())) / Math.max(1, present);
  S.lastMiss = missed / Math.max(1, present);
  S.lastExposure = exposure;
  S.rep += (quality(S.lastMiss, exposure) - S.rep) * 0.06;
  floats.push({ text: '+' + money(tickets + extra), x: DOOR_X, y: 372, life: 2 });
  if (walkins) play('tickets');
  spawnWalkers(false, S.plan.types[h]);
  checkGoals();
}

// Express des travailleurs : abonnés (pas de guichet), ils achètent mais ne dorment pas à l'hôtel
function exchangeSpecial(h) {
  const T = S.today, boarded = Math.min(Math.round(S.waitingCommuters), EXPRESS_SEATS);
  S.waitingCommuters = 0;
  S.boarding = boarded;
  S.pendingBoard = boarded;
  S.disembark = Math.round(S.plan.commuters[h] * (0.8 + Math.random() * 0.4));
  const subs = boarded * ticketPrice() * SUB_SHARE;
  S.budget += subs;
  T.passengers += boarded;
  T.commuters += boarded;
  T.visitors += boarded + S.disembark;
  S.dirt = Math.min(100, S.dirt + ((boarded + S.disembark) / 35) * dirtFactor());
  const extra = sell(PROFILES.commuter);
  T.revenue += subs + extra;
  floats.push({ text: '+' + money(subs + extra), x: DOOR_X, y: 372, life: 2 });
  if (boarded) play('tickets');
  spawnWalkers(true, 'express');
  checkGoals();
}

// Sert au comptoir (cafétéria, café du quai) dans la limite de sa capacité du jour ; renvoie le nombre servi
function serveCounter(k, wanted) {
  const c = COUNTERS[k];
  if (!c?.owned()) return 0;
  const n = Math.min(wanted, Math.max(0, c.cap() - (S.today.counter[k] ?? 0)));
  S.today.counter[k] = (S.today.counter[k] ?? 0) + n;
  S.today.restock += n * c.cost();
  return n;
}

// La voiture-bar des trains normaux sert une partie des cafés et repas à bord
const barShare = (k, regular = true) => (regular && S.barCar && (k === 'coffee' || k === 'meal') ? BAR.share : 1);

function sell(prof, regular = false) {
  const visitors = S.boarding + S.disembark;
  let total = regular && S.barCar ? binom(S.boarding, BAR.rate) * BAR.spend : 0;
  for (const [k, p] of Object.entries(PRODUCTS)) {
    let d = binom(visitors, productRate(k) * prof[k] * barShare(k, regular));
    if (COUNTERS[k] && d) {
      const c = serveCounter(k, d);
      total += c * COUNTERS[k].price();
      S.today.demand += c;
      S.today.served += c;
      d -= c;
    }
    // un distributeur en panne ne vend plus sa part du stock
    const usable = S.broken[k] ? Math.floor((S.stock[k] * (S.vending[k] - 1)) / S.vending[k]) : S.stock[k];
    const sold = Math.min(d, usable);
    S.stock[k] -= sold;
    total += sold * p.price;
    S.today.demand += d;
    S.today.served += sold;
    if (!S.stock[k] && !S.today.empty[k]) {
      S.today.empty[k] = true;
      toast(`${p.icon} Distributeurs de ${p.name.toLowerCase()} vides : remplissez-les`, 'bad', 'stocks');
    } else if (S.stock[k] && S.stock[k] < stockCap(k) * 0.2 && !S.today.low[k]) {
      S.today.low[k] = true;
      toast(`${p.icon} Stock de ${p.name.toLowerCase()} bas : ${S.stock[k]} restants`, 'warn', 'stocks');
    }
  }
  for (const [k, sh] of Object.entries(SHOPS)) if (S.shops[k]) total += binom(visitors, sh.rate * (prof.shops[k] ?? 1)) * sh.spend * shopMult();
  if (S.svc.lockers) total += binom(visitors, LOCKER[0] * prof.lockers) * LOCKER[1];
  if (S.svc.relay) total += binom(visitors, RELAY[0] * prof.relay) * RELAY[1];

  // les clients de l'hôtel rejoignent la file d'attente de la réception, s'il reste des chambres
  const wanted = binom(S.disembark, roomRate() * prof.rooms * (S.plan.rooms ?? 1) * (S.event?.rooms ?? 1));
  const accepted = clamp(S.hotel * ROOMS_PER_FLOOR - S.today.rooms - S.hotelQueue, 0, wanted);
  S.hotelQueue += accepted;
  S.today.demand += wanted;
  if (wanted > accepted) {
    if (!S.today.refused) toast('Hôtel complet : des clients sont refusés', 'bad', 'staff');
    S.today.refused += wanted - accepted;
  }
  S.budget += total;
  return total;
}

function closeDay() {
  S.today.refused += S.hotelQueue; // les clients encore en attente repartent
  S.hotelQueue = 0;
  // les distributeurs encore en panne sont réparés la nuit, plus cher qu'en journée
  const repairs = Object.values(S.broken).filter(Boolean).length * 3000;
  S.broken = {};
  S.strike = 0;
  const costs = [...dailyCosts(S.today.rooms, S.today.restock), ...(repairs ? [['Réparations de nuit', repairs]] : [])];
  const total = sum(costs.map(([, v]) => v));
  const revenue = S.today.revenue + S.pub * PUB_INCOME;
  S.budget += S.pub * PUB_INCOME - total;
  S.lastNet = revenue - total;
  checkGoals();
  const T = S.today;
  S.report = { day: S.day, costs, total, revenue, passengers: T.passengers, planned: S.plan.total, rooms: T.rooms,
    commuters: T.commuters, missed: T.missed, fraud: T.fraud, caught: T.caught, fines: T.fines, refused: T.refused, goals: T.goals, repStart: T.repStart, repEnd: S.rep, sat: satisfaction() };
  S.report.points = dayPoints(S.report);
  S.score += S.report.points;
  S.report.record = S.score > bestScore();
  if (S.report.record) setBest(S.score);
  S.history = [...S.history, { day: S.day, budget: S.budget, pax: T.passengers, rep: S.rep, net: S.lastNet }].slice(-14);
  S.lastSat = satisfaction();
  S.today = newDay(S.rep);
  if (S.autoRefill) Object.keys(PRODUCTS).forEach(refill);
  S.event = null;
  S.plan = makePlan(true, S.day + 1);

  // Découvert toléré quelques jours, puis faillite
  S.debtDays = S.budget < 0 ? S.debtDays + 1 : 0;
  if (S.debtDays >= DEBT_DAYS) {
    S.over = true;
    setSpeed(0);
    clearSave();
    if (modal.open) modal.close();
    $('#over').showModal();
  } else {
    openModal('summary');
  }
}

// Prévient quand l'effectif ne correspond plus aux voyageurs prévus du jour (une fois par changement)
const staffAlert = {};
function checkStaff() {
  const need = expect(S.plan).need;
  for (const [k, r] of staffRoles()) {
    const d = need[k] - S.staff[k], state = d > 0 ? 'under' : d < 0 ? 'over' : 'ok';
    if (state !== staffAlert[k] && state !== 'ok') {
      toast(d > 0 ? `${r.icon} Il manque ${d} ${r.name.toLowerCase()} pour aujourd'hui`
        : `${r.icon} ${-d} ${r.name.toLowerCase()} en trop : ${money(-d * r.salary)} de salaires inutiles par jour`, d > 0 ? 'bad' : 'warn', 'staff');
    }
    staffAlert[k] = state;
  }
}

// Points du jour sur 200 : appréciation (100), clients satisfaits (50), bénéfice (50 pour 500 000 €)
const dayPoints = (R) => Math.round(clamp(R.repEnd * 20, 0, 100) + clamp(R.sat, 0, 1) * 50 + clamp((R.revenue - R.total) / 10000, 0, 50));
const bestScore = () => { try { return +localStorage.getItem('aligato-best') || 0; } catch { return 0; } };
const setBest = (v) => { try { localStorage.setItem('aligato-best', v); } catch { /* stockage indisponible */ } };

function checkGoals() {
  const g = GOALS[S.goal];
  if (!g || g.value() < g.target) return;
  S.goal++;
  S.today.goals.push(g);
  toast(`🎯 Objectif atteint ! Débloqué : ${g.unlocks}`, 'goal');
  if (S.goal === GOALS.length) toast('🏆 Vous êtes une Légende du rail !', 'goal');
}

// ---------- Canvas ----------
const canvas = $('#scene');
const mainCtx = canvas.getContext('2d');
let ctx = mainCtx; // pointe temporairement vers le calque des personnages pendant le rendu
const DPR = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = W * DPR;
canvas.height = H * DPR;
mainCtx.scale(DPR, DPR);

const Y = { grass: 300, road: 316, roadEnd: 366, platform: 384, platformEdge: 440, track: 452, rail: 474, ground: 494 };
const MX = 900, MW = 330, GF = 330, FLOOR_H = 42; // bâtiment principal : x, largeur, haut du rez-de-chaussée
const DOOR_X = MX + MW / 2;
const SHOP_X = 804; // bord gauche de la boutique, à droite du café du quai (720 à 796)
const TOWER = { x: 852, clockY: 236 }; // tour de l'horloge centrée sur la boutique
const CAR_W = 146, GAP = 4, LOCO_W = 170;
const LAMPS = [70, 290, 510, 700];
const WINDOWS = [];
const SIGNAL = { x: 26, y: 372 };
const platX = () => PLATFORM_X[S.platform];
const hotelTop = () => GF - S.hotel * FLOOR_H;
const SHOP_TOP = 328;
const FRONTS = [
  ...['news', 'bakery', 'books', 'market', 'wc'].map((k) => ({ k, label: SHOPS[k].label, color: SHOPS[k].color, owned: () => S.shops[k] })),
  { k: 'cafeteria', label: 'CAFÉTÉRIA', color: '#b5432f', owned: () => S.svc.cafeteria },
  { k: 'relay', label: 'RELAIS COLIS', color: '#e67e22', owned: () => S.svc.relay },
];
const shopFronts = () => FRONTS.map((f, i) => ({ ...f, x: 230 + i * 68, w: 62 })).filter((f) => f.owned());

function layer(draw) {
  const c = document.createElement('canvas');
  c.width = W * DPR;
  c.height = H * DPR;
  const g = c.getContext('2d');
  g.scale(DPR, DPR);
  draw(g);
  return c;
}

function pine(g, x, base, h, col, shade) {
  g.fillStyle = '#3b2b22';
  g.fillRect(x - 1.5, base - h * 0.12, 3, h * 0.12);
  for (let i = 0; i < 3; i++) {
    const top = base - h + i * h * 0.24, bw = h * 0.42 * (0.55 + i * 0.25), bot = top + h * 0.42;
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x, top); g.lineTo(x + bw / 2, bot); g.lineTo(x - bw / 2, bot); g.fill();
    g.fillStyle = shade;
    g.beginPath(); g.moveTo(x, top); g.lineTo(x + bw / 2, bot); g.lineTo(x, bot); g.fill();
  }
}

function bricks(g, x, y, w, h, color) {
  g.fillStyle = color; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgb(0 0 0 / .09)';
  for (let by = y; by < y + h; by += 8) {
    g.fillRect(x, by, w, 1);
    for (let bx = x + ((by / 8) % 2 ? 0 : 10); bx < x + w; bx += 20) g.fillRect(bx, by, 1, 8);
  }
}

function windowAt(g, x, y, w, h) {
  WINDOWS.push({ x, y, w, h });
  g.fillStyle = '#e9dccb'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
  g.fillStyle = '#2b3d5c'; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgb(255 255 255 / .18)'; g.fillRect(x, y, w / 2, h);
}

// Décor arrière : forêt, route, quai, voie
function drawBack(g) {
  const r = rng(7);
  const forests = [
    { base: 262, min: 40, max: 80, col: '#4c8a7a', shade: '#437c6d', step: 13 },
    { base: 286, min: 55, max: 105, col: '#2c6a4d', shade: '#245c42', step: 15 },
    { base: 306, min: 60, max: 125, col: '#1c4e35', shade: '#16412b', step: 18 },
  ];
  for (const L of forests) {
    g.fillStyle = L.col;
    g.fillRect(0, L.base - 6, W, H);
    for (let x = -20; x < W + 20; x += L.step * (0.6 + r() * 0.8)) pine(g, x, L.base + r() * 6, lerp(L.min, L.max, r()), L.col, L.shade);
  }

  g.fillStyle = '#5b9a45'; g.fillRect(0, Y.grass, W, Y.road - Y.grass);
  g.fillStyle = '#6fb055'; g.fillRect(0, Y.grass, W, 3);

  if (S.pub) {
    g.fillStyle = '#4a4f58'; g.fillRect(478, 236, 5, 66); g.fillRect(598, 236, 5, 66);
    g.fillStyle = '#10275c'; g.beginPath(); g.roundRect(440, 190, 200, 50, 6); g.fill();
    g.strokeStyle = '#f5b82e'; g.lineWidth = 3; g.stroke();
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '800 18px system-ui, sans-serif'; g.fillText('ALIGATO', 540, 213);
    g.fillStyle = '#f5b82e'; g.font = '600 11px system-ui, sans-serif'; g.fillText('Voyagez malin, voyagez en train !', 540, 230);
  }
  if (S.parking) {
    g.fillStyle = '#4a4f58'; g.fillRect(300, 301, 330, 15);
    g.fillStyle = '#e9ecf1';
    for (let x = 300; x <= 630; x += 30) g.fillRect(x, 301, 2, 15);
    const cols = ['#e85d3a', '#3aa0d8', '#f4f4f4', '#f2b134', '#5b6b7a', '#2b8a9e'];
    for (let i = 0; i < 9; i++) {
      if (i === 3 || i === 7) continue; // places libres
      g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.roundRect(305 + i * 30, 305, 22, 9, 3); g.fill();
      g.fillStyle = 'rgb(0 0 0 / .35)'; g.fillRect(309 + i * 30, 307, 14, 4);
    }
    g.fillStyle = '#2f6fd6'; g.beginPath(); g.roundRect(280, 284, 16, 16, 3); g.fill();
    g.fillStyle = '#fff'; g.font = '800 12px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('P', 288, 297);
    g.fillStyle = '#5b616b'; g.fillRect(287, 300, 2, 16);
  }

  g.fillStyle = '#3a3f48'; g.fillRect(0, Y.road, W, Y.roadEnd - Y.road);
  g.fillStyle = '#8b929c'; g.fillRect(0, Y.road, W, 2); g.fillRect(0, Y.roadEnd - 2, W, 2);
  g.fillStyle = '#f0d36a';
  for (let x = 0; x < W; x += 56) g.fillRect(x, 340, 30, 3);

  g.fillStyle = '#a7afb9'; g.fillRect(0, Y.roadEnd, W, Y.platform - Y.roadEnd);
  g.fillStyle = 'rgb(0 0 0 / .08)';
  for (let x = 0; x < W; x += 32) g.fillRect(x, Y.roadEnd, 1, Y.platform - Y.roadEnd);

  // talus là où le quai n'existe pas encore
  const px = platX();
  g.fillStyle = '#5b8f45'; g.fillRect(0, Y.platform, px, Y.track - Y.platform);
  const pg = g.createLinearGradient(0, Y.platform, 0, Y.platformEdge);
  pg.addColorStop(0, '#c5c9d0'); pg.addColorStop(1, '#dde0e5');
  g.fillStyle = pg; g.fillRect(px, Y.platform, W - px, Y.platformEdge - Y.platform);
  g.fillStyle = '#f2c94c'; g.fillRect(px, Y.platformEdge - 7, W - px, 4);
  g.fillStyle = '#767c86'; g.fillRect(px, Y.platformEdge, W - px, Y.track - Y.platformEdge);
  if (px) {
    g.fillStyle = '#9ea3ab';
    g.beginPath(); g.moveTo(px, Y.platform); g.lineTo(px - 24, Y.track); g.lineTo(px, Y.track); g.fill();
  }

  g.fillStyle = '#6f6256'; g.fillRect(0, Y.track, W, Y.ground - Y.track);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = r() < 0.5 ? '#7d7064' : '#5f544a';
    g.fillRect(r() * W, Y.track + r() * (Y.ground - Y.track), 2, 2);
  }
  g.fillStyle = '#4a3b30';
  for (let x = 4; x < W; x += 22) g.fillRect(x, Y.rail - 2, 12, 9);
  g.fillStyle = '#c3c9d1'; g.fillRect(0, Y.rail - 5, W, 4);
  g.fillStyle = '#7f8792'; g.fillRect(0, Y.rail - 1, W, 2);

  g.fillStyle = '#4c7a3a'; g.fillRect(0, Y.ground, W, H - Y.ground);
}

// Décor avant : gare, hôtel, lampadaires, panneaux (devant les voitures)
function drawFront(g) {
  const bottom = Y.platform + 2, top = hotelTop();
  WINDOWS.length = 0;
  g.textAlign = 'center';

  // aile basse à droite
  bricks(g, MX + MW, 318, W - MX - MW, bottom - 318, '#a63c2a');
  g.fillStyle = '#4a3a3e'; g.fillRect(MX + MW - 4, 310, W - MX - MW + 8, 10);

  // niveau 2 : boutique à gauche ; niveau 3 : tour de l'horloge
  if (S.station >= 3) {
    bricks(g, TOWER.x - 26, 206, 52, 120, '#a63c2a');
    g.fillStyle = '#3b3036';
    g.beginPath(); g.moveTo(TOWER.x - 32, 208); g.lineTo(TOWER.x, 168); g.lineTo(TOWER.x + 32, 208); g.fill();
    g.fillStyle = '#f6f1e6'; g.strokeStyle = '#3b3036'; g.lineWidth = 3;
    g.beginPath(); g.arc(TOWER.x, TOWER.clockY, 17, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  if (S.station >= 2) {
    const bx = SHOP_X; // la boutique commence après le café du quai
    bricks(g, bx, 318, MX - bx, bottom - 318, '#b5432f');
    g.fillStyle = '#4a3a3e'; g.fillRect(bx - 4, 310, MX - bx + 4, 10);
    g.fillStyle = '#e9dccb'; g.fillRect(bx + 4, 334, MX - bx - 12, 40);
    g.fillStyle = '#7fb3d9'; g.fillRect(bx + 8, 338, MX - bx - 20, 32);
    g.fillStyle = 'rgb(255 255 255 / .25)'; g.fillRect(bx + 8, 338, (MX - bx - 20) / 2, 32);
    WINDOWS.push({ x: bx + 8, y: 338, w: MX - bx - 20, h: 32 });
    g.fillStyle = '#2f6fd6'; g.beginPath(); g.roundRect((bx + MX) / 2 - 42, 321, 84, 12, 3); g.fill();
    g.fillStyle = '#fff'; g.font = '700 9px system-ui, sans-serif'; g.fillText('BOUTIQUE', (bx + MX) / 2, 330);
  }

  // rez-de-chaussée (gare) + étages (hôtel)
  bricks(g, MX, top, MW, bottom - top, '#b5432f');
  g.fillStyle = '#8f3424'; g.fillRect(MX, bottom - 10, MW, 10);
  for (let f = 1; f <= S.hotel; f++) {
    const fy = GF - f * FLOOR_H;
    g.fillStyle = '#e9dccb'; g.fillRect(MX - 4, fy + FLOOR_H - 6, MW + 8, 6);
    for (let k = 0; k < 7; k++) windowAt(g, MX + 20 + k * 45, fy + 8, 22, 24);
  }
  for (let k = 0; k < 7; k++) if (k !== 3) windowAt(g, MX + 20 + k * 45, 340, 22, 24);

  const dx = DOOR_X - 22;
  g.fillStyle = '#e9dccb'; g.fillRect(dx - 4, 334, 52, bottom - 334);
  g.fillStyle = '#26354f'; g.fillRect(dx, 338, 44, bottom - 338);
  g.fillStyle = '#9fb4d3'; g.fillRect(dx + 21, 338, 2, bottom - 338);
  g.fillStyle = '#6b2a1e'; g.font = '600 9px system-ui, sans-serif';
  g.fillText('HÔTEL  ·  GARE', DOOR_X, GF - 0.5);

  // toit + supports de l'enseigne
  g.fillStyle = '#3b3036';
  g.beginPath();
  g.moveTo(MX - 16, top + 2); g.lineTo(MX + MW + 16, top + 2); g.lineTo(MX + MW - 24, top - 24); g.lineTo(MX + 24, top - 24);
  g.fill();
  g.fillStyle = '#54474e'; g.fillRect(MX - 16, top, MW + 32, 4);
  g.fillStyle = '#3a404a'; g.fillRect(DOOR_X - 60, top - 34, 4, 12); g.fillRect(DOOR_X + 56, top - 34, 4, 12);

  // marquise vitrée (sur tout le quai au niveau 3)
  const cx = S.platform >= 3 ? platX() + 10 : MX - 20;
  g.fillStyle = 'rgb(180 210 235 / .55)'; g.fillRect(cx, 366, W - cx, 6);
  g.fillStyle = '#4a4f58';
  for (let px = cx + 10; px <= W; px += 120) g.fillRect(px, 372, 3, Y.platform - 372 + 4);

  // lampadaires
  for (const lx of LAMPS) {
    g.fillStyle = '#3a404a';
    g.fillRect(lx - 2, 300, 4, Y.roadEnd + 10 - 300);
    g.fillRect(lx - 2, 300, 18, 3);
    g.beginPath(); g.roundRect(lx + 10, 300, 14, 6, 3); g.fill();
  }

  // panneau "Gare"
  g.fillStyle = '#5b616b'; g.fillRect(178, 300, 4, Y.roadEnd + 8 - 300);
  g.fillStyle = '#fff'; g.strokeStyle = '#d33c2c'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(150, 282, 64, 22, 4); g.fill(); g.stroke();
  g.fillStyle = '#1b2540'; g.font = '700 12px system-ui, sans-serif';
  g.fillText('Gare  ➜', 182, 297);

  // signal de passage à niveau
  g.fillStyle = '#e9ecf1'; g.fillRect(SIGNAL.x - 2, SIGNAL.y - 26, 4, Y.platformEdge - SIGNAL.y + 26);
  g.strokeStyle = '#e9ecf1'; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(SIGNAL.x - 14, SIGNAL.y - 36); g.lineTo(SIGNAL.x + 14, SIGNAL.y - 18);
  g.moveTo(SIGNAL.x + 14, SIGNAL.y - 36); g.lineTo(SIGNAL.x - 14, SIGNAL.y - 18);
  g.stroke();
  g.fillStyle = '#20242b'; g.beginPath(); g.roundRect(SIGNAL.x - 15, SIGNAL.y - 6, 30, 12, 6); g.fill();

  // café du quai ; terrasse (tables) au niveau 2, grand café (auvent plus haut, enseigne dorée) au niveau 3
  if (S.cafe) {
    const top = S.cafe >= 3 ? 342 : 352;
    g.fillStyle = '#7a5537'; g.fillRect(726, 368, 64, 20);
    g.fillStyle = S.cafe >= 3 ? '#f5b82e' : '#f6f1e6'; g.font = '700 9px system-ui, sans-serif';
    g.fillText(S.cafe >= 3 ? 'GRAND CAFÉ' : 'CAFÉ', 758, 381);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f6f1e6' : '#d62f45'; g.fillRect(720 + i * 9.5, top, 9.5, 10); }
    g.fillStyle = '#3a404a'; g.fillRect(722, top + 10, 3, 388 - top - 10); g.fillRect(791, top + 10, 3, 388 - top - 10);
    if (S.cafe >= 2) { // tables de la terrasse, devant le comptoir
      for (const tx of S.cafe >= 3 ? [700, 740, 780] : [730, 770]) {
        g.fillStyle = '#3a404a'; g.fillRect(tx - 1, 392, 2, 8); g.fillRect(tx - 5, 399, 10, 1.5);
        g.fillStyle = '#f6f1e6'; g.beginPath(); g.ellipse(tx, 392, 7, 2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7a5537'; g.fillRect(tx - 12, 393, 4, 7); g.fillRect(tx + 8, 393, 4, 7);
      }
    }
  }

  // plaques de la gare
  const plaque = (x, y, w, text, bg, fg = '#fff') => {
    g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, w, 9, 2); g.fill();
    g.fillStyle = fg; g.font = '700 6.5px system-ui, sans-serif'; g.fillText(text, x + w / 2, y + 7);
  };
  if (S.waitroom) plaque(MX + 16, 368, 120, S.waitroom > 1 ? 'GRANDE SALLE D\'ATTENTE' : 'SALLE D\'ATTENTE', '#2f6fd6');
  if (S.svc.lounge) plaque(MX + MW + 4, 352, 42, 'SALON 1re', '#c9a227', '#1b2540');
  if (S.svc.spa) plaque(MX + MW + 4, 364, 42, 'SPA', '#16a085');
  if (S.svc.wifi) plaque(DOOR_X + 60, 368, 30, 'WI-FI', '#6c5ce7');

  // galerie de commerces le long de la route
  for (const sh of shopFronts()) {
    const { x, w } = sh, top = SHOP_TOP, s = sh;
    g.fillStyle = '#efe6d8'; g.fillRect(x, top, w, Y.platform + 2 - top);
    g.fillStyle = '#4a3a3e'; g.fillRect(x - 2, top - 4, w + 4, 5);
    g.fillStyle = s.color; g.fillRect(x + 3, top + 3, w - 6, 11);
    g.fillStyle = '#fff'; g.font = '700 7px system-ui, sans-serif'; g.fillText(s.label, x + w / 2, top + 11);
    for (let j = 0; j < 6; j++) { g.fillStyle = j % 2 ? '#fff' : s.color; g.fillRect(x + (j * w) / 6, top + 16, w / 6, 7); }
    windowAt(g, x + 6, top + 29, 28, 18);
    g.fillStyle = '#26354f'; g.fillRect(x + 40, top + 28, 16, Y.platform + 2 - top - 28);
  }

}

let back, front;
// Personnages, bornes et train : calque séparé, assombri à part, pour passer devant les fenêtres éclairées la nuit
const sprites = layer(() => {});
const spriteCtx = sprites.getContext('2d');
function rebuild() {
  back = layer(drawBack);
  front = layer(drawFront);
}
rebuild();

// ---------- Ciel ----------
const STARS = (() => { const r = rng(3); return Array.from({ length: 70 }, () => [r() * W, r() * 240, r() * 1.4 + 0.4]); })();

function daylight(t) {
  if (t < 5 || t > 21) return 0;
  if (t < 7.5) return (t - 5) / 2.5;
  if (t > 18.5) return (21 - t) / 2.5;
  return 1;
}

function drawSky(t, d) {
  const warm = d * (1 - d) * 4;
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, mix('#0a1430', '#3d8fe0', d));
  g.addColorStop(1, css(mixA(mixA(hex('#24355c'), hex('#c3e4ff'), d), hex('#ffa36b'), warm * 0.7)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 300);

  if (d < 0.6) {
    ctx.fillStyle = `rgb(255 255 255 / ${(1 - d / 0.6) * 0.9})`;
    for (const [x, y, s] of STARS) ctx.fillRect(x, y, s, s);
  }
  if (t > 5.5 && t < 20.5) {
    const p = (t - 5.5) / 15;
    ctx.fillStyle = mix('#ff9b50', '#fff3c4', Math.sin(Math.PI * p));
    ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(80 + p * (W - 160), 250 - Math.sin(Math.PI * p) * 210, 22, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#e8edf7';
    ctx.beginPath(); ctx.arc(320, 70, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mix('#0a1430', '#3d8fe0', d);
    ctx.beginPath(); ctx.arc(328, 64, 14, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- Voitures ----------
const CAR_TYPES = [
  { kind: 'car', len: 56, colors: ['#f08a24', '#e85d3a', '#f2b134', '#3aa0d8', '#f4f4f4', '#5b6b7a'] },
  { kind: 'pickup', len: 70, colors: ['#c99a52', '#8a6a43', '#b5463c'] },
  { kind: 'van', len: 64, colors: ['#2f6fd6', '#2b8a9e', '#e8e8e8'] },
];
const cars = [];
let carTimer = 0;

function updateCars(dt, t) {
  carTimer -= dt;
  if (carTimer <= 0) {
    const lane = rand(2), type = pick(CAR_TYPES);
    const dir = lane ? 1 : -1;
    cars.push({ ...type, color: pick(type.colors), lane, dir, x: dir > 0 ? -80 : W + 80, speed: 70 + rand(70) });
    carTimer = (1 + Math.random() * 3) / (0.3 + peakFactor(t));
  }
  for (const c of cars) {
    if (c.stopAt && c.x >= c.stopAt && c.wait > 0) { c.wait -= dt; continue; } // la navette marque l'arrêt
    c.x += c.dir * c.speed * dt;
  }
  for (let i = cars.length - 1; i >= 0; i--) if (cars[i].x < -120 || cars[i].x > W + 120) cars.splice(i, 1);
}

const laneY = (lane) => (lane ? 360 : 336);

function drawCar(c) {
  const s = c.lane ? 1 : 0.88, L = c.len;
  ctx.save();
  ctx.translate(c.x, laneY(c.lane));
  ctx.scale(c.dir * s, s);
  ctx.fillStyle = 'rgb(0 0 0 / .25)';
  ctx.beginPath(); ctx.ellipse(0, 0, L / 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.color;
  if (c.kind === 'bus') {
    ctx.beginPath(); ctx.roundRect(-L / 2, -36, L, 31, [8, 12, 4, 4]); ctx.fill();
    ctx.fillStyle = '#bfe0f5';
    ctx.fillRect(-L / 2 + 6, -31, L - 22, 10);
    ctx.beginPath(); ctx.roundRect(L / 2 - 13, -31, 9, 14, [2, 8, 2, 2]); ctx.fill();
    ctx.fillStyle = '#1b2540'; ctx.font = '700 8px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('NAVETTE ALIGATO', -4, -12);
  } else if (c.kind === 'van') {
    ctx.beginPath(); ctx.roundRect(-L / 2, -30, L, 25, [6, 12, 4, 4]); ctx.fill();
    ctx.fillStyle = '#bfe0f5';
    ctx.beginPath(); ctx.roundRect(L / 2 - 16, -26, 12, 10, [2, 8, 2, 2]); ctx.fill();
    ctx.fillRect(-L / 2 + 6, -26, L - 26, 8);
  } else if (c.kind === 'pickup') {
    ctx.beginPath(); ctx.roundRect(-L / 2, -16, L, 11, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(L / 2 - 30, -27, 22, 12, [5, 8, 0, 0]); ctx.fill();
    ctx.fillStyle = '#bfe0f5';
    ctx.beginPath(); ctx.roundRect(L / 2 - 27, -25, 16, 8, [3, 6, 0, 0]); ctx.fill();
    ctx.fillStyle = 'rgb(0 0 0 / .2)'; ctx.fillRect(-L / 2 + 2, -18, L / 2, 3);
  } else {
    ctx.beginPath(); ctx.roundRect(-L / 2, -15, L, 10, 5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-L * 0.3, -25, L * 0.55, 12, [6, 10, 0, 0]); ctx.fill();
    ctx.fillStyle = '#bfe0f5';
    ctx.beginPath(); ctx.roundRect(-L * 0.26, -23, L * 0.22, 8, [4, 2, 0, 0]); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-L * 0.01, -23, L * 0.22, 8, [2, 7, 0, 0]); ctx.fill();
  }
  for (const wx of [-L * 0.3, L * 0.3]) {
    ctx.fillStyle = '#1f2328'; ctx.beginPath(); ctx.arc(wx, -4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a7aeb8'; ctx.beginPath(); ctx.arc(wx, -4, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------- Personnages ----------
const SHIRTS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ff6b9a', '#34495e', '#16a085',
  '#c0392b', '#2980b9', '#8e44ad', '#d35400', '#27ae60', '#f39c12', '#7f8c8d', '#ff8a5b', '#5dade2', '#a3cb38',
  '#fd79a8', '#6c5ce7', '#00b894', '#fab1a0'];
const PANTS = ['#2d3436', '#34495e', '#1e3a5f', '#5d4037', '#636e72'];
const SKINS = ['#f5d0b5', '#e0ac8a', '#c68863', '#8d5a3b'];
const HAIRS = ['#2d1f16', '#5a3a22', '#c9a35b', '#1b1b1b', '#9c9c9c'];

function person(r) {
  return { shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], pants: PANTS[Math.floor(r() * PANTS.length)],
    skin: SKINS[Math.floor(r() * SKINS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)], phase: r() * 6.28, bag: r() < 0.3 };
}

const CROWD_MAX = 400; // 1 personnage par voyageur
const SUITS = ['#2d3436', '#34495e', '#4a5568', '#1e3a5f']; // costumes des travailleurs
const guests = (() => { const r = rng(77); return Array.from({ length: 10 }, () => ({ ...person(r), bag: true })); })();
const crowd = (() => {
  const r = rng(42);
  const arr = Array.from({ length: CROWD_MAX }, (_, i) => ({
    ...person(r), order: i, u: r(), y: Y.platform + 10 + r() * (Y.platformEdge - Y.platform - 16),
  }));
  for (const p of arr) p.suit = { ...p, shirt: SUITS[p.order % SUITS.length], pants: '#1b1f27', bag: true };
  return arr.sort((a, b) => a.y - b.y);
})();
const crowdX = (u) => platX() + 20 + u * (1250 - platX() - 20);

// Personnel : uniformes reconnaissables
const r2 = rng(9);
const uniforms = {
  entretien: Array.from({ length: 10 }, () => ({ ...person(r2), shirt: '#9be15d', pants: '#3d4a5c', hat: '#f5b82e', bag: false })),
  security: { ...person(r2), shirt: '#1b2540', pants: '#1b2540', hat: '#111827', bag: false },
  controleur: Array.from({ length: 10 }, () => ({ ...person(r2), shirt: '#2f6fd6', pants: '#1b2540', hat: '#c0392b', bag: false })),
  welcome: { ...person(r2), shirt: '#ff7a1a', pants: '#2d3436', bag: false },
};

// Déchets sur le quai, proportionnels à la saleté
const LITTER = (() => {
  const r = rng(5);
  return Array.from({ length: 160 }, () => ({ u: r(), y: Y.platform + 6 + r() * 44, c: pick(['#f4f4f4', '#e8c547', '#c0392b', '#7f8c8d', '#8d6e63']), w: 3 + r() * 4 }));
})();

function drawPerson(p, x, y, t, walking) {
  const s = 0.85 + ((y - Y.platform) / 56) * 0.25;
  const bob = walking ? Math.abs(Math.sin(t * 9 + p.phase)) * -1.2 : Math.sin(t * 2 + p.phase) * 0.5;
  const step = walking ? Math.sin(t * 9 + p.phase) * 2 : 0;
  ctx.fillStyle = p.pants;
  ctx.fillRect(x - 3 * s + step * 0.5, y - 10 * s, 2.6 * s, 10 * s);
  ctx.fillRect(x + 0.4 * s - step * 0.5, y - 10 * s, 2.6 * s, 10 * s);
  ctx.fillStyle = p.shirt;
  ctx.beginPath(); ctx.roundRect(x - 4.5 * s, y - 21 * s + bob, 9 * s, 12 * s, 3 * s); ctx.fill();
  if (p.bag) { ctx.fillStyle = '#5b4636'; ctx.fillRect(x + 4 * s, y - 14 * s + bob, 4 * s, 5 * s); }
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(x, y - 25 * s + bob, 3.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.hat ?? p.hair;
  ctx.beginPath(); ctx.arc(x, y - 25.6 * s + bob, 3.7 * s, Math.PI, 0); ctx.fill();
  if (p.hat) ctx.fillRect(x - 5 * s, y - 26 * s + bob, 10 * s, 1.6 * s);
}

// Coins d'attente sous les abris : banc à gauche, distributeurs café-repas-goodies à droite, au même rang.
// Le 4e coin de distributeurs se place à côté d'un banc du décor (ou au début du quai s'il n'est pas agrandi).
const vendingSpots = () => [...SHELTER_X.map((sx) => sx + 66), S.platform >= 2 ? 520 : 580];
function drawStaff(t) {
  const y = Y.platform + 7;
  if (S.svc.security) { // ronde lente devant la gare
    const d = (t * 12) % 600, gx = 700 + (d < 300 ? d : 600 - d);
    drawPerson(uniforms.security, gx, Y.platform + 16, t, true);
  }

  if (S.svc.welcome) drawPerson(uniforms.welcome, DOOR_X - 6, y + 8, t, false); // agent d'accueil près de la porte

  // clients de l'hôtel en attente, valise à la main
  for (let i = 0; i < Math.min(S.hotelQueue, 10); i++) drawPerson(guests[i], 1248 - i * 11, y + 6, t, false);

  const x0 = platX() + 30, len = 1230 - x0;

  // bornes de billets (bleues) à gauche de la gare, bornes de check-in (vertes) à droite de la porte
  const kiosk = (x, color) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x - 7, y - 30, 14, 30, [4, 4, 1, 1]); ctx.fill();
    ctx.fillStyle = '#bfe0f5'; ctx.fillRect(x - 5, y - 27, 10, 8);
    ctx.fillStyle = '#f5b82e'; ctx.fillRect(x - 3, y - 15, 6, 2);
  };
  for (let i = 0; i < S.machines.kiosk; i++) kiosk(MX - 30 - i * 20, '#2f6fd6');
  for (let i = 0; i < S.machines.checkin; i++) kiosk(DOOR_X + 34 + i * 18, '#12804a');

  // autolaveuses conduites par un agent d'entretien, sur une voie derrière les bancs
  for (let i = 0; i < S.machines.robot; i++) {
    const d = (t * 30 + i * 523 + 200) % (len * 2), dir = d < len ? 1 : -1;
    const x = x0 + (d < len ? d : len * 2 - d), fy = Y.platform + 14 + (i % 2) * 6, p = uniforms.entretien[9 - i];
    ctx.fillStyle = '#5f6670'; ctx.beginPath(); ctx.ellipse(x + dir * 6, fy, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill(); // brosse
    ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.roundRect(x - 12, fy - 14, 24, 12, [6, 6, 3, 3]); ctx.fill(); // cuve
    ctx.fillStyle = '#1b2540'; ctx.beginPath(); ctx.arc(x - dir * 7, fy - 2, 3, 0, Math.PI * 2); ctx.fill(); // roue
    ctx.fillStyle = '#3a404a'; ctx.fillRect(x + dir * 8 - 1, fy - 22, 2, 9); ctx.fillRect(x + dir * 8 - 3, fy - 23, 6, 2); // volant
    const cx = x - dir * 3; // conducteur assis à l'arrière
    ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.roundRect(cx - 4, fy - 24, 8, 11, 3); ctx.fill();
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(cx, fy - 27, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.hat; ctx.beginPath(); ctx.arc(cx, fy - 27.6, 3.5, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 4.7, fy - 28, 9.4, 1.5);
    ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ff9f1a' : '#7a4a10'; ctx.fillRect(x + dir * 8 - 1.5, fy - 26, 3, 3); // gyrophare
  }

  // bancs alignés sur une même rangée, en retrait de la bordure du quai : ceux achetés (sous les abris), puis ceux du décor
  for (const bx of [...SHELTER_X.slice(0, S.benches).map((sx) => sx + 8), 470, 330]) {
    if (bx < platX() + 20) continue;
    ctx.fillStyle = '#7a5537'; ctx.fillRect(bx, 412, 40, 4); ctx.fillRect(bx, 404, 40, 3);
    ctx.fillStyle = '#3a404a'; ctx.fillRect(bx + 4, 416, 3, 6); ctx.fillRect(bx + 33, 416, 3, 6);
  }
  // distributeurs automatiques (écran rouge quand ils sont vides), à côté des bancs, pieds sur la même ligne
  const vy = 422;
  vendingSpots().forEach((x, i) => {
    for (const [k, p] of Object.entries(PRODUCTS)) {
      if (i >= S.vending[k]) continue;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.roundRect(x - 5, vy - 27, 10, 27, [3, 3, 1, 1]); ctx.fill();
      ctx.fillStyle = S.broken[k] && i === 0 ? (Math.floor(t * 3) % 2 ? '#ff9f1a' : '#3a2a10') : S.stock[k] ? '#bfe0f5' : '#ff5b4a';
      ctx.fillRect(x - 3, vy - 24, 6, 5);
      ctx.fillStyle = 'rgb(0 0 0 / .35)'; ctx.fillRect(x - 3, vy - 8, 6, 3);
      x += 12;
    }
  });

  // contrôleurs (casquette rouge), sur la voie devant les bancs
  for (let i = 0; i < Math.min(S.staff.controleur, 4); i++) {
    const d = (t * 16 + i * 611 + 90) % (len * 2);
    drawPerson(uniforms.controleur[i], x0 + (d < len ? d : len * 2 - d), Y.platform + 46, t, true);
  }

  for (let i = 0; i < S.staff.entretien; i++) {
    const d = (t * 22 + i * 397) % (len * 2), dir = d < len ? 1 : -1;
    // voies entièrement derrière (pieds au-dessus des bancs) ou entièrement devant les bancs (dessinés avant eux)
    const x = x0 + (d < len ? d : len * 2 - d), fy = Y.platform + [12, 48, 18][i % 3];
    drawPerson(uniforms.entretien[i], x, fy, t, true);
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + dir * 4, fy - 16); ctx.lineTo(x + dir * 12, fy); ctx.stroke();
  }
}

// Voyageurs visibles sur le quai, séparés entre voyageurs classiques et travailleurs
function crowdSplit() {
  const [ph, p, special] = trainPhase();
  const pend = ph === 'stopped' ? S.pendingBoard * (1 - Math.min(1, p * 2)) : 0;
  // quand aucun train n'est à quai, la salle d'attente garde une partie des voyageurs à l'intérieur
  const inside = ph === 'stopped' ? 0 : Math.min(WAITROOM[S.waitroom], S.waiting);
  return { classic: S.waiting + (special ? 0 : pend), commuters: S.waitingCommuters + (special ? pend : 0), inside };
}
const displayWaiting = () => { const c = crowdSplit(); return c.classic + c.commuters; };

// Voyageurs qui descendent du train et rejoignent la gare ou la sortie
const walkers = [];
function spawnWalkers(special, type) {
  const left = stopLeft(type), r = Math.random;
  for (let i = 0; i < Math.min(40, Math.ceil(S.disembark / 3)); i++) {
    const p = person(r);
    // les travailleurs partent tous vers la ville, en costume
    if (special) Object.assign(p, { shirt: pick(SUITS), pants: '#1b1f27', bag: true });
    walkers.push({ ...p, x: clamp(left + r() * (trainLen(type) - LOCO_W), platX() + 20, 1240), y: Y.platform + 14 + r() * 36,
      tx: !special && r() < 0.65 ? DOOR_X - 15 + r() * 30 : -30, speed: 40 + r() * 30, delay: r() * 1.5 });
  }
}
function updateWalkers(dt) {
  if (walkers.length > 200) walkers.splice(0, walkers.length - 200); // garde-fou si l'onglet a été mis en veille
  for (const w of walkers) {
    if ((w.delay -= dt) > 0) continue;
    const d = w.tx - w.x;
    w.x += Math.sign(d) * Math.min(Math.abs(d), w.speed * dt);
  }
  for (let i = walkers.length - 1; i >= 0; i--) if (walkers[i].x === walkers[i].tx) walkers.splice(i, 1);
}

// ---------- Train ----------
const trainCars = (type) => (type === 'express' ? SPECIAL_WAGONS : S.wagons + S.barCar + TRAIN_TYPES[type].extraCars);
const trainLen = (type = 'regional') => trainCars(type) * (CAR_W + GAP) + LOCO_W;
const stopLeft = (type = 'regional') => 1250 - trainLen(type);
const LIVERY = {
  // une livrée plus moderne à chaque niveau de rénovation
  regular: [
    { body: '#eef1f6', roof: '#c9d0db', stripe: '#d62f45', band: '#1e3a8a' },
    { body: '#f3f6fa', roof: '#c9d3df', stripe: '#16a085', band: '#0e5c4f' },
    { body: '#f5f8fc', roof: '#cdd8e6', stripe: '#2f6fd6', band: '#10275c' },
    { body: '#ffffff', roof: '#d6dde8', stripe: '#6c5ce7', band: '#c9a227' },
  ],
  national: { body: '#d5dbe1', roof: '#aab4be', stripe: '#1e8449', band: '#145a32' },
  tgv: { body: '#f7f9fc', roof: '#dde3ea', stripe: '#2f6fd6', band: '#8e1b3b' },
  bar: { body: '#7b2d3b', roof: '#5c1f2b', stripe: '#c9a227', band: '#3d1520' },
  express: { body: '#f5c542', roof: '#d9a521', stripe: '#1e3a8a', band: '#10275c' },
};
const easeOut = (p) => 1 - (1 - p) ** 3;
const easeIn = (p) => p ** 3;

function trainLeft() {
  const [ph, p, , type] = trainPhase();
  if (ph === 'arriving') return lerp(-trainLen(type) - 40, stopLeft(type), easeOut(p));
  if (ph === 'stopped') return stopLeft(type);
  if (ph === 'leaving') return lerp(stopLeft(type), W + 40, easeIn(p));
  return null;
}

function drawWagon(x, L) {
  ctx.fillStyle = L.body;
  ctx.beginPath(); ctx.roundRect(x, 400, CAR_W, 64, 8); ctx.fill();
  ctx.fillStyle = L.roof; ctx.fillRect(x + 4, 400, CAR_W - 8, 5);
  ctx.fillStyle = '#1e2a40';
  ctx.beginPath(); ctx.roundRect(x + 8, 412, CAR_W - 16, 20, 4); ctx.fill();
  ctx.fillStyle = L.body;
  for (let wx = x + 34; wx < x + CAR_W - 10; wx += 26) ctx.fillRect(wx, 412, 3, 20);
  ctx.fillStyle = L.stripe; ctx.fillRect(x, 440, CAR_W, 6);
  ctx.fillStyle = L.band; ctx.fillRect(x, 447, CAR_W, 3);
  ctx.strokeStyle = '#a3adbd'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 12, 414, 16, 46); ctx.strokeRect(x + CAR_W - 28, 414, 16, 46);
  ctx.fillStyle = '#2b2f36'; ctx.fillRect(x + 10, 463, CAR_W - 20, 6);
  for (const wx of [22, 40, CAR_W - 40, CAR_W - 22]) { ctx.beginPath(); ctx.arc(x + wx, 472, 6, 0, Math.PI * 2); ctx.fill(); }
}

function drawLoco(x, L, type) {
  ctx.fillStyle = L.body;
  ctx.beginPath();
  if (type === 'tgv') { // long nez profilé
    ctx.moveTo(x, 402); ctx.lineTo(x + LOCO_W - 110, 402);
    ctx.bezierCurveTo(x + LOCO_W - 40, 402, x + LOCO_W, 430, x + LOCO_W, 458); ctx.lineTo(x + LOCO_W, 464); ctx.lineTo(x, 464);
  } else if (type === 'national') { // locomotive massive et carrée
    ctx.roundRect(x, 396, LOCO_W, 68, [6, 14, 6, 6]);
  } else {
    ctx.roundRect(x, 400, LOCO_W, 64, [8, 60, 10, 8]);
  }
  ctx.fill();
  ctx.fillStyle = '#1e2a40';
  ctx.beginPath();
  if (type === 'tgv') { ctx.moveTo(x + LOCO_W - 100, 410); ctx.lineTo(x + LOCO_W - 52, 410); ctx.lineTo(x + LOCO_W - 24, 428); ctx.lineTo(x + LOCO_W - 100, 428); }
  else if (type === 'national') ctx.roundRect(x + LOCO_W - 42, 408, 32, 22, 3);
  else { ctx.moveTo(x + LOCO_W - 66, 410); ctx.lineTo(x + LOCO_W - 30, 410); ctx.lineTo(x + LOCO_W - 8, 434); ctx.lineTo(x + LOCO_W - 66, 434); }
  ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + 10, 412, LOCO_W - (type === 'tgv' ? 120 : 90), 20, 4); ctx.fill();
  ctx.fillStyle = L.stripe;
  ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x + LOCO_W - 4, 440); ctx.lineTo(x + LOCO_W - 6, 446); ctx.lineTo(x, 446); ctx.fill();
  ctx.fillStyle = L.band; ctx.fillRect(x, 447, LOCO_W - 8, 3);
  const label = { express: 'EXPRESS', national: 'INTERCITÉS', tgv: 'TGV' }[type];
  if (label) {
    ctx.fillStyle = L.band; ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, x + 50, 459);
  }
  ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(x + LOCO_W - 10, 454, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2f36'; ctx.fillRect(x + 10, 463, LOCO_W - 30, 6);
  for (const wx of [24, 44, LOCO_W - 60, LOCO_W - 40]) { ctx.beginPath(); ctx.arc(x + wx, 472, 6, 0, Math.PI * 2); ctx.fill(); }
}

function drawTrain(left, type) {
  const L = type === 'regional' ? LIVERY.regular[S.comfort] : LIVERY[type], n = trainCars(type);
  for (let i = 0; i < n; i++) {
    const bar = type !== 'express' && S.barCar && i === n - 1; // la voiture-bar suit la locomotive
    drawWagon(left + i * (CAR_W + GAP), bar ? LIVERY.bar : L);
    if (bar) {
      ctx.fillStyle = '#c9a227'; ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BAR', left + i * (CAR_W + GAP) + CAR_W / 2, 459);
    }
  }
  drawLoco(left + n * (CAR_W + GAP), L, type);
}

// ---------- Effets ----------
const floats = [];
function updateFloats(dt) {
  for (const f of floats) { f.life -= dt; f.y -= 18 * dt; }
  for (let i = floats.length - 1; i >= 0; i--) if (floats[i].life <= 0) floats.splice(i, 1);
}

function glow(x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgb(0 0 0 / 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawClockHands() {
  const a = ((S.minutes + acc) / 60 / 12) * Math.PI * 2, b = (((S.minutes + acc) % 60) / 60) * Math.PI * 2;
  ctx.strokeStyle = '#1b2540'; ctx.lineCap = 'round';
  for (const [ang, len, w] of [[a, 8, 2.5], [b, 13, 1.5]]) {
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(TOWER.x, TOWER.clockY);
    ctx.lineTo(TOWER.x + Math.sin(ang) * len, TOWER.clockY - Math.cos(ang) * len); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// Silhouettes dans la salle d'attente et écran des départs (par-dessus les fenêtres éclairées)
function drawInsideDetails(inside) {
  if (S.strike) {
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.roundRect(DOOR_X - 34, 326, 68, 12, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✊ GRÈVE', DOOR_X, 335);
  }
  if (S.waitroom) {
    const heads = Math.round((inside / WAITROOM[S.waitroom]) * 12);
    ctx.fillStyle = 'rgb(40 32 36 / .8)';
    for (let i = 0; i < heads; i++) {
      const wx = MX + 20 + Math.floor(i / 4) * 45, hx = wx + 3 + (i % 4) * 5.5;
      ctx.beginPath(); ctx.arc(hx, 357, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(hx - 2.4, 359, 4.8, 5);
    }
  }
  if (S.svc.screens) {
    const sx = MX + MW + 4, sy = 326;
    ctx.fillStyle = '#0b1020'; ctx.beginPath(); ctx.roundRect(sx, sy, 42, 20, 3); ctx.fill();
    ctx.fillStyle = '#ffb547'; ctx.font = '700 7px ui-monospace, monospace'; ctx.textAlign = 'center';
    ctx.fillText('DÉPART', sx + 21, sy + 8);
    const next = nextTrain();
    ctx.fillText(next.startsWith('à quai') ? 'À QUAI' : next.slice(0, 5), sx + 21, sy + 17);
  }
}

// Pluie, neige ou chaleur par-dessus la scène
const DROPS = (() => { const r = rng(11); return Array.from({ length: 180 }, () => [r() * W, r() * H, 0.6 + r() * 0.4]); })();
function drawWeather(t) {
  const w = S.plan.weather;
  if (w === 'rain') {
    ctx.strokeStyle = 'rgb(190 210 240 / .55)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [x0, y0, k] of DROPS) {
      const y = (y0 + t * 520 * k) % H, x = (((x0 - t * 90 * k) % W) + W) % W;
      ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12);
    }
    ctx.stroke();
  } else if (w === 'snow') {
    ctx.fillStyle = 'rgb(255 255 255 / .85)';
    for (const [x0, y0, k] of DROPS) {
      const y = (y0 + t * 45 * k) % H, x = x0 + Math.sin(t * k + y0) * 12;
      ctx.beginPath(); ctx.arc(x, y, 1.6 * k, 0, Math.PI * 2); ctx.fill();
    }
  } else if (w === 'heat') {
    ctx.fillStyle = 'rgb(255 170 60 / .12)';
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- Rendu ----------
let simT = 0; // temps d'animation, figé en pause
function render(now) {
  const t = (S.minutes + acc) / 60;
  const d = daylight(t), dark = 1 - d;
  const [phase, , , ttype] = trainPhase();
  const tl = trainLeft();

  drawSky(t, d);
  if (S.plan.weather === 'rain' || S.plan.weather === 'snow') { // ciel couvert
    ctx.fillStyle = 'rgb(110 120 140 / .5)';
    ctx.fillRect(0, 0, W, 300);
  }
  ctx.drawImage(back, 0, 0, W, H);
  for (const c of cars) if (!c.lane) drawCar(c);
  for (const c of cars) if (c.lane) drawCar(c);
  ctx.drawImage(front, 0, 0, W, H);
  if (S.station >= 3) drawClockHands();

  ctx = spriteCtx;
  ctx.clearRect(0, 0, W, H);
  for (const l of LITTER.slice(0, Math.round(S.dirt * 1.6))) {
    ctx.fillStyle = l.c;
    ctx.fillRect(crowdX(l.u), l.y, l.w, 2.5);
  }
  drawStaff(simT);
  const split = crowdSplit();
  const vc = Math.min(CROWD_MAX, Math.round(split.classic - split.inside)), vw = Math.min(CROWD_MAX - vc, Math.round(split.commuters));
  for (const p of crowd) {
    if (p.order < vc) drawPerson(p, crowdX(p.u), p.y, simT, false);
    else if (p.order < vc + vw) drawPerson(p.suit, crowdX(p.u), p.y, simT, false);
  }
  for (const w of walkers) drawPerson(w, w.x, w.y, simT, w.delay <= 0);
  // abris voyageurs, devant la foule (vitre translucide), en retrait de la ligne jaune comme les bancs
  for (const x of SHELTER_X.slice(0, S.shelters)) {
    const w = SHELTER_W;
    ctx.fillStyle = 'rgb(170 205 235 / .35)'; ctx.fillRect(x, 350, w, 60);
    ctx.fillStyle = '#2f3b4f'; ctx.fillRect(x, 344, 3, 80); ctx.fillRect(x + w - 3, 344, 3, 80);
    ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.roundRect(x - 8, 337, w + 16, 8, 3); ctx.fill();
  }

  if (tl !== null) drawTrain(tl, ttype);
  if (dark > 0) {
    ctx.globalCompositeOperation = 'source-atop'; // n'assombrit que les pixels déjà dessinés
    ctx.fillStyle = `rgb(10 18 45 / ${dark * 0.6})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx = mainCtx;

  // nuit
  if (dark > 0) {
    ctx.fillStyle = `rgb(10 18 45 / ${dark * 0.6})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const lx of LAMPS) glow(lx + 17, 308, 70, `rgb(255 200 110 / ${dark * 0.45})`);
    ctx.save(); // les phares disparaissent derrière les bâtiments de la gare et les commerces
    ctx.beginPath(); ctx.rect(0, 0, S.station >= 2 ? 760 : MX, H);
    for (const sh of shopFronts()) ctx.rect(sh.x - 2, SHOP_TOP - 4, sh.w + 4, H);
    ctx.clip('evenodd');
    for (const c of cars) glow(c.x + c.dir * c.len / 2, laneY(c.lane) - 10, 30, `rgb(255 230 160 / ${dark * 0.5})`);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgb(255 214 130 / ${dark * 0.85})`;
    for (const wn of WINDOWS) ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    for (const lx of LAMPS) { ctx.fillStyle = `rgb(255 236 190 / ${dark})`; ctx.fillRect(lx + 12, 305, 10, 2); }
  }
  drawInsideDetails(split.inside);
  ctx.drawImage(sprites, 0, 0, W, H);
  if (dark > 0 && tl !== null) {
    ctx.fillStyle = `rgb(255 230 170 / ${dark * 0.7})`;
    for (let i = 0; i < trainCars(ttype); i++) ctx.fillRect(tl + i * (CAR_W + GAP) + 8, 412, CAR_W - 16, 20);
  }

  // signal de passage à niveau
  const blink = (phase === 'arriving' || phase === 'leaving') && Math.floor(now * 2.5) % 2;
  for (const [i, on] of [[0, blink], [1, !blink && phase !== 'away' && phase !== 'stopped']]) {
    const lx = SIGNAL.x - 7 + i * 14;
    ctx.fillStyle = on ? '#ff3b30' : '#5a1e1e';
    ctx.beginPath(); ctx.arc(lx, SIGNAL.y, 4, 0, Math.PI * 2); ctx.fill();
    if (on) glow(lx, SIGNAL.y, 18, 'rgb(255 60 50 / .6)');
  }

  // enseigne lumineuse ALIGATO, posée sur le toit
  const sy = hotelTop() - 70;
  ctx.fillStyle = '#10275c';
  ctx.strokeStyle = '#5fa8ff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(DOOR_X - 85, sy, 170, 36, 8); ctx.fill(); ctx.stroke();
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#4da3ff'; ctx.shadowBlur = 8 + dark * 14;
  ctx.fillStyle = '#eaf4ff';
  ctx.fillText('ALIGATO', DOOR_X, sy + 27);
  ctx.shadowBlur = 0;

  drawWeather(simT);
  ctx.font = '700 18px system-ui, sans-serif';
  for (const f of floats) {
    ctx.fillStyle = `rgb(30 200 110 / ${Math.min(1, f.life)})`;
    ctx.strokeStyle = `rgb(0 40 20 / ${Math.min(1, f.life) * 0.6})`; ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y);
  }
}

// ---------- Sons (Web Audio, sans fichier) ----------
// Coupé par défaut ; le contexte audio n'est créé qu'après un geste du joueur (règles d'autoplay des navigateurs)
const sound = { on: false, ctx: null, amb: null };
try { sound.on = localStorage.getItem('aligato-sound') === '1'; } catch { /* stockage indisponible */ }
function audio() {
  if (sound.ctx) return sound.ctx;
  const a = (sound.ctx = new AudioContext());
  // ambiance : bruit blanc filtré très bas, comme le brouhaha lointain d'un hall de gare
  const buf = a.createBuffer(1, a.sampleRate * 3, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), lp = a.createBiquadFilter();
  src.buffer = buf;
  src.loop = true;
  lp.frequency.value = 380;
  sound.amb = a.createGain();
  sound.amb.gain.value = 0;
  src.connect(lp).connect(sound.amb).connect(a.destination);
  src.start();
  return a;
}
// l'ambiance se tait quand le jeu est en pause
function ambience() {
  if (sound.amb) sound.amb.gain.setTargetAtTime(sound.on && S.speed ? 0.06 : 0, sound.ctx.currentTime, 0.3);
}
function tone(freq, start, dur, vol = 0.12, type = 'sine') {
  const a = sound.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime + start;
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}
// [fréquence, départ, durée, volume, forme d'onde]
const SFX = {
  tickets: [[2093, 0, 0.12, 0.05], [2637, 0.06, 0.3, 0.05]], // pièces discrètes à chaque recette de billets
  // actions du joueur
  upgrade: [[523, 0, 0.3, 0.09, 'triangle'], [659, 0.1, 0.3, 0.09, 'triangle'], [784, 0.2, 0.3, 0.09, 'triangle'], [1047, 0.3, 0.9, 0.09, 'triangle']], // petite fanfare
  hire: [[587, 0, 0.3, 0.09, 'triangle'], [880, 0.12, 0.6, 0.09, 'triangle']], // deux notes montantes
  fire: [[440, 0, 0.3, 0.08, 'triangle'], [294, 0.15, 0.7, 0.08, 'triangle']], // deux notes descendantes
  stock: [[1319, 0, 0.15, 0.08, 'triangle'], [1976, 0.07, 0.4, 0.08, 'triangle']], // tintement de caisse
};
const play = (name) => { if (sound.on && sound.ctx?.state === 'running') SFX[name].forEach((n) => tone(...n)); };
function soundButton() {
  $('#sound').textContent = sound.on ? '🔊' : '🔇';
  $('#sound').dataset.tip = sound.on ? 'Couper le son' : 'Activer le son';
  $('#sound').ariaLabel = $('#sound').dataset.tip;
}
function setSound(on) {
  sound.on = on;
  soundButton();
  try { localStorage.setItem('aligato-sound', on ? '1' : '0'); } catch { /* stockage indisponible */ }
  if (on) audio().resume();
  ambience();
}
soundButton();
$('#sound').onclick = () => setSound(!sound.on);
// son mémorisé : il reprend au premier clic ou à la première touche
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (sound.on) setSound(true); }, { once: true });

// ---------- Interface ----------
// view : fenêtre ouverte au clic sur la notification
function toast(msg, kind = '', view = null) {
  const box = $('#toasts'), el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  if (view) {
    el.classList.add('action');
    el.onclick = () => openModal(view);
  }
  box.prepend(el);
  while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => el.remove(), 7000);
}

function nextTrain() {
  const [ph, , , type] = trainPhase();
  const tag = (t) => (t === 'regional' ? '' : ` · ${t === 'express' ? 'express' : TRAIN_TYPES[t].name}`);
  if (ph === 'stopped') return `à quai${tag(type)}`;
  for (let t = S.minutes + 1; t < S.minutes + 1440; t++) {
    const h = Math.floor(t / 60) % 24, m = t % 60;
    if (m === 30 && t < 1440 && hasSpecial(h)) return `${pad(h)}:30 · express`;
    if (m === 0 && hasTrain(h)) return `${pad(h)}:00${t < 1440 ? tag(S.plan.types[h]) : ''}`;
  }
  return '—';
}

const HUD = {
  budget: () => money(S.budget),
  day: () => S.day,
  clock: clockStr,
  pax: () => `${fmt(S.today.passengers)} / ${fmt(S.plan.total)}`,
  goalTitle: () => (S.goal < GOALS.length ? `Objectif ${S.goal + 1}/${GOALS.length}` : 'Objectifs'),
  goalText: () => GOALS[S.goal]?.text ?? '🏆 Légende du rail',
  waiting: () => fmt(displayWaiting()),
  weekday: () => `${seasonOf().icon} ${DAYS[weekday()]}`,
  score: () => fmt(S.score),
  nextTrain,
  weather: () => `${weather().icon} ${weather().name}`,
  freeRooms: () => `${Math.max(0, S.hotel * ROOMS_PER_FLOOR - S.today.rooms - S.hotelQueue)} / ${S.hotel * ROOMS_PER_FLOOR}`,
  hotelQueue: () => S.hotelQueue,
  sat: () => `${Math.round(satisfaction() * 100)} %`,
};
$('#stockBars').innerHTML = Object.entries(PRODUCTS).map(([k, p]) => `<span class="kv"><span>${p.icon}</span><span class="bar" id="bar-${k}"><i></i></span></span>`).join('');
const bound = [...document.querySelectorAll('[data-k]')];

function updateHUD() {
  for (const el of bound) el.textContent = HUD[el.dataset.k]();
  $('[data-k="budget"]').classList.toggle('bad', S.budget < 0);
  $('[data-k="budget"]').title = S.budget < 0 ? `Découvert : faillite si le budget est encore négatif dans ${DEBT_DAYS - S.debtDays} soir(s)` : '';
  $('#stars').style.setProperty('--v', S.rep.toFixed(2));
  const num = (v, opt = {}) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2, ...opt });
  const factors = qualityFactors().sort((a, b) => b[1] - a[1]);
  $('#repStat').dataset.tip = `Note : ${num(S.rep)} / 5 · tend vers ${num(quality(S.lastMiss, S.lastExposure))}\n• Base : 2,20\n`
    + factors.map(([label, v]) => `${v > 0 ? '👍' : '👎'} ${label} : ${num(v, { signDisplay: 'always' })}`).join('\n');
  const g = GOALS[S.goal];
  $('#goalBar').style.width = `${g ? clamp(g.value() / g.target, 0, 1) * 100 : 100}%`;
  const n = UPGRADES.filter((u) => upState(u) === 'ok').length;
  $('#upBadge').textContent = n || '';
  for (const k of Object.keys(PRODUCTS)) {
    const r = S.stock[k] / stockCap(k), bar = $('#bar-' + k);
    bar.classList.toggle('low', r < 0.2);
    bar.firstChild.style.width = `${r * 100}%`;
    bar.parentNode.dataset.tip = `${PRODUCTS[k].icon} ${PRODUCTS[k].name} en stock dans les distributeurs : ${S.stock[k]} / ${stockCap(k)}`;
  }
  const clean = 100 - S.dirt;
  $('#bar-clean').classList.toggle('low', clean < 50);
  $('#bar-clean').firstChild.style.width = `${clean}%`;
  $('#bar-clean').parentNode.dataset.tip = `🧹 Propreté du quai : ${Math.round(clean)} / 100`;
  $('#weatherRow').dataset.tip = weather().severity
    ? `Voyageurs à l'abri : ${shelterCap()} places (abris + salle d'attente). Les autres attendent dehors et l'appréciation baisse.`
    : 'Beau temps : aucune gêne pour les voyageurs qui attendent dehors.';
  $('#scoreStat').dataset.tip = `Points d'hier : ${S.report?.points ?? '—'} / 200\nRecord : ${fmt(Math.max(bestScore(), S.score))} points\n`
    + 'Chaque soir : appréciation (100) + clients satisfaits (50) + bénéfice (50)';
  $('#dayStat').dataset.tip = `${seasonOf().icon} ${seasonOf().name} · jour ${((S.day - 1) % SEASON_DAYS) + 1} / ${SEASON_DAYS}`;
  $('[data-k="sat"]').className = satisfaction() >= 0.9 ? 'good' : satisfaction() < 0.75 ? 'bad' : '';
}

// --- Fenêtres modales (le jeu est en pause tant qu'elles sont ouvertes) ---
const modal = $('#modal');
let view = null, resumeSpeed = 1;
const row = (label, value, cls = '') => `<div class="row"><span>${label}</span><b class="${cls}">${value}</b></div>`;
const adviceCls = (n, need) => (n < need ? 'bad' : n > need ? 'over' : 'good');

// Lien vers une fenêtre, utilisé dans les conseils du bilan
const link = (text, view) => `<button class="link" data-act="open:${view}">${text}</button>`;

function advice() {
  const p = S.plan, need = expect(p).need, R = S.report, tips = [];
  const dayName = DAYS[weekday(p.day)].toLowerCase();
  const ns = seasonOf(p.day);
  if (p.day > 1 && ns !== seasonOf(p.day - 1)) {
    tips.push(`${ns.icon} ${ns.name === 'Été' ? 'L\'été' : ns.name === 'Automne' ? 'L\'automne' : ns.name === 'Hiver' ? 'L\'hiver' : 'Le printemps'} commence demain : `
      + { 'Printemps': 'retour à la normale, quelques averses.', 'Été': 'vacances, plus de touristes et de chambres, moins de travailleurs, fortes chaleurs.',
        'Automne': 'beaucoup de pluie : prévoyez des abris.', 'Hiver': 'neige fréquente et moins de voyageurs : abris et salle d\'attente indispensables.' }[ns.name]);
  }
  if (p.weekend) tips.push(`🌞 Ce ${dayName}, pas d'express : les voyageurs de loisir restent plus à l'hôtel et mangent davantage. Prévoyez chambres et repas.`);
  else if (weekday(p.day) === 0) tips.push(`💼 Lundi, les travailleurs reviennent (express à 6 h 30, 7 h 30, 17 h 30, 18 h 30) : ils boivent beaucoup de café.`);
  if (weather().severity && shelterCap() < p.peak) {
    tips.push(`${weather().icon} ${weather().name} prévue : seulement ${shelterCap()} voyageurs à l'abri sur ${p.peak} au plus fort. ${link('Ajoutez des abris', 'upgrades')} ou une salle d'attente.`);
  }
  if (S.budget < 0) tips.push(`💸 Budget négatif : faillite si c'est encore le cas dans ${DEBT_DAYS - S.debtDays} soir(s). Réduisez l'effectif ou montez le prix.`);
  const n = UPGRADES.filter((u) => upState(u) === 'ok').length;
  if (n) tips.push(`🏗️ ${link(`${n} amélioration(s) à votre portée`, 'upgrades')}.`);
  const best = bestTarif();
  if (Math.abs(best - S.tarif) >= 10) {
    tips.push(`💲 ${link(`${best > S.tarif ? 'Montez' : 'Baissez'} le prix vers ${money(best * PRICE_PER_POINT)}`, 'prices')} : c'est le billet le plus rentable demain.`);
  }
  if (p.potential > p.capacity * 1.05) tips.push(`🚦 La gare est saturée : ${link('agrandissez', 'upgrades')} le quai et ajoutez des wagons pour accueillir plus de voyageurs.`);
  for (const [k, r] of Object.entries(STAFF)) {
    const d = need[k] - S.staff[k];
    if (d > 0) tips.push(`${r.icon} Il manquera ${d} ${r.name.toLowerCase()} demain : ${link('embauchez', 'staff')} avant le premier train.`);
    else if (d < 0) tips.push(`${r.icon} ${link(`${-d} ${r.name.toLowerCase()} en trop`, 'staff')} : ${money(-d * r.salary)} de salaires inutiles par jour.`);
  }
  if (R?.refused) tips.push(`🏨 Des clients ont été refusés à l'hôtel : ajoutez du ${link('personnel d\'hôtel', 'staff')}, une ${link('borne de check-in ou un étage', 'upgrades')}.`);
  if (S.dirt > 40) tips.push(`🧹 Le quai est sale : cela fait baisser l'appréciation. ${link('Renforcer l\'entretien', 'staff')}`);
  for (const k of expect(p).stockShort) {
    tips.push(`${PRODUCTS[k].icon} Les distributeurs de ${PRODUCTS[k].name.toLowerCase()} seront vides avant la fin de journée : ${link('ajoutez-en un ou remplissez-les', 'stocks')} en journée.`);
  }
  if (!S.autoRefill) tips.push(`🛒 Le remplissage automatique est désactivé : pensez à ${link('remplir les distributeurs', 'stocks')}.`);
  return tips.slice(0, 6);
}

const VIEWS = {
  summary: {
    title: '🌙 Fin de journée',
    html: () => {
      const R = S.report, m = expect(S.plan), g = GOALS[S.goal];
      const net = (v) => `<b class="${v >= 0 ? 'good' : 'bad'}">${money(v)}</b>`;
      const stars = (v) => `${v.toFixed(1)} ★`;
      const tips = advice();
      return `<p class="hint">Bilan du ${DAYS[weekday(R.day)].toLowerCase()} (jour ${R.day})</p>
      <div class="cols">
        <section><h3>Aujourd'hui</h3>
          ${row('Voyageurs', `${fmt(R.passengers)} <small>/ ${fmt(R.planned)} prévus</small>`)}
          ${R.commuters ? row('dont travailleurs', fmt(R.commuters)) : ''}
          ${R.missed ? row('Sans billet', fmt(R.missed), 'bad') : ''}
          ${R.fraud ? row('Fraudeurs', `${fmt(R.fraud)} <small>(${fmt(R.caught)} verbalisés, +${money(R.fines)})</small>`, R.fraud > R.passengers * 0.08 ? 'bad' : '') : ''}
          ${row('Clients à l\'hôtel', R.rooms + (R.refused ? ` <small class="bad">(${R.refused} refusés)</small>` : ''))}
          ${row('Clients satisfaits', `${Math.round(R.sat * 100)} %`, R.sat >= 0.9 ? 'good' : R.sat < 0.75 ? 'bad' : '')}
          ${row('Recettes', money(R.revenue))}
          ${row('Frais', money(R.total))}
          <div class="row"><span>Résultat</span>${net(R.revenue - R.total)}</div>
          ${row('Appréciation', `${stars(R.repStart)} → ${stars(R.repEnd)}`, R.repEnd >= R.repStart ? 'good' : 'bad')}
          ${row('Points du jour', `${R.points} / 200`)}
          ${row('Score total', fmt(S.score) + (R.record ? ' 🏆 record' : ''), R.record ? 'good' : '')}</section>
        <section><h3>Objectifs</h3>
          ${R.goals.map((x) => `<p class="win">🎯 <b>${x.text}</b><small>Débloqué : ${x.unlocks}</small></p>`).join('')}
          ${g ? `<p><b>▶️ ${g.text}</b></p><span class="bar"><i style="width:${clamp(g.value() / g.target, 0, 1) * 100}%"></i></span>`
            : '<p><b>🏆 Vous êtes une Légende du rail !</b></p>'}</section>
        <section><h3>Demain · ${DAYS[weekday(S.plan.day)]} ${seasonOf(S.plan.day).icon}</h3>
          ${row('Météo', `${weather().icon} ${weather().name}`)}
          ${row('Voyageurs prévus', fmt(S.plan.total))}
          ${S.plan.commuterTotal ? row('dont travailleurs', fmt(S.plan.commuterTotal)) : row('Week-end', 'pas d\'express')}
          ${row('Capacité', fmt(S.plan.capacity))}
          ${row('Recettes prévues', money(m.revenue))}
          ${row('Frais prévus', money(m.costs))}
          <div class="row"><span>Résultat prévu</span>${net(m.revenue - m.costs)}</div></section>
      </div>
      ${tips.length ? `<div class="tips"><h3>Conseils</h3><ul>${tips.map((t) => `<li>${t}</li>`).join('')}</ul></div>` : ''}
      <div class="actions"><button class="primary" data-act="close">Commencer le jour ${S.day + 1} ▶</button></div>`;
    },
  },
  prices: {
    title: '💲 Tarifs',
    html: () => `
      <label class="field"><span>Prix du billet</span><output id="tarifOut"></output>
        <input type="range" id="tarif" min="1" max="100" value="${S.tarif}"></label>
      <div class="callout" id="pricePreview"></div>`,
    bind() {
      $('#tarif').oninput = (e) => { S.tarif = +e.target.value; this.refresh(); };
      this.best = bestTarif(); // ne dépend pas du curseur : calculé une fois à l'ouverture
      this.refresh();
    },
    refresh() {
      const p = makePlan(false, S.day + 1), saturated = p.potential > p.capacity, e = expect(p);      $('#tarifOut').textContent = `${money(ticketPrice())}`;
      $('#pricePreview').innerHTML = `
        ${row('Clientèle attirée demain', fmt(p.potential))}
        ${row('Capacité de la gare', `${fmt(p.capacity)} <small>(${capPerTrain()} par train)</small>`)}
        ${row('Voyageurs prévus demain', fmt(p.total))}
        ${row('Résultat prévu demain', money(e.revenue - e.costs), e.revenue >= e.costs ? 'good' : 'bad')}
        ${row('Billet le plus rentable', money(this.best * PRICE_PER_POINT), Math.abs(this.best - S.tarif) < 10 ? 'good' : '')}
        ${row('Appréciation visée', `${quality(0).toFixed(1)} ★`)}
        <p class="hint">${saturated
          ? '🚦 La gare est saturée : monter le prix rapporte plus sans perdre beaucoup de voyageurs. Agrandissez le quai et ajoutez des wagons pour en accueillir davantage.'
          : '📉 La gare n\'est pas pleine : un billet moins cher attire plus de monde, mais rapporte moins par voyageur.'}
          Le prix agit sur la fréquentation du lendemain.</p>`;
    },
  },
  stocks: {
    title: '🛒 Stocks & distributeurs',
    html: () => {
      const e = expect(S.plan);
      return `<p class="hint">Chaque visiteur peut acheter un café, un repas ou un goodies. Un distributeur vide fait des clients mécontents.
        Le réapprovisionnement est payé à minuit.</p>`
        + Object.entries(PRODUCTS).map(([k, p]) => {
          const cap = stockCap(k);
          return `<div class="stock-row">
            <div><b>${p.icon} ${p.name}</b>
              <small>${S.vending[k]} distributeur(s) · stock ${S.stock[k]} / ${cap} · demande prévue ${fmt(e.demandBy[k])} par jour</small>
              ${e.counterBy[k] ? `<small>dont ${fmt(e.counterBy[k])} servis par ${COUNTERS[k].name} avant les distributeurs</small>` : ''}
              <span class="bar ${S.stock[k] < cap * 0.2 ? 'low' : ''}"><i style="width:${(S.stock[k] / cap) * 100}%"></i></span></div>
            ${S.broken[k] ? `<button class="primary" data-act="repair:${k}" ${S.budget < 1500 ? 'disabled' : ''}>⚠️ Réparer · ${money(1500)}</button>` : ''}
            <button data-act="refill:${k}" ${S.stock[k] >= cap ? 'disabled' : ''}>Remplir · ${money((cap - S.stock[k]) * p.cost)}</button>
            <button data-act="vending:${k}" ${S.vending[k] >= VENDING_MAX || S.budget < VENDING_PRICE ? 'disabled' : ''}>+ Distributeur · ${money(VENDING_PRICE)}</button>
          </div>`;
        }).join('')
        + `<label class="check"><input type="checkbox" id="autoRefill" ${S.autoRefill ? 'checked' : ''}> Remplir automatiquement tous les distributeurs chaque nuit</label>`;
    },
    bind() { $('#autoRefill').onchange = (e) => { S.autoRefill = e.target.checked; }; },
  },
  staff: {
    title: '👥 Personnel',
    html: () => {
      const today = expect(S.plan).need, tomorrow = expect(makePlan(false, S.day + 1)).need;
      return `<p class="hint">L'effectif conseillé est calculé d'après les voyageurs prévus. Embauche ${money(HIRE_FEE)}, licenciement ${money(SEVERANCE)}.</p>`
        + staffRoles().map(([k, r]) => `
        <div class="staff-row">
          <div><b>${r.icon} ${r.name}</b>
            <small>${money(r.salary)} / jour · ${r.info()}</small>
            <small>Conseillé : <span class="${adviceCls(S.staff[k], today[k])}">${today[k]} aujourd'hui</span> · ${tomorrow[k]} demain</small></div>
          <button data-act="fire:${k}" ${S.staff[k] <= r.min() ? 'disabled' : ''}>−</button>
          <span class="n">${S.staff[k]}</span>
          <button data-act="hire:${k}" ${S.staff[k] >= 10 || S.budget < HIRE_FEE ? 'disabled' : ''}>+</button>
        </div>`).join('');
    },
  },
  upgrades: {
    title: '🏗️ Améliorations',
    html: () => '<p class="hint">Les agrandissements attirent plus de voyageurs dès le lendemain. Une amélioration de chaque type par jour. Atteignez les objectifs pour en débloquer d\'autres.</p><div class="ups">'
      + UPGRADES.map((u) => {
        const st = upState(u), l = u.level();
        const action = st === 'max' ? '<span class="tag">✓ Acquis</span>'
          : st === 'locked' ? `<span class="tag">🔒 Objectif ${upReq(u)}</span>`
          : st === 'pre' ? `<span class="tag">🔒 ${u.preText()}</span>`
          : st === 'today' ? '<span class="tag" title="Une amélioration de chaque type par jour">⏳ Demain</span>'
          : `<button data-act="buy:${u.id}" ${st === 'poor' ? 'disabled' : ''}>${money(u.cost(l))}</button>`;
        return `<div class="up ${st}"><span class="icon">${u.icon}</span>
          <div><b>${u.name}</b>${u.max > 1 ? ` <small>${l}/${u.max}</small>` : ''}<p>${u.desc()}</p></div>${action}</div>`;
      }).join('') + '</div>',
  },
  goals: {
    title: '🎯 Objectifs',
    html: () => '<ol class="goals">' + GOALS.map((g, i) => {
      const st = i < S.goal ? 'done' : i === S.goal ? 'current' : 'todo';
      const v = Math.min(g.value(), g.target);
      const progress = st === 'current'
        ? `<div class="bar"><i style="width:${clamp(v / g.target, 0, 1) * 100}%"></i></div><small>${g.money ? money(v) : g.target < 10 ? v.toFixed(1) : fmt(v)} / ${g.money ? money(g.target) : g.target < 10 ? g.target : fmt(g.target)}</small>`
        : '';
      return `<li class="${st}"><b>${st === 'done' ? '✅' : st === 'current' ? '▶️' : '🔒'} ${g.text}</b>${progress}<small>Débloque : ${g.unlocks}</small></li>`;
    }).join('') + '</ol>',
  },
  report: {
    title: '📊 Bilan & prévisions',
    html: () => {
      const t = expect(S.plan), m = expect(makePlan(false, S.day + 1)), R = S.report;
      const net = (v) => `<b class="${v >= 0 ? 'good' : 'bad'}">${money(v)}</b>`;
      return `<div class="cols">
        <section><h3>Aujourd'hui</h3>
          ${row('Voyageurs prévus', fmt(S.plan.total))}
          ${row('Déjà transportés', fmt(S.today.passengers))}
          ${row('Recettes prévues', money(t.revenue))}
          ${row('Frais prévus', money(t.costs))}
          <div class="row"><span>Résultat prévu</span>${net(t.revenue - t.costs)}</div></section>
        <section><h3>Demain</h3>
          ${row('Voyageurs prévus', fmt(makePlan(false, S.day + 1).total))}
          ${row('Recettes prévues', money(m.revenue))}
          ${row('Frais prévus', money(m.costs))}
          <div class="row"><span>Résultat prévu</span>${net(m.revenue - m.costs)}</div></section>
        <section><h3>Hier</h3>${R
          ? row('Voyageurs', fmt(R.passengers)) + row('Clients hôtel', R.rooms) + row('Recettes', money(R.revenue))
            + R.costs.filter(([, v]) => v).map(([k, v]) => row(k, '−' + money(v))).join('')
            + `<div class="row"><span>Résultat</span>${net(R.revenue - R.total)}</div>`
          : '<p class="hint">Premier bilan à minuit.</p>'}</section>
      </div>
      <h3 class="hist-title">Historique · ${S.history.length} dernier(s) jour(s)</h3>
      ${S.history.length < 2 ? '<p class="hint">Les courbes apparaissent après deux journées.</p>' : `<div class="charts">
        ${chart('Budget', S.history.map((h) => h.budget), 'line', money)}
        ${chart('Résultat du jour', S.history.map((h) => h.net), 'bars', money)}
        ${chart('Voyageurs', S.history.map((h) => h.pax), 'bars', fmt)}
        ${chart('Appréciation', S.history.map((h) => h.rep), 'line', (v) => `${v.toFixed(2).replace('.', ',')} ★`, [0, 5])}
      </div>`}`;
    },
  },
};

// Petit graphique SVG (une série) : courbe ou barres, infobulle native sur chaque point, dernière valeur affichée
function chart(title, values, kind, format, range) {
  const w = 240, h = 72, pad = 4, n = values.length, days = S.history.map((x) => x.day);
  const lo = range?.[0] ?? Math.min(0, ...values), hi = range?.[1] ?? Math.max(1, ...values);
  const y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - 2 * pad);
  const step = (w - 2 * pad) / n, x = (i) => pad + step * (i + 0.5);
  const tip = (i) => `<title>Jour ${days[i]} : ${format(values[i])}</title>`;
  const marks = kind === 'line'
    ? `<polyline points="${values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`
      + values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="var(--accent)" stroke="#fff" stroke-width="2">${tip(i)}</circle>`).join('')
    : values.map((v, i) => {
      const top = Math.min(y(v), y(0)), bh = Math.max(1, Math.abs(y(v) - y(0)));
      return `<rect x="${x(i) - step * 0.35}" y="${top}" width="${step * 0.7}" height="${bh}" rx="2" fill="${v < 0 ? 'var(--bad)' : 'var(--accent)'}">${tip(i)}</rect>`;
    }).join('');
  return `<figure class="chart"><figcaption><span>${title}</span><b>${format(values[n - 1])}</b></figcaption>
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title} sur ${n} jours">
      <line x1="0" x2="${w}" y1="${y(Math.max(lo, 0))}" y2="${y(Math.max(lo, 0))}" stroke="var(--line)"/>${marks}</svg></figure>`;
}

function openModal(name) {
  if (!modal.open) {
    resumeSpeed = S.speed || resumeSpeed;
    setSpeed(0);
    modal.showModal();
  }
  view = VIEWS[name];
  renderModal();
}
// Onglets pour passer d'une fenêtre à l'autre sans la fermer (le bilan du soir n'en a pas)
const TABS = { prices: '💲 Tarifs', staff: '👥 Personnel', stocks: '🛒 Stocks', upgrades: '🏗️ Améliorations', goals: '🎯 Objectifs', report: '📊 Bilan' };
$('#modalTabs').innerHTML = Object.entries(TABS).map(([k, label]) => `<button data-tab="${k}">${label}</button>`).join('');
$('#modalTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) openModal(b.dataset.tab); });
function renderModal() {
  for (const b of $('#modalTabs').children) b.classList.toggle('active', VIEWS[b.dataset.tab] === view);
  $('#modalTitle').textContent = view.title;
  $('#modalBody').innerHTML = view.html();
  view.bind?.();
}
modal.addEventListener('close', () => { if (!S.over) setSpeed(resumeSpeed); });
modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
$('#modalClose').onclick = () => modal.close();
document.querySelectorAll('[data-modal]').forEach((b) => { b.onclick = () => openModal(b.dataset.modal); });

$('#modalBody').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const [act, key] = btn.dataset.act.split(':');
  if (act === 'close') return modal.close();
  if (act === 'open') return openModal(key);
  const before = S.budget;
  if (act === 'refill') refill(key);
  if (act === 'repair' && S.budget >= 1500) {
    S.broken[key] = false;
    S.budget -= 1500;
    toast(`🔧 Distributeur de ${PRODUCTS[key].name.toLowerCase()} réparé : −${money(1500)}`, 'warn');
  }
  if (act === 'vending' && S.vending[key] < VENDING_MAX && S.budget >= VENDING_PRICE) {
    S.vending[key]++;
    S.budget -= VENDING_PRICE;
  }
  if (act === 'hire' && S.staff[key] < 10 && S.budget >= HIRE_FEE) {
    S.staff[key]++;
    S.budget -= HIRE_FEE;
    toast(`${STAFF[key].icon} Embauche d'${STAFF[key].one} : −${money(HIRE_FEE)}, puis ${money(STAFF[key].salary)} de salaire par jour`, 'warn');
  } else if (act === 'fire' && S.staff[key] > STAFF[key].min()) {
    S.staff[key]--;
    S.budget -= SEVERANCE;
    toast(`${STAFF[key].icon} Licenciement d'${STAFF[key].one} : −${money(SEVERANCE)} d'indemnités, ${money(STAFF[key].salary)} de salaire économisé par jour`, 'warn');
  } else if (act === 'buy') {
    const u = UPGRADES.find((x) => x.id === key);
    if (upState(u) !== 'ok') return;
    S.budget -= u.cost(u.level());
    u.buy();
    S.today.bought[u.id] = true;
    rebuild();
    toast(`${u.icon} ${u.name} : c'est fait !`, 'good');
  }
  // le remplissage n'est payé qu'à minuit : il ne fait pas baisser le budget
  if (S.budget < before || act === 'refill') play({ buy: 'upgrade', hire: 'hire', fire: 'fire' }[act] ?? 'stock');
  renderModal();
  updateHUD();
  save();
});

function setSpeed(v) {
  S.speed = v;
  document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('active', +b.dataset.speed === v));
  ambience();
}
document.querySelectorAll('[data-speed]').forEach((b) => { b.onclick = () => setSpeed(+b.dataset.speed); });
addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || modal.open) return;
  e.preventDefault();
  if (S.speed) { resumeSpeed = S.speed; setSpeed(0); } else setSpeed(resumeSpeed);
});
setSpeed(1);

// ---------- Boucle ----------
// ---------- Sauvegarde (navigateur) ----------
const SAVE_KEY = 'aligato-save';
function save() {
  if (S.over) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...S, speed: 1, event: EVENTS.indexOf(S.event), today: { ...S.today, goals: S.today.goals.map((g) => GOALS.indexOf(g)) },
      report: S.report && { ...S.report, goals: S.report.goals.map((g) => GOALS.indexOf(g)) },
    }));
  } catch { /* stockage indisponible (navigation privée) : on joue sans sauvegarde */ }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* idem */ }
}
// Recharge une partie ; les objets imbriqués sont fusionnés avec les valeurs par défaut (nouveaux champs ajoutés depuis)
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d) return false;
    for (const [k, v] of Object.entries(d)) {
      const def = S[k];
      S[k] = v && def && typeof v === 'object' && typeof def === 'object' && !Array.isArray(v) ? { ...def, ...v } : v;
    }
    S.event = EVENTS[d.event] ?? null;
    S.today.goals = d.today.goals.map((i) => GOALS[i]);
    if (S.report) S.report.goals = d.report.goals.map((i) => GOALS[i]);
    return true;
  } catch {
    return false;
  }
}
addEventListener('pagehide', save);
$('#newGame').onclick = () => {
  if (!confirm('Abandonner cette partie et en commencer une nouvelle ?')) return;
  clearSave();
  location.reload();
};

const resumed = load();
if (resumed) {
  rebuild();
  toast(`Partie reprise : ${DAYS[weekday()].toLowerCase()}, jour ${S.day}.`, 'good');
} else {
  S.plan = makePlan();
  Object.assign(S.staff, expect(S.plan).need); // effectif de départ adapté à la demande prévue
  toast(`Bienvenue, directeur ! Aujourd'hui, ${fmt(S.plan.total)} voyageurs attendus.`);
}

// ---------- Première journée guidée (une seule fois, jeu en pause) ----------
const TUTORIAL = [
  ['.stat.goal', '🎯 Votre objectif du moment. Chaque objectif atteint débloque de nouvelles améliorations.'],
  ['.overlay', '👀 L\'état de la gare en direct : prochain train, voyageurs à quai, hôtel, clients satisfaits et stocks. Survolez les jauges pour le détail.'],
  ['.toolbar [data-modal="prices"]', '💲 Le prix du billet : bas, il attire du monde ; haut, il rapporte plus par voyageur. Il agit sur le lendemain.'],
  ['.toolbar [data-modal="staff"]', '👥 Le personnel conseillé est calculé pour vous. Un guichetier manquant, et des voyageurs restent à quai.'],
  ['.toolbar [data-modal="stocks"]', '🛒 Cafés, repas et goodies : un distributeur vide fait des mécontents. Ajoutez-en dès que possible.'],
  ['.toolbar [data-modal="upgrades"]', '🏗️ Bancs, abris, quai, hôtel… Une amélioration de chaque type par jour.'],
  ['#repStat', '⭐ Survolez la note pour savoir ce qui plaît ou déplaît aux voyageurs. À minuit, un bilan vous attend. Bon jeu !'],
];
function startTutorial() {
  try { if (localStorage.getItem('aligato-tuto')) return; } catch { return; }
  const box = document.createElement('div');
  box.className = 'coach';
  document.body.append(box);
  let i = 0, target = null;
  const end = () => {
    target?.classList.remove('coach-target');
    box.remove();
    try { localStorage.setItem('aligato-tuto', '1'); } catch { /* stockage indisponible */ }
    setSpeed(1);
  };
  const show = () => {
    target?.classList.remove('coach-target');
    if (i >= TUTORIAL.length) return end();
    const [sel, text] = TUTORIAL[i];
    target = $(sel);
    target.classList.add('coach-target');
    box.innerHTML = `<p>${text}</p><div><small>${i + 1} / ${TUTORIAL.length}</small>
      <button class="link" data-skip>Passer</button><button class="primary" data-next>${i < TUTORIAL.length - 1 ? 'Suivant' : 'Jouer'}</button></div>`;
    const r = target.getBoundingClientRect(), below = r.bottom + 160 < innerHeight;
    box.style.left = `${clamp(r.left + r.width / 2 - 160, 10, innerWidth - 330)}px`;
    box.style.top = below ? `${r.bottom + 10}px` : `${r.top - box.offsetHeight - 10}px`;
    box.querySelector('[data-next]').onclick = () => { i++; show(); };
    box.querySelector('[data-skip]').onclick = end;
  };
  setSpeed(0);
  show();
}
if (!resumed) startTutorial();
let last = performance.now(), uiTimer = 0;
function frame(now) {
  const dt = Math.min(100, now - last);
  last = now;
  if (!S.over && S.speed > 0) {
    acc += dt / (MS_PER_MIN / S.speed);
    for (let n = 0; acc >= 1 && n < 60 && S.speed > 0; n++) { acc -= 1; stepMinute(); } // s'arrête si le bilan du soir met en pause
  }
  const sdt = S.over ? 0 : (dt / 1000) * S.speed;
  simT += sdt;
  updateCars(sdt, S.minutes / 60); // voitures au rythme du jeu, comme les voyageurs
  updateWalkers(sdt);
  updateFloats(dt / 1000);
  render(now / 1000);
  if ((uiTimer += dt) > 150) { uiTimer = 0; updateHUD(); }
  requestAnimationFrame(frame);
}
updateHUD();
requestAnimationFrame(frame);
