// Run with: node --test rubiks-cube/cube.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Cube = require('./cube.js');

const U = [0, -1, 0];
const F = [0, 0, 1];
const R = [1, 0, 0];

function run(cube, seq) {
  for (const m of seq.trim().split(/\s+/)) Cube.applyMove(cube, m);
  return cube;
}

test('new cube is solved', () => {
  assert.equal(Cube.isSolved(Cube.createCube()), true);
});

test('a single turn unsolves the cube', () => {
  assert.equal(Cube.isSolved(run(Cube.createCube(), 'R')), false);
});

test('every face turn has order 4 and is undone by its prime', () => {
  for (const f of 'UDLRFB') {
    assert.equal(Cube.isSolved(run(Cube.createCube(), `${f} ${f} ${f} ${f}`)), true, f);
    assert.equal(Cube.isSolved(run(Cube.createCube(), `${f} ${f}'`)), true, f);
    assert.equal(Cube.isSolved(run(Cube.createCube(), `${f}2 ${f}2`)), true, f);
  }
});

test("sexy move (R U R' U') has order 6", () => {
  const cube = Cube.createCube();
  for (let i = 0; i < 5; i++) run(cube, "R U R' U'");
  assert.equal(Cube.isSolved(cube), false);
  run(cube, "R U R' U'");
  assert.equal(Cube.isSolved(cube), true);
});

test('R moves front stickers onto the up face (clockwise from the right)', () => {
  const cube = run(Cube.createCube(), 'R');
  assert.equal(Cube.stickerColor(cube, [1, -1, 1], U), Cube.COLORS.F);
  assert.equal(Cube.stickerColor(cube, [-1, -1, 1], U), Cube.COLORS.U);
});

test('U moves right stickers onto the front face (clockwise from above)', () => {
  const cube = run(Cube.createCube(), 'U');
  assert.equal(Cube.stickerColor(cube, [0, -1, 1], F), Cube.COLORS.R);
});

test('F moves up stickers onto the right face (clockwise from the front)', () => {
  const cube = run(Cube.createCube(), 'F');
  assert.equal(Cube.stickerColor(cube, [1, 0, 1], R), Cube.COLORS.U);
});

test('L, D, B are clockwise from their own side', () => {
  // L: up stickers go to front. D: front stickers go to right. B: up stickers go to left.
  assert.equal(Cube.stickerColor(run(Cube.createCube(), 'L'), [-1, 1, 1], F), Cube.COLORS.U);
  assert.equal(Cube.stickerColor(run(Cube.createCube(), 'D'), [1, 1, 0], R), Cube.COLORS.F);
  assert.equal(Cube.stickerColor(run(Cube.createCube(), 'B'), [-1, 0, -1], [-1, 0, 0]), Cube.COLORS.U);
});

test('scramble followed by its inverse is solved', () => {
  let seed = 42;
  const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const scramble = Cube.randomScramble(25, rng);
  assert.equal(scramble.length, 25);
  const cube = Cube.createCube();
  scramble.forEach((m) => Cube.applyMove(cube, m));
  assert.equal(Cube.isSolved(cube), false);
  scramble.slice().reverse().forEach((m) => Cube.applyMove(cube, Cube.invertMove(m)));
  assert.equal(Cube.isSolved(cube), true);
});

test('scramble never turns the same axis twice in a row', () => {
  const scramble = Cube.randomScramble(200, Math.random);
  for (let i = 1; i < scramble.length; i++) {
    assert.notEqual(Cube.parseMove(scramble[i]).axis, Cube.parseMove(scramble[i - 1]).axis);
  }
});

test('parseMove rejects unknown notation', () => {
  assert.throws(() => Cube.parseMove('Q'));
  assert.throws(() => Cube.parseMove("R'2"));
});

test('turnFromDrag: dragging the top-right front sticker upward is R', () => {
  // Straight-on view: world x/y map directly to screen x/y.
  const project = (v) => [v[0], v[1]];
  const turn = Cube.turnFromDrag([1, -1, 1], F, [0, -1], project);
  assert.deepEqual(turn, Cube.parseMove('R'));
});

test('turnFromDrag: dragging a top-row front sticker left is U', () => {
  const project = (v) => [v[0], v[1]];
  const turn = Cube.turnFromDrag([0, -1, 1], F, [-1, 0], project);
  assert.deepEqual(turn, Cube.parseMove('U'));
});

test('turnFromDrag: dragging the middle column turns the middle slice', () => {
  const project = (v) => [v[0], v[1]];
  const cube = Cube.createCube();
  Cube.applyTurn(cube, Cube.turnFromDrag([0, 0, 1], F, [0, -1], project));
  // Middle slice moved front centre onto the up face.
  assert.equal(Cube.stickerColor(cube, [0, -1, 0], U), Cube.COLORS.F);
  assert.equal(Cube.stickerColor(cube, [1, -1, 0], U), Cube.COLORS.U);
});

test('picture solved: new cube, and a turn undone', () => {
  assert.equal(Cube.isPictureSolved(Cube.createCube()), true);
  assert.equal(Cube.isPictureSolved(run(Cube.createCube(), 'R')), false);
  assert.equal(Cube.isPictureSolved(run(Cube.createCube(), "R U R' U' U R U' R'")), true);
});

test('picture solved: a twisted centre is colour-solved but not picture-solved', () => {
  const cube = Cube.createCube();
  const centre = cube.cubies.find((c) => c.pos.join() === '0,-1,0');
  centre.rot = [[0, 0, -1], [0, 1, 0], [1, 0, 0]]; // quarter turn about y
  assert.equal(Cube.isSolved(cube), true);
  assert.equal(Cube.isPictureSolved(cube), false);
});

test('picture solved: turning all three slices (whole-cube rotation) still counts', () => {
  const cube = Cube.createCube();
  for (const layer of [-1, 0, 1]) Cube.applyTurn(cube, { axis: 'x', layer, dir: 1 });
  assert.equal(Cube.isPictureSolved(cube), true);
});

test('tileOf: tiles read left-to-right, top-to-bottom when looking at each face', () => {
  const t = (pos, face) => Cube.tileOf(pos, Cube.FACE_NORMALS[face]);
  // Front: viewer's top-left is x=-1, y=-1.
  assert.deepEqual(t([-1, -1, 1], 'F'), { col: 0, row: 0 });
  assert.deepEqual(t([1, 1, 1], 'F'), { col: 2, row: 2 });
  // Right: top-left (seen from the right) is the front edge.
  assert.deepEqual(t([1, -1, 1], 'R'), { col: 0, row: 0 });
  // Left: top-left is the back edge.
  assert.deepEqual(t([-1, -1, -1], 'L'), { col: 0, row: 0 });
  // Back: top-left (seen from behind) is x=+1.
  assert.deepEqual(t([1, -1, -1], 'B'), { col: 0, row: 0 });
  // Up: seen from above with front at the bottom, top-left is back-left.
  assert.deepEqual(t([-1, -1, -1], 'U'), { col: 0, row: 0 });
  assert.deepEqual(t([-1, -1, 1], 'U'), { col: 0, row: 2 });
  // Down: seen from below with front at the top, top-left is front-left.
  assert.deepEqual(t([-1, 1, 1], 'D'), { col: 0, row: 0 });
});
