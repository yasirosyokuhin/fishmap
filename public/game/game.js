'use strict';

// ===== パズルのデータ =====

const NAME_POOL = {
  anglers: ['タカシ', 'ユミ', 'ケンタ', 'サオリ', 'ヒロシ'],
  fish: ['マダイ', 'スズキ', 'アジ', 'カサゴ', 'ヒラメ'],
  spots: ['堤防', '砂浜', '磯', '船の上', '河口'],
};

const SIZES = { easy: 3, normal: 4, hard: 5 };

// ===== 汎用ユーティリティ =====

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function permutations(n) {
  const result = [];
  const perm = Array.from({ length: n }, (_, i) => i);
  (function recurse(k) {
    if (k === n) {
      result.push(perm.slice());
      return;
    }
    for (let i = k; i < n; i++) {
      [perm[k], perm[i]] = [perm[i], perm[k]];
      recurse(k + 1);
      [perm[k], perm[i]] = [perm[i], perm[k]];
    }
  })(0);
  return result;
}

// ===== パズル生成（解の一意性をソルバーで保証する） =====
//
// 解は2つの順列で表す:
//   solB[p] = 釣り人 p が釣った魚, solC[p] = 釣り人 p の釣り場
// 手がかりは3種類:
//   PB: 釣り人と魚の関係 / PC: 釣り人と釣り場の関係 / BC: 魚と釣り場の関係

function satisfies(clue, pb, pc) {
  switch (clue.type) {
    case 'PB':
      return (pb[clue.p] === clue.b) === clue.pos;
    case 'PC':
      return (pc[clue.p] === clue.c) === clue.pos;
    case 'BC': {
      const p = pb.indexOf(clue.b);
      return (pc[p] === clue.c) === clue.pos;
    }
  }
  return false;
}

function countSolutions(clues, perms, limit) {
  let count = 0;
  for (const pb of perms) {
    for (const pc of perms) {
      let ok = true;
      for (const clue of clues) {
        if (!satisfies(clue, pb, pc)) {
          ok = false;
          break;
        }
      }
      if (ok && ++count >= limit) return count;
    }
  }
  return count;
}

function buildCluePool(solB, solC, n) {
  const pool = [];
  for (let p = 0; p < n; p++) {
    pool.push({ type: 'PB', p, b: solB[p], pos: true });
    pool.push({ type: 'PC', p, c: solC[p], pos: true });
    pool.push({ type: 'BC', b: solB[p], c: solC[p], pos: true });
    for (let b = 0; b < n; b++) {
      if (b !== solB[p]) pool.push({ type: 'PB', p, b, pos: false });
    }
    for (let c = 0; c < n; c++) {
      if (c !== solC[p]) {
        pool.push({ type: 'PC', p, c, pos: false });
        pool.push({ type: 'BC', b: solB[p], c, pos: false });
      }
    }
  }
  return pool;
}

function generatePuzzle(difficulty) {
  const n = SIZES[difficulty];
  const solB = shuffle([...Array(n).keys()]);
  const solC = shuffle([...Array(n).keys()]);
  const perms = permutations(n);

  // かんたんは断定形の手がかりを優先し、むずかしいは否定形を優先して採用する
  const offset = (clue) => {
    if (difficulty === 'easy') return clue.pos ? -0.5 : 0;
    if (difficulty === 'hard') return clue.pos && clue.type !== 'BC' ? 0.5 : -0.2;
    return 0;
  };
  const pool = buildCluePool(solB, solC, n)
    .map((clue) => ({ clue, key: Math.random() + offset(clue) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.clue);

  // 解の候補が1つになるまで、絞り込みに効く手がかりだけを採用する
  const clues = [];
  let count = perms.length * perms.length;
  for (const clue of pool) {
    if (count === 1) break;
    const next = countSolutions([...clues, clue], perms, count);
    if (next < count) {
      clues.push(clue);
      count = next;
    }
  }

  // なくても解が一意のままの手がかりを取り除き、最小限のセットにする
  for (let i = clues.length - 1; i >= 0; i--) {
    const rest = clues.slice(0, i).concat(clues.slice(i + 1));
    if (countSolutions(rest, perms, 2) === 1) clues.splice(i, 1);
  }

  shuffle(clues);
  return { n, solB, solC, clues };
}

function clueText(clue, names) {
  const a = names.anglers;
  const f = names.fish;
  const s = names.spots;
  switch (clue.type) {
    case 'PB':
      return clue.pos
        ? `${a[clue.p]}が釣ったのは${f[clue.b]}だ。`
        : `${a[clue.p]}は${f[clue.b]}を釣っていない。`;
    case 'PC':
      return clue.pos
        ? `${a[clue.p]}は${s[clue.c]}で釣った。`
        : `${a[clue.p]}は${s[clue.c]}では釣っていない。`;
    case 'BC':
      return clue.pos
        ? `${f[clue.b]}が釣れたのは${s[clue.c]}だ。`
        : `${f[clue.b]}が釣れたのは${s[clue.c]}ではない。`;
  }
  return '';
}

// ===== ゲームの状態 =====

// マークの値: 0 = 空白, 1 = ○, 2 = ✕
const EMPTY = 0;
const MARU = 1;
const BATSU = 2;

let state = null;
let timerId = null;

function blankGrid(n) {
  return Array.from({ length: n }, () => Array(n).fill(EMPTY));
}

// CB ブロックの正解判定: 魚 b が釣り場 c で釣れたか
function isTrueCB(c, b) {
  const p = state.solB.indexOf(b);
  return state.solC[p] === c;
}

function isTrueCell(block, i, j) {
  if (block === 'PB') return state.solB[i] === j;
  if (block === 'PC') return state.solC[i] === j;
  return isTrueCB(i, j);
}

// ===== DOM =====

const $ = (id) => document.getElementById(id);

function newGame() {
  const difficulty = $('difficulty').value;
  const n = SIZES[difficulty];
  state = {
    ...generatePuzzle(difficulty),
    names: {
      anglers: shuffle(NAME_POOL.anglers.slice()).slice(0, n),
      fish: shuffle(NAME_POOL.fish.slice()).slice(0, n),
      spots: shuffle(NAME_POOL.spots.slice()).slice(0, n),
    },
    marks: { PB: blankGrid(n), PC: blankGrid(n), CB: blankGrid(n) },
    hints: 0,
    startedAt: Date.now(),
    finished: false,
  };
  renderBoard();
  renderClues();
  $('message').hidden = true;
  $('win').hidden = true;
  startTimer();
}

function renderBoard() {
  const { n, names } = state;
  const table = document.createElement('table');
  table.className = 'grid';

  const headRow = document.createElement('tr');
  headRow.appendChild(el('th', 'corner', ''));
  names.fish.forEach((name, j) => {
    headRow.appendChild(el('th', 'col-head' + (j === 0 ? ' block-start' : ''), name));
  });
  names.spots.forEach((name, j) => {
    headRow.appendChild(el('th', 'col-head' + (j === 0 ? ' block-start' : ''), name));
  });
  table.appendChild(headRow);

  names.anglers.forEach((name, p) => {
    const tr = document.createElement('tr');
    tr.appendChild(el('th', 'row-head', name));
    for (let b = 0; b < n; b++) tr.appendChild(cellTd('PB', p, b, b === 0));
    for (let c = 0; c < n; c++) tr.appendChild(cellTd('PC', p, c, c === 0));
    table.appendChild(tr);
  });

  names.spots.forEach((name, c) => {
    const tr = document.createElement('tr');
    if (c === 0) tr.className = 'block-top';
    tr.appendChild(el('th', 'row-head', name));
    for (let b = 0; b < n; b++) tr.appendChild(cellTd('CB', c, b, b === 0));
    table.appendChild(tr);
  });

  const board = $('board');
  board.innerHTML = '';
  board.appendChild(table);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function cellTd(block, i, j, blockStart) {
  const td = document.createElement('td');
  if (blockStart) td.className = 'block-start';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cell';
  btn.dataset.block = block;
  btn.dataset.i = i;
  btn.dataset.j = j;
  btn.addEventListener('click', onCellClick);
  td.appendChild(btn);
  return td;
}

function renderClues() {
  const list = $('clue-list');
  list.innerHTML = '';
  state.clues.forEach((clue) => {
    const li = document.createElement('li');
    li.textContent = clueText(clue, state.names);
    li.addEventListener('click', () => li.classList.toggle('done'));
    list.appendChild(li);
  });
}

function updateAllCells() {
  document.querySelectorAll('.cell').forEach((btn) => {
    const mark = state.marks[btn.dataset.block][btn.dataset.i][btn.dataset.j];
    btn.textContent = mark === MARU ? '○' : mark === BATSU ? '✕' : '';
    btn.classList.toggle('maru', mark === MARU);
    btn.classList.toggle('batsu', mark === BATSU);
  });
}

function onCellClick(event) {
  if (state.finished) return;
  const { block, i, j } = event.currentTarget.dataset;
  const grid = state.marks[block];
  grid[i][j] = (grid[i][j] + 1) % 3;
  if (grid[i][j] === MARU && $('autocross').checked) autoCross(block, +i, +j);
  updateAllCells();
  checkWin();
}

// ○ を置いたとき、同じブロックの同じ行・列の空白セルに ✕ を入れる
function autoCross(block, i, j) {
  const grid = state.marks[block];
  for (let k = 0; k < state.n; k++) {
    if (k !== j && grid[i][k] === EMPTY) grid[i][k] = BATSU;
    if (k !== i && grid[k][j] === EMPTY) grid[k][j] = BATSU;
  }
}

// PB・PC ブロックの ○ が過不足なく正解と一致し、CB に誤った ○ がなければクリア
function checkWin() {
  const { n, marks } = state;
  for (const block of ['PB', 'PC']) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const isTrue = isTrueCell(block, i, j);
        if (isTrue && marks[block][i][j] !== MARU) return;
        if (!isTrue && marks[block][i][j] === MARU) return;
      }
    }
  }
  for (let c = 0; c < n; c++) {
    for (let b = 0; b < n; b++) {
      if (marks.CB[c][b] === MARU && !isTrueCB(c, b)) return;
    }
  }
  finishGame();
}

function finishGame() {
  state.finished = true;
  stopTimer();
  const time = formatTime(Date.now() - state.startedAt);
  const hints = state.hints > 0 ? `／ ヒント ${state.hints} 回` : '／ ヒントなし';
  $('win-stats').textContent = `タイム ${time} ${hints}`;
  $('win').hidden = false;
}

function checkAnswer() {
  if (state.finished) return;
  const { n, marks } = state;
  let mistakes = 0;
  for (const block of ['PB', 'PC', 'CB']) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const mark = marks[block][i][j];
        const isTrue = isTrueCell(block, i, j);
        if ((mark === MARU && !isTrue) || (mark === BATSU && isTrue)) mistakes++;
      }
    }
  }
  if (mistakes === 0) {
    showMessage('いまのところ間違いはありません。その調子！', 'ok');
  } else {
    showMessage(`間違っているマークが ${mistakes} か所あります。`, 'ng');
  }
}

function giveHint() {
  if (state.finished) return;
  const { n, marks } = state;
  const candidates = [];
  for (const block of ['PB', 'PC']) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (isTrueCell(block, i, j) && marks[block][i][j] !== MARU) {
          candidates.push({ block, i, j });
        }
      }
    }
  }
  if (candidates.length === 0) {
    showMessage('○ はすべて埋まっています。間違った ○ がないか確認しましょう。', 'ok');
    return;
  }
  const { block, i, j } = candidates[Math.floor(Math.random() * candidates.length)];
  marks[block][i][j] = MARU;
  if ($('autocross').checked) autoCross(block, i, j);
  state.hints++;
  updateAllCells();
  checkWin();
}

let messageTimerId = null;

function showMessage(text, kind) {
  const box = $('message');
  box.textContent = text;
  box.className = `message ${kind}`;
  box.hidden = false;
  clearTimeout(messageTimerId);
  messageTimerId = setTimeout(() => {
    box.hidden = true;
  }, 4000);
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function startTimer() {
  stopTimer();
  $('timer').textContent = '0:00';
  timerId = setInterval(() => {
    $('timer').textContent = formatTime(Date.now() - state.startedAt);
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

// ===== 初期化 =====

if (typeof document !== 'undefined') {
  $('new-game').addEventListener('click', newGame);
  $('win-new-game').addEventListener('click', newGame);
  $('check').addEventListener('click', checkAnswer);
  $('hint').addEventListener('click', giveHint);
  $('difficulty').addEventListener('change', newGame);
  newGame();
}
