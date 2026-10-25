// Simulation automatique de l'équilibrage : node sim.mjs [parties] [jours]
// Joue des parties complètes sans navigateur, avec une stratégie simple, et vérifie que le jeu reste viable.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const GAMES = +process.argv[2] || 3, DAYS = +process.argv[3] || 56;

// Faux DOM : tout objet du navigateur devient un « bouchon » qui accepte n'importe quel accès ou appel
const stub = new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => 0 : k === Symbol.iterator ? function* () {} : stub),
  apply: () => stub,
  construct: () => stub,
  set: () => true,
});

function newGame() {
  const store = new Map();
  const context = vm.createContext({
    document: stub, window: stub, console, Math, JSON, Number, String, Object, Array, Symbol, Map, Set, Intl, Date,
    performance, requestAnimationFrame: () => 0, setTimeout: () => 0, addEventListener: () => {}, removeEventListener: () => {},
    confirm: () => false, innerWidth: 1440, innerHeight: 820,
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  });
  const code = readFileSync(new URL('./game.js', import.meta.url), 'utf8');
  // expose les variables internes du jeu (déclarées en const) à la simulation
  vm.runInContext(`${code}\nglobalThis.G = { S, stepMinute, UPGRADES, upState, expect, makePlan, PRODUCTS, refill, VENDING_MAX, VENDING_PRICE, GOALS, walkers, acceptWorks };`, context);
  return context.G;
}

// Stratégie d'un joueur raisonnable : tarif selon l'objectif, achats en gardant de quoi payer les frais du soir, effectif conseillé
function play(G, days) {
  const { S } = G, log = [];
  let minBudget = Infinity, goalsDay = null, maxDebtDays = 0;
  for (let d = 0; d < days; d++) {
    S.tarif = S.goal >= 6 ? 25 : S.goal === 4 ? 55 : S.goal >= 3 ? 40 : 50;
    G.acceptWorks(); // le joueur lance les travaux proposés dès le matin
    for (let i = 0; i < 1440; i++) {
      G.stepMinute();
      minBudget = Math.min(minBudget, S.budget);
      if (S.minutes === 22 * 60) {
        // réserve : les frais payés à minuit, plus une marge
        const reserve = G.expect(S.plan).costs + 50000;
        for (const u of G.UPGRADES) {
          if (G.upState(u) === 'ok' && S.budget > u.cost(u.level()) + reserve) {
            S.budget -= u.cost(u.level());
            u.buy();
            S.today.bought[u.id] = true;
          }
        }
        for (const k of G.expect(S.plan).stockShort) {
          if (S.vending[k] < G.VENDING_MAX && S.budget > G.VENDING_PRICE + reserve) { S.vending[k]++; S.budget -= G.VENDING_PRICE; }
        }
        Object.assign(S.staff, G.expect(G.makePlan(false, S.day + 1)).need);
      }
      if (S.minutes === 13 * 60) Object.keys(G.PRODUCTS).forEach(G.refill);
    }
    G.walkers.length = 0;
    maxDebtDays = Math.max(maxDebtDays, S.debtDays);
    const R = S.report;
    log.push({ day: R.day, net: R.revenue - R.total, pax: R.passengers, rep: S.rep, sat: R.sat });
    if (S.goal >= G.GOALS.length && goalsDay === null) goalsDay = R.day;
    if (S.over) break;
  }
  return { log, minBudget, goalsDay, maxDebtDays, over: S.over, score: S.score };
}

const failures = [];
for (let g = 1; g <= GAMES; g++) {
  const r = play(newGame(), DAYS);
  const losses = r.log.filter((d) => d.net < 0);
  const fmt = (v) => Math.round(v).toLocaleString('fr-FR');
  console.log(`Partie ${g} : objectifs ${r.goalsDay ? `au jour ${r.goalsDay}` : 'non atteints'}, budget minimum ${fmt(r.minBudget)} €, `
    + `jours en perte ${losses.length}, résultat moyen ${fmt(r.log.reduce((s, d) => s + d.net, 0) / r.log.length)} €/jour, score ${fmt(r.score)}`);
  if (r.over) failures.push(`partie ${g} : faillite`);
  // un découvert d'un soir est toléré par le jeu ; deux soirs de suite signalent un déséquilibre
  if (r.maxDebtDays >= 2) failures.push(`partie ${g} : découvert ${r.maxDebtDays} soirs de suite`);
  if (losses.length) failures.push(`partie ${g} : ${losses.length} jour(s) en perte (jours ${losses.map((d) => d.day).join(', ')})`);
  if (!r.goalsDay || r.goalsDay > 40) failures.push(`partie ${g} : objectifs ${r.goalsDay ? `trop lents (jour ${r.goalsDay})` : 'non atteints'}`);
}
if (failures.length) {
  console.error(`\n❌ Équilibrage à revoir :\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\n✅ Équilibrage correct');
