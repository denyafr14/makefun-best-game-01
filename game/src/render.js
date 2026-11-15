// Everything the eye sees: the night garden, the hearth's glow, the keeper,
// the shadows, the shards, the particles, the HUD and every menu screen.
// All art is drawn in canvas code; there are no image files.
import { ENEMY_KINDS, FIELD, HEARTH, PALETTE, PLAYER, WIN_WAVE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, fraction, fill, back) {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (fraction > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, fraction)), h, h / 2);
    ctx.fill();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // Draw in CSS pixels from here on; the transform scales to the backing store.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(w / FIELD.width, h / FIELD.height);
    offsetX = (w - FIELD.width * scale) / 2;
    offsetY = (h - FIELD.height * scale) / 2;
  }

  function toScreen(x, y) {
    return { x: offsetX + x * scale, y: offsetY + y * scale };
  }

  function drawBackground(time) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a0e22');
    g.addColorStop(1, '#131a33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Stars.
    ctx.fillStyle = 'rgba(200, 214, 255, 0.7)';
    for (let i = 0; i < 70; i += 1) {
      const sx = ((i * 137.5) % FIELD.width) * scale + offsetX;
      const sy = ((i * 89.3) % FIELD.height) * scale + offsetY;
      const tw = 0.5 + 0.5 * Math.sin(time * 1.5 + i * 1.7);
      ctx.globalAlpha = 0.25 + 0.45 * tw;
      ctx.fillRect(sx, sy, 2 * scale, 2 * scale);
    }
    ctx.globalAlpha = 1;
    // Garden floor: a checker of deep blues with grass tufts.
    const tile = 60;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.groundA : PALETTE.groundB;
        ctx.fillRect(offsetX + tx * tile * scale, offsetY + ty * tile * scale, tile * scale, tile * scale);
      }
    }
    ctx.strokeStyle = 'rgba(90, 120, 190, 0.16)';
    ctx.lineWidth = Math.max(1, scale);
    for (let i = 0; i <= FIELD.width / tile; i += 1) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * tile * scale, offsetY);
      ctx.lineTo(offsetX + i * tile * scale, offsetY + FIELD.height * scale);
      ctx.stroke();
    }
    for (let i = 0; i <= FIELD.height / tile; i += 1) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * tile * scale);
      ctx.lineTo(offsetX + FIELD.width * scale, offsetY + i * tile * scale);
      ctx.stroke();
    }
    // Grass tufts, fixed by a hash of their cell so they never jump.
    ctx.strokeStyle = 'rgba(110, 160, 110, 0.5)';
    ctx.lineWidth = Math.max(1, 1.4 * scale);
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        const h = (tx * 31 + ty * 57) % 7;
        if (h < 3) continue;
        const bx = offsetX + (tx * tile + 14 + h * 5) * scale;
        const by = offsetY + (ty * tile + 40) * scale;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - 3 * scale, by - 9 * scale);
        ctx.moveTo(bx + 4 * scale, by);
        ctx.lineTo(bx + 6 * scale, by - 10 * scale);
        ctx.stroke();
      }
    }
  }

  function drawHearth(state, time) {
    const p = toScreen(HEARTH.x, HEARTH.y);
    const r = HEARTH.radius * scale;
    const flicker = 1 + 0.06 * Math.sin(time * 7) + 0.04 * Math.sin(time * 13);
    const glow = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r * 3.4 * flicker);
    const flame = Math.max(0.15, state.hearth / 100);
    glow.addColorStop(0, `rgba(255, 179, 71, ${0.5 * flame})`);
    glow.addColorStop(0.5, `rgba(255, 140, 60, ${0.16 * flame})`);
    glow.addColorStop(1, 'rgba(255, 140, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - r * 3.4, p.y - r * 3.4, r * 6.8, r * 6.8);
    // Stone ring.
    ctx.fillStyle = '#2c3554';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a5878';
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
    // The flame itself: three nested teardrops that breathe.
    for (let i = 0; i < 3; i += 1) {
      const fr = r * (0.62 - i * 0.16) * flicker;
      const fy = p.y + (2 - i * 2) * scale - Math.sin(time * 5 + i) * 2 * scale;
      ctx.fillStyle = i === 0 ? '#ff8c3c' : i === 1 ? '#ffb347' : '#ffd97a';
      ctx.beginPath();
      ctx.moveTo(p.x, fy - fr * 1.25);
      ctx.quadraticCurveTo(p.x + fr, fy, p.x, fy + fr * 0.7);
      ctx.quadraticCurveTo(p.x - fr, fy, p.x, fy - fr * 1.25);
      ctx.fill();
    }
    // Flame bar under the hearth.
    bar(ctx, p.x - r, p.y + r + 10 * scale, r * 2, 8 * scale, state.hearth / 100, '#ffb347', 'rgba(0,0,0,0.5)');
  }

  function drawPlayer(state, time) {
    const p = toScreen(state.player.x, state.player.y);
    const r = PLAYER.radius * scale;
    const dashing = state.dashTime > 0;
    // Dash trail.
    if (dashing) {
      ctx.fillStyle = 'rgba(255, 217, 122, 0.25)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Lantern glow.
    const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r * 3);
    glow.addColorStop(0, 'rgba(255, 217, 122, 0.4)');
    glow.addColorStop(1, 'rgba(255, 217, 122, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - r * 3, p.y - r * 3, r * 6, r * 6);
    // Body: a hooded keeper, drawn as a cloak with a lantern.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(state.player.angle);
    ctx.fillStyle = '#3f6fb5';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c4f86';
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(-r * 0.4, r * 0.85);
    ctx.lineTo(-r * 0.4, -r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(r * 0.55, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9d2e';
    ctx.beginPath();
    ctx.arc(r * 0.55, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Health ring.
    ctx.strokeStyle = 'rgba(255, 92, 122, 0.9)';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 6 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (state.health / state.maxHealth));
    ctx.stroke();
    void time;
  }

  function drawEnemy(e) {
    const p = toScreen(e.x, e.y);
    const r = e.radius * scale;
    const flash = e.hitFlash > 0;
    const bob = Math.sin(e.wobble) * 2 * scale;
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.globalAlpha = 0.92;
    if (e.kind === 'wisp') {
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x - r * 0.35, p.y + bob - r * 0.2, r * 0.28, 0, Math.PI * 2);
      ctx.arc(p.x + r * 0.35, p.y + bob - r * 0.2, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#0d1226';
      ctx.fill();
    } else if (e.kind === 'crawler') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(13, 18, 38, 0.6)';
      ctx.lineWidth = 2 * scale;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * r * 0.4, p.y + Math.sin(a) * r * 0.4);
        ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
        ctx.stroke();
      }
    } else if (e.kind === 'spitter') {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r * 1.2 + bob);
      ctx.lineTo(p.x + r, p.y + r * 0.8);
      ctx.lineTo(p.x - r, p.y + r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0d1226';
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Brute: a big spiked shadow.
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(13, 18, 38, 0.55)';
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * r * 0.7, p.y + Math.sin(a) * r * 0.7);
        ctx.lineTo(p.x + Math.cos(a) * r * 1.25, p.y + Math.sin(a) * r * 1.25);
        ctx.lineTo(p.x + Math.cos(a + 0.35) * r * 0.7, p.y + Math.sin(a + 0.35) * r * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // Health bar for hurt foes.
    if (e.health < e.maxHealth) {
      bar(ctx, p.x - r, p.y - r - 9 * scale, r * 2, 5 * scale, e.health / e.maxHealth, e.color, 'rgba(0,0,0,0.55)');
    }
  }

  function drawShards(state) {
    for (const s of state.shardsList) {
      const p = toScreen(s.x, s.y);
      const tw = 0.7 + 0.3 * Math.sin(state.time * 8 + s.x);
      ctx.fillStyle = `rgba(255, 217, 77, ${tw})`;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4 * scale, -4 * scale, 8 * scale, 8 * scale);
      ctx.restore();
    }
  }

  function drawBullets(state) {
    for (const b of state.bullets) {
      const p = toScreen(b.x, b.y);
      ctx.fillStyle = b.hostile ? '#ff5c7a' : '#ffe9a8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, b.radius * scale), 0, Math.PI * 2);
      ctx.fill();
      if (!b.hostile) {
        ctx.fillStyle = 'rgba(255, 233, 168, 0.35)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(4, b.radius * scale * 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      const s = toScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(s.x - p.size * scale / 2, s.y - p.size * scale / 2, p.size * scale, p.size * scale);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(15 * scale)}px system-ui, sans-serif`;
    for (const f of state.floaters) {
      const p = toScreen(f.x, f.y);
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    const pad = 16 * scale;
    const w = canvas.width / (window.devicePixelRatio || 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Top-left: score and best.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold ${Math.round(26 * scale)}px system-ui, sans-serif`;
    ctx.fillText(`Score ${state.score}`, pad, pad + 24 * scale);
    ctx.fillStyle = PALETTE.dimText;
    ctx.font = `${Math.round(15 * scale)}px system-ui, sans-serif`;
    ctx.fillText(`Best ${Math.max(best, state.score)}`, pad, pad + 46 * scale);
    // Top-center: wave.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold ${Math.round(24 * scale)}px system-ui, sans-serif`;
    ctx.fillText(state.waveActive ? `WAVE ${state.wave} / ${WIN_WAVE}` : state.betweenWaves ? `WAVE ${state.wave} CLEARED` : `WAVE ${state.wave} / ${WIN_WAVE}`, w / 2, pad + 22 * scale);
    if (state.waveActive) {
      const left = state.spawnQueue + state.enemies.length;
      ctx.fillStyle = PALETTE.dimText;
      ctx.font = `${Math.round(14 * scale)}px system-ui, sans-serif`;
      ctx.fillText(`${left} shadow${left === 1 ? '' : 's'} left`, w / 2, pad + 44 * scale);
    }
    // Top-right: shards and kills.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.shard;
    ctx.font = `bold ${Math.round(22 * scale)}px system-ui, sans-serif`;
    ctx.fillText(`◆ ${state.shards}`, w - pad, pad + 22 * scale);
    ctx.fillStyle = PALETTE.dimText;
    ctx.font = `${Math.round(15 * scale)}px system-ui, sans-serif`;
    ctx.fillText(`${state.kills} slain`, w - pad, pad + 46 * scale);
    // Bottom-left: health bar and dash. The bar sits above the bottom edge
    // with room for its label and the dash line beneath it.
    const barW = 200 * scale;
    const bottom = canvas.height / (window.devicePixelRatio || 1);
    const barY = bottom - pad - 44 * scale;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold ${Math.round(14 * scale)}px system-ui, sans-serif`;
    ctx.fillText(`HEALTH ${Math.ceil(state.health)} / ${state.maxHealth}`, pad, barY - 8 * scale);
    bar(ctx, pad, barY, barW, 12 * scale, state.health / state.maxHealth, '#7fe08a', 'rgba(0,0,0,0.5)');
    const dashReady = state.dashCooldownLeft <= 0;
    ctx.fillStyle = dashReady ? PALETTE.accent : PALETTE.dimText;
    ctx.fillText(dashReady ? 'DASH READY  [Space]' : 'dash recharging…', pad, barY + 30 * scale);
    // Bottom-right: controls hint.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.dimText;
    ctx.font = `${Math.round(14 * scale)}px system-ui, sans-serif`;
    ctx.fillText('WASD move · mouse aim · hold click to fire · Space dash · P pause · M mute', w - pad, barY + 30 * scale);
  }

  function panel(title, lines, accent) {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.fillStyle = 'rgba(5, 8, 20, 0.55)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(620 * scale, w - 40);
    const ph = 300 * scale + lines.length * 26 * scale;
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, px, py, pw, ph, 14 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent || PALETTE.accent;
    ctx.font = `bold ${Math.round(40 * scale)}px system-ui, sans-serif`;
    ctx.fillText(title, w / 2, py + 62 * scale);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `${Math.round(17 * scale)}px system-ui, sans-serif`;
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, py + 108 * scale + i * 26 * scale);
    });
    return { x: px, y: py, width: pw, height: ph };
  }

  function drawTitle(state, best) {
    drawBackground(state.time);
    drawHearth(state, state.time);
    for (const e of state.enemies) drawEnemy(e);
    drawParticles(state);
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.fillStyle = 'rgba(5, 8, 20, 0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `bold ${Math.round(64 * scale)}px system-ui, sans-serif`;
    ctx.fillText('EMBERKEEP', w / 2, h * 0.26);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `${Math.round(20 * scale)}px system-ui, sans-serif`;
    ctx.fillText('Keep the hearth burning. Survive all 10 waves of the dark.', w / 2, h * 0.26 + 36 * scale);
    ctx.fillStyle = PALETTE.dimText;
    ctx.font = `${Math.round(16 * scale)}px system-ui, sans-serif`;
    const lines = [
      'WASD / arrows — move      Mouse — aim      Hold click — fire      Space — dash',
      'Shadows burn the hearth when they reach it. Slay them, gather shards,',
      'and choose a blessing between waves. If the flame or you fall, the dark wins.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.42 + i * 24 * scale));
    if (best > 0) {
      ctx.fillStyle = PALETTE.shard;
      ctx.font = `bold ${Math.round(18 * scale)}px system-ui, sans-serif`;
      ctx.fillText(`Best score: ${best}`, w / 2, h * 0.42 + 3 * 24 * scale + 14 * scale);
    }
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold ${Math.round(22 * scale)}px system-ui, sans-serif`;
    ctx.fillText('— Press Space or click to begin —', w / 2, h * 0.82);
    ctx.globalAlpha = 1;
  }

  function drawUpgrade(state, choices) {
    drawBackground(state.time);
    drawHearth(state, state.time);
    drawParticles(state);
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.fillStyle = 'rgba(5, 8, 20, 0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `bold ${Math.round(38 * scale)}px system-ui, sans-serif`;
    ctx.fillText(`WAVE ${state.wave} CLEARED`, w / 2, h * 0.2);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `${Math.round(19 * scale)}px system-ui, sans-serif`;
    ctx.fillText(`Score ${state.score}   ·   ◆ ${state.shards} shards   ·   Hearth ${Math.ceil(state.hearth)}%`, w / 2, h * 0.2 + 32 * scale);
    ctx.fillStyle = PALETTE.dimText;
    ctx.font = `${Math.round(17 * scale)}px system-ui, sans-serif`;
    ctx.fillText('Choose a blessing — click a card or press 1, 2 or 3', w / 2, h * 0.2 + 62 * scale);
    const cardW = 210 * scale;
    const cardH = 190 * scale;
    const gap = 24 * scale;
    const totalW = cardW * 3 + gap * 2;
    const startX = (w - totalW) / 2;
    const cardY = h * 0.34;
    choices.forEach((choice, i) => {
      const x = startX + i * (cardW + gap);
      ctx.fillStyle = PALETTE.panel;
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 2;
      roundRect(ctx, x, cardY, cardW, cardH, 12 * scale);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.shard;
      ctx.font = `bold ${Math.round(30 * scale)}px system-ui, sans-serif`;
      ctx.fillText('✦', x + cardW / 2, cardY + 48 * scale);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold ${Math.round(19 * scale)}px system-ui, sans-serif`;
      ctx.fillText(choice.name, x + cardW / 2, cardY + 84 * scale);
      ctx.fillStyle = PALETTE.dimText;
      ctx.font = `${Math.round(15 * scale)}px system-ui, sans-serif`;
      const words = choice.desc.split(' ');
      let line = '';
      let ly = cardY + 116 * scale;
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 22) {
          ctx.fillText(line.trim(), x + cardW / 2, ly);
          ly += 20 * scale;
          line = word;
        } else {
          line += ' ' + word;
        }
      }
      if (line.trim()) ctx.fillText(line.trim(), x + cardW / 2, ly);
      ctx.fillStyle = PALETTE.accent;
      ctx.font = `bold ${Math.round(16 * scale)}px system-ui, sans-serif`;
      ctx.fillText(`[ ${i + 1} ]`, x + cardW / 2, cardY + cardH - 18 * scale);
    });
    return choices.map((choice, i) => ({
      choice,
      x: startX + i * (cardW + gap),
      y: cardY,
      width: cardW,
      height: cardH,
    }));
  }

  function drawOver(state, best, won) {
    drawBackground(state.time);
    drawHearth(state, state.time);
    drawParticles(state);
    const title = won ? 'THE DAWN RETURNS' : 'THE DARK PREVAILS';
    const lines = won
      ? [
          `You held the hearth through all ${WIN_WAVE} waves.`,
          `Score ${state.score}   ·   ${state.kills} shadows slain   ·   ${state.shards} shards gathered`,
          `Best ${Math.max(best, state.score)}`,
          '',
          'Press Space or click to play again',
        ]
      : [
          state.hearth <= 0 ? 'The hearth flame went out.' : 'The keeper has fallen.',
          `You reached wave ${state.wave} of ${WIN_WAVE}.`,
          `Score ${state.score}   ·   ${state.kills} shadows slain   ·   Best ${Math.max(best, state.score)}`,
          '',
          'Press Space or click to try again',
        ];
    panel(title, lines, won ? PALETTE.shard : PALETTE.danger);
  }

  function drawPaused(state) {
    drawBackground(state.time);
    drawHearth(state, state.time);
    for (const e of state.enemies) drawEnemy(e);
    panel('PAUSED', ['Press P or Space to keep playing', 'M — mute · R — restart from wave 1'], PALETTE.text);
  }

  function draw(state, screen, best, choices) {
    resize();
    ctx.save();
    // Screen shake: a small random offset while the world shakes.
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
    }
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
    } else if (screen === SCREEN_UPGRADE) {
      return drawUpgrade(state, choices);
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      drawOver(state, best, screen === SCREEN_WIN);
    } else if (screen === SCREEN_PAUSED) {
      drawPaused(state);
    } else {
      drawBackground(state.time);
      drawHearth(state, state.time);
      drawShards(state);
      for (const e of state.enemies) drawEnemy(e);
      drawBullets(state);
      drawPlayer(state, state.time);
      drawParticles(state);
      drawFloaters(state);
      drawHud(state, best);
    }
    ctx.restore();
    return null;
  }

  return {
    draw,
    get scale() { return scale; },
    get offsetX() { return offsetX; },
    get offsetY() { return offsetY; },
    resize,
  };
}
