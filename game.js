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
const HIRE_FEE = 5000, SEVERANCE = 8000, STAFF_MAX = 10; // effectif maximal par métier
const MACHINE_UPKEEP = { kiosk: 300, robot: 400, checkin: 250 }; // par jour
const PUB_INCOME = 15000;
const BUS_PRICE = 0.7; // part du prix du billet payée par un voyageur du car de substitution
// campagnes de publicité : un seul achat par jour, clientèle en plus le lendemain seulement
const ADS = [
  { icon: '📰', name: 'Journal', cost: 80000, boost: 0.15 },
  { icon: '📻', name: 'Radio', cost: 200000, boost: 0.3 },
  { icon: '📺', name: 'Télévision', cost: 500000, boost: 0.5 },
];
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
const TRACK2_UPKEEP = [0, 6000, 15000]; // seconde voie : entretien et redevance des trains de renfort
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
// Saisons de 4 jours : météo probable, clientèle de loisir, chambres et travailleurs (vacances d'été)
const SEASON_DAYS = 4; // une saison tous les 4 jours, indépendamment de la semaine
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
const BOUTIQUE_GOODIES = 200; // la boutique de la gare vend des souvenirs avant les distributeurs
// Services : bonus d'appréciation et coût d'entretien par jour
const SERVICES = {
  wifi: { icon: '📶', name: 'Wi-Fi gratuit', desc: 'Appréciation +0,15', req: 0, cost: 25000, upkeep: 600, rep: 0.15 },
  security: { icon: '👮', name: 'Agent de sécurité', desc: 'Protège contre le vandalisme et les tags : travaux d\'entretien 25 % moins chers', req: 1, cost: 31250, upkeep: 2500, rep: 0.1 },
  screens: { icon: '📺', name: 'Écrans d\'information', desc: 'Guichets et bornes 25 % plus efficaces', req: 2, cost: 37500, upkeep: 300, rep: 0.1 },
  cafeteria: { icon: '🍽️', name: 'Cafétéria', desc: `Repas à ${CAFETERIA_PRICE} € servis par des serveurs, dîner des clients de l'hôtel`, req: 3, cost: 112500, upkeep: 1500, rep: 0.2 },
  lockers: { icon: '🧳', name: 'Consigne à bagages', desc: 'Recette sur les voyageurs de loisir', req: 3, cost: 31250, upkeep: 200, rep: 0.05 },
  relay: { icon: '📦', name: 'Point relais colis', desc: 'Recette sur les travailleurs', req: 4, cost: 50000, upkeep: 300, rep: 0.05 },
  spa: { icon: '🧖', name: 'Spa de l\'hôtel', desc: 'Chambres 30 % plus chères le week-end', req: 6, cost: 150000, upkeep: 1500, rep: 0.1,
    pre: () => S.hotel >= 3, preText: () => 'Hôtel de 3 étages requis' },
  workshop: { icon: '🔧', name: 'Atelier de maintenance', desc: 'Retards et pannes 4 fois plus rares, distributeurs réparés dans l\'heure', req: 2, cost: 75000, upkeep: 1500, rep: 0.05 },
  partner: { icon: '🤝', name: 'Hôtel partenaire', desc: 'Les clients refusés faute de chambre sont envoyés en ville : 60 % acceptent le trajet, la gare touche 20 % du prix de la chambre', req: 6, cost: 75000, upkeep: 500, rep: 0.05,
    pre: () => S.hotel >= 4, preText: () => 'Hôtel de 4 étages requis' },
  welcome: { icon: '🙋', name: 'Accueil voyageurs', desc: 'Moins d\'abandons en cas de retard, 20 billets par train même en grève, une partie des voyageurs sans billet attendent le train suivant', req: 2, cost: 43750, upkeep: 1500, rep: 0.1 },
  lounge: { icon: '💎', name: 'Salon 1re classe', desc: 'Billet double pour 10 % des voyageurs dès 4 ★ (3 % sinon)', req: 6, cost: 187500, upkeep: 1000, rep: 0.1,
    pre: () => S.category >= 2, preText: () => 'Gare nationale requise' },
  aircon: { icon: '❄️', name: 'Salle d\'attente climatisée', desc: 'Forte chaleur deux fois moins pénible pour tous les voyageurs', req: 5, cost: 60000, upkeep: 600, rep: 0.1,
    pre: () => S.waitroom >= 1, preText: () => 'Salle d\'attente requise' },
  piano: { icon: '🎹', name: 'Piano du hall', desc: 'Un piano en libre-service : les voyageurs apprécient', req: 0, cost: 15000, upkeep: 50, rep: 0.1 },
  bus: { icon: '🚌', name: 'Car de substitution', desc: `Les voyageurs qui abandonnent après un retard ou restent sans billet pendant une grève prennent le car (billet à −${Math.round((1 - BUS_PRICE) * 100)} %) · coût ×3 les jours de grève`,
    req: 4, cost: 120000, upkeep: 1500, rep: 0 },
};
const PARTNER = { share: 0.6, commission: 0.2 }; // part des clients refusés qui acceptent le trajet, commission de la gare
const ROOMS = [['Une Chambre Simple', 350], ['Une Chambre Double', 600], ['Une Suite', 1500]];
// Distributeurs : demande par visiteur, prix de vente, coût d'achat, contenance d'un distributeur
const PRODUCTS = {
  coffee: { icon: '☕', name: 'Cafés', rate: 0.22, price: 3, cost: 1, cap: 320, color: '#8d5a3b' },
  meal: { icon: '🥪', name: 'Repas', rate: 0.1, price: 9, cost: 4, cap: 170, color: '#e67e22' },
  goodies: { icon: '🎁', name: 'Souvenirs', rate: 0.04, price: 18, cost: 8, cap: 80, color: '#8e44ad' },
};
const VENDING_PRICE = 8000, VENDING_MAX = 4, VENDING_UPKEEP = 100;
// Commerces loués : part des visiteurs qui achètent, recette pour la gare par achat, bonus d'appréciation
const SHOPS = {
  news: { icon: '📰', name: 'Marchand de journaux', label: 'PRESSE', rate: 0.1, spend: 4, rep: 0.1, color: '#2f6fd6', req: 1, cost: 43750 },
  bakery: { icon: '🥐', name: 'Boulangerie', label: 'BOULANGERIE', rate: 0.12, spend: 8, rep: 0.2, color: '#c98b3a', req: 3, cost: 75000 },
  books: { icon: '📚', name: 'Librairie', label: 'LIBRAIRIE', rate: 0.03, spend: 25, rep: 0.15, color: '#8e44ad', req: 4, cost: 87500 },
  market: { icon: '🛒', color: '#27ae60', req: [5, 6, 7], cost: [110000, 180000, 280000], levels: [
    { name: 'Épicerie', label: 'ÉPICERIE', rate: 0.05, spend: 22, rep: 0.1 },
    { name: 'Supérette', label: 'SUPÉRETTE', rate: 0.06, spend: 30, rep: 0.15 },
    { name: 'Supermarché', label: 'SUPERMARCHÉ', rate: 0.07, spend: 40, rep: 0.25 },
  ] },
  wc: { icon: '🚻', name: 'Sanitaires', label: 'TOILETTES', rate: 0, spend: 0, rep: 0.3, color: '#7f8c8d', req: 2, cost: 37500 },
};
const SHOP_UPKEEP = 600;
const MARKET_MEAL_CUT = 0.05; // par niveau, les repas se prennent à la supérette plutôt qu'aux distributeurs
// caractéristiques d'un commerce à son niveau l (1 = premier niveau)
const shopAt = (k, l = S.shops[k]) => ({ ...SHOPS[k], ...SHOPS[k].levels?.[Math.max(l, 1) - 1] });
const TRAIN_HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // de 5 h à 23 h

// Répartition douce de la journée : légers pics matin et soir, normalisée sur le nombre de trains
const SHAPE = (() => {
  const raw = Object.fromEntries(TRAIN_HOURS.map((h) => [h, 1 + 0.3 * Math.exp(-((h - 8) ** 2) / 2) + 0.3 * Math.exp(-((h - 18) ** 2) / 2.5) - (h < 6 || h > 21 ? 0.25 : 0)]));
  const k = TRAIN_HOURS.length / sum(Object.values(raw));
  for (const h of TRAIN_HOURS) raw[h] *= k;
  return raw;
})();

const newDay = (rep = 3) => ({ passengers: 0, visitors: 0, rooms: 0, refused: 0, missed: 0, revenue: 0, commuters: 0, counter: { meal: 0, coffee: 0, goodies: 0 }, fraud: 0, caught: 0, fines: 0, partner: 0, works: 0, struck: false, challenges: [], demand: 0, served: 0, restock: 0, empty: {}, low: {}, bought: {}, goals: [], repStart: rep });
const DEBT_DAYS = 3; // jours de découvert tolérés avant la faillite
const S = {
  budget: 30000, day: 1, minutes: 4 * 60, // départ à 4 h : les voyageurs du premier train ont le temps d'arriver
  tarif: 50, roomTarif: 100, rep: 3, dirt: 10, lastSat: 0.9,
  stock: { coffee: 320, meal: 170, goodies: 80 }, vending: { coffee: 1, meal: 1, goodies: 1 }, autoRefill: true,
  shops: Object.fromEntries(Object.keys(SHOPS).map((k) => [k, 0])), hotelQueue: 0, checkinAcc: 0,
  waiting: 0, waitingCommuters: 0, waitingExtra: 0, track2: 0, challenge: 0, weekTarget: 60000, weekPax: 0, pendingBoard: 0, disembark: 0, boarding: 0,
  wagons: 4, hotel: 1, station: 1, platform: 1, phone: 0, shuttle: 0, cafe: 0, parking: 0, pub: 0, ad: 0,
  staff: { guichet: 3, entretien: 2, hotel: 2, cafe: 0, barista: 0, controleur: 0 }, waitroom: 0, benches: 0, shelters: 0, canopy: 0, v: 2, comfort: 0, barCar: 0, category: 1,
  svc: Object.fromEntries(Object.keys(SERVICES).map((k) => [k, 0])), machines: { kiosk: 0, robot: 0, checkin: 0 },
  plan: null, today: newDay(), report: null, lastNet: 0, score: 0, history: [], lastMiss: 0, lastExposure: 0, lastFraud: 0, lastDelay: 0, broken: {}, strike: 0, debtDays: 0, night: false, builds: [], works: null, minor: null, worksOffer: null, nextWorks: null, event: null, goal: 0, speed: 1, over: false,
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
const cafeteriaCap = () => (S.svc.cafeteria && !minorOn('cafeteria') ? S.staff.cafe * MEALS_PER_WAITER : 0);
// Fraude (à partir de l'objectif 3) : plus le billet est cher, plus de voyageurs montent sans payer.
// Les contrôleurs en dissuadent une partie et verbalisent ceux qu'ils prennent.
const FRAUD_GOAL = 3, CONTROL_PAX = 600, FINE = 50, DETERRENCE = 0.7, JUMP_SHARE = 0.4;
const controlCoverage = (n = S.staff.controleur, plan = S.plan) => Math.min(1, (n * CONTROL_PAX) / Math.max(1, plan.classic));
const fraudRate = (n = S.staff.controleur, plan = S.plan) => (S.goal >= FRAUD_GOAL
  ? (0.02 + 0.1 * (S.tarif / 100)) * (1 - DETERRENCE * controlCoverage(n, plan)) : 0);
const cafeCap = () => (S.cafe && !minorOn('cafe') ? Math.min(CAFE_CAPS[S.cafe], CAFE_CAPS[1] + S.staff.barista * BARISTA_CUPS) : 0);
const COMFORT = ['Sièges confortables', 'Climatisation', 'Prises et Wi-Fi à bord'];
const BAR = { rate: 0.15, spend: 7, share: 0.85, upkeep: 1200 }; // voiture-bar : achats à bord, moins de demande aux distributeurs
// extension des abris (id 'canopy') : sur tout le quai niveau 2, puis sur tout le grand quai
const CANOPY_SEATS = [0, 120, 250];
// modules d'abris de l'extension, à gauche des trois abris, au même pas qu'eux
const extensionX = () => {
  const start = S.canopy >= 2 ? platX() + 10 : PLATFORM_X[2] + 10, xs = [];
  if (S.canopy) for (let x = SHELTER_X[2] - 140; x >= start; x -= 140) xs.push(x);
  return xs;
};
// voyageurs à l'abri : abris, extension et salle d'attente
const shelterCap = () => (minorOn('shelter') ? 0 : S.shelters * SHELTER_SEATS) + CANOPY_SEATS[S.canopy] + waitroomSeats();
const weather = () => WEATHERS[S.plan.weather];
const screensMult = () => (S.svc.screens ? 1.25 : 1);
// en cas de grève (S.strike = minute de fin), les guichetiers vendent deux fois moins : les bornes tournent normalement
const STRIKE_HOURS = 3;
const striking = () => S.strike > S.minutes;
const WELCOME_TICKETS = 20; // billets vendus sur tablette par les agents d'accueil, à chaque train
const welcomeTickets = () => (S.svc.welcome ? WELCOME_TICKETS : 0);
const ticketCap = () => Math.round((S.staff.guichet * TICKETS_PER_AGENT * (striking() ? 0.5 : 1) + (minorOn('kiosk') ? 0 : S.machines.kiosk) * KIOSK_TICKETS + welcomeTickets()) * screensMult());
const cleanRate = () => S.staff.entretien * STAFF_CLEAN + S.machines.robot * ROBOT_CLEAN;
const worksOn = (k) => S.works?.kind === k;
// petit chantier de quelques heures (S.minor, tiré chaque nuit) : l'équipement est fermé entre `from` et `until`
const minorNow = () => (S.minor && S.minutes >= S.minor.from && S.minutes < S.minor.until ? S.minor : null);
const minorOn = (k) => minorNow()?.kind === k;
const hotelRooms = () => (S.hotel - (worksOn('hotel') ? 1 : 0)) * ROOMS_PER_FLOOR; // un étage fermé pendant sa rénovation
// chômage technique : salaire payé, production déjà nulle via les capacités ci-dessus
const idleStaff = () => ({
  cafe: minorOn('cafeteria') ? S.staff.cafe : 0,
  barista: minorOn('cafe') ? S.staff.barista : 0,
  hotel: worksOn('hotel') ? Math.round(S.staff.hotel / S.hotel) : 0,
  guichet: striking() ? Math.floor(S.staff.guichet / 2) : 0,
});
const waitroomSeats = () => (worksOn('waitroom') || minorOn('waitroom') ? 0 : WAITROOM[S.waitroom]);
const roomCap = () => Math.min(hotelRooms(), S.staff.hotel * ROOMS_PER_STAFF + (minorOn('checkin') ? 0 : S.machines.checkin) * CHECKIN_ROOMS);
const seatsPerTrain = () => Math.round(S.wagons * SEATS_PER_WAGON * SEAT_SHARE);
// quai (un quart fermé pendant sa réfection) + salle d'attente
const platformCap = () => Math.round(PLATFORM_MAX[S.platform] * (worksOn('platform') ? 0.75 : 1)) + waitroomSeats();
const capPerTrain = () => Math.min(platformCap(), seatsPerTrain());
const ticketPrice = () => S.tarif * PRICE_PER_POINT;

// Objectifs : chacun débloque de nouvelles améliorations (S.goal = nombre d'objectifs atteints)
const GOALS = [
  { text: 'Transporter 2 500 voyageurs en une journée', value: () => S.today.passengers, target: 2500, unlocks: 'Wagons · Agrandir le quai · Marchand de journaux · Agent de sécurité' },
  { text: 'Accueillir 10 clients à l\'hôtel en une journée', value: () => S.today.rooms, target: 10, unlocks: 'Étages d\'hôtel · Bornes de check-in · Sanitaires · Écrans d\'information · Salle d\'attente · Atelier de maintenance · Accueil voyageurs' },
  { text: 'Atteindre une appréciation de 3,6 ★', value: () => S.rep, target: 3.6, unlocks: 'Bornes de billets · Boulangerie · Cafétéria · Consigne à bagages · Gare nationale' },
  { text: 'Transporter 3 750 voyageurs en une journée', value: () => S.today.passengers, target: 3750, unlocks: 'Boutique · Autolaveuses · Grand quai · Wagons 7 et 8 · Librairie · Point relais colis · Car de substitution' },
  { text: `Faire ${money(190000)} de bénéfice en une journée`, value: () => S.lastNet, target: 190000, money: true, unlocks: 'Navette · Café du quai · Épicerie · Grande salle d\'attente · Salle d\'attente climatisée' },
  { text: 'Accueillir 36 clients à l\'hôtel en une journée', value: () => S.today.rooms, target: 36, unlocks: 'Parking · Dernier étage d\'hôtel · Spa · Salon 1re classe · Supérette · Gare grande vitesse' },
  { text: 'Transporter 6 250 voyageurs en une journée', value: () => S.today.passengers, target: 6250, unlocks: 'Tour de l\'horloge · Panneau publicitaire · Supermarché · Publicité (journal, radio, télévision)' },
  { text: 'Atteindre une appréciation de 4,5 ★', value: () => S.rep, target: 4.5, unlocks: 'Le titre de Légende du rail' },
];

// req[niveau] = nombre d'objectifs à atteindre pour acheter ce niveau
const UPGRADES = [
  { id: 'category', icon: '🚄', name: 'Catégorie de la gare', level: () => S.category - 1, max: 2, req: [3, 6],
    cost: (l) => [187500, 500000][l], buy: () => S.category++,
    pre: () => S.platform >= S.category + 1, preText: () => (S.category === 1 ? 'Quai niveau 2 requis' : 'Grand quai requis'),
    desc: () => (S.category === 1
      ? `Gare nationale : un Intercités toutes les deux heures (billet ×1,6, +30 % de places), clientèle +15 % · redevance ${money(8000)} / jour`
      : `Gare grande vitesse : TGV à 7 h, 9 h, 17 h et 19 h (billet ×2,5, +60 % de places, 4 ★ conseillées), clientèle +25 % · redevance ${money(20000)} / jour`) },
  { id: 'comfort', icon: '🛋️', name: 'Rénovation des wagons', desc: () => `${COMFORT[Math.min(2, S.comfort)]} : appréciation +0,1, clientèle +5 %`
      + (S.comfort === 1 ? ', moins de gêne par forte chaleur' : ''),
    level: () => S.comfort, max: 3, req: [1, 3, 5], cost: (l) => [50000, 100000, 175000][l], buy: () => S.comfort++ },
  { id: 'barCar', icon: '🍷', name: 'Voiture-bar', desc: () => `Ventes à bord, 15 % de demande en moins aux distributeurs · ${money(BAR.upkeep)} / jour`,
    level: () => S.barCar, max: 1, req: [4], cost: () => 87500, buy: () => S.barCar++ },
  { id: 'wagon', icon: '🚃', name: 'Wagon', desc: () => `+${Math.round(SEATS_PER_WAGON * SEAT_SHARE)} places par train`, level: () => S.wagons - 4, max: 4, req: [1, 1, 4, 4], cost: (l) => 62500 * (l + 1), buy: () => S.wagons++ },
  { id: 'quai', icon: '🛤️', name: 'Agrandir le quai', desc: () => `${PLATFORM_MAX[Math.min(3, S.platform + 1)]} voyageurs par train`, level: () => S.platform - 1, max: 2, req: [1, 4], cost: (l) => [75000, 187500][l], buy: () => S.platform++ },
  { id: 'hotel', icon: '🏨', name: 'Étage d\'hôtel', desc: () => `+${ROOMS_PER_FLOOR} chambres`, level: () => S.hotel - 1, max: 3, req: [2, 2, 6], cost: (l) => 100000 * (l + 1), buy: () => S.hotel++ },
  { id: 'checkin', icon: '🛎️', name: 'Borne de check-in', desc: () => `+${CHECKIN_ROOMS} chambres par jour, sans salaire`, level: () => S.machines.checkin, max: 3, req: [2], cost: () => 56250, buy: () => S.machines.checkin++ },
  { id: 'kiosk', icon: '🎫', name: 'Borne de billets', desc: () => `+${KIOSK_TICKETS} billets par train, sans salaire`, level: () => S.machines.kiosk, max: 4, req: [3], cost: () => 50000, buy: () => S.machines.kiosk++ },
  { id: 'phone', icon: '☎️', name: 'Ligne téléphonique', desc: () => 'Réservations : +10 % de clientèle', level: () => S.phone, max: 1, req: [0], cost: () => 50000, buy: () => S.phone++ },
  { id: 'gare', icon: '🏛️', name: 'Agrandir la gare', desc: () => (S.station === 1 ? 'Boutique' : 'Tour de l\'horloge') + ' : ventes +40 %, clientèle +10 %', level: () => S.station - 1, max: 2, req: [4, 7], cost: (l) => [112500, 250000][l], buy: () => S.station++ },
  { id: 'robot', icon: '🧽', name: 'Autolaveuse', desc: () => 'Conduite par un agent d\'entretien, elle nettoie comme 2 agents', level: () => S.machines.robot, max: 3, req: [4], cost: () => 62500, buy: () => S.machines.robot++ },
  { id: 'shuttle', icon: '🚌', name: 'Navette', desc: () => '+15 % de clientèle', level: () => S.shuttle, max: 1, req: [5], cost: () => 112500, buy: () => S.shuttle++ },
  { id: 'cafe', icon: '☕', name: 'Café du quai', level: () => S.cafe, max: 3, req: [5, 6, 7], cost: (l) => [87500, 62500, 112500][l], buy: () => S.cafe++,
    desc: () => [`Sert ${CAFE_CAPS[1]} cafés par jour avant les distributeurs, sans personnel, appréciation +0,4`,
      `Terrasse : jusqu'à ${fmt(CAFE_CAPS[2])} cafés et viennoiseries par jour à ${money(6)}, avec des baristas, appréciation +0,1`,
      `Grand café : jusqu'à ${fmt(CAFE_CAPS[3])} cafés par jour, avec des baristas, appréciation +0,1`][Math.min(2, S.cafe)],
    pre: () => (S.cafe < 2 ? S.platform >= 2 : S.station >= 2), preText: () => (S.cafe < 2 ? 'Quai niveau 2 requis' : 'Boutique requise') },
  { id: 'parking', icon: '🅿️', name: 'Parking', desc: () => '+20 % de clientèle', level: () => S.parking, max: 1, req: [6], cost: () => 150000, buy: () => S.parking++ },
  { id: 'pub', icon: '📢', name: 'Panneau publicitaire', desc: () => `+${money(PUB_INCOME)} par jour`, level: () => S.pub, max: 1, req: [7], cost: () => 75000, buy: () => S.pub++ },
  { id: 'benches', icon: '🪑', name: 'Bancs sur le quai', desc: () => 'Appréciation +0,05 par niveau, +0,05 de plus sous un abri',
    level: () => S.benches, max: 3, req: [0], cost: (l) => 10000 * (l + 1), buy: () => S.benches++,
    pre: () => !S.benches || S.platform >= 2, preText: () => 'Quai niveau 2 requis' }, // il faut de la place sur le quai
  { id: 'track2', icon: '🚉', name: 'Seconde voie',
    desc: () => (S.track2 ? `Renfort à chaque demi-heure libre (14 trains de plus en semaine, 18 le week-end) · ${money(TRACK2_UPKEEP[2])} / jour`
      : `4 trains de renfort par jour à h:30 aux heures de pointe · ${money(TRACK2_UPKEEP[1])} / jour`),
    level: () => S.track2, max: 2, req: [8, 8], cost: (l) => [375000, 500000][l], buy: () => S.track2++ },
  { id: 'canopy', icon: '⛱️', name: 'Extension des abris',
    desc: () => (S.canopy ? `Abris sur tout le grand quai : ${CANOPY_SEATS[2]} voyageurs à l'abri au total · ${money(400)} / jour`
      : `Abris sur tout le quai niveau 2 : ${CANOPY_SEATS[1]} voyageurs de plus à l'abri · ${money(200)} / jour`),
    level: () => S.canopy, max: 2, req: [2, 4], cost: (l) => [75000, 100000][l], buy: () => S.canopy++,
    pre: () => S.platform >= S.canopy + 2 && S.shelters >= S.canopy + 2,
    preText: () => (S.platform < S.canopy + 2 ? (S.canopy ? 'Grand quai requis' : 'Quai niveau 2 requis') : `${S.canopy + 2} abris requis`) },
  { id: 'shelters', icon: '⛱️', name: 'Abri voyageurs', desc: () => `Abrite ${SHELTER_SEATS} voyageurs de la pluie, de la neige et du soleil ; avec un banc dessous, appréciation +0,05`,
    level: () => S.shelters, max: 3, req: [1], cost: (l) => 31250 * (l + 1), buy: () => S.shelters++,
    pre: () => !S.shelters || S.platform > S.shelters, preText: () => (S.shelters === 1 ? 'Quai niveau 2 requis' : 'Grand quai requis') },
  { id: 'waitroom', icon: '🚪', name: 'Salle d\'attente', desc: () => `+${WAITROOM[Math.min(2, S.waitroom + 1)]} voyageurs par train, appréciation +0,1`,
    level: () => S.waitroom, max: 2, req: [2, 5], cost: (l) => [87500, 175000][l], buy: () => S.waitroom++ },
  ...ADS.map((a, i) => ({
    id: 'ad' + i, ad: true, icon: a.icon, name: `Publicité : ${a.name}`, desc: () => `Clientèle +${Math.round(a.boost * 100)} % demain seulement · un achat par jour`,
    level: () => (S.ad === i + 1 ? 1 : 0), max: 1, req: [7], cost: () => a.cost, buy: () => { S.ad = i + 1; },
    pre: () => !S.ad, preText: () => 'Une campagne à la fois', tag: '📣 Campagne lancée',
  })),
  ...Object.entries(SERVICES).map(([k, v]) => ({
    id: k, icon: v.icon, name: v.name, level: () => S.svc[k], max: 1, req: [v.req], cost: () => v.cost, buy: () => S.svc[k]++, pre: v.pre, preText: v.preText,
    desc: () => `${v.desc} · ${money(v.upkeep)} / jour`,
  })),
  ...Object.entries(SHOPS).map(([k, sh]) => {
    const max = sh.levels?.length ?? 1, next = () => shopAt(k, Math.min(S.shops[k] + 1, max));
    return {
      id: k, icon: sh.icon, get name() { return next().name; }, level: () => S.shops[k], max, req: [].concat(sh.req), cost: (l) => [].concat(sh.cost)[l], buy: () => S.shops[k]++,
      desc: () => (next().rate ? `Loyer sur les ventes · appréciation +${String(next().rep).replace('.', ',')}${k === 'market' ? ' · moins de repas aux distributeurs' : ''}`
        : 'Appréciation +0,3 · quai moins sale'),
    };
  }),
];
const upReq = (u) => u.req[Math.min(u.level(), u.req.length - 1)];
// achats uniquement en fin de journée, une amélioration de chaque type par soir
const upState = (u) => (u.level() >= u.max ? 'max' : S.goal < upReq(u) ? 'locked' : u.pre && !u.pre() ? 'pre' : buildOf(u.id) ? 'building' : !S.night ? 'day' : S.today.bought[u.id] ? 'today'
  : S.budget < u.cost(u.level()) ? 'poor' : 'ok');

// Chantiers : un achat est payé tout de suite mais livré après buildHours (S.builds = [{ id, until }], until en minutes absolues)
// Vrai chantier (délai selon le prix, barrières) pour ce qui se construit ; le reste (matériel, équipement, service) s'installe en 1 h
const SITES = ['category', 'quai', 'hotel', 'gare', 'cafe', 'shelters', 'canopy', 'waitroom', 'track2', 'parking', 'cafeteria', 'relay', ...Object.keys(SHOPS)];
const isSite = (id) => SITES.includes(id);
const buildHours = (cost, id) => (isSite(id) ? Math.max(2, Math.round(cost / 8000)) : 1);
const buildWord = (id) => (isSite(id) ? 'chantier' : 'installation');
const absMinute = () => S.day * 1440 + S.minutes;
const buildOf = (id) => S.builds.find((b) => b.id === id);
const buildEnd = (b) => `jour ${Math.floor(b.until / 1440)} à ${Math.floor((b.until % 1440) / 60)} h`;
function buyUpgrade(u) {
  S.budget -= u.cost(u.level());
  S.today.bought[u.id] = true;
  if (u.ad) { u.buy(); return; } // une campagne est instantanée
  S.builds.push({ id: u.id, until: absMinute() + buildHours(u.cost(u.level()), u.id) * 60 });
}
function finishBuilds() {
  const done = S.builds.filter((b) => b.until <= absMinute());
  if (!done.length) return;
  S.builds = S.builds.filter((b) => !done.includes(b));
  for (const b of done) {
    const u = UPGRADES.find((x) => x.id === b.id), name = u.name; // avant : nom du niveau livré (supérette)
    u.buy();
    toast(`${u.icon} ${name} : ${buildWord(b.id)} terminé${isSite(b.id) ? '' : 'e'} !`, 'good');
  }
  resetNeed();
  rebuild();
  play('upgrade');
}

const EVENTS = [
  { msg: '🚍 Un car de touristes arrive sur le quai !', kind: 'good', run: () => { S.waiting += 40 + rand(40); } },
  { msg: '🎤 Congrès en ville : l\'hôtel est très demandé', kind: 'good', rooms: 2.5 },
  { msg: `⚡ Panne de courant : réparation ${money(8000)}`, kind: 'bad', run: () => { S.budget -= 8000; } },
  { msg: '📰 Un journal vante la gare Aligato !', kind: 'good', run: () => { S.rep = Math.min(5, S.rep + 0.3); } },
  { msg: '🔨 Des vandales rôdent autour de la gare…', run: () => {
    if (S.svc.security) toast('👮 L\'agent de sécurité a fait fuir les vandales', 'good', null, 'good');
    else { S.budget -= VANDAL_COST; S.dirt = Math.min(100, S.dirt + 20); toast(`Vandalisme : ${money(VANDAL_COST)} de dégâts`, 'bad', 'upgrades', 'bad'); }
  } },
  { msg: `✊ Grève des guichetiers pendant ${STRIKE_HOURS} heures : ils vendent deux fois moins de billets, les bornes fonctionnent`, kind: 'bad', run: () => { S.strike = S.minutes + STRIKE_HOURS * 60; S.today.struck = true; } },
  { msg: '🔍 Inspection sanitaire…', run: () => {
    if (S.dirt > 50) { S.budget -= 25000; S.rep -= 0.4; toast(`Quai sale : amende de ${money(25000)}`, 'bad', null, 'bad'); }
    else toast('Quai impeccable : félicitations de l\'inspecteur', 'good', null, 'good');
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
const hasExtra = (h) => (S.plan?.extras?.[h] ?? 0) > 0;

// ---------- Modèle de fréquentation ----------
const marketBonus = () => 1 + 0.05 * S.comfort + 0.1 * S.phone + 0.15 * S.shuttle + 0.2 * S.parking + 0.1 * (S.station - 1);
// Clientèle potentielle : plus le prix est bas et la gare appréciée, plus il y a de monde
const potential = () => MARKET * (1.6 - (S.tarif / 100) * 1.2) * (0.5 + (S.rep / 5) * 0.7) * marketBonus() * CATEGORIES[S.category].market;

// Plan de la journée, fixé à minuit : nombre de voyageurs par train, limité par la capacité de la gare
// Le week-end attire plus de voyageurs de loisir ; en semaine, des express transportent les travailleurs
// jour du plan « de demain » vu depuis une fenêtre : le soir (ou avant le premier jour) le plan en cours est déjà celui de demain
const planDay = () => (S.night ? S.plan.day : S.day + 1);
function makePlan(noise = true, day = S.day, weather = null) {
  const weekend = weekday(day) >= 5, wx = noise ? weather ?? rollWeather(day) : 'sun', season = seasonOf(day);
  const pot = potential() * (weekend ? 1.15 : 1) * WEATHERS[wx].demand * season.demand * (1 + (ADS[S.ad - 1]?.boost ?? 0)), trains = {}, commuters = {}, types = {}, caps = {};
  const jitter = () => (noise ? 0.95 + Math.random() * 0.1 : 1);
  // les grands trains attirent une plus grande part des voyageurs ; le TGV boude une gare sous 4 ★
  const weight = (h) => SHAPE[h] * TRAIN_TYPES[types[h]].seats * (types[h] === 'tgv' && S.rep < 4 ? 0.6 : 1);
  for (const h of TRAIN_HOURS) {
    types[h] = typeForHour(h);
    caps[h] = Math.min(platformCap(), Math.round(seatsPerTrain() * TRAIN_TYPES[types[h]].seats));
  }
  // seconde voie : trains de renfort à h:30 aux heures de pointe (en semaine, aux heures sans express),
  // puis à chaque demi-heure libre de 5 h 30 à 22 h 30 au niveau 2
  const extraHours = S.track2 >= 2 ? TRAIN_HOURS.filter((h) => h < 23 && (weekend || !SPECIAL_HOURS.includes(h)))
    : S.track2 ? (weekend ? [7, 8, 17, 18] : [8, 9, 16, 19]) : [];
  const extras = {}, extraCap = Math.min(platformCap(), seatsPerTrain());
  const totalWeight = sum(TRAIN_HOURS.map(weight)) + sum(extraHours.map((h) => SHAPE[h]));
  for (const h of TRAIN_HOURS) trains[h] = Math.round(Math.min(caps[h], ((pot * weight(h)) / totalWeight) * jitter()));
  for (const h of extraHours) extras[h] = Math.round(Math.min(extraCap, ((pot * SHAPE[h]) / totalWeight) * jitter()));
  // l'express part à h:30, quand le quai accueille déjà la moitié des voyageurs du train suivant
  let commuterCap = 0;
  if (!weekend) for (const h of SPECIAL_HOURS) {
    const room = Math.max(0, platformCap() - Math.round((trains[h + 1] ?? 0) / 2));
    commuters[h] = Math.round(Math.min(room, EXPRESS_SEATS, commuterBase() * season.commuters * jitter()));
    commuterCap += Math.min(room, EXPRESS_SEATS);
  }
  const per = Object.values(trains), classic = sum(per) + sum(Object.values(extras)), commuterTotal = sum(Object.values(commuters));
  const classicCap = sum(Object.values(caps)) + extraHours.length * extraCap; // sans les express : seuls les trains classiques saturent
  return { day, weekend, weather: wx, rooms: season.rooms, potential: pot, capacity: classicCap + commuterCap, classicCap,
    trains, types, extras, commuters, classic, commuterTotal,
    total: classic + commuterTotal, peak: Math.max(...per) };
}

// Prix des chambres (en %) qui maximise le résultat prévu du lendemain (par pas de 10 %)
function bestRoomTarif() {
  const keep = S.roomTarif;
  let best = keep, bestNet = -Infinity;
  for (let t = 50; t <= 200; t += 10) {
    S.roomTarif = t;
    const e = expect(makePlan(false, planDay()));
    if (e.revenue - e.costs > bestNet) { bestNet = e.revenue - e.costs; best = t; }
  }
  S.roomTarif = keep;
  return best;
}

// Tarif qui maximise le résultat prévu du lendemain (par pas de 5 points)
function bestTarif() {
  const keep = S.tarif;
  let best = keep, bestNet = -Infinity;
  for (let t = 5; t <= 100; t += 5) {
    S.tarif = t;
    const e = expect(makePlan(false, planDay()));
    if (e.revenue - e.costs > bestNet) { bestNet = e.revenue - e.costs; best = t; }
  }
  S.tarif = keep;
  return best;
}

const satisfaction = () => (S.today.demand > 20 ? S.today.served / S.today.demand : S.lastSat);
// Prix des chambres en % du tarif de base : plus cher, moins de clients (130 % environ est le plus rentable quand il reste de la place)
const roomMult = () => S.roomTarif / 100;
const roomRate = () => 0.007 * (0.5 + satisfaction()) * (0.4 + S.rep / 5) * Math.max(0, 1.6 - 0.6 * roomMult());
const stockCap = (k) => S.vending[k] * PRODUCTS[k].cap;
const productRate = (k) => PRODUCTS[k].rate * (WEATHERS[S.plan?.weather]?.misc ?? 1) * (k === 'meal' ? 1 - MARKET_MEAL_CUT * S.shops.market : 1);
// Comptoirs servis avant les distributeurs : la cafétéria pour les repas, le café du quai pour les cafés,
// la boutique de la gare pour les souvenirs
// part des clients qui préfèrent les distributeurs (plus rapides, moins chers) ; chacun se rabat sur l'autre s'il est plein ou vide
const VENDING_PREF = { meal: 0.35, coffee: 0.35 };
const COUNTERS = {
  meal: { name: 'la cafétéria', owned: () => S.svc.cafeteria, cap: () => cafeteriaCap(), price: () => CAFETERIA_PRICE, cost: () => CAFETERIA_COST },
  coffee: { name: 'le café du quai', owned: () => S.cafe, cap: cafeCap, price: cafePrice, cost: cafeCost },
  goodies: { name: 'la boutique', owned: () => S.station >= 2, cap: () => BOUTIQUE_GOODIES, price: () => PRODUCTS.goodies.price, cost: () => PRODUCTS.goodies.cost },
};
const shopMult = () => 1 + 0.4 * (S.station - 1); // la boutique et la tour attirent les flâneurs
const shopOpen = (k) => S.shops[k] && !worksOn(k); // les sanitaires ferment pendant leur rénovation
const shopRep = () => sum(Object.keys(SHOPS).map((k) => (shopOpen(k) ? shopAt(k).rep : 0)));
const dirtFactor = () => (shopOpen('wc') ? 0.7 : 1);
function refill(k) {
  const n = stockCap(k) - S.stock[k];
  S.stock[k] += n;
  S.today.restock += n * PRODUCTS[k].cost; // payé à minuit
}
const roomPrice = () => { // prix moyen d'une chambre selon la répartition de sell()
  const k = 1 + S.hotel * 0.15;
  return ((0.55 * ROOMS[0][1] + 0.4 * ROOMS[1][1] + (k - 0.95) * ROOMS[2][1]) / k) * roomMult();
};

function dailyCosts(rooms, restock) {
  return [
    ['Électricité', 4000 + 2500 * S.station + 2000 * S.hotel + 1000 * S.platform + 400 * S.wagons + (S.cafe ? 1000 + 500 * S.cafe : 0) + SHOP_UPKEEP * sum(Object.values(S.shops))],
    ['Réapprovisionnement', Math.round(restock)],
    ['Blanchisserie', Math.round(rooms * 60)],
    ['Salaires', sum(Object.entries(STAFF).map(([k, r]) => S.staff[k] * r.salary))],
    ['Redevance réseau', CATEGORIES[S.category].fee],
    ['Services', sum(Object.entries(SERVICES).map(([k, v]) => S.svc[k] * v.upkeep)) + 800 * S.waitroom + 200 * S.canopy + TRACK2_UPKEEP[S.track2] + BAR.upkeep * S.barCar + (S.svc.bus && S.today.struck ? 2 * SERVICES.bus.upkeep : 0)],
    ['Entretien machines', sum(Object.entries(MACHINE_UPKEEP).map(([k, v]) => S.machines[k] * v)) + VENDING_UPKEEP * sum(Object.values(S.vending))],
  ];
}

// Valeurs moyennes attendues pour un plan donné, et effectif nécessaire pour le servir
function expect(plan) {
  const prof = plan.weekend ? PROFILES.weekend : PROFILES.classic, cp = PROFILES.commuter;
  const dis = plan.classic * 0.6, commuters = plan.commuterTotal, cVis = commuters * 2;
  const extraTrains = Object.values(plan.extras ?? {});
  const boarded = sum([...Object.values(plan.trains), ...extraTrains].map((d) => Math.min(d, ticketCap())));
  const roomDemand = dis * roomRate() * prof.rooms * (plan.rooms ?? 1);
  const rooms = Math.min(roomDemand, roomCap());
  // hôtel partenaire : une partie des clients refusés accepte le trajet jusqu'en ville, la gare touche une commission
  const partner = S.svc.partner ? Math.max(0, roomDemand - hotelRooms()) * PARTNER.share : 0;
  const visitors = boarded + dis;
  let products = 0, restock = 0;
  const demandBy = {}, counterBy = {}, stockShort = [];
  let cafeteriaDemand = 0, coffeeDemand = 0;
  for (const [k, p] of Object.entries(PRODUCTS)) {
    const d = (demandBy[k] = (visitors * prof[k] * barShare(k) + cVis * cp[k]) * productRate(k));
    const c = COUNTERS[k], pref = d * (VENDING_PREF[k] ?? 0);
    let toVending = d;
    if (c?.owned()) { // même répartition que sell() : comptoir pour la plupart, distributeurs pour les autres, repli de chaque côté
      const diners = k === 'meal' ? rooms * 0.8 : 0, want = diners + d - pref;
      if (k === 'meal') cafeteriaDemand = want;
      if (k === 'coffee') coffeeDemand = want;
      let served = Math.min(want, c.cap());
      toVending = pref + Math.max(0, d - pref - Math.max(0, served - diners));
      served += Math.min(Math.max(0, toVending - stockCap(k)), c.cap() - served);
      counterBy[k] = served;
      products += served * c.price();
      restock += served * c.cost();
    }
    const sold = Math.min(toVending, stockCap(k));
    if (toVending > stockCap(k)) stockShort.push(k);
    products += sold * p.price;
    restock += sold * p.cost;
  }
  const extras = (S.svc.lockers ? visitors * LOCKER[0] * prof.lockers * LOCKER[1] : 0) + (S.svc.relay ? cVis * RELAY[0] * RELAY[1] : 0);
  const shops = shopMult() * sum(Object.keys(SHOPS).map((k) => { const sh = shopAt(k); return (S.shops[k] ? 1 : 0) * sh.rate * sh.spend
    * (visitors * (prof.shops[k] ?? 1) + cVis * (cp.shops[k] ?? 1)); }));
  const bar = S.barCar ? boarded * BAR.rate * BAR.spend : 0;
  // recette des billets, pondérée par le type de chaque train (Intercités, TGV plus chers)
  // les fraudeurs ne paient pas leur billet ; ceux que les contrôleurs prennent paient l'amende
  const fareIncome = (n) => {
    const f = fraudRate(n, plan);
    const paid = sum(TRAIN_HOURS.map((h) => Math.min(plan.trains[h] * (1 - f), ticketCap()) * TRAIN_TYPES[plan.types[h]].price))
      + sum(extraTrains.map((d) => Math.min(d * (1 - f), ticketCap()))); // renforts : régionaux
    return paid * (1 + loungeShare()) * ticketPrice() + f * controlCoverage(n, plan) * plan.classic * FINE;
  };
  // effectif de contrôleurs le plus rentable (recettes sauvées et amendes moins les salaires)
  let controllers = 0;
  if (S.goal >= FRAUD_GOAL) {
    const gain = (n) => fareIncome(n) - n * STAFF.controleur.salary;
    for (let n = 1; n <= 10; n++) if (gain(n) > gain(controllers)) controllers = n;
  }
  const revenue = fareIncome(S.staff.controleur) + commuters * SUB_SHARE * ticketPrice() + (rooms + partner * PARTNER.commission) * roomPrice() * spaMult(plan.weekend)
    + bar + products + shops + extras + S.pub * PUB_INCOME;
  const costs = sum(dailyCosts(rooms, restock).map(([, v]) => v));
  return {
    revenue, costs, demandBy, counterBy, stockShort, roomDemand,
    need: capNeed({
      guichet: Math.max(STAFF.guichet.min(), Math.ceil((plan.peak / screensMult() - S.machines.kiosk * KIOSK_TICKETS - welcomeTickets()) / TICKETS_PER_AGENT)),
      // la saleté arrive avec les trains (19 heures sur 24) : il faut la retirer au même rythme, pas sur toute la journée
      entretien: Math.max(0, Math.ceil((((visitors + cVis) * dirtFactor()) / 35 / TRAIN_HOURS.length - S.machines.robot * ROBOT_CLEAN) / STAFF_CLEAN)),
      hotel: Math.max(0, Math.ceil((Math.min(roomDemand, hotelRooms()) - S.machines.checkin * CHECKIN_ROOMS) / ROOMS_PER_STAFF)),
      cafe: S.svc.cafeteria ? Math.ceil(cafeteriaDemand / MEALS_PER_WAITER) : 0,
      controleur: controllers,
      barista: S.cafe >= 2 ? Math.ceil(clamp(coffeeDemand - CAFE_CAPS[1], 0, CAFE_CAPS[S.cafe] - CAFE_CAPS[1]) / BARISTA_CUPS) : 0,
    }),
  };
}
// on ne conseille jamais plus que l'effectif maximal d'un métier
const capNeed = (need) => Object.fromEntries(Object.entries(need).map(([k, v]) => [k, Math.min(v, STAFF_MAX)]));

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
  if (hasSpecial(h) || hasExtra(h)) { // express des travailleurs ou train de renfort de la seconde voie
    const ex = hasSpecial(h), t = ex ? 'express' : 'regional';
    if (m >= 22 && m < 30) return ['arriving', (m - 22) / 8, ex, t];
    if (m >= 30 && m < 40) return ['stopped', (m - 30) / 10, ex, t];
    if (m >= 40 && m < 48) return ['leaving', (m - 40) / 8, ex, t];
  }
  return ['away', 0, false, 'regional'];
}

const peakFactor = (h) => Math.exp(-((h - 8) ** 2) / 2) + Math.exp(-((h - 18) ** 2) / 2.5) + (h >= 6 && h <= 22 ? 0.25 : 0.03);

function stepMinute() {
  S.minutes++;
  if (S.minutes >= 1440) { closeDay(); S.minutes = 0; S.day++; save(); }
  finishBuilds();
  if (S.minor && (S.minutes === S.minor.from || S.minutes === S.minor.until)) {
    const w = MINOR[S.minor.kind], on = S.minutes === S.minor.from;
    toast(`🚧 ${w.name} : ${on ? `fermé pour travaux jusqu'à ${S.minor.until / 60 | 0} h ${pad(S.minor.until % 60)}` : 'travaux terminés, réouverture'}`, on ? 'warn' : 'good');
  }
  const h = Math.floor(S.minutes / 60), m = S.minutes % 60;

  // les voyageurs du prochain train arrivent régulièrement pendant l'heure qui précède
  S.waiting += (S.plan.trains[m === 0 ? h : (h + 1) % 24] ?? 0) / 60;
  if (S.svc.piano && h >= 10 && h < 18 && S.waiting >= 2 && simT >= pianoUntil && Math.random() < 0.035) { pianoUntil = simT + 4 + Math.random() * 8; } // un voyageur qui attend se met au piano
  // les travailleurs arrivent dans les 20 minutes qui précèdent leur express
  if (hasSpecial(h) && m > 10 && m <= 30) S.waitingCommuters += S.plan.commuters[h] / 20;
  if (hasExtra(h) && m > 0 && m <= 30) S.waitingExtra += S.plan.extras[h] / 30;

  if (m % 20 === 0 && h >= 6 && h < 22) spawnShopWalkers();
  if (m % 15 === 0 && h >= 5 && h < 23) spawnStationExits();
  if (S.shuttle && m % 30 === 0 && h >= 6 && h <= 22) {
    cars.push({ kind: 'bus', len: 92, color: '#f5b82e', lane: 1, dir: 1, x: -100, speed: 110, stopAt: BUS_STOP_X, wait: 2.5 });
  }

  // la réception de l'hôtel enregistre les clients en file d'attente
  if (m % 10 === 0 && S.hotelQueue > 0) {
    S.checkinAcc += (S.staff.hotel * ROOMS_PER_STAFF + S.machines.checkin * CHECKIN_ROOMS) / 12 / 6;
    const n = Math.min(Math.floor(S.checkinAcc), S.hotelQueue);
    if (n) {
      let rev = 0;
      for (let i = 0; i < n; i++) {
        const r = Math.random() * (1 + S.hotel * 0.15);
        rev += ROOMS[r < 0.55 ? 0 : r < 0.95 ? 1 : 2][1] * roomMult() * spaMult(S.plan.weekend);
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
        toast(`⚠️ Un distributeur de ${PRODUCTS[k].name.toLowerCase()} est en panne : réparez-le`, 'bad', 'stocks', 'fault');
      }
    }
    if (!S.event && h >= 7 && h <= 20 && Math.random() < 0.05) {
      S.event = pick(EVENTS);
      toast(S.event.msg, S.event.kind, null, S.event.kind);
      S.event.run?.();
    }
    if (h === 6) play('rooster');
    if (h === 21) play('owl');
    if (hasTrain(h)) { play('jingle'); exchange(h); }
  }
  if (m === 30 && hasSpecial(h)) exchangeSpecial(h);
  if (m === 30 && hasExtra(h)) exchangeExtra(h);
  S.rep = clamp(S.rep, 0, 5);
}

function exchange(h) {
  S.disembark = Math.round((S.plan.trains[h] ?? 0) * (0.5 + Math.random() * 0.2));
  // incident : train en retard, une partie des voyageurs abandonne
  const delayed = Math.random() < (S.svc.workshop ? 0.01 : 0.04);
  const giveUp = delayed ? Math.round(S.waiting * (S.svc.welcome ? 0.05 : 0.15)) : 0; // les agents d'accueil rassurent
  const present = Math.round(S.waiting) - giveUp;
  S.lastDelay = giveUp / Math.max(1, present + giveUp);
  if (delayed) toast(`🕒 Train de ${pad(h)}:00 en retard : ${giveUp} voyageur(s) ${S.svc.bus ? 'prennent le car de substitution' : 'abandonnent'}`, 'bad', 'upgrades', 'delay');
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
  // car de substitution : pendant une grève, les voyageurs sans billet partent en car ; ceux qui abandonnent aussi
  const unserved = noTicket - jumpers - kept, strikeBus = S.svc.bus && striking() ? unserved : 0;
  const missed = unserved - strikeBus, viaBus = S.svc.bus ? giveUp + strikeBus : 0;
  S.waiting = kept;
  S.boarding = walkins + fraud;
  S.pendingBoard = walkins + fraud;

  // les clients du salon paient double ; les fraudeurs pris paient l'amende
  const tickets = (walkins + binom(walkins, loungeShare())) * ticketPrice() * type.price + caught * FINE + viaBus * ticketPrice() * BUS_PRICE;
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
  const severity = weather().severity * (S.plan.weather === 'heat' && (S.comfort >= 2 || S.svc.aircon) ? 0.5 : 1);
  const exposure = (severity * Math.max(0, present - shelterCap())) / Math.max(1, present);
  S.lastMiss = missed / Math.max(1, present);
  S.lastExposure = exposure;
  S.rep += (quality(S.lastMiss, exposure) - S.rep) * 0.06;
  floats.push({ text: '+' + money(tickets + extra), x: DOOR_X, y: 372, life: 2 });
  if (walkins) play('tickets');
  spawnWalkers(false, S.plan.types[h]);
  checkGoals();
}

// Train de renfort de la seconde voie : un régional de plus, sans incident ni fraude
function exchangeExtra(h) {
  play('jingle');
  const T = S.today, present = Math.round(S.waitingExtra), boarded = Math.min(present, seatsPerTrain(), ticketCap());
  S.waitingExtra = 0;
  S.boarding = boarded;
  S.pendingBoard = boarded;
  S.disembark = Math.round(S.plan.extras[h] * (0.5 + Math.random() * 0.2));
  const tickets = boarded * ticketPrice();
  S.budget += tickets;
  T.passengers += boarded;
  T.missed += present - boarded;
  T.visitors += boarded + S.disembark;
  S.dirt = Math.min(100, S.dirt + ((boarded + S.disembark) / 35) * dirtFactor());
  const extra = sell(S.plan.weekend ? PROFILES.weekend : PROFILES.classic, true);
  T.revenue += tickets + extra;
  floats.push({ text: '+' + money(tickets + extra), x: DOOR_X, y: 372, life: 2 });
  if (boarded) play('tickets');
  spawnWalkers(false, 'regional');
  checkGoals();
}

// Express des travailleurs : abonnés (pas de guichet), ils achètent mais ne dorment pas à l'hôtel
function exchangeSpecial(h) {
  play('jingle');
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
    const want = binom(visitors, productRate(k) * prof[k] * barShare(k, regular));
    // les clients qui préfèrent le comptoir y vont d'abord ; les autres, et ceux qui le trouvent plein, vont aux distributeurs
    const c1 = serveCounter(k, want - binom(want, VENDING_PREF[k] ?? 0));
    const d = want - c1;
    // un distributeur en panne ne vend plus sa part du stock
    const usable = S.broken[k] ? Math.floor((S.stock[k] * (S.vending[k] - 1)) / S.vending[k]) : S.stock[k];
    const sold = Math.min(d, usable);
    const c2 = serveCounter(k, d - sold); // distributeurs vides : repli sur le comptoir
    S.stock[k] -= sold;
    total += sold * p.price + (c1 + c2) * (COUNTERS[k]?.price() ?? 0);
    S.today.demand += want;
    S.today.served += c1 + sold + c2;
    if (!S.stock[k] && !S.today.empty[k]) {
      S.today.empty[k] = true;
      toast(`${p.icon} Distributeurs de ${p.name.toLowerCase()} vides : remplissez-les`, 'bad', 'stocks');
    } else if (S.stock[k] && S.stock[k] < stockCap(k) * 0.2 && !S.today.low[k]) {
      S.today.low[k] = true;
      toast(`${p.icon} Stock de ${p.name.toLowerCase()} bas : ${S.stock[k]} restants`, 'warn', 'stocks');
    }
  }
  for (const k of Object.keys(SHOPS)) if (S.shops[k]) total += binom(visitors, shopAt(k).rate * (prof.shops[k] ?? 1)) * shopAt(k).spend * shopMult();
  if (S.svc.lockers) total += binom(visitors, LOCKER[0] * prof.lockers) * LOCKER[1];
  if (S.svc.relay) total += binom(visitors, RELAY[0] * prof.relay) * RELAY[1];

  // les clients de l'hôtel rejoignent la file d'attente de la réception, s'il reste des chambres
  const wanted = binom(S.disembark, roomRate() * prof.rooms * (S.plan.rooms ?? 1) * (S.event?.rooms ?? 1));
  const accepted = clamp(hotelRooms() - S.today.rooms - S.hotelQueue, 0, wanted);
  S.hotelQueue += accepted;
  S.today.demand += wanted;
  if (wanted > accepted) {
    // hôtel partenaire : ceux qui acceptent le trajet sont servis (ils ne dînent pas à la gare)
    const sent = S.svc.partner ? binom(wanted - accepted, PARTNER.share) : 0;
    total += sent * roomPrice() * spaMult(S.plan.weekend) * PARTNER.commission;
    S.today.partner += sent;
    S.today.served += sent;
    if (wanted - accepted > sent) {
      if (!S.today.refused) toast('Hôtel complet : des clients sont refusés', 'bad', 'prices');
      S.today.refused += wanted - accepted - sent;
    }
  }
  S.budget += total;
  return total;
}

function closeDay() {
  S.night = true; // fin de journée : bilan consultable jusqu'à la fermeture de la fenêtre
  S.today.refused += S.hotelQueue; // les clients encore en attente repartent
  S.hotelQueue = 0;
  // les distributeurs encore en panne sont réparés la nuit, plus cher qu'en journée
  const repairs = Object.values(S.broken).filter(Boolean).length * 3000;
  S.broken = {};
  S.strike = 0;
  const works = S.today.works + (S.works?.cost ?? 0); // chantier du jour et travaux ponctuels acceptés
  const costs = [...dailyCosts(S.today.rooms, S.today.restock), ...(repairs ? [['Réparations de nuit', repairs]] : []),
    ...(works ? [['Travaux', Math.round(works)]] : [])];
  const total = sum(costs.map(([, v]) => v));
  const revenue = S.today.revenue + S.pub * PUB_INCOME;
  S.budget += S.pub * PUB_INCOME - total;
  S.lastNet = revenue - total;
  checkGoals();
  closeWeek();
  const T = S.today;
  S.report = { day: S.day, costs, total, revenue, passengers: T.passengers, planned: S.plan.total, rooms: T.rooms,
    commuters: T.commuters, missed: T.missed, fraud: T.fraud, caught: T.caught, fines: T.fines, refused: T.refused, partner: T.partner, challenges: T.challenges, goals: T.goals, repStart: T.repStart, repEnd: S.rep, sat: satisfaction() };
  S.report.points = dayPoints(S.report);
  S.score += S.report.points;
  S.report.record = S.score > bestScore();
  if (S.report.record) setBest(S.score);
  S.history = [...S.history, { day: S.day, budget: S.budget, pax: T.passengers, rep: S.rep, net: S.lastNet }].slice(-14);
  S.lastSat = satisfaction();
  S.today = newDay(S.rep);
  if (S.autoRefill) Object.keys(PRODUCTS).forEach(refill);
  S.event = null;
  nightWorks();
  planMinor();
  S.ad = 0; // la campagne achetée hier soir n'a servi que pour le plan de la journée écoulée
  S.plan = makePlan(true, S.day + 1);
  // après les travaux : un chantier qui commence réduit déjà la capacité de demain

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

// ---------- Travaux d'entretien ----------
// À partir de 4,5 ★ (ou des 8 objectifs), un chantier est proposé dans le bilan environ toutes les deux semaines.
// Le devis et la durée grandissent avec la gare ; tant qu'il est reporté : −0,05 ★ et +10 % sur le devis chaque soir.
const stationSize = () => sum(UPGRADES.map((u) => u.level()));
const WORKS = {
  machines: { icon: '🔧', name: 'Remplacement des machines usées', effect: 'bornes et distributeurs remis à neuf',
    ok: () => sum(Object.values(S.machines)) > 0,
    quote: () => 0.3 * (S.machines.kiosk * 40000 + S.machines.checkin * 45000 + S.machines.robot * 50000 + sum(Object.values(S.vending)) * VENDING_PRICE) },
  tags: { icon: '🧽', name: 'Nettoyage des tags', effect: 'murs et quai nettoyés', ok: () => true, quote: () => 3000 + 400 * stationSize() },
  platform: { icon: '🛤️', name: 'Réfection du quai', effect: '−25 % de voyageurs par train', days: true, ok: () => true },
  hotel: { icon: '🏨', name: 'Rénovation d\'un étage d\'hôtel', effect: `−${ROOMS_PER_FLOOR} chambres`, days: true, ok: () => S.hotel >= 2 },
  wc: { icon: '🚻', name: 'Rénovation des sanitaires', effect: 'sanitaires fermés', days: true, ok: () => S.shops.wc },
  waitroom: { icon: '🚪', name: 'Rénovation de la salle d\'attente', effect: 'salle d\'attente fermée', days: true, ok: () => S.waitroom },
};
// Petits travaux : dès l'objectif 2, un jour sur quatre, un équipement possédé ferme 2 à 5 h entre 7 h et 18 h
const MINOR = {
  cafe: { name: 'Café du quai', ok: () => S.cafe },
  cafeteria: { name: 'Cafétéria', ok: () => S.svc.cafeteria },
  kiosk: { name: 'Bornes de billets', ok: () => S.machines.kiosk },
  checkin: { name: 'Bornes de check-in', ok: () => S.machines.checkin },
  shelter: { name: 'Abris', ok: () => S.shelters },
  waitroom: { name: 'Salle d\'attente', ok: () => S.waitroom },
};
function planMinor() {
  const kinds = Object.keys(MINOR).filter((k) => MINOR[k].ok());
  if (S.goal < 2 || !kinds.length || Math.random() >= 0.25) return (S.minor = null);
  const from = (7 + rand(12)) * 60 + rand(4) * 15;
  S.minor = { kind: pick(kinds), from, until: from + (2 + rand(4)) * 60 };
}
const nextWorksDay = () => S.day + 10 + rand(9);
function nightWorks() {
  if (S.works && --S.works.days <= 0) {
    toast(`🚧 ${WORKS[S.works.kind].name} : travaux terminés`, 'good');
    S.works = null;
  }
  const o = S.worksOffer;
  if (o?.accepted) { // le chantier accepté commence demain
    S.works = { kind: o.kind, days: o.days, cost: o.cost };
    S.worksOffer = null;
  } else if (o) { // reporté : la gare vieillit et le devis augmente
    S.rep = Math.max(0, S.rep - 0.05);
    o.cost *= 1.1;
    o.delay++;
  } else if (!S.works && (S.rep >= 4.5 || S.goal >= GOALS.length || S.nextWorks)) {
    S.nextWorks ??= nextWorksDay();
    if (S.day >= S.nextWorks) {
      const kind = pick(Object.keys(WORKS).filter((k) => WORKS[k].ok())), w = WORKS[kind], size = stationSize();
      const guard = S.svc.security ? 0.75 : 1; // l'agent de sécurité limite tags et dégradations
      S.worksOffer = w.days
        ? { kind, days: 1 + rand(1 + Math.min(3, Math.floor(size / 15))), cost: (2000 + 300 * size) * guard, delay: 0 }
        : { kind, days: 0, cost: w.quote() * guard, delay: 0 };
      S.nextWorks = nextWorksDay();
    }
  }
}
// Accepte le chantier proposé : travaux ponctuels payés à minuit, chantier sur plusieurs jours lancé le lendemain
function acceptWorks() {
  const o = S.worksOffer, w = o && WORKS[o.kind];
  if (!o || o.accepted) return;
  if (o.days) {
    o.accepted = true;
    toast(`🚧 ${w.name} : début demain pour ${o.days} jour(s), ${w.effect}`, 'warn');
  } else {
    S.today.works += o.cost;
    S.worksOffer = null;
    if (o.kind === 'tags') S.dirt = Math.max(0, S.dirt - 20);
    toast(`${w.icon} ${w.name} : ${money(o.cost)} payés à minuit`, 'warn');
  }
}
// Encart du chantier en cours ou proposé (bilan du soir et fenêtre Bilan)
function worksBlock() {
  const sites = S.builds.map((b) => `<div class="callout">${isSite(b.id) ? '🚧' : '🔧'} <b>${UPGRADES.find((u) => u.id === b.id).name}</b> : ${buildWord(b.id)} jusqu'au ${buildEnd(b)}</div>`).join('');
  return sites + worksOffers();
}
function worksOffers() {
  if (S.works) {
    const w = WORKS[S.works.kind];
    return `<div class="callout">🚧 <b>${w.name}</b> en cours : ${w.effect}, encore ${S.works.days} jour(s) · ${money(S.works.cost)} / jour</div>`;
  }
  const o = S.worksOffer, w = o && WORKS[o.kind];
  if (!o) return '';
  if (o.accepted) return `<div class="callout">🚧 <b>${w.name}</b> : début demain pour ${o.days} jour(s), ${w.effect} · ${money(o.cost)} / jour</div>`;
  return `<div class="callout works">🚧 <b>Travaux à prévoir : ${w.name}</b>
    <small>${o.days ? `${o.days} jour(s) à ${money(o.cost)} / jour · ${w.effect}` : `${money(o.cost)} · ${w.effect}`}${o.delay ? ` · reporté ${o.delay} fois` : ''}.
    Tant qu'ils sont reportés : −0,05 ★ et +10 % sur le devis chaque soir.</small>
    <button class="primary" data-act="works">${o.days ? 'Lancer les travaux demain' : 'Faire les travaux'}</button></div>`;
}

// Effectif conseillé du jour : calculé une fois par plan (pas au fil de l'appréciation ou d'une grève),
// recalculé seulement après un achat ou un prix qui le change (amélioration, distributeur, billet, chambres)
const dayNeed = () => (S.plan.need ??= expect(S.plan).need);
const resetNeed = () => { delete S.plan.need; };

// Points du jour sur 200 : appréciation (100), clients satisfaits (50), bénéfice (50 pour 500 000 €)
const dayPoints = (R) => Math.round(clamp(R.repEnd * 20, 0, 100) + clamp(R.sat, 0, 1) * 50 + clamp((R.revenue - R.total) / 10000, 0, 50));
const bestScore = () => { try { return +localStorage.getItem('aligato-best') || 0; } catch { return 0; } };
const setBest = (v) => { try { localStorage.setItem('aligato-best', v); } catch { /* stockage indisponible */ } };

function checkGoals() {
  const g = GOALS[S.goal];
  if (g && g.value() >= g.target) {
    S.goal++;
    S.today.goals.push(g);
    toast(`🎯 Objectif atteint ! Débloqué : ${g.unlocks}`, 'goal', null, 'goal');
    if (S.goal === GOALS.length) toast('🏆 Vous êtes une Légende du rail ! Place aux défis de fréquentation.', 'goal');
  }
  const c = S.goal >= GOALS.length && CHALLENGES[S.challenge];
  if (c && S.today.passengers >= c.target) {
    S.challenge++;
    S.score += c.points;
    S.today.challenges.push(`${c.icon} ${c.text} : +${c.points} points`);
    toast(`${c.icon} Défi réussi : ${c.text} ! +${c.points} points`, 'goal');
  }
}

// ---------- Défis de fréquentation (après les 8 objectifs) ----------
const CHALLENGES = [
  { icon: '🥉', text: 'Transporter 8 000 voyageurs en une journée', target: 8000, points: 100 },
  { icon: '🥈', text: 'Transporter 10 000 voyageurs en une journée', target: 10000, points: 200 },
  { icon: '🥇', text: 'Transporter 12 000 voyageurs en une journée', target: 12000, points: 300 },
  { icon: '🏆', text: 'Transporter 15 000 voyageurs en une journée', target: 15000, points: 400 },
  { icon: '💎', text: 'Transporter 20 000 voyageurs en une journée', target: 20000, points: 500 },
];
const WEEK_STEP = 5000, WEEK_POINTS = 500; // record de la semaine : +5 000 voyageurs à chaque palier
// défi en cours : le prochain défi du jour, puis le record de la semaine (du lundi au dimanche)
const currentChallenge = () => {
  const c = CHALLENGES[S.challenge];
  return c ? { title: `Défi ${S.challenge + 1}/${CHALLENGES.length}`, text: `${c.icon} ${c.text}`, value: S.today.passengers, target: c.target }
    : { title: 'Record de la semaine', text: `🏅 ${fmt(S.weekTarget)} voyageurs du lundi au dimanche`, value: S.weekPax + S.today.passengers, target: S.weekTarget };
};
// Défis dans la fenêtre Objectifs : défis du jour, puis record de la semaine qui recommence plus haut à chaque palier
function challengesHtml() {
  const open = S.goal >= GOALS.length, cur = currentChallenge();
  const bar = (v, t) => `<div class="bar"><i style="width:${clamp(v / t, 0, 1) * 100}%"></i></div><small>${fmt(Math.min(v, t))} / ${fmt(t)}</small>`;
  return `<h3 class="hist-title">Défis de fréquentation${open ? '' : ' · après les 8 objectifs'}</h3><ol class="goals">`
    + CHALLENGES.map((c, i) => {
      const st = !open || i > S.challenge ? 'todo' : i < S.challenge ? 'done' : 'current';
      return `<li class="${st}"><b>${st === 'done' ? '✅' : st === 'current' ? '▶️' : '🔒'} ${c.icon} ${c.text}</b>
        ${st === 'current' ? bar(cur.value, c.target) : ''}<small>Récompense : ${c.points} points</small></li>`;
    }).join('')
    + `<li class="${open && S.challenge >= CHALLENGES.length ? 'current' : 'todo'}"><b>🏅 Record de la semaine : ${fmt(S.weekTarget)} voyageurs du lundi au dimanche</b>
      ${open ? bar(S.weekPax + S.today.passengers, S.weekTarget) : ''}<small>${WEEK_POINTS} points à chaque record, puis +${fmt(WEEK_STEP)} voyageurs</small></li></ol>`;
}

// chaque dimanche soir : record de la semaine, puis nouvelle semaine
function closeWeek() {
  if (S.goal < GOALS.length) return;
  S.weekPax += S.today.passengers;
  if (weekday() !== 6) return;
  if (S.weekPax >= S.weekTarget) {
    S.score += WEEK_POINTS;
    S.today.challenges.push(`🏅 Record de la semaine : ${fmt(S.weekPax)} voyageurs, +${WEEK_POINTS} points`);
    toast(`🏅 Record de la semaine battu : ${fmt(S.weekPax)} voyageurs ! +${WEEK_POINTS} points`, 'goal');
    S.weekTarget += WEEK_STEP;
  }
  S.weekPax = 0;
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
const SHOP_TOP = GF; // les commerces ont la hauteur du rez-de-chaussée de la gare
// Emplacement [x, pied] de la barrière d'un chantier : là où l'ouvrage apparaîtra
const SHOP_OTHERS = ['wc', 'cafeteria', 'relay'];
function shopSite(id) { // milieu de la façade que le commerce aura une fois livré (mêmes règles que shopFronts)
  const ext = Object.keys(EXT_SHOPS).filter((k) => EXT_SHOPS[k].on() || buildOf(k) || k === id), x0 = (S.station >= 2 ? SHOP_X : MX) - ext.length * EXT_SLOT;
  if (ext.includes(id)) return x0 + ext.indexOf(id) * EXT_SLOT + EXT_SLOT / 2;
  const owned = (k) => (k === 'wc' ? S.shops.wc : S.svc[k]) || buildOf(k);
  return x0 - (SHOP_OTHERS.slice(0, SHOP_OTHERS.indexOf(id)).filter(owned).length + 1) * EXT_SLOT + 31;
}
const buildSite = (id, i) => {
  const g = Y.platform + 11, edge = 438, span = (1230 - platX() - 120) / 5, track = (k) => [platX() + 60 + k * span, edge];
  if (id in EXT_SHOPS || SHOP_OTHERS.includes(id)) return [shopSite(id), g]; // sa future façade
  return {
    quai: track(0), wagon: track(1), comfort: track(2), barCar: track(3), category: track(4), track2: track(5),
    shelters: [SHELTER_X[Math.min(S.shelters, 2)] + SHELTER_W / 2, 424], canopy: [PLATFORM_X[2] + 70, 424], benches: [520, 424],
    waitroom: [MX + 280, g], hotel: [DOOR_X + 70, g], checkin: [DOOR_X + 34, g], kiosk: [MX - 30, g], phone: [DOOR_X - 40, g],
    gare: [830, g], cafe: [758, g], wifi: [DOOR_X + 60, g], security: [700, g], piano: [DOOR_X - 20, g],
  }[id] ?? [DOOR_X - 70 - i * 40, g];
};
const BUS_STOP_X = 130; // arrêt de la navette, à gauche de la galerie de commerces
const EXT_SLOT = 68, WC_W = 34; // largeur d'un commerce et de l'annexe des toilettes
// commerces et services de l'extension, dans l'ordre d'apparition ; cafétéria et relais colis sont des services, hors de SHOPS
const EXT_SHOPS = {
  ...Object.fromEntries(['news', 'bakery', 'books', 'market'].map((k) => [k, { on: () => S.shops[k], label: () => shopAt(k).label, icon: SHOPS[k].icon, color: SHOPS[k].color }])),
  cafeteria: { on: () => S.svc.cafeteria, label: () => 'CAFÉTÉRIA', icon: '🍽️', color: '#5d4037' },
  relay: { on: () => S.svc.relay, label: () => 'RELAIS COLIS', icon: '📦', color: '#e67e22' },
};
const shopFloors = (n) => (n >= 5 ? 3 : n >= 3 ? 2 : 1); // l'extension prend un étage à 3 puis à 5 commerces
// un seul bâtiment collé à la gare, de plus en plus large et haut ; les toilettes sont une porte annexe sur son côté gauche
const shopFronts = () => {
  const ks = Object.keys(EXT_SHOPS).filter((k) => EXT_SHOPS[k].on()), x0 = (S.station >= 2 ? SHOP_X : MX) - ks.length * EXT_SLOT;
  const fronts = ks.map((k, i) => ({ k, ext: true, label: EXT_SHOPS[k].label(), icon: EXT_SHOPS[k].icon, color: EXT_SHOPS[k].color, x: x0 + i * EXT_SLOT, w: EXT_SLOT }));
  if (S.shops.wc) fronts.push({ k: 'wc', annex: true, icon: SHOPS.wc.icon, x: x0 - WC_W, w: WC_W });
  return fronts;
};

// les lampadaires situés devant l'emplacement du bâtiment des commerces disparaissent une fois celui-ci construit
const lamps = () => {
  const xs = shopFronts().map((f) => f.x), left = Math.min(...xs) - 20, right = S.station >= 2 ? SHOP_X : MX;
  return LAMPS.filter((lx) => !xs.length || lx + 17 < left || lx >= right);
};

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

function windowAt(g, x, y, w, h, hotel = false) {
  WINDOWS.push({ x, y, w, h, hotel });
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
    for (let x = 300; x <= 630; x += 47) g.fillRect(x, 312, 2, 4); // marquage des places, au pied des voitures
    // voitures garées, vues de profil comme celles de la route, en plus petit (plus loin)
    const keep = ctx;
    ctx = g;
    PARKED.forEach((c, i) => c && drawCar({ ...c, x: 324 + i * 47 }, 315, 0.55));
    ctx = keep;
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
  if (S.track2) { // seconde voie, au premier plan : ballast, traverses et rail
    g.fillStyle = '#6f6256'; g.fillRect(0, Y.ground + 6, W, H - Y.ground - 6);
    g.fillStyle = '#4a3a2e';
    for (let x = 10; x < W; x += 22) g.fillRect(x, Y.ground + 14, 12, 7);
    g.fillStyle = '#c3c9d1'; g.fillRect(0, Y.ground + 11, W, 3);
  }
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
    for (let k = 0; k < 7; k++) windowAt(g, MX + 20 + k * 45, fy + 8, 22, 24, true);
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

  // lampadaires
  for (const lx of lamps()) {
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

  // abribus de la navette, sur le trottoir : vitrage translucide pour voir le bus derrière
  if (S.shuttle) {
    const ax = BUS_STOP_X - 38, ay = Y.roadEnd + 14;
    g.fillStyle = 'rgb(191 224 245 / .35)'; g.fillRect(ax, ay - 30, 76, 30);
    g.fillStyle = '#3a404a'; g.fillRect(ax - 2, ay - 32, 4, 32); g.fillRect(ax + 74, ay - 32, 4, 32);
    g.fillStyle = '#f5b82e'; g.beginPath(); g.roundRect(ax - 6, ay - 38, 88, 7, 3); g.fill();
    g.fillStyle = '#7a5537'; g.fillRect(ax + 8, ay - 9, 28, 3);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(ax + 46, ay - 27, 22, 14, 3); g.fill();
    g.font = '10px system-ui, sans-serif'; g.fillText('🚌', ax + 57, ay - 16);
  }

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
  if (S.waitroom) plaque(MX + MW - 108, 368, 104, S.waitroom > 1 ? 'GRANDE SALLE D\'ATTENTE' : 'SALLE D\'ATTENTE', '#2f6fd6'); // sous les deux dernières fenêtres
  if (S.svc.lounge) plaque(MX + MW + 4, 352, 42, 'SALON 1re', '#c9a227', '#1b2540');
  if (S.svc.spa) plaque(MX + MW + 4, 364, 42, 'SPA', '#16a085');
  if (S.svc.wifi) plaque(MX + 16, 368, 30, 'WI-FI', '#6c5ce7');

  // galerie de commerces le long de la route
  const fronts = shopFronts();
  const exts = fronts.filter((f) => f.ext), annex = fronts.find((f) => f.annex), gTop = SHOP_TOP;
  const cornice = (x, w, y) => { g.fillStyle = '#e9dccb'; g.fillRect(x, y, w, 6); }; // même corniche que les étages de l'hôtel
  // commerces de plain-pied : les toilettes partagent leur toit ; dès l'étage, l'annexe garde son propre toit
  const joined = annex && exts.length && shopFloors(exts.length) === 1;
  if (annex) { // toilettes (dessinées avant le toit commun qui les recouvre) : annexe de la hauteur du rez-de-chaussée, une porte et son icône
    const { x, w, icon } = annex;
    bricks(g, x, gTop - 6, w, bottom - gTop + 6, '#9c3d2a');
    if (!joined) { // petit toit à un pan contre le mur des commerces plus hauts, comme eux contre la gare
      g.fillStyle = '#3b3036'; g.beginPath(); g.moveTo(x - 4, gTop - 6); g.lineTo(x + w, gTop - 6); g.lineTo(x + w, gTop - 18); g.lineTo(x + 6, gTop - 18); g.fill();
      g.fillStyle = '#54474e'; g.fillRect(x - 4, gTop - 8, w + 4, 3);
    }
    cornice(x, w, gTop - 6);
    g.font = '14px system-ui, sans-serif';
    g.fillText(icon, x + w / 2 + 3, gTop + 15); // décalé pour paraître centré sur la porte
    g.fillStyle = '#26354f'; g.fillRect(x + 9, gTop + 20, 16, bottom - gTop - 20);
  }
  if (exts.length) { // un seul bâtiment, une seule porte centrale, fenêtres espacées comme celles de la gare ; étages à 3 puis 5 commerces
    const n = exts.length, x0 = exts[0].x, wTot = n * EXT_SLOT, fl = shopFloors(n), top = gTop - (fl - 1) * FLOOR_H, dcx = x0 + wTot / 2;
    const left = joined ? annex.x : x0, eave = fl === 1 ? top - 6 : top + 2; // bord gauche et bas du toit
    const m = Math.floor(wTot / 45), wx = Array.from({ length: m }, (_, k) => x0 + (wTot - m * 45) / 2 + 12 + k * 45);
    bricks(g, x0, top, wTot, bottom - top, '#b5432f');
    g.fillStyle = '#3b3036'; g.beginPath();
    if (top === hotelTop()) { // même hauteur que la gare : un seul toit continu
      g.moveTo(x0 - 16, top + 2); g.lineTo(MX + MW + 16, top + 2); g.lineTo(MX + MW - 24, top - 24); g.lineTo(x0 + 24, top - 24);
    } else { // sinon toit à un pan qui s'appuie contre le mur de la gare, au-dessus de la corniche quand il n'y a pas d'étage
      g.moveTo(left - 6, eave); g.lineTo(x0 + wTot, eave); g.lineTo(x0 + wTot, eave - 16); g.lineTo(left + 10, eave - 16);
    }
    g.fill();
    g.fillStyle = '#54474e'; // gouttière comme celle de la gare
    if (top === hotelTop()) g.fillRect(x0 - 16, top, MX - x0, 4); else g.fillRect(left - 6, eave - 2, x0 + wTot - left + 6, 4);
    for (let f = 1; f < fl; f++) {
      const fy = gTop - f * FLOOR_H;
      cornice(x0, wTot, fy + FLOOR_H - 6);
      for (const x of wx) windowAt(g, x, fy + 8, 22, 24);
    }
    cornice(x0, wTot, gTop - 6);
    for (const x of wx) if (Math.abs(x + 11 - dcx) > 37) windowAt(g, x, 340, 22, 24);
    g.fillStyle = '#e9dccb'; g.fillRect(dcx - 26, 334, 52, bottom - 334);
    g.fillStyle = '#26354f'; g.fillRect(dcx - 22, 338, 44, bottom - 338);
    g.fillStyle = '#9fb4d3'; g.fillRect(dcx - 1, 338, 2, bottom - 338);
    for (const { x, label, icon, color } of exts) { // enseignes alignées au bas du premier étage
      g.fillStyle = color; g.fillRect(x + 4, gTop - 6, EXT_SLOT - 8, 10);
      const txt = `${icon} ${label}`;
      let fs = 6.5;
      g.fillStyle = '#fff'; g.font = `700 ${fs}px system-ui, sans-serif`;
      while (g.measureText(txt).width > EXT_SLOT - 14 && fs > 4) g.font = `700 ${(fs -= 0.25)}px system-ui, sans-serif`; // marge de 3 px autour du texte
      g.fillText(txt, x + EXT_SLOT / 2, gTop + 2);
    }
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
// voitures du parking, une par place (null : place libre)
const PARKED = [
  { kind: 'car', len: 56, color: '#e85d3a', dir: 1 }, { kind: 'van', len: 64, color: '#2f6fd6', dir: -1 }, null,
  { kind: 'car', len: 56, color: '#f4f4f4', dir: 1 }, { kind: 'pickup', len: 70, color: '#c99a52', dir: -1 }, null,
  { kind: 'car', len: 56, color: '#3aa0d8', dir: -1 },
];
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
    if (c.stopAt && c.x >= c.stopAt && c.wait > 0) { // la navette marque l'arrêt et dépose des voyageurs
      if (!c.dropped) { c.dropped = true; spawnBusWalkers(); }
      c.wait -= dt;
      continue;
    }
    c.x += c.dir * c.speed * dt;
  }
  for (let i = cars.length - 1; i >= 0; i--) if (cars[i].x < -120 || cars[i].x > W + 120) cars.splice(i, 1);
}

const laneY = (lane) => (lane ? 360 : 336);

// y et s : position et échelle, par défaut celles de la voie de circulation
function drawCar(c, y = laneY(c.lane), s = c.lane ? 1 : 0.88) {
  const L = c.len;
  ctx.save();
  ctx.translate(c.x, y);
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
// voyageurs abrités : les premiers se placent sous les abris (avec l'extension, tout le quai est couvert)
const shelterX = (u) => {
  const zones = SHELTER_X.slice(0, S.shelters), i = Math.floor(u * zones.length), f = u * zones.length - i;
  return zones[i] + 8 + f * (SHELTER_W - 16);
};

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

// Pendant le rendu des sprites, personnages et barrières sont triés par ordonnée du pied : ceux qui sont plus près du quai passent devant
let depthQueue = null;
const drawPerson = (...a) => (depthQueue ? depthQueue.push({ y: a[2], draw: () => paintPerson(...a) }) : paintPerson(...a));
function paintPerson(p, x, y, t, walking) {
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

// Coins d'attente sous les abris : banc à gauche, distributeurs café-repas-souvenirs à droite, au même rang.
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
  const inDepth = (dy, draw) => (depthQueue ? depthQueue.push({ y: dy, draw }) : draw()); // se place devant ou derrière les personnes selon sa profondeur
  const kiosk = (x, color) => inDepth(y, () => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x - 7, y - 30, 14, 30, [4, 4, 1, 1]); ctx.fill();
    ctx.fillStyle = '#bfe0f5'; ctx.fillRect(x - 5, y - 27, 10, 8);
    ctx.fillStyle = '#f5b82e'; ctx.fillRect(x - 3, y - 15, 6, 2);
  });
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
  vendingSpots().forEach((x, i) => inDepth(vy, () => {
    for (const [k, p] of Object.entries(PRODUCTS)) {
      if (i >= S.vending[k]) continue;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.roundRect(x - 5, vy - 27, 10, 27, [3, 3, 1, 1]); ctx.fill();
      ctx.fillStyle = S.broken[k] && i === 0 ? (Math.floor(t * 3) % 2 ? '#ff9f1a' : '#3a2a10') : S.stock[k] ? '#bfe0f5' : '#ff5b4a';
      ctx.fillRect(x - 3, vy - 24, 6, 5);
      ctx.fillStyle = 'rgb(0 0 0 / .35)'; ctx.fillRect(x - 3, vy - 8, 6, 3);
      x += 12;
    }
  }));

  // chantier en cours : barrières « TRAVAUX » sur la zone, bâche sur l'étage d'hôtel rénové
  const paintBarrier = (bx, by) => { // panneau jaune bordé de noir, deux lisses rayées orange et blanc sur deux pieds
    ctx.fillStyle = '#3a404a';
    ctx.fillRect(bx - 19, by - 15, 2.5, 15); ctx.fillRect(bx + 16.5, by - 15, 2.5, 15);
    ctx.fillRect(bx - 21, by - 1.5, 6.5, 1.5); ctx.fillRect(bx + 14.5, by - 1.5, 6.5, 1.5); // pieds
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#e8590c'; ctx.fillRect(bx - 18 + i * 6, by - 13 + r * 5, 6, 3.5); }
    ctx.fillStyle = '#1b2540'; ctx.fillRect(bx - 20, by - 29.5, 40, 12.5); // cadre
    ctx.fillStyle = '#f5b82e'; ctx.fillRect(bx - 19, by - 28.5, 38, 10.5);
    ctx.fillStyle = '#1b2540'; ctx.font = '800 6px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TRAVAUX', bx, by - 20.5);
  };
  const barrier = (bx, by) => (depthQueue ? depthQueue.push({ y: by - 6, draw: () => paintBarrier(bx, by) }) : paintBarrier(bx, by));
  S.builds.filter((b) => isSite(b.id)).forEach((b, i) => { const [bx, by] = buildSite(b.id, i); barrier(bx, by); }); // chantiers d'amélioration, à l'emplacement de l'ouvrage
  if (S.works) {
    const k = S.works.kind, wc = shopFronts().find((f) => f.k === 'wc');
    if (k === 'platform') { barrier(platX() + 60, 438); barrier((platX() + 1250) / 2, 438); }
    if (k === 'hotel') {
      ctx.fillStyle = 'rgb(232 89 12 / .45)'; ctx.fillRect(MX + 6, hotelTop() + 2, MW - 12, FLOOR_H - 8);
      barrier(DOOR_X + 70, y + 4);
    }
    if (k === 'wc' && wc) barrier(wc.x + wc.w / 2, y + 4);
    if (k === 'waitroom') barrier(MX + 280, y + 4);
  }
  const mn = minorNow();
  if (mn) {
    const cf = shopFronts().find((f) => f.k === 'cafeteria');
    const bx = { cafe: 758, cafeteria: cf && cf.x + cf.w / 2, kiosk: MX - 30, checkin: DOOR_X + 34, shelter: SHELTER_X[0] + 30, waitroom: MX + 280 }[mn.kind];
    if (bx) barrier(bx, y + 4);
  }

  // contrôleurs (casquette rouge), sur la voie devant les bancs
  for (let i = 0; i < Math.min(S.staff.controleur, 4); i++) {
    const d = (t * 16 + i * 611 + 90) % (len * 2);
    drawPerson(uniforms.controleur[i], x0 + (d < len ? d : len * 2 - d), Y.platform + 46, t, true);
  }
}

// agents d'entretien : dessinés au milieu de la foule, triés par profondeur (y) pour passer devant ceux qui sont plus haut sur le quai
function cleaners(t) {
  const x0 = platX() + 30, len = 1230 - x0;
  return Array.from({ length: S.staff.entretien }, (_, i) => {
    const d = (t * 22 + i * 397) % (len * 2), dir = d < len ? 1 : -1;
    const x = x0 + (d < len ? d : len * 2 - d), fy = Y.platform + [12, 48, 18][i % 3];
    return { y: fy, draw() {
      drawPerson(uniforms.entretien[i % uniforms.entretien.length], x, fy, t, true);
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + dir * 4, fy - 16); ctx.lineTo(x + dir * 12, fy); ctx.stroke();
    } };
  }).sort((a, b) => a.y - b.y);
}

// Voyageurs visibles sur le quai, séparés entre voyageurs classiques et travailleurs
function crowdSplit() {
  const [ph, p, special] = trainPhase();
  const pend = ph === 'stopped' ? S.pendingBoard * (1 - Math.min(1, p * 2)) : 0;
  // quand aucun train n'est à quai, la salle d'attente garde une partie des voyageurs à l'intérieur
  const inside = ph === 'stopped' ? 0 : Math.min(waitroomSeats(), S.waiting);
  return { classic: S.waiting + S.waitingExtra + (special ? 0 : pend), commuters: S.waitingCommuters + (special ? pend : 0), inside };
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
      ...(S.platform < 3 || (!special && r() < 0.65) ? { tx: pick(doorXs()) - 10 + r() * 20, ty: DOOR_FOOT } : { tx: -30 }), speed: 40 + r() * 30, delay: r() * 1.5 });
  }
}
// Voyageurs déposés par la navette : ils longent le trottoir jusqu'à la gare
function spawnBusWalkers() {
  for (let i = 0; i < 3 + rand(4); i++) {
    walkers.push({ ...person(Math.random), x: BUS_STOP_X + 10 + rand(30), y: Y.roadEnd + 12 + rand(8),
      tx: DOOR_X - 10 + rand(20), ty: DOOR_FOOT, speed: 40 + rand(30), delay: i * 0.3 });
  }
}
const doorXs = () => [DOOR_X, shopDoorX()].filter((x) => x !== null); // portes de la gare et des commerces
const onPlatform = (x) => clamp(x, platX() + 10, 1240); // les passants ne marchent pas dans l'herbe
const DOOR_FOOT = Y.platform + 8; // pied des portes, où les voyageurs entrent et sortent
const shopDoorX = () => { const e = shopFronts().filter((f) => f.ext); return e.length ? e[0].x + (e.length * EXT_SLOT) / 2 : null; };
// une personne sort de la porte `dx` (invisible jusqu'à son tour) et s'éloigne
const spawnExit = (dx, tx, delay) => {
  const w = { ...person(Math.random), x: dx - 6 + rand(12), y: DOOR_FOOT, tx, ty: DOOR_FOOT + 4 + rand(18), speed: 40 + rand(30), delay, hidden: true };
  walkers.push(w);
  return w;
};
// Passants des commerces : un groupe de taille aléatoire entre par la porte du bâtiment, un autre en ressort un peu plus tard ;
// les voyageurs s'enchaînent à moins d'une seconde d'intervalle, donc la porte reste ouverte tant que dure le groupe
function spawnShopWalkers() {
  const dx = shopDoorX();
  if (dx === null) return;
  const total = sum(shopFronts().filter((f) => f.ext && SHOPS[f.k] && shopOpen(f.k)).map((f) => Math.round(shopAt(f.k).rate * 20)));
  if (!total) return;
  const side = Math.random() < 0.5 ? -1 : 1, n = 1 + rand(Math.min(5, total)), outAt = 3 + n * 0.6;
  for (let i = 0; i < n; i++) {
    walkers.push({ ...person(Math.random), x: onPlatform(dx + side * (30 + rand(50))), y: DOOR_FOOT + rand(22), tx: dx - 6 + rand(12), ty: DOOR_FOOT, speed: 40 + rand(30), delay: i * (0.4 + Math.random() * 0.4) });
    spawnExit(dx, onPlatform(dx - side * (30 + rand(50))), outAt + i * (0.4 + Math.random() * 0.4));
  }
}
// Voyageurs qui sortent de la gare par petits groupes : quai de niveau 3, ils quittent l'écran par la gauche ; sinon ils rejoignent
// la porte des commerces, ou le quai
function spawnStationExits() {
  const shop = shopDoorX();
  for (let i = 1 + rand(4); i > 0; i--) {
    const tx = S.platform >= 3 ? (Math.random() < 0.5 ? BUS_STOP_X + 20 : -30) : shop !== null && Math.random() < 0.6 ? shop : onPlatform(platX() + 40 + rand(600));
    const w = spawnExit(DOOR_X, tx, i * (0.4 + Math.random() * 0.4));
    if (tx === shop) Object.assign(w, { tx: shop - 6 + rand(12), ty: DOOR_FOOT }); // ils entrent dans le commerce par sa porte
  }
}
function updateWalkers(dt) {
  if (walkers.length > 200) walkers.splice(0, walkers.length - 200); // garde-fou si l'onglet a été mis en veille
  for (const w of walkers) {
    if ((w.delay -= dt) > 0) continue;
    const dx = w.tx - w.x, dy = (w.ty ?? w.y) - w.y, dist = Math.hypot(dx, dy), step = w.speed * dt;
    if (dist <= step) { w.x = w.tx; w.y = w.ty ?? w.y; } else { w.x += (dx / dist) * step; w.y += (dy / dist) * step; }
  }
  for (let i = walkers.length - 1; i >= 0; i--) {
    const w = walkers[i];
    if (w.x !== w.tx || w.y !== (w.ty ?? w.y)) continue;
    if (w.arrival) crowdShown++; // un nouveau voyageur arrivé à sa place apparaît dans la foule
    walkers.splice(i, 1);
  }
}

// Foule du quai : un nouveau voyageur sort d'une porte et marche jusqu'à sa place, il n'apparaît pas d'un coup
let crowdShown = null; // nombre de personnages de la foule effectivement affichés
const crowdCounts = () => {
  const sp = crowdSplit(), vc = Math.min(CROWD_MAX, Math.round(sp.classic - sp.inside));
  return [vc, Math.min(CROWD_MAX - vc, Math.round(sp.commuters))];
};
function updateArrivals() {
  const [vc, vw] = crowdCounts(), total = vc + vw, flying = walkers.filter((w) => w.arrival).length;
  if (crowdShown === null || crowdShown > total) crowdShown = total; // au chargement ou à l'embarquement : pas d'animation
  if (total - crowdShown - flying > 8) crowdShown = Math.max(0, total - flying - 8); // gros saut : seuls les 8 derniers marchent
  const under = S.canopy ? 0 : S.shelters * SHELTER_SEATS, need = total - crowdShown - flying;
  for (let k = 0; k < need; k++) {
    const idx = crowdShown + flying + k, p = crowd.find((q) => q.order === idx);
    if (!p) { crowdShown++; continue; }
    const dx = pick(doorXs()), w = spawnExit(dx, 0, 0);
    Object.assign(w, idx < vc ? p : p.suit, { x: dx - 6 + rand(12), y: DOOR_FOOT, tx: idx < under ? shelterX(p.u) : crowdX(p.u), ty: p.y, speed: 40 + rand(30), delay: k * 0.5, hidden: true, arrival: true });
  }
}

// Portes coulissantes de la gare et des commerces : elles s'ouvrent quand quelqu'un arrive ou sort
const doorOpen = { station: 0, shop: 0 };
let doorT = 0;
function drawDoors(now) {
  const dt = Math.min(0.1, now - doorT);
  doorT = now;
  const shopX = shopDoorX();
  for (const [k, cx] of [['station', DOOR_X], ['shop', shopX]]) {
    if (cx === null) continue;
    const near = walkers.some((w) => w.delay <= (w.hidden ? 0.5 : 0) && Math.abs(w.x - cx) < 34 && w.y < Y.platform + 26);
    doorOpen[k] += ((near ? 1 : 0) - doorOpen[k]) * Math.min(1, dt * 8);
    const o = doorOpen[k];
    if (o < 0.03) continue;
    const x = cx - 22, y = 338, h = Y.platform + 2 - y, leaf = 22 - 18 * o;
    ctx.fillStyle = '#10151f'; ctx.fillRect(x, y, 44, h);
    ctx.fillStyle = '#26354f'; ctx.fillRect(x, y, leaf, h); ctx.fillRect(x + 44 - leaf, y, leaf, h);
    ctx.fillStyle = '#9fb4d3'; ctx.fillRect(x + leaf - 1, y, 1, h); ctx.fillRect(x + 44 - leaf, y, 1, h);
  }
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
    // fenêtres du rez-de-chaussée (sauf la porte), moins celle du piano une fois acheté
    const wins = [0, 1, 2, 4, 5, 6].filter((k) => !(S.svc.piano && k === 4));
    const heads = Math.round((inside / WAITROOM[S.waitroom]) * wins.length * 4);
    ctx.fillStyle = 'rgb(40 32 36 / .8)';
    for (let i = 0; i < heads; i++) {
      const wx = MX + 20 + wins[Math.floor(i / 4)] * 45, hx = wx + 3 + (i % 4) * 5.5;
      ctx.beginPath(); ctx.arc(hx, 357, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(hx - 2.4, 359, 4.8, 5);
    }
  }
  if (S.svc.piano) { // piano droit en ombre chinoise derrière la 5e fenêtre ; des notes s'en élèvent quand quelqu'un joue
    const px = MX + 202, playing = simT < pianoUntil;
    ctx.fillStyle = 'rgb(40 32 36 / .8)';
    ctx.fillRect(px, 353, 18, 11); ctx.fillRect(px - 1, 352, 20, 2);
    if (playing) { ctx.beginPath(); ctx.arc(px + 9, 349, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(px + 6.6, 351, 4.8, 3); }
    if (playing) {
      ctx.fillStyle = '#f6f1e6'; ctx.strokeStyle = 'rgb(40 32 36 / .6)'; ctx.lineWidth = 2; ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const k = (simT * 0.6 + i / 3) % 1, nx = px + 9 + Math.sin(simT * 2 + i * 2.1) * 7 + (i - 1) * 8, ny = 338 - k * 40;
        ctx.globalAlpha = Math.min(1, (1 - k) * 2);
        ctx.strokeText(i % 2 ? '♪' : '♫', nx, ny); ctx.fillText(i % 2 ? '♪' : '♫', nx, ny);
      }
      ctx.globalAlpha = 1;
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

// Chambres occupées : une fenêtre sur sept par tranche de chambres, dans un ordre fixe ; les clients d'hier partent à 10 h
const ROOM_ORDER = (() => { const r = rng(42); return Array.from({ length: 28 }, (_, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i); })();
function occupiedWindows() {
  const hw = WINDOWS.filter((wn) => wn.hotel), cap = S.hotel * ROOMS_PER_FLOOR;
  const guests = Math.min(cap, S.today.rooms + (S.minutes < 600 ? S.report?.rooms ?? 0 : 0));
  return ROOM_ORDER.filter((i) => i < hw.length).slice(0, Math.round((guests / cap) * hw.length)).map((i) => hw[i]);
}

// ---------- Rendu ----------
let simT = 0; // temps d'animation, figé en pause
let pianoUntil = 0; // le piano du hall joue jusqu'à cet instant
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
  drawDoors(now);
  if (S.station >= 3) drawClockHands();
  // rideaux tirés des chambres occupées ; lumière allumée en soirée et au réveil, éteinte la nuit
  const occupied = occupiedWindows(), roomLights = (t >= 17 && t < 23) || (t >= 6 && t < 8);
  for (const wn of occupied) {
    ctx.fillStyle = '#c0624a'; ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    ctx.fillStyle = '#9c4a36'; ctx.fillRect(wn.x + wn.w / 2 - 0.5, wn.y, 1, wn.h); // jonction des deux rideaux
    ctx.fillStyle = '#e9dccb'; ctx.fillRect(wn.x, wn.y, wn.w, 2); // tringle
  }

  ctx = spriteCtx;
  ctx.clearRect(0, 0, W, H);
  for (const l of LITTER.slice(0, Math.round(S.dirt * 1.6))) {
    ctx.fillStyle = l.c;
    ctx.fillRect(crowdX(l.u), l.y, l.w, 2.5);
  }
  depthQueue = [];
  drawStaff(simT);
  const split = crowdSplit();
  const [vcT, vwT] = crowdCounts(), shownN = Math.min(vcT + vwT, crowdShown ?? Infinity); // seuls les voyageurs déjà arrivés à leur place sont affichés
  const vc = Math.min(vcT, shownN), vw = Math.min(vwT, shownN - vc);
  const underShelters = S.canopy ? 0 : S.shelters * SHELTER_SEATS; // avec l'extension, tout le quai est couvert
  const cl = cleaners(simT);
  for (const p of crowd) {
    while (cl.length && cl[0].y <= p.y) cl.shift().draw();
    const x = p.order < underShelters ? shelterX(p.u) : crowdX(p.u);
    if (p.order < vc) drawPerson(p, x, p.y, simT, false);
    else if (p.order < vc + vw) drawPerson(p.suit, x, p.y, simT, false);
  }
  for (const c of cl) c.draw();
  for (const w of walkers) if (!w.hidden || w.delay <= 0) drawPerson(w, w.x, w.y, simT, w.delay <= 0);
  depthQueue.sort((a, b) => a.y - b.y).forEach((o) => o.draw());
  depthQueue = null;
  // abris voyageurs et leur extension, devant la foule (vitre translucide), en retrait de la ligne jaune comme les bancs
  for (const x of [...SHELTER_X.slice(0, S.shelters), ...extensionX()]) {
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
    ctx.save(); // les phares disparaissent derrière les bâtiments de la gare et les commerces
    ctx.beginPath(); ctx.rect(0, 0, S.station >= 2 ? SHOP_X : MX, H);
    const fr = shopFronts(), ex = fr.filter((f) => f.ext), an = fr.find((f) => f.annex);
    if (ex.length) ctx.rect(ex[0].x, SHOP_TOP - (shopFloors(ex.length) - 1) * FLOOR_H - 26, ex.length * EXT_SLOT, H);
    if (an) ctx.rect(an.x - 4, SHOP_TOP - 18, an.w + 4, H);
    ctx.clip('evenodd');
    for (const lx of lamps()) glow(lx + 17, 308, 70, `rgb(255 200 110 / ${dark * 0.45})`); // lampadaires derrière les bâtiments : masqués aussi
    for (const lx of lamps()) { ctx.fillStyle = `rgb(255 236 190 / ${dark})`; ctx.fillRect(lx + 12, 305, 10, 2); }
    for (const c of cars) glow(c.x + c.dir * c.len / 2, laneY(c.lane) - 10, 30, `rgb(255 230 160 / ${dark * 0.5})`);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgb(255 214 130 / ${dark * 0.85})`;
    for (const wn of WINDOWS) if (!wn.hotel) ctx.fillRect(wn.x, wn.y, wn.w, wn.h); // les chambres vides restent sombres
    if (roomLights) {
      ctx.fillStyle = `rgb(255 190 110 / ${dark * 0.8})`;
      for (const wn of occupied) ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    }
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
const SOUND_CATS = { ambiance: 'Ambiance', tickets: 'Recettes', actions: 'Actions', night: 'Jour / nuit', announce: 'Annonces', events: 'Événements' };
const sound = { on: false, cats: Object.fromEntries(Object.keys(SOUND_CATS).map((k) => [k, true])), ctx: null, amb: null };
try {
  // anciennes sauvegardes : '1' / '0' ; sinon objet { on, cats }
  const saved = JSON.parse(localStorage.getItem('aligato-sound'));
  if (saved?.cats) { sound.on = !!saved.on; Object.assign(sound.cats, saved.cats); } else sound.on = saved === 1;
} catch { /* stockage indisponible ou absent */ }
function audio() {
  if (sound.ctx) return sound.ctx;
  const a = (sound.ctx = new AudioContext());
  // ambiance : bruit blanc filtré très bas, comme le brouhaha lointain d'un hall de gare
  const buf = a.createBuffer(1, a.sampleRate * 3, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  sound.noise = buf;
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
  if (sound.amb) sound.amb.gain.setTargetAtTime(sound.on && sound.cats.ambiance && S.speed ? 0.06 : 0, sound.ctx.currentTime, 0.3);
}
function tone(freq, start, dur, vol = 0.12, type = 'sine', to = 0) {
  const a = sound.ctx, g = a.createGain(), t = a.currentTime + start;
  let o;
  if (type === 'noise') { // bruit filtré autour de freq (chocs mécaniques)
    const bp = a.createBiquadFilter();
    o = a.createBufferSource();
    o.buffer = sound.noise;
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 0.8;
    o.connect(bp).connect(g);
  } else {
    o = a.createOscillator();
    o.type = type === 'curve' ? 'sine' : type;
    o.frequency.setValueAtTime(freq, t);
    if (to && type !== 'curve') o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.connect(g);
  }
  g.gain.setValueAtTime(0, t);
  if (type === 'curve') {
    for (const [dt, f, v] of to) { o.frequency.linearRampToValueAtTime(f, t + dt); g.gain.linearRampToValueAtTime(vol * v, t + dt); }
  } else {
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  }
  g.connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}
// une voix : la note, une copie désaccordée (chorus / battement) et son octave plus faible
const voice = (f, t, d, v, to, type = 'sine') => [[f, t, d, v, type, to], [f * 1.015, t, d, v * 0.8, type, to * 1.015], [f * 2, t, d, v * 0.15, type, to * 2]];
// hululements d'une hulotte relevés sur un enregistrement : [départ, [[temps, hauteur Hz, volume 0-1], …]], un point tous les 20 ms
const OWL_HOOTS = [
[0.02,[[0.0,306,0],[0.02,347,0.29],[0.04,368,0.41],[0.06,383,0.44],[0.08,360,0.44],[0.1,346,0.37],[0.12,363,0.23],[0.14,363,0.05],[0.16,363,0.03],[0.18,363,0]]],
[0.36,[[0.0,345,0],[0.02,369,0.61],[0.04,401,0.87],[0.06,405,0.94],[0.08,371,0.85],[0.1,342,0.53],[0.12,357,0.25],[0.14,325,0.31],[0.16,356,0.68],[0.18,396,0.91],[0.2,412,0.98],[0.22,409,1],[0.24,399,0.94],[0.26,397,0.81],[0.28,404,0.71],[0.3,405,0.7],[0.32,404,0.71],[0.34,402,0.75],[0.36,392,0.71],[0.38,373,0.62],[0.4,351,0.51],[0.42,358,0.31],[0.44,358,0.05],[0.46,358,0.04],[0.48,358,0]]],
[1.12,[[0.0,341,0],[0.02,369,0.64],[0.04,407,0.82],[0.06,419,0.85],[0.08,412,0.89],[0.1,398,0.82],[0.12,376,0.66],[0.14,378,0.5],[0.16,393,0.55],[0.18,399,0.63],[0.2,399,0.64],[0.22,397,0.57],[0.24,384,0.49],[0.26,382,0.42],[0.28,374,0.36],[0.3,368,0.45],[0.32,365,0.54],[0.34,350,0.49],[0.36,368,0.27],[0.38,377,0.12],[0.4,377,0.1],[0.42,377,0.07],[0.44,377,0.06],[0.46,377,0.05],[0.48,377,0.04],[0.5,377,0]]],
[1.70,[[0.0,348,0],[0.02,378,0.71],[0.04,411,0.86],[0.06,419,0.87],[0.08,413,0.9],[0.1,404,0.94],[0.12,386,0.82],[0.14,372,0.65],[0.16,367,0.63],[0.18,368,0.59],[0.2,364,0.59],[0.22,358,0.64],[0.24,354,0.57],[0.26,331,0.39],[0.28,358,0.11],[0.3,358,0.09],[0.32,350,0.11],[0.34,350,0.09],[0.36,350,0.07],[0.38,350,0]]],
];
// chant de coq relevé sur un enregistrement : trois partiels (≈ 700-900 Hz, ≈ 1100 Hz, ≈ 1400-1600 Hz), une mesure [Hz, volume 0-99] toutes les 20 ms
const ROOSTER = [
[[780,0],[593,7],[720,7],[708,8],[715,10],[737,10],[752,11],[838,12],[616,17],[629,15],[615,6],[615,0],[615,0],[615,0],[615,0],[615,0],[710,6],[724,39],[795,57],[845,53],[910,19],[887,31],[785,99],[727,82],[730,27],[730,5],[614,9],[733,45],[772,76],[786,88],[782,96],[774,91],[767,89],[767,96],[759,87],[746,81],[734,77],[732,55],[716,66],[759,46],[736,49],[743,28],[781,9],[754,8],[706,6],[731,14],[728,13],[566,7],[562,8],[686,14],[717,48],[725,58],[718,50],[721,55],[712,55],[710,43],[710,44],[716,41],[714,40],[713,39],[707,37],[706,36],[708,35],[713,35],[717,35],[716,34],[714,32],[714,31],[711,30],[708,30],[707,30],[707,30],[708,29],[708,29],[710,30],[709,28],[705,27],[704,26],[702,27],[702,25],[705,25],[703,25],[703,25],[701,23],[703,26],[700,24],[698,25],[703,24],[717,32],[703,24],[703,23],[696,24],[693,23],[686,22],[685,25],[686,21],[711,41],[713,36],[710,34],[706,36],[704,35],[689,34],[638,17],[725,4],[725,0]],
[[1150,0],[1203,5],[1203,0],[1203,0],[1203,0],[1147,8],[1119,18],[1132,20],[1209,24],[1249,21],[1154,18],[1105,12],[1105,0],[1105,0],[1105,0],[1105,0],[1105,0],[1283,5],[1283,0],[1283,0],[1283,0],[1283,0],[1283,0],[1214,6],[1091,4],[1091,0],[1224,11],[1243,13],[1243,0],[1243,0],[1243,0],[1243,0],[1115,3],[1115,0],[1115,0],[1164,10],[1157,8],[1084,6],[1086,8],[1223,11],[1078,27],[1099,39],[1076,41],[1122,35],[1101,16],[1097,28],[1096,31],[1123,38],[1120,31],[1175,23],[1226,11],[1249,4],[1222,5],[1212,5],[1205,3],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1205,0],[1296,3],[1296,0],[1296,4],[1296,3],[1296,0],[1296,0],[1296,0],[1296,0],[1294,9],[1294,0],[1294,0]],
[[1521,6],[1521,0],[1423,13],[1413,16],[1422,15],[1468,16],[1502,12],[1483,21],[1424,17],[1447,11],[1450,12],[1495,5],[1502,3],[1502,0],[1502,0],[1502,0],[1506,7],[1448,27],[1599,31],[1790,33],[1813,71],[1829,91],[1531,47],[1499,17],[1473,7],[1473,0],[1465,12],[1482,42],[1547,57],[1570,60],[1564,61],[1545,72],[1523,80],[1533,81],[1517,82],[1490,77],[1459,69],[1472,66],[1476,74],[1472,97],[1450,61],[1471,30],[1444,21],[1490,28],[1489,44],[1415,34],[1451,28],[1687,8],[1683,11],[1447,37],[1419,40],[1450,40],[1436,49],[1438,48],[1424,51],[1417,60],[1422,61],[1433,61],[1429,61],[1425,61],[1414,63],[1412,64],[1415,67],[1427,68],[1433,64],[1433,61],[1427,60],[1428,60],[1422,60],[1417,60],[1414,61],[1415,61],[1415,61],[1416,60],[1419,57],[1417,58],[1410,58],[1408,56],[1404,53],[1405,53],[1411,52],[1407,51],[1407,50],[1402,50],[1406,50],[1398,51],[1397,55],[1402,51],[1435,40],[1406,53],[1405,60],[1393,61],[1385,60],[1372,58],[1371,58],[1369,55],[1417,29],[1424,27],[1420,30],[1412,30],[1408,26],[1394,11],[1359,12],[1603,10],[1603,0]],
];
// [fréquence, départ, durée, volume, forme d'onde, fréquence finale (glissando)] ; forme 'curve' : le dernier champ est une liste [temps, Hz, volume]
const SFX = {
  // caisse enregistreuse, calée sur la mesure d'un enregistrement : cliquetis du mécanisme, frappe de clochette (2100 Hz + partiels
  // inharmoniques à ×2,3 et ×3,5), puis claquement du tiroir qui refait sonner la clochette
  tickets: [
    [5000, 0.05, 0.03, 0.1, 'noise'], [4500, 0.08, 0.03, 0.12, 'noise'], [5000, 0.11, 0.03, 0.12, 'noise'], // cliquetis
    [2100, 0.13, 0.15, 0.04, 'sine'], [2100, 0.13, 1.3, 0.03, 'sine'], [4800, 0.13, 0.3, 0.025, 'sine'], [7450, 0.13, 0.15, 0.009, 'sine'], // clochette
    [5500, 0.44, 0.1, 0.28, 'noise'], [2100, 0.45, 0.5, 0.02, 'sine'], [4800, 0.45, 0.15, 0.01, 'sine'], // claquement du tiroir
  ],
  // actions du joueur
  upgrade: [[523, 0, 0.3, 0.09, 'triangle'], [659, 0.1, 0.3, 0.09, 'triangle'], [784, 0.2, 0.3, 0.09, 'triangle'], [1047, 0.3, 0.9, 0.09, 'triangle']], // petite fanfare
  hire: [[587, 0, 0.3, 0.09, 'triangle'], [880, 0.12, 0.6, 0.09, 'triangle']], // deux notes montantes
  goal: [[523, 0, 0.2, 0.09, 'triangle'], [659, 0.12, 0.2, 0.09, 'triangle'], [784, 0.24, 0.2, 0.09, 'triangle'], [1047, 0.36, 0.2, 0.09, 'triangle'],
    [784, 0.6, 0.15, 0.09, 'triangle'], [1047, 0.72, 0.15, 0.09, 'triangle'], [1319, 0.84, 1.1, 0.09, 'triangle'], [1047, 0.84, 1.1, 0.05, 'triangle']], // fanfare d'objectif
  fire: [[440, 0, 0.3, 0.08, 'triangle'], [294, 0.15, 0.7, 0.08, 'triangle']], // deux notes descendantes
  piano: [[523, 0, 0.6, 0.05, 'triangle'], [659, 0.25, 0.6, 0.05, 'triangle'], [784, 0.5, 0.9, 0.05, 'triangle']], // arpège de piano
  stock: [[1319, 0, 0.15, 0.08, 'triangle'], [1976, 0.07, 0.4, 0.08, 'triangle']], // tintement de caisse
  // jour / nuit
  rooster: ROOSTER.map((frames) => [0, 0, frames.length * 0.02, 0.07, 'curve', frames.map(([f, a], i) => [i * 0.02, f, a / 99])]), // trois sinus qui suivent la mesure
  owl: OWL_HOOTS.map(([start, pts]) => [0, start, pts.at(-1)[0], 0.09, 'curve', pts]), // sinus pur, hauteur et volume suivent la mesure
  // annonces
  jingle: [[659, 0, 0.3, 0.07, 'triangle'], [523, 0.22, 0.3, 0.07, 'triangle'], [784, 0.44, 0.3, 0.07, 'triangle'], [659, 0.66, 0.7, 0.07, 'triangle']], // arrivée d'un train
  // événements
  good: [[784, 0, 0.15, 0.07, 'triangle'], [1047, 0.1, 0.45, 0.07, 'triangle']],
  bad: [[262, 0, 0.25, 0.07, 'triangle'], [196, 0.15, 0.5, 0.07, 'triangle']],
  delay: [[440, 0, 0.25, 0.08, 'triangle'], [440, 0.3, 0.25, 0.08, 'triangle'], [330, 0.6, 0.7, 0.08, 'triangle']],
  fault: [[180, 0, 0.15, 0.05, 'square'], [180, 0.2, 0.15, 0.05, 'square'], [140, 0.4, 0.4, 0.05, 'square']],
};
const SFX_CAT = { tickets: 'tickets', piano: 'ambiance', upgrade: 'actions', hire: 'actions', fire: 'actions', stock: 'actions', goal: 'events', rooster: 'night', owl: 'night', jingle: 'announce', good: 'events', bad: 'events', delay: 'events', fault: 'events' };
const play = (name) => { if (sound.on && sound.cats[SFX_CAT[name]] && sound.ctx?.state === 'running') SFX[name].forEach((n) => tone(...n)); };
function soundButton() {
  $('#sound').textContent = sound.on ? '🔊' : '🔇';
  $('#sound').dataset.tip = 'Réglages du son';
  $('#sound').ariaLabel = $('#sound').dataset.tip;
}
function setSound() {
  soundButton();
  try { localStorage.setItem('aligato-sound', JSON.stringify({ on: sound.on, cats: sound.cats })); } catch { /* stockage indisponible */ }
  if (sound.on) audio().resume();
  ambience();
}
// panneau : interrupteur général + une case par catégorie
const SOUND_PREVIEW = { ambiance: 'piano', tickets: 'tickets', actions: 'upgrade', night: ['rooster', 'owl'], announce: 'jingle', events: 'good' };
const soundPanel = $('#soundPanel');
// preview : son joué quand on coche la case (pas quand on la décoche) ; une liste est jouée en alternance
const soundBox = (label, checked, onchange, preview) => {
  let n = 0;
  const l = document.createElement('label'), c = document.createElement('input');
  c.type = 'checkbox';
  c.checked = checked;
  c.onchange = () => {
    onchange(c.checked);
    setSound();
    soundPanel.classList.toggle('off', !sound.on);
    if (c.checked && sound.on && preview) audio().resume().then(() => play(Array.isArray(preview) ? preview[n++ % preview.length] : preview));
  };
  l.append(c, ` ${label}`);
  return l;
};
soundPanel.append(soundBox('Son', sound.on, (v) => (sound.on = v)), ...Object.entries(SOUND_CATS).map(([k, label]) => soundBox(label, sound.cats[k], (v) => (sound.cats[k] = v), SOUND_PREVIEW[k])));
soundPanel.classList.toggle('off', !sound.on);
soundPanel.firstChild.classList.add('master');
soundPanel.addEventListener('beforetoggle', (e) => {
  if (e.newState !== 'open') return;
  const r = $('#sound').getBoundingClientRect();
  soundPanel.style.cssText = `right:${innerWidth - r.right}px;bottom:${innerHeight - r.top + 8}px`;
});
soundButton();
// son mémorisé : il reprend au premier clic ou à la première touche
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (sound.on) setSound(); }, { once: true });

// ---------- Interface ----------
// view : fenêtre ouverte au clic sur la notification
// sfx : son joué avec la notification, réservé aux événements (les alertes répétées restent silencieuses)
function toast(msg, kind = '', view = null, sfx = null) {
  if (SFX[sfx]) play(sfx);
  const box = $('#toasts'), el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  if (kind === 'goal') {
    const colors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#ff8c42'];
    for (let i = 0; i < 12; i++) {
      const c = document.createElement('i');
      c.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.6}s;--spin:${(Math.random() * 720 - 360) | 0}deg`;
      el.append(c);
    }
  }
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
    if (m === 30 && t < 1440 && hasExtra(h)) return `${pad(h)}:30 · renfort`;
    if (m === 0 && hasTrain(h)) return `${pad(h)}:00${t < 1440 ? tag(S.plan.types[h]) : ''}`;
  }
  return '—';
}

const HUD = {
  budget: () => money(S.budget),
  day: () => S.day,
  clock: clockStr,
  pax: () => `${fmt(S.today.passengers)} / ${fmt(S.plan.total)}`,
  goalTitle: () => (S.goal < GOALS.length ? `Objectif ${S.goal + 1}/${GOALS.length}` : currentChallenge().title),
  goalText: () => GOALS[S.goal]?.text ?? currentChallenge().text,
  waiting: () => fmt(displayWaiting()),
  weekday: () => `${seasonOf().icon} ${DAYS[weekday()]}`,
  score: () => fmt(S.score),
  nextTrain,
  weather: () => `${weather().icon} ${weather().name}`,
  freeRooms: () => `${Math.max(0, hotelRooms() - S.today.rooms - S.hotelQueue)} / ${hotelRooms()}`,
  hotelQueue: () => S.hotelQueue,
  sat: () => `${Math.round(satisfaction() * 100)} %`,
  works: () => (S.works ? `${WORKS[S.works.kind].effect} · ${S.works.days} j` : minorNow() ? `${MINOR[S.minor.kind].name} · ${S.minor.until / 60 | 0} h ${pad(S.minor.until % 60)}` : S.builds.length ? `${S.builds.length} en cours` : ''),
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
  const cg = g ?? currentChallenge();
  $('#goalBar').style.width = `${clamp((g ? g.value() : cg.value) / cg.target, 0, 1) * 100}%`;
  const n = UPGRADES.filter((u) => !u.ad && upState(u) === 'ok').length;
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
  $('#worksRow').style.display = S.works || minorNow() || S.builds.length ? '' : 'none';
  if (!S.works && !minorNow() && S.builds.length) $('#worksRow').dataset.tip = S.builds.map((b) => `${UPGRADES.find((u) => u.id === b.id).name} : fin ${buildEnd(b)}`).join('\n');
  else if (S.works) $('#worksRow').dataset.tip = `${WORKS[S.works.kind].name} : encore ${S.works.days} jour(s), ${money(S.works.cost)} par jour`;
  else if (minorNow()) $('#worksRow').dataset.tip = `${MINOR[S.minor.kind].name} fermé pour de petits travaux jusqu'à ${S.minor.until / 60 | 0} h ${pad(S.minor.until % 60)}, sans frais`;
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
  const p = S.plan, need = dayNeed(), R = S.report, tips = [];
  const dayName = DAYS[weekday(p.day)].toLowerCase();
  const ns = seasonOf(p.day);
  if (p.day > 1 && ns !== seasonOf(p.day - 1)) {
    tips.push(`${ns.icon} ${ns.name === 'Été' ? 'L\'été' : ns.name === 'Automne' ? 'L\'automne' : ns.name === 'Hiver' ? 'L\'hiver' : 'Le printemps'} commence demain : `
      + { 'Printemps': 'retour à la normale, quelques averses.', 'Été': 'vacances, plus de touristes et de chambres, moins de travailleurs, fortes chaleurs.',
        'Automne': 'beaucoup de pluie : prévoyez des abris.', 'Hiver': 'neige fréquente et moins de voyageurs : abris et salle d\'attente indispensables.' }[ns.name]);
  }
  if (p.weekend) tips.push(`🌞 Ce ${dayName}, pas d'express : les voyageurs de loisir restent plus à l'hôtel et mangent davantage. Prévoyez chambres et repas.`);
  else if (weekday(p.day) === 0) tips.push(`💼 Lundi, les travailleurs reviennent (express à 6 h 30, 7 h 30, 17 h 30, 18 h 30) : ils boivent beaucoup de café.`);
  // les conseils ne proposent que des améliorations qu'il reste à acheter
  const left = (id) => { const u = UPGRADES.find((x) => x.id === id); return u.level() < u.max; };
  const ideas = (list) => list.filter(([id]) => left(id)).map(([, text]) => text);
  const shelter = ideas([['shelters', 'des abris'], ['canopy', 'l\'extension des abris'], ['waitroom', 'la salle d\'attente']]);
  if (weather().severity && shelterCap() < p.peak && shelter.length) {
    tips.push(`${weather().icon} ${weather().name} prévue : seulement ${shelterCap()} voyageurs à l'abri sur ${p.peak} au plus fort. Pensez à ${link(shelter.join(', '), 'upgrades')}.`);
  }
  if (S.ad) tips.push(`📣 Campagne ${ADS[S.ad - 1].name.toLowerCase()} demain : clientèle +${Math.round(ADS[S.ad - 1].boost * 100)} %.`);
  if (S.budget < 0) tips.push(`💸 Budget négatif : faillite si c'est encore le cas dans ${DEBT_DAYS - S.debtDays} soir(s). Réduisez l'effectif ou montez le prix.`);
  const n = UPGRADES.filter((u) => !u.ad && upState(u) === 'ok').length;
  if (n) tips.push(`🏗️ ${link(`${n} amélioration(s) à votre portée`, 'upgrades')}.`);
  const best = bestTarif();
  if (Math.abs(best - S.tarif) >= 10) {
    tips.push(`💲 ${link(`${best > S.tarif ? 'Montez' : 'Baissez'} le prix vers ${money(best * PRICE_PER_POINT)}`, 'prices')} : c'est le billet le plus rentable demain.`);
  }
  const bigger = ideas([['quai', 'agrandir le quai'], ['wagon', 'ajouter des wagons'], ['waitroom', 'agrandir la salle d\'attente'], ['track2', 'ouvrir la seconde voie']]);
  if (p.potential > p.classicCap * 1.05 && bigger.length) tips.push(`🚦 La gare est saturée : ${link(bigger.join(', '), 'upgrades')} pour accueillir plus de voyageurs.`);
  for (const [k, r] of Object.entries(STAFF)) {
    const d = need[k] - S.staff[k];
    if (d > 0) tips.push(`${r.icon} Il manquera ${d} ${r.name.toLowerCase()} demain : ${link('embauchez', 'staff')} avant le premier train.`);
    else if (d < 0) tips.push(`${r.icon} ${link(`${-d} ${r.name.toLowerCase()} en trop`, 'staff')} : ${money(-d * r.salary)} de salaires inutiles par jour.`);
  }
  if (R?.refused) {
    tips.push(hotelRooms() <= R.rooms // hôtel plein : le personnel n'y peut rien
      ? `🏨 L'hôtel est plein : ${link('montez le prix des chambres', 'prices')}${S.svc.partner ? '' : ` ou prenez un ${link('hôtel partenaire', 'upgrades')}`}.`
      : `🏨 Des clients ont été refusés à l'hôtel : ajoutez du ${link('personnel d\'hôtel', 'staff')}${(left('checkin') || left('hotel')) ? `, une ${link('borne de check-in ou un étage', 'upgrades')}` : ''}.`);
  }
  if (S.dirt > 40) tips.push(`🧹 Le quai est sale : cela fait baisser l'appréciation. ${link('Renforcer l\'entretien', 'staff')}`);
  for (const k of expect(p).stockShort) {
    tips.push(`${PRODUCTS[k].icon} Les distributeurs de ${PRODUCTS[k].name.toLowerCase()} seront vides avant la fin de journée : ${link(S.vending[k] < VENDING_MAX ? 'ajoutez-en un ou remplissez-les' : 'remplissez-les', 'stocks')} en journée.`);
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
          ${R.partner ? row('Envoyés à l\'hôtel partenaire', fmt(R.partner)) : ''}
          ${row('Clients satisfaits', `${Math.round(R.sat * 100)} %`, R.sat >= 0.9 ? 'good' : R.sat < 0.75 ? 'bad' : '')}
          ${row('Recettes', money(R.revenue))}
          ${row('Frais', money(R.total))}
          <div class="row"><span>Résultat</span>${net(R.revenue - R.total)}</div>
          ${row('Appréciation', `${stars(R.repStart)} → ${stars(R.repEnd)}`, R.repEnd >= R.repStart ? 'good' : 'bad')}
          ${row('Points du jour', `${R.points} / 200`)}
          ${row('Score total', fmt(S.score) + (R.record ? ' 🏆 record' : ''), R.record ? 'good' : '')}</section>
        <section><h3>Objectifs</h3>
          ${R.goals.map((x) => `<p class="win">🎯 <b>${x.text}</b><small>Débloqué : ${x.unlocks}</small></p>`).join('')}
          ${(R.challenges ?? []).map((t) => `<p class="win"><b>${t}</b></p>`).join('')}
          ${g ? `<p><b>▶️ ${g.text}</b></p><span class="bar"><i style="width:${clamp(g.value() / g.target, 0, 1) * 100}%"></i></span>`
            : ((c) => `<p><b>▶️ ${c.text}</b></p><span class="bar"><i style="width:${clamp(c.value / c.target, 0, 1) * 100}%"></i></span>`)(currentChallenge())}</section>
        <section><h3>Demain · ${DAYS[weekday(S.plan.day)]} ${seasonOf(S.plan.day).icon}</h3>
          ${row('Météo', `${weather().icon} ${weather().name}`)}
          ${row('Voyageurs prévus', fmt(S.plan.total))}
          ${S.plan.commuterTotal ? row('dont travailleurs', fmt(S.plan.commuterTotal)) : row('Week-end', 'pas d\'express')}
          ${row('Capacité', fmt(S.plan.capacity))}
          ${row('Recettes prévues', money(m.revenue))}
          ${row('Frais prévus', money(m.costs))}
          <div class="row"><span>Résultat prévu</span>${net(m.revenue - m.costs)}</div></section>
      </div>
      ${worksOffers()}
      ${tips.length ? `<div class="tips"><h3>Conseils</h3><ul>${tips.map((t) => `<li>${t}</li>`).join('')}</ul></div>` : ''}
      <div class="actions"><button class="primary" data-act="close">Commencer le jour ${S.day} ▶</button></div>`;
    },
  },
  start: {
    title: '🌅 Début de journée',
    html: () => `<p class="hint">Réglez les prix de la première journée avant l'ouverture : ils resteront fixes jusqu'au soir. Les onglets permettent aussi d'embaucher, d'acheter et de remplir les stocks.</p>${VIEWS.prices.html()}`,
    bind() { VIEWS.prices.bind(); },
  },
  prices: {
    title: '💲 Tarifs',
    html: () => `${S.night ? '' : '<p class="hint">🌙 Les tarifs se règlent en fin de journée et restent fixes pendant la journée.</p>'}
      <label class="field"><span>Prix du billet</span><output id="tarifOut"></output>
        <input type="range" id="tarif" min="1" max="100" value="${S.tarif}" ${S.night ? '' : 'disabled'}></label>
      <div class="callout" id="pricePreview"></div>
      <label class="field"><span>Prix des chambres</span><output id="roomOut"></output>
        <input type="range" id="roomTarif" min="50" max="200" step="5" value="${S.roomTarif}" ${S.night ? '' : 'disabled'}></label>
      <div class="callout" id="roomPreview"></div>`,
    bind() {
      // le soir, le plan de la journée qui commence suit le prix (même météo) ; la fraude, donc les contrôleurs, en dépend aussi
      $('#tarif').oninput = (e) => { S.tarif = +e.target.value; S.plan = makePlan(true, S.plan.day, S.plan.weather); this.refresh(); };
      $('#roomTarif').oninput = (e) => { S.roomTarif = +e.target.value; resetNeed(); this.refresh(); };
      // ne dépendent pas des curseurs : calculés une fois à l'ouverture
      this.best = bestTarif();
      this.bestRoom = bestRoomTarif();
      this.refresh();
    },
    refresh() {
      const p = makePlan(false, planDay()), saturated = p.potential > p.classicCap, e = expect(p);
      $('#tarifOut').textContent = `${money(ticketPrice())}`;
      $('#roomOut').textContent = `${money(roomPrice())} en moyenne`;
      const cap = hotelRooms(), wanted = expect(p).roomDemand;
      $('#roomPreview').innerHTML = `
        ${row('Demandes de chambres prévues demain', `${fmt(wanted)} <small>/ ${cap} chambres</small>`, wanted > cap ? 'bad' : '')}
        ${row('Prix des chambres le plus rentable', `${this.bestRoom} %`, Math.abs(this.bestRoom - S.roomTarif) < 10 ? 'good' : '')}
        <p class="hint">${wanted > cap
          ? '🏨 L\'hôtel sera plein : montez le prix des chambres, vous gagnerez plus sans le vider.'
          : '🛏️ Il reste des chambres : un prix plus bas attire plus de clients.'} Le prix des chambres est fixé pour la journée.</p>`;
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
          Le prix du billet est fixé pour la journée.</p>`;
    },
  },
  stocks: {
    title: '🛒 Stocks & distributeurs',
    html: () => {
      const e = expect(S.plan);
      return `<p class="hint">Chaque visiteur peut acheter un café, un repas ou un souvenir. Un distributeur vide fait des clients mécontents.
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
      const today = dayNeed(), tomorrow = expect(makePlan(false, planDay())).need, idle = idleStaff();
      return `<p class="hint">L'effectif conseillé est calculé d'après les voyageurs prévus. Embauche ${money(HIRE_FEE)}, licenciement ${money(SEVERANCE)}. ${S.night ? '' : '🌙 Embauches et licenciements en fin de journée.'}</p>`
        + staffRoles().map(([k, r]) => `
        <div class="staff-row">
          <div><b>${r.icon} ${r.name}</b>
            <small>${money(r.salary)} / jour · ${r.info()}${idle[k] ? ` · 🛠️ ${idle[k]} au chômage technique` : ''}</small>
            <small>Conseillé : <span class="${adviceCls(S.staff[k], today[k])}">${today[k]} ${S.night ? (S.report ? 'demain' : 'jour 1') : 'aujourd\'hui'}</span> · ${tomorrow[k]} ${S.night ? 'ensuite' : 'demain'}</small></div>
          <button data-act="fire:${k}" ${!S.night || S.staff[k] <= r.min() ? 'disabled' : ''}>−</button>
          <span class="n">${S.staff[k]}</span>
          <button data-act="hire:${k}" ${!S.night || S.staff[k] >= STAFF_MAX || S.budget < HIRE_FEE ? 'disabled' : ''}>+</button>
        </div>`).join('');
    },
  },
  upgrades: {
    title: '🏗️ Améliorations',
    html: () => '<p class="hint">Les agrandissements attirent plus de voyageurs dès le lendemain. Achats en fin de journée, livrés après un chantier (selon le prix) ou une courte installation, une amélioration de chaque type par soir. Atteignez les objectifs pour en débloquer d\'autres.</p><div class="ups">'
      + [...UPGRADES].sort((a, b) => upReq(a) - upReq(b) || a.cost(a.level()) - b.cost(b.level())).map((u) => { // par objectif à atteindre, puis par prix
        const st = upState(u), l = u.level();
        const action = st === 'max' ? `<span class="tag">${u.tag ?? '✓ Acquis'}</span>`
          : st === 'locked' ? `<span class="tag">🔒 Objectif ${upReq(u)}</span>`
          : st === 'pre' ? `<span class="tag">🔒 ${u.preText()}</span>`
          : st === 'building' ? `<span class="tag" title="${isSite(u.id) ? 'Le chantier se termine' : 'L\'installation se termine'} ${buildEnd(buildOf(u.id))}">${isSite(u.id) ? '🚧' : '🔧'} Fin ${buildEnd(buildOf(u.id))}</span>`
          : st === 'day' ? '<span class="tag" title="Les achats se font en fin de journée">🌙 Ce soir</span>'
          : st === 'today' ? '<span class="tag" title="Une amélioration de chaque type par soir">✓ Acheté ce soir</span>'
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
    }).join('') + '</ol>' + challengesHtml(),
  },
  report: {
    title: '📊 Bilan & prévisions',
    html: () => {
      const t = expect(S.plan), m = expect(makePlan(false, planDay())), R = S.report;
      const net = (v) => `<b class="${v >= 0 ? 'good' : 'bad'}">${money(v)}</b>`;
      return `${worksBlock()}<div class="cols">
        <section><h3>Aujourd'hui</h3>
          ${row('Voyageurs prévus', fmt(S.plan.total))}
          ${row('Déjà transportés', fmt(S.today.passengers))}
          ${row('Recettes prévues', money(t.revenue))}
          ${row('Frais prévus', money(t.costs))}
          <div class="row"><span>Résultat prévu</span>${net(t.revenue - t.costs)}</div></section>
        <section><h3>Demain</h3>
          ${row('Voyageurs prévus', fmt(makePlan(false, planDay()).total))}
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
const TABS = { start: '🌅 Début de journée', summary: '🌙 Fin de journée', report: '📊 Bilan', goals: '🎯 Objectifs', upgrades: '🏗️ Améliorations', prices: '💲 Tarifs', staff: '👥 Personnel', stocks: '🛒 Stocks' };
$('#modalTabs').innerHTML = Object.entries(TABS).map(([k, label]) => `<button data-tab="${k}">${label}</button>`).join('');
$('#modalTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) openModal(b.dataset.tab); });
function renderModal() {
  for (const b of $('#modalTabs').children) {
    b.classList.toggle('active', VIEWS[b.dataset.tab] === view);
    // le bilan du soir n'existe que le soir ; « Début de journée » seulement avant le premier jour
    b.hidden = (b.dataset.tab === 'summary' && !(S.night && S.report)) || (b.dataset.tab === 'start' && !(S.night && !S.report));
  }
  $('#modalClose').hidden = S.night;
  $('#modalTitle').textContent = view.title;
  // le bilan du soir a déjà son propre bouton
  $('#modalBody').innerHTML = view.html() + (S.night && view !== VIEWS.summary ? `<div class="actions"><button class="primary" data-act="close">Commencer le jour ${S.day} ▶</button></div>` : '');
  view.bind?.();
}
modal.addEventListener('close', () => { S.night = false; if (!S.over) setSpeed(resumeSpeed); });
modal.addEventListener('click', (e) => { if (e.target === modal && !S.night) modal.close(); }); // le soir, seul « Commencer le jour » ferme
modal.addEventListener('cancel', (e) => { if (S.night) e.preventDefault(); }); // touche Échap
$('#modalClose').onclick = () => modal.close();
document.querySelectorAll('[data-modal]').forEach((b) => { b.onclick = () => openModal(b.dataset.modal); });
// toucher : un tap affiche l'infobulle (pas de survol) ; un tap sur l'encart le déplie
document.addEventListener('click', (e) => {
  if (!matchMedia('(hover: none)').matches) return; // à la souris, le survol suffit
  const t = e.target.closest('.stat[data-tip], .overlay [data-tip]');
  document.querySelectorAll('.tip-open').forEach((x) => x !== t && x.classList.remove('tip-open'));
  t?.classList.toggle('tip-open');
});
$('.overlay').addEventListener('click', (e) => e.currentTarget.classList.toggle('open'));

$('#modalBody').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const [act, key] = btn.dataset.act.split(':');
  if (act === 'close') return modal.close();
  if (act === 'open') return openModal(key);
  if (act === 'works') acceptWorks();
  const before = S.budget;
  if (act === 'refill') refill(key);
  if (act === 'repair' && S.budget >= 1500) {
    S.broken[key] = false;
    S.budget -= 1500;
    toast(`🔧 Distributeur de ${PRODUCTS[key].name.toLowerCase()} réparé : −${money(1500)}`, 'warn');
  }
  if (act === 'vending' && S.vending[key] < VENDING_MAX && S.budget >= VENDING_PRICE) {
    S.vending[key]++;
    resetNeed();
    S.budget -= VENDING_PRICE;
  }
  if (act === 'hire' && S.night && S.staff[key] < STAFF_MAX && S.budget >= HIRE_FEE) {
    S.staff[key]++;
    S.budget -= HIRE_FEE;
    toast(`${STAFF[key].icon} Embauche d'${STAFF[key].one} : −${money(HIRE_FEE)}, puis ${money(STAFF[key].salary)} de salaire par jour`, 'warn');
  } else if (act === 'fire' && S.night && S.staff[key] > STAFF[key].min()) {
    S.staff[key]--;
    S.budget -= SEVERANCE;
    toast(`${STAFF[key].icon} Licenciement d'${STAFF[key].one} : −${money(SEVERANCE)} d'indemnités, ${money(STAFF[key].salary)} de salaire économisé par jour`, 'warn');
  } else if (act === 'buy') {
    const u = UPGRADES.find((x) => x.id === key);
    if (upState(u) !== 'ok') return;
    buyUpgrade(u);
    if (u.ad) S.plan = makePlan(true, S.day, S.plan.weather); // S.day est déjà celui de demain ; le plan a été tiré avant la campagne
    toast(u.ad ? `${u.icon} ${u.name} : c'est fait !` : `${isSite(u.id) ? '🚧' : '🔧'} ${u.name} : ${buildWord(u.id)} lancé${isSite(u.id) ? '' : 'e'}, fin ${buildEnd(buildOf(u.id))}`, u.ad ? 'good' : 'warn');
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
    if (!d.v && d.canopy) S.canopy = 2; // sauvegarde d'avant l'extension à deux niveaux : elle couvrait tout le grand quai
    S.v = 2;
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
  removeEventListener('pagehide', save); // sinon le rechargement réécrit la sauvegarde qu'on vient d'effacer
  clearSave();
  location.reload();
};

const resumed = load();
if (resumed) {
  rebuild();
  toast(`Partie reprise : ${DAYS[weekday()].toLowerCase()}, jour ${S.day}.`, 'good');
  if (S.night) openModal(S.report ? 'summary' : 'start'); // rechargé en pleine fin de journée ou avant le premier jour
} else {
  S.plan = makePlan();
  Object.assign(S.staff, expect(S.plan).need); // effectif de départ adapté à la demande prévue
  toast(`Bienvenue, directeur ! Aujourd'hui, ${fmt(S.plan.total)} voyageurs attendus.`);
}

// ---------- Première journée guidée (une seule fois, jeu en pause) ----------
const TUTORIAL = [
  ['.stat.goal', '🎯 Votre objectif du moment. Chaque objectif atteint débloque de nouvelles améliorations.'],
  ['.overlay', '👀 L\'état de la gare en direct : prochain train, voyageurs à quai, hôtel, clients satisfaits et stocks. Survolez les jauges pour le détail.'],
  ['.toolbar [data-modal="upgrades"]', '🏗️ Bancs, abris, quai, hôtel… Achats en fin de journée, un niveau de chaque type par soir.'],
  ['.toolbar [data-modal="prices"]', '💲 Le prix du billet : bas, il attire du monde ; haut, il rapporte plus par voyageur. Il se règle en fin de journée.'],
  ['.toolbar [data-modal="staff"]', '👥 Le personnel conseillé est calculé pour vous ; embauches le soir. Un guichetier manquant, et des voyageurs restent à quai.'],
  ['.toolbar [data-modal="stocks"]', '🛒 Cafés, repas et souvenirs : un distributeur vide fait des mécontents. Ajoutez-en dès que possible.'],
  ['#repStat', '⭐ Survolez la note pour savoir ce qui plaît ou déplaît aux voyageurs. À minuit, un bilan vous attend. Bon jeu !'],
];
function startTutorial() {
  try { if (localStorage.getItem('aligato-tuto')) return false; } catch { return false; }
  const box = document.createElement('div');
  box.className = 'coach';
  document.body.append(box);
  let i = 0, target = null;
  const end = () => {
    target?.classList.remove('coach-target');
    box.remove();
    try { localStorage.setItem('aligato-tuto', '1'); } catch { /* stockage indisponible */ }
    openStart();
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
  return true;
}
// nouvelle partie : panneau « Début de journée » (après la visite guidée) pour régler les tarifs avant l'ouverture
function openStart() { S.night = true; openModal('start'); }
if (!resumed && !startTutorial()) openStart();
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
  updateArrivals();
  updateFloats(dt / 1000);
  render(now / 1000);
  if ((uiTimer += dt) > 150) { uiTimer = 0; updateHUD(); }
  requestAnimationFrame(frame);
}
updateHUD();
requestAnimationFrame(frame);
