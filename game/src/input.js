// Keyboard and mouse, read fresh every frame. Movement is WASD or arrows;
// the mouse aims and holding the button fires; Space dashes; P or Escape
// pauses; M mutes; Enter/Space/click confirms on menus. Actions are edge
// triggered (takeActions clears them) so a held key never double-fires a menu.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
    if (event.key === 'Shift') actions |= ACTION_DASH;
    if (event.key === 'm' || event.key === 'M') actions |= ACTION_MUTE;
  }
  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }
  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }
  function mouseDownHandler(event) {
    mouseMove(event);
    mouseDown = true;
    mouseClicked = true;
  }
  function mouseUpHandler() {
    mouseDown = false;
  }
  function blur() {
    keys.clear();
    mouseDown = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDownHandler);
  window.addEventListener('mouseup', mouseUpHandler);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    // -1, 0 or 1 on each axis, from the keys held right now.
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return { x, y };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      if (mouseClicked) {
        mouseClicked = false;
        return taken | ACTION_CONFIRM;
      }
      return taken;
    },
    takeDigit() {
      for (const digit of ['1', '2', '3']) {
        if (keys.has(digit)) {
          keys.delete(digit);
          return Number(digit);
        }
      }
      return 0;
    },
    get mouse() {
      return { x: mouseX, y: mouseY, down: mouseDown };
    },
    // The mouse position in field coordinates (the canvas is scaled to fit).
    fieldMouse(scale, offsetX, offsetY) {
      return { x: (mouseX - offsetX) / scale, y: (mouseY - offsetY) / scale };
    },
    pressKey(key) {
      keys.add(key);
    },
  };
}
