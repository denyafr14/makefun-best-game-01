// Emberkeep: every number that tunes the game lives here, so the balance can be
// read (and changed) in one place. The arena is a fixed logical field; the
// renderer scales it to whatever window the browser opens.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'emberkeep.best';
export const WIN_WAVE = 10;

// The hearth sits in the middle of the field and is what the shadows want.
export const HEARTH = { x: FIELD.width / 2, y: FIELD.height / 2, radius: 42 };
export const HEARTH_MAX = 100;

export const PLAYER = {
  radius: 14,
  speed: 235,
  maxHealth: 100,
  fireInterval: 0.16,
  bulletSpeed: 520,
  bulletDamage: 12,
  bulletRadius: 4,
  dashSpeed: 640,
  dashTime: 0.16,
  dashCooldown: 1.6,
  pickupRadius: 26,
};

export const ENEMY_KINDS = {
  wisp:   { radius: 11, speed: 95,  health: 18, damage: 8,  score: 10, shards: 1, color: '#b78cff' },
  crawler:{ radius: 17, speed: 52,  health: 55, damage: 14, score: 25, shards: 2, color: '#7fe08a' },
  spitter:{ radius: 13, speed: 68,  health: 30, damage: 10, score: 30, shards: 2, color: '#ff9d5c', ranged: true },
  brute:  { radius: 26, speed: 38,  health: 150, damage: 22, score: 60, shards: 4, color: '#ff5c7a' },
};

// Wave n fields this many shadows, picked from the kinds unlocked so far.
export function wavePlan(wave) {
  const count = 6 + wave * 4;
  const kinds = ['wisp'];
  if (wave >= 2) kinds.push('crawler');
  if (wave >= 3) kinds.push('spitter');
  if (wave >= 5) kinds.push('brute');
  return { count, kinds };
}

export const UPGRADE_POOL = [
  { id: 'rapid',   name: 'Quick Wick',    desc: 'Fire 25% faster.',            apply: (p) => { p.fireInterval *= 0.75; } },
  { id: 'heavy',   name: 'Heavy Flame',   desc: '+8 bullet damage.',           apply: (p) => { p.bulletDamage += 8; } },
  { id: 'swift',   name: 'Swift Boots',   desc: '+18% move speed.',           apply: (p) => { p.speed *= 1.18; } },
  { id: 'multishot', name: 'Twin Lantern', desc: 'Fire one extra bullet.',     apply: (p) => { p.bullets += 1; } },
  { id: 'pierce',  name: 'Piercing Light',desc: 'Bullets pass through 1 foe.', apply: (p) => { p.pierce += 1; } },
  { id: 'mend',    name: 'Mend the Hearth', desc: 'Restore 40 hearth flame.', apply: (p, w) => { w.hearth = Math.min(HEARTH_MAX, w.hearth + 40); } },
  { id: 'vitality',name: 'Stout Heart',   desc: '+30 max health, heal 30.',   apply: (p, w) => { p.maxHealth += 30; w.health = Math.min(p.maxHealth, w.health + 30); } },
  { id: 'magnet',  name: 'Ember Magnet',  desc: 'Shards fly to you farther.', apply: (p) => { p.pickupRadius *= 1.8; } },
  { id: 'dash',    name: 'Flicker Step',  desc: 'Dash recharges 40% faster.', apply: (p) => { p.dashCooldown *= 0.6; } },
  { id: 'shard',   name: 'Shard Hoard',   desc: '+25 shards right now.',      apply: (p, w) => { w.shards += 25; } },
];

// The palette: a night garden lit by one warm hearth.
export const PALETTE = {
  background: '#0d1226',
  groundA: '#131a33',
  groundB: '#0f152b',
  grass: '#1d2f4a',
  hearthGlow: '#ffb347',
  hearthCore: '#ffd97a',
  player: '#ffd97a',
  playerRing: '#ff9d2e',
  text: '#f2ead8',
  dimText: '#9aa7c7',
  panel: 'rgba(10, 14, 30, 0.88)',
  panelEdge: '#3a4a7a',
  accent: '#ffb347',
  danger: '#ff5c7a',
  shard: '#ffd94d',
};
