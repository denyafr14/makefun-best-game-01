// Every sound in Emberkeep is synthesized with WebAudio: short oscillator and
// noise bursts, no audio files. Music is a quiet, slow arpeggio that keeps
// playing under the game; it starts on the first user gesture, as browsers
// require, and a mute toggle (M) silences everything.
export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let musicStep = 0;
  const MELODY = [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 246.94];

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!context || muted) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!context || muted) return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  function startMusic() {
    if (!context || musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const note = MELODY[musicStep % MELODY.length];
      tone(note, 0.5, 'sine', 0.05);
      if (musicStep % 4 === 0) tone(note / 2, 0.7, 'triangle', 0.04);
      musicStep += 1;
    }, 340);
  }

  return {
    unlock() {
      if (ensure()) {
        if (context.state === 'suspended') context.resume();
        startMusic();
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() { tone(720, 0.07, 'square', 0.05, 340); },
    hit() { noise(0.06, 0.08, 900); },
    foeDown() { tone(320, 0.14, 'triangle', 0.09, 90); },
    hurt() { tone(160, 0.22, 'sawtooth', 0.12, 70); },
    hearthHit() { tone(110, 0.3, 'sawtooth', 0.12, 55); },
    shard() { tone(1180, 0.09, 'sine', 0.07, 1560); },
    dash() { noise(0.12, 0.07, 2400); },
    waveHorn() { tone(196, 0.5, 'triangle', 0.1, 294); tone(294, 0.5, 'triangle', 0.07, 392); },
    upgrade() { tone(523, 0.12, 'sine', 0.09); window.setTimeout(() => tone(784, 0.18, 'sine', 0.09), 110); },
    win() { [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => tone(f, 0.35, 'triangle', 0.1), i * 140)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => window.setTimeout(() => tone(f, 0.4, 'sawtooth', 0.07), i * 160)); },
    click() { tone(880, 0.05, 'sine', 0.06); },
  };
}
