// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the
// real rules forward from a fresh world with a seeded generator and a simple
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame. The pilot kites: it shoots the nearest
// shadow and steps away from the nearest one, dashing when cornered. The end
// scene's pilot is reckless — it stands its ground and never dashes — so the
// dark catches it, as it catches a careless player.
import { FIELD, HEARTH, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const LIMIT_SECONDS = 900;

/** The autopilot's decision for one step: where to move, where to aim. */
function autopilot(state, reckless) {
  const p = state.player;
  let nearest = null;
  let nearestDist = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
  }
  if (!nearest) return { move: { x: 0, y: 0 }, aim: { x: p.x, y: p.y - 100 }, firing: false, dash: false };
  const aim = { x: nearest.x, y: nearest.y };
  if (reckless) return { move: { x: 0, y: 0 }, aim, firing: true, dash: false };
  // Step away from the nearest shadow, but drift back toward the hearth so
  // the keeper never gets cornered at the field's edge.
  const awayX = (p.x - nearest.x) / (nearestDist || 1);
  const awayY = (p.y - nearest.y) / (nearestDist || 1);
  const homeX = (HEARTH.x - p.x) / FIELD.width;
  const homeY = (HEARTH.y - p.y) / FIELD.height;
  let mx = awayX + homeX * 0.6;
  let my = awayY + homeY * 0.6;
  // Steer off the field's edges, where shadows corner the keeper.
  const edge = 120;
  if (p.x < edge) mx += (edge - p.x) / edge;
  if (p.x > FIELD.width - edge) mx -= (p.x - (FIELD.width - edge)) / edge;
  if (p.y < edge) my += (edge - p.y) / edge;
  if (p.y > FIELD.height - edge) my -= (p.y - (FIELD.height - edge)) / edge;
  const len = Math.hypot(mx, my) || 1;
  mx /= len;
  my /= len;
  return { move: { x: mx, y: my }, aim, firing: true, dash: nearestDist < 90 };
}

/** Run the world forward for `seconds` with the pilot; returns the events seen. */
function playFor(world, seconds, reckless) {
  let events = 0;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const decision = autopilot(world.state, reckless);
    events |= world.step(STEP, decision.move, decision.aim, decision.firing, decision.dash, false);
    if (events & (EVENT_OVER | EVENT_WIN | EVENT_WAVE_CLEAR)) break;
  }
  return events;
}

/**
 * Set `world` to the named scene and return what to draw: the screen, the
 * best score to show, and (for the upgrade screen) the three blessings.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, { x: 0, y: 0 }, false, false, true);
    return { screen: SCREEN_TITLE, best: 1250 };
  }
  if (name === 'play') {
    // Clear wave 1, then catch wave 2 mid-fight, when the field is busy.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      world.reset();
      world.startWave();
      const cleared = playFor(world, LIMIT_SECONDS, false) & EVENT_WAVE_CLEAR;
      if (!cleared || world.state.over) continue;
      world.startWave();
      playFor(world, 8, false);
      if (!world.state.over) return { screen: SCREEN_PLAY, best: 1250 };
    }
    world.reset();
    world.startWave();
    playFor(world, 10, false);
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'upgrade') {
    world.startWave();
    let events = playFor(world, LIMIT_SECONDS, false);
    if (!(events & EVENT_WAVE_CLEAR)) {
      // The pilot lost wave 1: try once more, then fall back to the wave's
      // cleared state as the game itself would leave it.
      world.reset();
      world.startWave();
      events = playFor(world, LIMIT_SECONDS, false);
    }
    if (!(events & EVENT_WAVE_CLEAR)) {
      world.state.waveActive = false;
      world.state.betweenWaves = true;
      world.state.enemies.length = 0;
      world.state.shards += 12;
    }
    return { screen: SCREEN_UPGRADE, best: 1250, choices: world.rollUpgrades() };
  }
  // end: the reckless pilot is caught, and the defeat screen is what is drawn.
  world.startWave();
  let events = playFor(world, LIMIT_SECONDS, true);
  if (!(events & EVENT_OVER)) {
    world.startWave();
    events = playFor(world, LIMIT_SECONDS, true);
  }
  if (!(events & EVENT_OVER)) {
    world.state.health = 0;
    world.state.over = true;
  }
  return { screen: SCREEN_OVER, best: 1250 };
}

export { SCREEN_WIN };
