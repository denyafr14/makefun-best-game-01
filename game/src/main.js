// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// upgrade (a blessing between waves), paused, game over and victory.
// ?seed=N fixes the falling pattern. ?shot=start|play|upgrade|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP, WIN_WAVE } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_DASH, EVENT_FOE_DOWN, EVENT_HEARTH_HIT, EVENT_HIT, EVENT_OVER, EVENT_SHARD, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, scene.choices);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      window.__shotInfo = { screen: scene.screen, score: world.state.score, wave: world.state.wave, shards: world.state.shards };
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let choices = [];
  let cardRects = null;
  let dashQueued = false;

  // Screen readers (and anyone watching the page's text) hear the screen
  // changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    world.startWave();
    audio.waveHorn();
    announce(`Wave 1 of ${WIN_WAVE}. Keep the hearth burning.`);
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.lose();
    announce(won
      ? `Victory! Score ${world.state.score}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function openUpgrades() {
    choices = world.rollUpgrades();
    screen = SCREEN_UPGRADE;
    audio.upgrade();
    announce(`Wave ${world.state.wave} cleared. Choose a blessing.`);
  }

  function pickUpgrade(index) {
    if (index < 0 || index >= choices.length) return;
    world.applyUpgrade(choices[index]);
    audio.upgrade();
    choices = [];
    screen = SCREEN_PLAY;
    world.startWave();
    audio.waveHorn();
    announce(`Wave ${world.state.wave} of ${WIN_WAVE}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_DASH) dashQueued = true;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        audio.click();
        startGame();
      }
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      const digit = input.takeDigit();
      if (digit >= 1 && digit <= 3) {
        audio.unlock();
        pickUpgrade(digit - 1);
        return;
      }
      if (actions & ACTION_CONFIRM && cardRects) {
        const mouse = input.mouse;
        for (let i = 0; i < cardRects.length; i += 1) {
          const r = cardRects[i];
          if (mouse.x >= r.x && mouse.x <= r.x + r.width && mouse.y >= r.y && mouse.y <= r.y + r.height) {
            audio.unlock();
            pickUpgrade(i);
            return;
          }
        }
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, { x: 0, y: 0 }, false, false, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    const mouse = input.fieldMouse(renderer.scale, renderer.offsetX, renderer.offsetY);
    const dash = dashQueued;
    dashQueued = false;
    const events = world.step(STEP, dir, mouse, input.mouse.down, dash, false);
    if (events & EVENT_HIT) audio.hurt();
    if (events & EVENT_HEARTH_HIT) audio.hearthHit();
    if (events & EVENT_FOE_DOWN) audio.foeDown();
    if (events & EVENT_SHARD) audio.shard();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_WAVE_CLEAR) openUpgrades();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      step();
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    const drawn = renderer.draw(world.state, screen, best, choices);
    if (screen === SCREEN_UPGRADE) cardRects = drawn;
    else cardRects = null;
  }

  // Leaving the tab pauses a running game rather than letting shadows fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // R restarts from wave 1 whenever the game is over or paused.
  window.addEventListener('keydown', (event) => {
    if ((event.key === 'r' || event.key === 'R') && (screen === SCREEN_OVER || screen === SCREEN_WIN || screen === SCREEN_PAUSED)) {
      audio.unlock();
      startGame();
    }
  });

  announce('Emberkeep. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
