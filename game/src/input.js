// Keyboard and mouse state. The game loop polls `down` for held keys and
// `pressed` for one-shot actions; the mouse is read in canvas pixels and
// main.js converts to world coordinates where it matters (the coin toss).

const held = new Set();
const pressedOnce = new Set();
const mouse = { x: 0, y: 0, down: false, clicked: false };

let attached = false;

export function attachInput(canvas) {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressedOnce.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    mouse.down = true;
    mouse.clicked = true;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
}

export function isDown(...codes) {
  return codes.some((code) => held.has(code));
}

/** True once per physical press; the loop clears the set every frame. */
export function wasPressed(...codes) {
  return codes.some((code) => pressedOnce.has(code));
}

export function getMouse() {
  return mouse;
}

/** Call at the end of each frame so one-shot presses fire exactly once. */
export function endFrameInput() {
  pressedOnce.clear();
  mouse.clicked = false;
}
