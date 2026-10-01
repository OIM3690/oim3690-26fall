// Pure Rubik's cube model, no DOM. Works as a browser global (window.Cube) and a Node module.
//
// Coordinates follow CSS: x → right, y → down, z → toward the viewer.
// Each of the 27 cubies has an integer position in {-1,0,1}^3 and a 3x3 rotation matrix.
// A turn is { axis: 'x'|'y'|'z', layer: -1|0|1, dir: 1|-1|2 }, where dir is the number of
// quarter turns using the same sign convention as CSS rotateX/rotateY/rotateZ.
(function (root) {
  'use strict';

  const AXIS_INDEX = { x: 0, y: 1, z: 2 };
  const AXIS_NAMES = ['x', 'y', 'z'];

  const FACE_NORMALS = {
    U: [0, -1, 0],
    D: [0, 1, 0],
    L: [-1, 0, 0],
    R: [1, 0, 0],
    F: [0, 0, 1],
    B: [0, 0, -1],
  };

  const COLORS = {
    U: '#ffffff',
    D: '#ffd500',
    L: '#ff5800',
    R: '#c41e3a',
    F: '#006644', // Babson green
    B: '#0051ba',
  };

  // Clockwise quarter turn of each face, as seen looking at that face.
  const FACE_TURNS = {
    R: { axis: 'x', layer: 1, dir: 1 },
    L: { axis: 'x', layer: -1, dir: -1 },
    U: { axis: 'y', layer: -1, dir: -1 },
    D: { axis: 'y', layer: 1, dir: 1 },
    F: { axis: 'z', layer: 1, dir: 1 },
    B: { axis: 'z', layer: -1, dir: -1 },
  };

  function quarterMatrix(axis, sign) {
    const s = sign;
    switch (axis) {
      case 'x': return [[1, 0, 0], [0, 0, -s], [0, s, 0]];
      case 'y': return [[0, 0, s], [0, 1, 0], [-s, 0, 0]];
      case 'z': return [[0, -s, 0], [s, 0, 0], [0, 0, 1]];
      default: throw new Error(`Unknown axis: ${axis}`);
    }
  }

  function mulMat(a, b) {
    return a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
  }

  function mulVec(m, v) {
    return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
  }

  function sameVec(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  function createCube() {
    const cubies = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const pos = [x, y, z];
          const stickers = [];
          for (const face of Object.keys(FACE_NORMALS)) {
            const n = FACE_NORMALS[face];
            const k = n.findIndex((c) => c !== 0);
            if (pos[k] === n[k]) stickers.push({ normal: n, color: COLORS[face] });
          }
          cubies.push({ home: pos.slice(), pos, rot: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], stickers });
        }
      }
    }
    return { cubies };
  }

  function parseMove(move) {
    const m = /^([UDLRFB])(['2]?)$/.exec(move);
    if (!m) throw new Error(`Invalid move: ${move}`);
    const base = FACE_TURNS[m[1]];
    const dir = m[2] === "'" ? -base.dir : m[2] === '2' ? 2 : base.dir;
    return { axis: base.axis, layer: base.layer, dir };
  }

  function invertMove(move) {
    parseMove(move);
    if (move.endsWith('2')) return move;
    return move.endsWith("'") ? move[0] : `${move}'`;
  }

  function cubiesInLayer(cube, turn) {
    const k = AXIS_INDEX[turn.axis];
    return cube.cubies.filter((c) => c.pos[k] === turn.layer);
  }

  function applyTurn(cube, turn) {
    const quarters = turn.dir === 2 ? 2 : 1;
    const m = quarterMatrix(turn.axis, turn.dir === 2 ? 1 : turn.dir);
    for (const c of cubiesInLayer(cube, turn)) {
      for (let i = 0; i < quarters; i++) {
        c.pos = mulVec(m, c.pos);
        c.rot = mulMat(m, c.rot);
      }
    }
    return cube;
  }

  function applyMove(cube, move) {
    return applyTurn(cube, parseMove(move));
  }

  function isSolved(cube) {
    const faceColor = new Map();
    for (const c of cube.cubies) {
      for (const s of c.stickers) {
        const key = mulVec(c.rot, s.normal).join(',');
        if (!faceColor.has(key)) faceColor.set(key, s.color);
        else if (faceColor.get(key) !== s.color) return false;
      }
    }
    return true;
  }

  // Stricter check for picture faces, where centre orientation is visible: every cubie must
  // carry the same rotation G and sit at G·home (the whole cube may be rotated as one).
  function isPictureSolved(cube) {
    const g = cube.cubies[0].rot;
    return cube.cubies.every(
      (c) => c.rot.every((row, i) => sameVec(row, g[i])) && sameVec(c.pos, mulVec(g, c.home))
    );
  }

  // Screen axes of each sticker face (left→right, top→bottom as seen from outside the cube).
  // Must match the .face transforms in style.css.
  const FACE_AXES = {
    '0,0,1': [[1, 0, 0], [0, 1, 0]], // front:  translateZ
    '0,0,-1': [[-1, 0, 0], [0, 1, 0]], // back:   rotateY(180deg)
    '1,0,0': [[0, 0, -1], [0, 1, 0]], // right:  rotateY(90deg)
    '-1,0,0': [[0, 0, 1], [0, 1, 0]], // left:   rotateY(-90deg)
    '0,-1,0': [[1, 0, 0], [0, 0, 1]], // top:    rotateX(90deg)
    '0,1,0': [[1, 0, 0], [0, 0, -1]], // bottom: rotateX(-90deg)
  };

  // Which tile of its face's picture a sticker shows, given the cubie's home position.
  function tileOf(homePos, normal) {
    const [ex, ey] = FACE_AXES[normal.join(',')];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    return { col: dot(homePos, ex) + 1, row: dot(homePos, ey) + 1 };
  }

  function stickerColor(cube, pos, normal) {
    const c = cube.cubies.find((cb) => sameVec(cb.pos, pos));
    if (!c) return null;
    const s = c.stickers.find((st) => sameVec(mulVec(c.rot, st.normal), normal));
    return s ? s.color : null;
  }

  function randomScramble(length, rng) {
    const faces = Object.keys(FACE_TURNS);
    const suffixes = ['', "'", '2'];
    const moves = [];
    let lastAxis = null;
    while (moves.length < length) {
      const face = faces[Math.floor(rng() * faces.length)];
      if (FACE_TURNS[face].axis === lastAxis) continue;
      lastAxis = FACE_TURNS[face].axis;
      moves.push(face + suffixes[Math.floor(rng() * suffixes.length)]);
    }
    return moves;
  }

  // Which layer turn does a drag on a sticker mean?
  // pos: cubie position, normal: sticker's world normal, drag: [dx, dy] on screen,
  // project: maps a world vector to its [x, y] screen direction under the current view.
  function turnFromDrag(pos, normal, drag, project) {
    let best = null;
    for (let k = 0; k < 3; k++) {
      if (normal[k] !== 0) continue;
      const t = [0, 0, 0];
      t[k] = 1;
      const p = project(t);
      const len = Math.hypot(p[0], p[1]);
      if (len < 1e-6) continue;
      const score = (drag[0] * p[0] + drag[1] * p[1]) / len;
      if (!best || Math.abs(score) > Math.abs(best.score)) best = { t, score };
    }
    if (!best || best.score === 0) return null;
    // Rotating +90° about a = n × t carries the sticker along +t.
    const n = normal;
    const t = best.t;
    const a = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
    const k = a.findIndex((c) => c !== 0);
    return { axis: AXIS_NAMES[k], layer: pos[k], dir: Math.sign(best.score) * a[k] };
  }

  const api = {
    COLORS,
    FACE_NORMALS,
    createCube,
    parseMove,
    invertMove,
    applyTurn,
    applyMove,
    cubiesInLayer,
    isSolved,
    isPictureSolved,
    tileOf,
    stickerColor,
    randomScramble,
    turnFromDrag,
    mulVec,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Cube = api;
})(typeof window !== 'undefined' ? window : globalThis);
