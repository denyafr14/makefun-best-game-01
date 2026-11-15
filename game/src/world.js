// The world: the player, the hearth, the shadows, the bullets, the shards and
// the waves. Pure state plus a fixed-step update; it knows nothing about the
// canvas. Events are a bitmask the main loop reads for sounds and announcements.
import { ENEMY_KINDS, FIELD, HEARTH, HEARTH_MAX, PLAYER, UPGRADE_POOL, WIN_WAVE, wavePlan } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_FOE_DOWN = 2;
export const EVENT_SHARD = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_OVER = 16;
export const EVENT_WIN = 32;
export const EVENT_HEARTH_HIT = 64;
export const EVENT_DASH = 128;

const TWO_PI = Math.PI * 2;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function spawnEdge(random) {
  const side = random.int(0, 3);
  const margin = 30;
  if (side === 0) return { x: random.range(0, FIELD.width), y: -margin };
  if (side === 1) return { x: FIELD.width + margin, y: random.range(0, FIELD.height) };
  if (side === 2) return { x: random.range(0, FIELD.width), y: FIELD.height + margin };
  return { x: -margin, y: random.range(0, FIELD.height) };
}

export function createWorld(random) {
  const state = {
    player: { x: FIELD.width / 2, y: FIELD.height / 2 + 130, angle: -Math.PI / 2 },
    health: PLAYER.maxHealth,
    maxHealth: PLAYER.maxHealth,
    hearth: HEARTH_MAX,
    score: 0,
    shards: 0,
    wave: 0,
    kills: 0,
    time: 0,
    // Upgradeable stats; upgrades mutate these, never the config.
    stats: {
      speed: PLAYER.speed,
      fireInterval: PLAYER.fireInterval,
      bulletDamage: PLAYER.bulletDamage,
      bullets: 1,
      pierce: 0,
      pickupRadius: PLAYER.pickupRadius,
      dashCooldown: PLAYER.dashCooldown,
    },
    enemies: [],
    bullets: [],
    shardsList: [],
    particles: [],
    floaters: [],
    spawnQueue: 0,
    spawnTimer: 0,
    waveActive: false,
    betweenWaves: false,
    dashTime: 0,
    dashCooldownLeft: 0,
    fireTimer: 0,
    shake: 0,
    won: false,
    over: false,
  };

  function reset() {
    state.player.x = FIELD.width / 2;
    state.player.y = FIELD.height / 2 + 130;
    state.player.angle = -Math.PI / 2;
    state.health = PLAYER.maxHealth;
    state.maxHealth = PLAYER.maxHealth;
    state.hearth = HEARTH_MAX;
    state.score = 0;
    state.shards = 0;
    state.wave = 0;
    state.kills = 0;
    state.time = 0;
    state.stats.speed = PLAYER.speed;
    state.stats.fireInterval = PLAYER.fireInterval;
    state.stats.bulletDamage = PLAYER.bulletDamage;
    state.stats.bullets = 1;
    state.stats.pierce = 0;
    state.stats.pickupRadius = PLAYER.pickupRadius;
    state.stats.dashCooldown = PLAYER.dashCooldown;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.shardsList.length = 0;
    state.particles.length = 0;
    state.floaters.length = 0;
    state.spawnQueue = 0;
    state.spawnTimer = 0;
    state.waveActive = false;
    state.betweenWaves = false;
    state.dashTime = 0;
    state.dashCooldownLeft = 0;
    state.fireTimer = 0;
    state.shake = 0;
    state.won = false;
    state.over = false;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, TWO_PI);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: random.range(0.25, 0.6),
        maxLife: 0.6,
        size: random.range(2, 5),
        color,
      });
    }
  }

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function startWave() {
    state.wave += 1;
    const plan = wavePlan(state.wave);
    state.spawnQueue = plan.count;
    state.spawnTimer = 0;
    state.waveActive = true;
    state.betweenWaves = false;
    return plan;
  }

  function spawnEnemy(kindName) {
    const kind = ENEMY_KINDS[kindName];
    const pos = spawnEdge(random);
    const scale = 1 + (state.wave - 1) * 0.04;
    state.enemies.push({
      kind: kindName,
      x: pos.x,
      y: pos.y,
      radius: kind.radius,
      speed: kind.speed * random.range(0.85, 1.15),
      health: kind.health * scale,
      maxHealth: kind.health * scale,
      damage: kind.damage,
      score: kind.score,
      shards: kind.shards,
      color: kind.color,
      ranged: !!kind.ranged,
      shootTimer: random.range(1.2, 2.4),
      hitFlash: 0,
      wobble: random.range(0, TWO_PI),
    });
  }

  function rollUpgrades() {
    const pool = [...UPGRADE_POOL];
    const picks = [];
    while (picks.length < 3 && pool.length > 0) {
      picks.push(pool.splice(random.int(0, pool.length - 1), 1)[0]);
    }
    return picks;
  }

  function applyUpgrade(upgrade) {
    upgrade.apply(state.stats, state);
  }

  // One fixed step. `move` is the normalized movement input, `aim` the point in
  // field coordinates the player faces, `firing` whether the trigger is held,
  // `dash` whether a dash was requested this step. `attract` runs the title
  // backdrop: shadows drift and fade, nothing can hurt anyone.
  function step(dt, move, aim, firing, dash, attract) {
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);

    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const f of state.floaters) {
      f.y -= 34 * dt;
      f.life -= dt;
    }
    state.floaters = state.floaters.filter((f) => f.life > 0);

    if (attract) {
      // Title backdrop: a few shadows wander toward the hearth and dissolve.
      if (state.enemies.length < 7 && random.next() < dt * 0.8) spawnEnemy(random.pick(['wisp', 'crawler']));
      for (const e of state.enemies) {
        const dx = HEARTH.x - e.x;
        const dy = HEARTH.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * e.speed * 0.5 * dt;
        e.y += (dy / d) * e.speed * 0.5 * dt;
        if (d < HEARTH.radius + 30) {
          burst(e.x, e.y, e.color, 10, 90);
          e.health = 0;
        }
      }
      state.enemies = state.enemies.filter((e) => e.health > 0);
      return events;
    }

    if (state.over || state.won) return events;

    // --- Player movement and dash ---
    const len = Math.hypot(move.x, move.y) || 1;
    const nx = move.x / len;
    const ny = move.y / len;
    const moving = move.x !== 0 || move.y !== 0;
    if (dash && state.dashCooldownLeft <= 0 && moving) {
      state.dashTime = PLAYER.dashTime;
      state.dashCooldownLeft = state.stats.dashCooldown;
      burst(state.player.x, state.player.y, '#ffd97a', 12, 140);
      events |= EVENT_DASH;
    }
    if (state.dashCooldownLeft > 0) state.dashCooldownLeft -= dt;
    const speed = state.dashTime > 0 ? PLAYER.dashSpeed : state.stats.speed;
    if (state.dashTime > 0) state.dashTime -= dt;
    if (moving) {
      state.player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, state.player.x + nx * speed * dt));
      state.player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, state.player.y + ny * speed * dt));
    }
    state.player.angle = Math.atan2(aim.y - state.player.y, aim.x - state.player.x);

    // --- Firing ---
    state.fireTimer -= dt;
    if (firing && state.fireTimer <= 0) {
      state.fireTimer = state.stats.fireInterval;
      const spread = state.stats.bullets > 1 ? 0.14 : 0;
      for (let i = 0; i < state.stats.bullets; i += 1) {
        const offset = (i - (state.stats.bullets - 1) / 2) * spread;
        const angle = state.player.angle + offset;
        state.bullets.push({
          x: state.player.x + Math.cos(angle) * (PLAYER.radius + 6),
          y: state.player.y + Math.sin(angle) * (PLAYER.radius + 6),
          vx: Math.cos(angle) * PLAYER.bulletSpeed,
          vy: Math.sin(angle) * PLAYER.bulletSpeed,
          damage: state.stats.bulletDamage,
          pierce: state.stats.pierce,
          radius: PLAYER.bulletRadius,
          life: 1.1,
        });
      }
    }

    // --- Spawning ---
    if (state.waveActive && state.spawnQueue > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = Math.max(0.25, 0.9 - state.wave * 0.05);
        const plan = wavePlan(state.wave);
        spawnEnemy(random.pick(plan.kinds));
        state.spawnQueue -= 1;
      }
    }

    // --- Enemies ---
    for (const e of state.enemies) {
      if (e.hitFlash > 0) e.hitFlash -= dt;
      e.wobble += dt * 3;
      const dxH = HEARTH.x - e.x;
      const dyH = HEARTH.y - e.y;
      const dH = Math.hypot(dxH, dyH) || 1;
      const dxP = state.player.x - e.x;
      const dyP = state.player.y - e.y;
      const dP = Math.hypot(dxP, dyP) || 1;
      // Shadows chase the nearer of the keeper and the hearth; spitters keep
      // their distance and shoot.
      let tx = dxH / dH;
      let ty = dyH / dH;
      let targetDist = dH;
      if (dP < dH) {
        tx = dxP / dP;
        ty = dyP / dP;
        targetDist = dP;
      }
      if (e.ranged && targetDist < 260) {
        tx = -tx;
        ty = -ty;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && targetDist < 320) {
          e.shootTimer = random.range(1.8, 2.6);
          const angle = Math.atan2(dyP, dxP);
          state.bullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * 190,
            vy: Math.sin(angle) * 190,
            damage: e.damage,
            pierce: 0,
            radius: 5,
            life: 2.2,
            hostile: true,
          });
        }
      } else {
        e.x += tx * e.speed * dt;
        e.y += ty * e.speed * dt;
      }
      // Separation: shadows do not stack on each other.
      for (const other of state.enemies) {
        if (other === e) continue;
        const ox = e.x - other.x;
        const oy = e.y - other.y;
        const od = Math.hypot(ox, oy);
        const min = e.radius + other.radius;
        if (od > 0 && od < min) {
          e.x += (ox / od) * (min - od) * 0.25;
          e.y += (oy / od) * (min - od) * 0.25;
        }
      }
      // Reaching the hearth burns its flame.
      if (dH < HEARTH.radius + e.radius) {
        state.hearth -= e.damage;
        burst(e.x, e.y, '#ffb347', 14, 160);
        floater(HEARTH.x, HEARTH.y - HEARTH.radius - 8, `-${e.damage}`, '#ff9d5c');
        e.health = 0;
        state.shake = Math.min(0.6, state.shake + 0.25);
        events |= EVENT_HEARTH_HIT;
      }
      // Touching the keeper hurts the keeper.
      if (dP < e.radius + PLAYER.radius) {
        state.health -= e.damage;
        burst(state.player.x, state.player.y, '#ff5c7a', 12, 150);
        e.health = 0;
        state.shake = Math.min(0.6, state.shake + 0.3);
        events |= EVENT_HIT;
      }
    }

    // --- Bullets ---
    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.hostile) {
        if (dist(b, state.player) < b.radius + PLAYER.radius) {
          state.health -= b.damage;
          b.life = 0;
          burst(state.player.x, state.player.y, '#ff5c7a', 10, 130);
          events |= EVENT_HIT;
        }
        continue;
      }
      for (const e of state.enemies) {
        if (e.health <= 0) continue;
        if (dist(b, e) < b.radius + e.radius) {
          e.health -= b.damage;
          e.hitFlash = 0.09;
          burst(b.x, b.y, '#ffe9a8', 4, 90);
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.life = 0;
          }
          break;
        }
      }
    }
    state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20);

    // --- Dead foes drop shards ---
    for (const e of state.enemies) {
      if (e.health > 0) continue;
      state.kills += 1;
      state.score += e.score;
      floater(e.x, e.y - 10, `+${e.score}`, '#f2ead8');
      burst(e.x, e.y, e.color, 16, 170);
      for (let i = 0; i < e.shards; i += 1) {
        state.shardsList.push({
          x: e.x + random.range(-14, 14),
          y: e.y + random.range(-14, 14),
          vx: random.range(-40, 40),
          vy: random.range(-40, 40),
          life: 9,
        });
      }
      events |= EVENT_FOE_DOWN;
    }
    state.enemies = state.enemies.filter((e) => e.health > 0);

    // --- Shards drift, then fly to the keeper ---
    for (const s of state.shardsList) {
      s.life -= dt;
      const d = dist(s, state.player);
      if (d < state.stats.pickupRadius * 3.2) {
        const pull = 420 * dt;
        s.x += ((state.player.x - s.x) / (d || 1)) * pull;
        s.y += ((state.player.y - s.y) / (d || 1)) * pull;
      } else {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.92;
        s.vy *= 0.92;
      }
      if (d < PLAYER.radius + 10) {
        s.life = 0;
        state.shards += 1;
        state.score += 2;
        events |= EVENT_SHARD;
      }
    }
    state.shardsList = state.shardsList.filter((s) => s.life > 0);

    // --- Wave cleared? ---
    if (state.waveActive && state.spawnQueue === 0 && state.enemies.length === 0) {
      state.waveActive = false;
      if (state.wave >= WIN_WAVE) {
        state.won = true;
        events |= EVENT_WIN;
      } else {
        state.betweenWaves = true;
        state.shards += 5 + state.wave; // Wave-clear bonus.
        events |= EVENT_WAVE_CLEAR;
      }
    }

    // --- Defeat ---
    if (state.health <= 0 || state.hearth <= 0) {
      state.health = Math.max(0, state.health);
      state.hearth = Math.max(0, state.hearth);
      state.over = true;
      burst(state.player.x, state.player.y, '#ff5c7a', 30, 220);
      events |= EVENT_OVER;
    }

    return events;
  }

  return { state, reset, step, startWave, rollUpgrades, applyUpgrade };
}
