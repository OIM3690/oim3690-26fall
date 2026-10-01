// DOM rendering, animation and input for the cube model in cube.js.
(function () {
  'use strict';

  const FACE_CLASSES = [
    ['front', [0, 0, 1]],
    ['back', [0, 0, -1]],
    ['right', [1, 0, 0]],
    ['left', [-1, 0, 0]],
    ['top', [0, -1, 0]],
    ['bottom', [0, 1, 0]],
  ];
  const TURN_MS = 180;
  const SCRAMBLE_TURN_MS = 60;
  const SCRAMBLE_LENGTH = 25;
  const DRAG_THRESHOLD = 12;
  // One square campus photo per face, cut into a 3x3 grid. A missing photo leaves that face
  // its plain colour.
  const PHOTOS = {
    U: 'photos/up.jpg',
    D: 'photos/down.jpg',
    L: 'photos/left.jpg',
    R: 'photos/right.jpg',
    F: 'photos/front.jpg',
    B: 'photos/back.jpg',
  };
  const FACE_BY_NORMAL = Object.fromEntries(
    Object.entries(Cube.FACE_NORMALS).map(([face, n]) => [n.join(','), face])
  );

  const viewport = document.getElementById('viewport');
  const scene = document.getElementById('scene');
  const movesEl = document.getElementById('moves');
  const messageEl = document.getElementById('message');

  let cube = Cube.createCube();
  let cubieEls = [];
  let size = 60;
  const view = { x: -28, y: -38 };
  let queue = [];
  let animating = null; // { turn, start, duration, rafId, user }
  let moveCount = 0;
  let scrambled = false;
  let drag = null;
  const loadedPhotos = new Set();

  function vecKey(v) {
    return v.join(',');
  }

  // Paints each sticker: its face's photo tile if that photo has loaded, otherwise its colour.
  function applySkin() {
    for (const s of scene.querySelectorAll('.sticker')) {
      const face = s.dataset.face;
      if (loadedPhotos.has(face)) {
        s.style.backgroundImage = `url("${PHOTOS[face]}")`;
        s.style.backgroundSize = '300% 300%';
        s.style.backgroundPosition = `${s.dataset.col * 50}% ${s.dataset.row * 50}%`;
      }
      const isLogo = face === 'U' && s.dataset.col === '1' && s.dataset.row === '1' && !loadedPhotos.has('U');
      s.classList.toggle('logo', isLogo);
      s.textContent = isLogo ? 'BABSON' : '';
    }
  }

  function build() {
    scene.innerHTML = '';
    cubieEls = cube.cubies.map((cubie, i) => {
      const el = document.createElement('div');
      el.className = 'cubie';
      for (const [cls, normal] of FACE_CLASSES) {
        const face = document.createElement('div');
        face.className = `face ${cls}`;
        const sticker = cubie.stickers.find((s) => vecKey(s.normal) === vecKey(normal));
        if (sticker) {
          const s = document.createElement('div');
          const tile = Cube.tileOf(cubie.home, normal);
          s.className = 'sticker';
          s.style.backgroundColor = sticker.color;
          s.dataset.cubie = String(i);
          s.dataset.normal = vecKey(normal);
          s.dataset.face = FACE_BY_NORMAL[vecKey(normal)];
          s.dataset.col = String(tile.col);
          s.dataset.row = String(tile.row);
          face.appendChild(s);
        }
        el.appendChild(face);
      }
      scene.appendChild(el);
      return el;
    });
    applySkin();
  }

  function loadPhotos() {
    for (const face of Object.keys(PHOTOS)) {
      const img = new Image();
      img.onload = () => {
        loadedPhotos.add(face);
        applySkin();
      };
      img.src = PHOTOS[face];
    }
  }

  // With every photo showing, centre orientation is visible, so it must be solved too.
  function solved() {
    return loadedPhotos.size === 6 ? Cube.isPictureSolved(cube) : Cube.isSolved(cube);
  }

  function cubieTransform(cubie, prefix) {
    const r = cubie.rot;
    const [x, y, z] = cubie.pos;
    // matrix3d is column-major.
    const m = [r[0][0], r[1][0], r[2][0], 0, r[0][1], r[1][1], r[2][1], 0, r[0][2], r[1][2], r[2][2], 0, 0, 0, 0, 1];
    return `${prefix} translate3d(${x * size}px, ${y * size}px, ${z * size}px) matrix3d(${m.join(',')})`;
  }

  function render() {
    cube.cubies.forEach((c, i) => {
      cubieEls[i].style.transform = cubieTransform(c, '');
    });
    scene.style.transform = `rotateX(${view.x}deg) rotateY(${view.y}deg)`;
    movesEl.textContent = String(moveCount);
  }

  function resize() {
    const available = Math.min(window.innerWidth, 720) - 32;
    size = Math.max(32, Math.min(60, Math.floor(available / 6)));
    document.documentElement.style.setProperty('--cubie', `${size}px`);
    render();
  }

  // --- Animation queue ---------------------------------------------------

  function enqueue(turn, user, duration) {
    queue.push({ turn, user, duration });
    if (!animating) next();
  }

  function next() {
    const item = queue.shift();
    if (!item) {
      animating = null;
      return;
    }
    const layer = Cube.cubiesInLayer(cube, item.turn).map((c) => cube.cubies.indexOf(c));
    animating = { ...item, layer, start: performance.now(), rafId: 0 };
    animating.rafId = requestAnimationFrame(step);
  }

  function step(now) {
    const a = animating;
    const t = Math.min(1, (now - a.start) / a.duration);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const angle = a.turn.dir * 90 * eased;
    const rotate = `rotate${a.turn.axis.toUpperCase()}(${angle}deg)`;
    for (const i of a.layer) {
      cubieEls[i].style.transform = cubieTransform(cube.cubies[i], rotate);
    }
    if (t < 1) {
      a.rafId = requestAnimationFrame(step);
      return;
    }
    Cube.applyTurn(cube, a.turn);
    if (a.user) moveCount++;
    render();
    if (a.user && scrambled && solved()) {
      scrambled = false;
      messageEl.textContent = `Solved in ${moveCount} moves!`;
    }
    next();
  }

  function busy() {
    return animating !== null || queue.length > 0;
  }

  // --- Actions -------------------------------------------------------------

  function userMove(notation) {
    enqueue(Cube.parseMove(notation), true, TURN_MS);
  }

  function scramble() {
    moveCount = 0;
    scrambled = true;
    messageEl.textContent = '';
    for (const m of Cube.randomScramble(SCRAMBLE_LENGTH, Math.random)) {
      enqueue(Cube.parseMove(m), false, SCRAMBLE_TURN_MS);
    }
    render();
  }

  function reset() {
    if (animating) cancelAnimationFrame(animating.rafId);
    animating = null;
    queue = [];
    cube = Cube.createCube();
    moveCount = 0;
    scrambled = false;
    messageEl.textContent = '';
    build();
    render();
  }

  // --- Input ---------------------------------------------------------------

  function rotX(v, deg) {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
  }

  function rotY(v, deg) {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  }

  // World direction → screen direction under the scene's rotateX(...) rotateY(...).
  function project(v) {
    const p = rotX(rotY(v, view.y), view.x);
    return [p[0], p[1]];
  }

  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const sticker = e.target.closest('.sticker');
    drag = {
      x: e.clientX,
      y: e.clientY,
      sticker: sticker
        ? { cubie: Number(sticker.dataset.cubie), normal: sticker.dataset.normal.split(',').map(Number) }
        : null,
      done: false,
    };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('dragging');
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.sticker) {
      view.y += dx * 0.4;
      view.x = Math.max(-90, Math.min(90, view.x - dy * 0.4));
      drag.x = e.clientX;
      drag.y = e.clientY;
      render();
      return;
    }
    // Turn decisions read the cube's current state, so wait until it is idle.
    if (drag.done || busy() || Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.done = true;
    const cubie = cube.cubies[drag.sticker.cubie];
    const normal = Cube.mulVec(cubie.rot, drag.sticker.normal);
    const turn = Cube.turnFromDrag(cubie.pos, normal, [dx, dy], project);
    if (turn) enqueue(turn, true, TURN_MS);
  });

  function endDrag() {
    drag = null;
    viewport.classList.remove('dragging');
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const face = e.key.toUpperCase();
    if (!'UDLRFB'.includes(face) || face.length !== 1) return;
    userMove(e.shiftKey ? `${face}'` : face);
  });

  const buttons = document.getElementById('move-buttons');
  for (const face of 'UDLRFB') {
    for (const move of [face, `${face}'`]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = move;
      b.addEventListener('click', () => userMove(move));
      buttons.appendChild(b);
    }
  }
  document.getElementById('scramble').addEventListener('click', scramble);
  document.getElementById('reset').addEventListener('click', reset);
  window.addEventListener('resize', resize);

  build();
  loadPhotos();
  resize();
})();
