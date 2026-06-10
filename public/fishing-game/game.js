/* =========================================================
 * FISHMAP リアル海釣りシミュレーター
 * 依存ライブラリなし / HTML5 Canvas + Web Audio
 * ========================================================= */
'use strict';

/* ---------------- ユーティリティ ---------------- */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

/* ---------------- 魚種データ ----------------
 * zone: 好む水域 0=岸近く(浅場) 〜 1=沖(深場)
 * fight: 引きの強さ 0〜1 / pts: 基本ポイント
 * day/night: 時間帯ごとの活性倍率
 * ratio: 体高/体長比, pattern: 模様
 */
const SPECIES = [
  { id: 'iwashi',   name: 'マイワシ',   min: 14,  max: 24,  maxKg: 0.15, zone: [0.0, 0.5], rarity: 30, fight: 0.22, pts: 60,   biteWin: 1.5, day: 1.0, night: 0.5, ratio: 0.24, back: [58, 110, 165],  belly: [232, 240, 246], pattern: 'spots',  desc: '群れで回遊する大衆魚。' },
  { id: 'aji',      name: 'マアジ',     min: 15,  max: 40,  maxKg: 0.7,  zone: [0.0, 0.7], rarity: 28, fight: 0.32, pts: 90,   biteWin: 1.4, day: 1.0, night: 1.0, ratio: 0.27, back: [90, 125, 106],  belly: [221, 232, 224], pattern: 'hline',  desc: '堤防釣りの定番。刺身が美味。' },
  { id: 'saba',     name: 'マサバ',     min: 25,  max: 50,  maxKg: 1.4,  zone: [0.2, 0.8], rarity: 20, fight: 0.48, pts: 130,  biteWin: 1.2, day: 1.0, night: 0.7, ratio: 0.25, back: [47, 93, 138],   belly: [214, 228, 238], pattern: 'vbars',  desc: '掛かると鋭く走る青魚。' },
  { id: 'kasago',   name: 'カサゴ',     min: 12,  max: 30,  maxKg: 0.8,  zone: [0.0, 0.4], rarity: 18, fight: 0.38, pts: 110,  biteWin: 1.5, day: 0.8, night: 1.3, ratio: 0.34, back: [138, 74, 58],   belly: [204, 153, 136], pattern: 'spots',  desc: '岩場に潜む根魚。夜に活発。' },
  { id: 'mebaru',   name: 'メバル',     min: 13,  max: 28,  maxKg: 0.7,  zone: [0.0, 0.5], rarity: 14, fight: 0.42, pts: 140,  biteWin: 1.3, day: 0.4, night: 1.7, ratio: 0.32, back: [68, 76, 85],    belly: [154, 165, 173], pattern: 'vbars',  desc: '大きな目の夜行性ハンター。' },
  { id: 'kawahagi', name: 'カワハギ',   min: 15,  max: 30,  maxKg: 0.9,  zone: [0.1, 0.6], rarity: 12, fight: 0.45, pts: 170,  biteWin: 0.9, day: 1.0, night: 0.3, ratio: 0.42, back: [140, 138, 106], belly: [207, 205, 176], pattern: 'spots',  desc: 'エサ取り名人。アワセが難しい。' },
  { id: 'kurodai',  name: 'クロダイ',   min: 25,  max: 55,  maxKg: 2.8,  zone: [0.1, 0.7], rarity: 10, fight: 0.62, pts: 260,  biteWin: 1.1, day: 1.0, night: 0.9, ratio: 0.38, back: [60, 66, 72],    belly: [174, 182, 187], pattern: 'vbars',  desc: '警戒心が強い堤防の主。' },
  { id: 'madai',    name: 'マダイ',     min: 30,  max: 80,  maxKg: 6.0,  zone: [0.4, 1.0], rarity: 8,  fight: 0.7,  pts: 340,  biteWin: 1.0, day: 1.0, night: 0.8, ratio: 0.36, back: [212, 99, 107],  belly: [242, 211, 205], pattern: 'spots',  desc: '魚の王様。三段引きが特徴。' },
  { id: 'suzuki',   name: 'スズキ',     min: 40,  max: 90,  maxKg: 7.0,  zone: [0.2, 0.9], rarity: 8,  fight: 0.74, pts: 380,  biteWin: 1.0, day: 0.7, night: 1.5, ratio: 0.28, back: [107, 123, 140], belly: [220, 228, 234], pattern: 'hline',  desc: 'エラ洗いで針を外す格闘家。' },
  { id: 'hirame',   name: 'ヒラメ',     min: 35,  max: 85,  maxKg: 8.0,  zone: [0.5, 1.0], rarity: 6,  fight: 0.68, pts: 420,  biteWin: 1.6, day: 1.0, night: 0.8, ratio: 0.5,  back: [107, 90, 62],   belly: [217, 201, 168], pattern: 'spots',  desc: '砂底に潜む高級魚。食い込みを待て。' },
  { id: 'tachiuo',  name: 'タチウオ',   min: 70,  max: 130, maxKg: 2.5,  zone: [0.5, 1.0], rarity: 6,  fight: 0.58, pts: 400,  biteWin: 1.0, day: 0.1, night: 1.9, ratio: 0.1,  back: [185, 196, 207], belly: [232, 237, 242], pattern: 'none',   desc: '夜の海に立ち泳ぐ銀色の刀。' },
  { id: 'buri',     name: 'ブリ',       min: 60,  max: 110, maxKg: 12.0, zone: [0.6, 1.0], rarity: 4,  fight: 0.92, pts: 650,  biteWin: 0.9, day: 1.0, night: 0.6, ratio: 0.3,  back: [63, 111, 143],  belly: [230, 233, 216], pattern: 'yline',  desc: '青物の王。怒涛の走りに耐えろ。' },
  { id: 'maguro',   name: 'クロマグロ', min: 100, max: 220, maxKg: 80.0, zone: [0.85, 1.0], rarity: 1.2, fight: 1.0, pts: 1500, biteWin: 0.7, day: 1.0, night: 0.7, ratio: 0.33, back: [31, 58, 95],   belly: [216, 224, 232], pattern: 'hline',  desc: '海の黒いダイヤ。出会えたら奇跡。' },
  { id: 'boot',     name: '古びた長靴', min: 26,  max: 30,  maxKg: 0.5,  zone: [0.0, 1.0], rarity: 3.5, fight: 0.06, pts: 5,    biteWin: 2.0, day: 1.0, night: 1.0, ratio: 0.6,  back: [90, 96, 70],    belly: [120, 126, 96],  pattern: 'none',   kind: 'boot', desc: '海のゴミ。持ち帰って正しく捨てよう。' },
  { id: 'can',      name: '空き缶',     min: 10,  max: 12,  maxKg: 0.1,  zone: [0.0, 1.0], rarity: 3,   fight: 0.04, pts: 3,    biteWin: 2.0, day: 1.0, night: 1.0, ratio: 0.45, back: [160, 60, 60],   belly: [200, 200, 205], pattern: 'none',   kind: 'can',  desc: 'ポイ捨てダメ、絶対。' },
];

/* ---------------- 空の色パレット（時刻キー） ---------------- */
const SKY_KEYS = [
  { h: 0,  top: [8, 14, 38],    bottom: [16, 30, 64],   sea: [10, 22, 46],  light: 0.18 },
  { h: 4,  top: [10, 18, 44],   bottom: [30, 40, 80],   sea: [12, 26, 52],  light: 0.22 },
  { h: 6,  top: [70, 80, 140],  bottom: [244, 160, 96], sea: [40, 60, 96],  light: 0.6 },
  { h: 8,  top: [92, 160, 220], bottom: [176, 220, 240],sea: [26, 90, 140], light: 1.0 },
  { h: 13, top: [70, 150, 224], bottom: [160, 214, 240],sea: [22, 96, 150], light: 1.0 },
  { h: 17, top: [120, 130, 190],bottom: [250, 150, 80], sea: [46, 70, 110], light: 0.7 },
  { h: 19, top: [26, 28, 70],   bottom: [90, 60, 100],  sea: [16, 30, 60],  light: 0.3 },
  { h: 21, top: [8, 14, 38],    bottom: [18, 32, 66],   sea: [10, 22, 46],  light: 0.18 },
  { h: 24, top: [8, 14, 38],    bottom: [16, 30, 64],   sea: [10, 22, 46],  light: 0.18 },
];

function skyAt(hour) {
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (hour >= SKY_KEYS[i].h && hour <= SKY_KEYS[i + 1].h) {
      a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break;
    }
  }
  const t = b.h === a.h ? 0 : (hour - a.h) / (b.h - a.h);
  return {
    top: lerpColor(a.top, b.top, t),
    bottom: lerpColor(a.bottom, b.bottom, t),
    sea: lerpColor(a.sea, b.sea, t),
    light: lerp(a.light, b.light, t),
  };
}

/* ---------------- サウンド（Web Audio 合成） ---------------- */
const Sound = {
  ctx: null,
  muted: false,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  env(node, t0, a, d, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g).connect(this.ctx.destination);
    return g;
  },
  tone(freq, dur, type, vol, slide) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    this.env(o, t0, 0.005, dur, vol || 0.12);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  noise(dur, vol, freq) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 1200;
    f.Q.value = 0.8;
    src.connect(f);
    this.env(f, t0, 0.005, dur, vol || 0.2);
    src.start(t0);
  },
  cast()   { this.noise(0.35, 0.12, 2400); },
  splash() { this.noise(0.4, 0.25, 900); this.noise(0.25, 0.12, 2000); },
  nibble() { this.tone(660, 0.07, 'sine', 0.08); },
  bite()   { this.tone(880, 0.1, 'square', 0.1); this.tone(1320, 0.12, 'square', 0.08); },
  hook()   { this.tone(440, 0.15, 'sawtooth', 0.1, 880); },
  reel()   { this.tone(rand(1800, 2200), 0.025, 'square', 0.03); },
  snap()   { this.tone(300, 0.3, 'sawtooth', 0.16, 60); this.noise(0.3, 0.18, 600); },
  escape() { this.tone(330, 0.25, 'sine', 0.1, 165); },
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, 'triangle', 0.12), i * 110);
    });
  },
};

/* ---------------- セーブデータ ---------------- */
const SAVE_KEY = 'fishmap_fishing_save_v1';
const Save = {
  data: { score: 0, total: 0, records: {}, muted: false },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d === 'object') this.data = Object.assign(this.data, d);
        if (!this.data.records) this.data.records = {};
      }
    } catch (e) { /* セーブ破損時は初期化 */ }
  },
  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* 容量不足等は無視 */ }
  },
};

/* ---------------- DOM ---------------- */
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const ui = {
  score: $('score'), count: $('count'), clock: $('clock'),
  powerWrap: $('power-wrap'), powerBar: $('power-bar'),
  fightUi: $('fight-ui'), tensionBar: $('tension-bar'),
  lineDist: $('line-dist'), fishStamina: $('fish-stamina'),
  msg: $('msg'),
  catchCard: $('catch-card'), catchName: $('catch-name'),
  catchCanvas: $('catch-canvas'), catchStats: $('catch-stats'),
  catchPts: $('catch-pts'), catchBadges: $('catch-badges'), catchOk: $('catch-ok'),
  zukanModal: $('zukan-modal'), zukanGrid: $('zukan-grid'),
  zukanBtn: $('zukan-btn'), zukanClose: $('zukan-close'),
  muteBtn: $('mute-btn'),
  title: $('title'), startBtn: $('start-btn'),
};

/* ---------------- ゲーム状態 ---------------- */
const ST = { TITLE: 0, IDLE: 1, CHARGE: 2, FLY: 3, WAIT: 4, BITE: 5, FIGHT: 6, CATCH: 7 };

const G = {
  state: ST.TITLE,
  t: 0,                 // 経過秒
  hour: 7,              // ゲーム内時刻
  W: 0, H: 0,
  seaY: 0,              // 海面基準ライン
  pierEnd: 0,           // 桟橋の先端x
  power: 0, powerDir: 1,
  proj: null,           // 飛翔中のウキ
  lure: null,           // 着水したウキ {x, baseY}
  zone: 0,              // キャスト地点の沖度 0-1
  engaged: null,        // 食いついている魚
  biteTimer: 0,
  fight: null,
  fishes: [],
  ripples: [],
  particles: [],
  clouds: [],
  stars: [],
  holding: false,
  holdT: 0,
  reeling: false,
  msgTimer: 0,
  shake: 0,
  reelTick: 0,
  rodTip: { x: 0, y: 0 },
};

const DAY_LEN = 360; // 実時間6分でゲーム内24時間

/* ---------------- リサイズ ---------------- */
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.W = window.innerWidth;
  G.H = window.innerHeight;
  canvas.width = Math.round(G.W * dpr);
  canvas.height = Math.round(G.H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  G.seaY = Math.round(G.H * 0.52);
  G.pierEnd = Math.min(190, G.W * 0.24);
}
window.addEventListener('resize', resize);
resize();

/* ---------------- 背景オブジェクト初期化 ---------------- */
function initScenery() {
  G.clouds = [];
  for (let i = 0; i < 5; i++) {
    G.clouds.push({ x: rand(0, 1), y: rand(0.06, 0.3), s: rand(0.6, 1.4), v: rand(0.004, 0.012) });
  }
  G.stars = [];
  for (let i = 0; i < 70; i++) {
    G.stars.push({ x: Math.random(), y: rand(0, 0.45), r: rand(0.4, 1.4), tw: rand(0, TAU) });
  }
}
initScenery();

/* ---------------- 波・水面 ---------------- */
function waterY(x, t) {
  return G.seaY
    + Math.sin(x * 0.012 + t * 1.1) * 4
    + Math.sin(x * 0.025 - t * 0.7) * 2.5
    + Math.sin(x * 0.006 + t * 0.4) * 3;
}

/* ---------------- 魚の生成・管理 ---------------- */
function timeFactor(sp) {
  const night = (G.hour < 5 || G.hour >= 19);
  return night ? sp.night : sp.day;
}

function pickSpecies(zone) {
  const cands = SPECIES.filter((sp) => zone >= sp.zone[0] - 0.08 && zone <= sp.zone[1] + 0.08);
  let total = 0;
  const ws = cands.map((sp) => {
    const w = sp.rarity * Math.max(0.05, timeFactor(sp));
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < cands.length; i++) {
    r -= ws[i];
    if (r <= 0) return cands[i];
  }
  return cands[cands.length - 1] || SPECIES[0];
}

function spawnFish(x) {
  const fx = x !== undefined ? x : rand(G.pierEnd + 40, G.W - 40);
  const zone = clamp((fx - G.pierEnd) / Math.max(1, G.W - G.pierEnd - 60), 0, 1);
  const sp = pickSpecies(zone);
  const size = Math.round(lerp(sp.min, sp.max, Math.pow(Math.random(), 1.7)));
  return {
    sp, size,
    x: fx,
    y: sp.kind ? rand(G.H - 70, G.H - 35) : rand(G.seaY + 50, G.H - 50),
    dir: Math.random() < 0.5 ? 1 : -1,
    speed: sp.kind ? 0 : rand(14, 34),
    state: 'swim',
    timer: rand(1, 4),
    teaseCount: 0,
    curiosity: rand(0.5, 1.5),
    wig: rand(0, TAU),
  };
}

function populateFishes() {
  G.fishes = [];
  const n = clamp(Math.round(G.W / 130), 7, 14);
  for (let i = 0; i < n; i++) G.fishes.push(spawnFish());
}

/* ---------------- エフェクト ---------------- */
function addRipple(x, y, big) {
  G.ripples.push({ x, y, r: big ? 6 : 3, vr: big ? 60 : 28, a: 0.7, max: big ? 90 : 40 });
}
function addSplash(x, y, n, power) {
  for (let i = 0; i < n; i++) {
    G.particles.push({
      x, y,
      vx: rand(-1, 1) * 90 * power,
      vy: rand(-1, -0.2) * 240 * power,
      life: rand(0.4, 0.9),
      t: 0,
      r: rand(1.5, 3.5),
    });
  }
}

/* ---------------- メッセージ ---------------- */
function msg(text, dur) {
  ui.msg.textContent = text;
  ui.msg.classList.remove('hidden');
  G.msgTimer = dur || 2.4;
}

/* ---------------- キャスト ---------------- */
function startCharge() {
  G.state = ST.CHARGE;
  G.power = 0;
  G.powerDir = 1;
  ui.powerWrap.classList.remove('hidden');
}

function doCast() {
  ui.powerWrap.classList.add('hidden');
  const power = Math.max(0.12, G.power);
  const targetX = lerp(G.pierEnd + 80, G.W - 60, power);
  const T = 0.85 + power * 0.55;
  const tip = G.rodTip;
  const gy = 1500;
  const dy = (G.seaY - 6) - tip.y;
  G.proj = {
    x: tip.x, y: tip.y,
    vx: (targetX - tip.x) / T,
    vy: (dy - 0.5 * gy * T * T) / T,
    g: gy,
  };
  G.state = ST.FLY;
  Sound.cast();
}

function landLure(x) {
  const lx = clamp(x, G.pierEnd + 60, G.W - 30);
  G.lure = { x: lx, dip: 0, sink: 0 };
  G.zone = clamp((lx - G.pierEnd) / Math.max(1, G.W - G.pierEnd - 60), 0, 1);
  G.proj = null;
  G.state = ST.WAIT;
  addSplash(lx, waterY(lx, G.t), 14, 0.8);
  addRipple(lx, waterY(lx, G.t), true);
  Sound.splash();
  const deep = G.zone > 0.66 ? '沖の深場' : G.zone > 0.33 ? '中距離' : '岸近く';
  msg(`${deep}に着水！ アタリを待とう…`, 2);
}

/* ---------------- アタリ・アワセ ---------------- */
function fishNibble(f) {
  G.lure.dip = 7;
  addRipple(G.lure.x, waterY(G.lure.x, G.t), false);
  Sound.nibble();
}

function fishBite(f) {
  // 既にアタリ・ファイト中なら新たなアタリは発生させない
  if (G.state !== ST.WAIT || G.engaged !== f || !G.lure) { f.state = 'swim'; return; }
  G.state = ST.BITE;
  G.biteTimer = f.sp.biteWin;
  f.state = 'biting';
  G.lure.dip = 22;
  addRipple(G.lure.x, waterY(G.lure.x, G.t), true);
  addSplash(G.lure.x, waterY(G.lure.x, G.t), 6, 0.5);
  Sound.bite();
}

function strikeAttempt() {
  // WAIT中のタップ＝アワセ
  const f = G.engaged;
  if (f && (f.state === 'tease' || f.state === 'approach')) {
    if (Math.random() < 0.55) {
      msg('早アワセ！魚が警戒して逃げた…');
      scareFish(f);
    } else {
      msg('まだ食い込んでいない…落ち着け！');
    }
  }
}

function scareFish(f) {
  if (!f) return;
  f.state = 'flee';
  f.timer = 2;
  f.dir = f.x > G.W / 2 ? 1 : -1;
  if (G.engaged === f) G.engaged = null;
}

function hookSet() {
  const f = G.engaged;
  if (!f) return;
  const sp = f.sp;
  const dist0 = 6 + G.zone * 22 + sp.fight * 6;
  G.fight = {
    f, sp,
    size: f.size,
    dist: dist0,
    dist0,
    maxLine: dist0 + 16,
    tension: 25,
    st: 0.65 + sp.fight * 0.85,
    stMax: 0.65 + sp.fight * 0.85,
    mode: 'run',
    modeT: rand(0.5, 1.2),
    wave: rand(0, TAU),
  };
  G.state = ST.FIGHT;
  G.reeling = false;
  ui.fightUi.classList.remove('hidden');
  Sound.hook();
  addSplash(G.lure.x, waterY(G.lure.x, G.t), 16, 1);
  G.shake = 0.35;
  if (sp.kind) msg('……ん？妙に軽いぞ…？');
  else if (sp.fight > 0.8) msg('竿が満月！とんでもない大物だ！！');
  else msg('ヒット！！');
}

function endFight(result) {
  ui.fightUi.classList.add('hidden');
  const fight = G.fight;
  G.fight = null;
  G.reeling = false;
  if (fight && fight.f) {
    const idx = G.fishes.indexOf(fight.f);
    if (idx >= 0) {
      if (result === 'landed') {
        G.fishes[idx] = spawnFish(); // 新しい個体を補充
      } else {
        scareFish(fight.f);
      }
    }
  }
  G.engaged = null;
  G.lure = null;
  if (result === 'landed') {
    showCatch(fight);
  } else {
    if (result === 'snap') {
      msg('ラインブレイク！テンションの掛けすぎだ…');
      Sound.snap();
    } else {
      msg('糸を出され過ぎた…逃げられた！');
      Sound.escape();
    }
    G.state = ST.IDLE;
  }
}

/* ---------------- 釣果 ---------------- */
function calcWeight(sp, size) {
  const kg = sp.maxKg * Math.pow(size / sp.max, 3);
  return kg;
}
function fmtWeight(kg) {
  return kg >= 1 ? `${kg.toFixed(1)} kg` : `${Math.max(1, Math.round(kg * 1000))} g`;
}

function showCatch(fight) {
  const sp = fight.sp;
  const size = fight.size;
  const rec = Save.data.records[sp.id];
  const isNew = !rec;
  const isRecord = rec && size > rec.maxSize;
  const sizeT = (size - sp.min) / Math.max(1, sp.max - sp.min);
  let gain = Math.round(sp.pts * (0.5 + sizeT));
  if (isNew) gain = Math.round(gain * 1.5);

  Save.data.score += gain;
  Save.data.total += 1;
  Save.data.records[sp.id] = {
    count: (rec ? rec.count : 0) + 1,
    maxSize: Math.max(rec ? rec.maxSize : 0, size),
  };
  Save.write();

  ui.catchName.textContent = sp.name;
  ui.catchStats.innerHTML =
    `全長 <b>${size} cm</b> ／ 重さ <b>${fmtWeight(calcWeight(sp, size))}</b><br>` +
    `<span style="opacity:.7;font-size:13px">${sp.desc}</span>`;
  ui.catchPts.textContent = `+${gain} pt`;
  ui.catchBadges.innerHTML =
    (isNew ? '<span class="badge new">初ゲット!</span>' : '') +
    (isRecord ? '<span class="badge record">自己記録更新!</span>' : '');

  const cc = ui.catchCanvas;
  const c2 = cc.getContext('2d');
  c2.clearRect(0, 0, cc.width, cc.height);
  c2.save();
  c2.translate(cc.width / 2, cc.height / 2);
  drawFishShape(c2, sp, Math.min(230, cc.width - 40), 0, false);
  c2.restore();

  ui.catchCard.classList.remove('hidden');
  G.state = ST.CATCH;
  if (!sp.kind) { Sound.fanfare(); addSplash(G.pierEnd, G.seaY, 10, 0.8); }
}

/* ---------------- 図鑑 ---------------- */
function openZukan() {
  ui.zukanGrid.innerHTML = '';
  SPECIES.forEach((sp) => {
    const rec = Save.data.records[sp.id];
    const cell = document.createElement('div');
    cell.className = 'zukan-cell' + (rec ? '' : ' unknown');
    const cv = document.createElement('canvas');
    cv.width = 140; cv.height = 64;
    const c2 = cv.getContext('2d');
    c2.save();
    c2.translate(70, 32);
    drawFishShape(c2, sp, 110, 0, !rec);
    c2.restore();
    cell.appendChild(cv);
    const info = document.createElement('div');
    if (rec) {
      info.innerHTML = `<div class="z-name">${sp.name}</div>最大 ${rec.maxSize}cm ／ ${rec.count}匹`;
    } else {
      info.innerHTML = `<div class="z-name">？？？</div>未捕獲`;
    }
    cell.appendChild(info);
    ui.zukanGrid.appendChild(cell);
  });
  ui.zukanModal.classList.remove('hidden');
}

/* =========================================================
 * 更新処理
 * ========================================================= */
function update(dt) {
  G.t += dt;
  G.hour = (7 + (G.t / DAY_LEN) * 24) % 24;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);

  if (G.msgTimer > 0) {
    G.msgTimer -= dt;
    if (G.msgTimer <= 0) ui.msg.classList.add('hidden');
  }

  // 雲
  G.clouds.forEach((c) => {
    c.x += c.v * dt;
    if (c.x > 1.2) c.x = -0.25;
  });

  // 波紋
  for (let i = G.ripples.length - 1; i >= 0; i--) {
    const r = G.ripples[i];
    r.r += r.vr * dt;
    r.a -= dt * 0.9;
    if (r.a <= 0 || r.r > r.max) G.ripples.splice(i, 1);
  }
  // 飛沫
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 700 * dt;
    if (p.t > p.life) G.particles.splice(i, 1);
  }

  // 状態別
  switch (G.state) {
    case ST.CHARGE: {
      G.power += G.powerDir * dt * 1.1;
      if (G.power >= 1) { G.power = 1; G.powerDir = -1; }
      if (G.power <= 0) { G.power = 0; G.powerDir = 1; }
      ui.powerBar.style.width = `${Math.round(G.power * 100)}%`;
      break;
    }
    case ST.FLY: {
      const p = G.proj;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      if (p.y >= waterY(p.x, G.t) - 2) landLure(p.x);
      break;
    }
    case ST.WAIT: {
      updateLure(dt);
      updateFishes(dt);
      if (G.holding) {
        G.holdT += dt;
        if (G.holdT > 0.28 && G.lure) {
          // 長押し＝回収
          G.lure.x -= 110 * dt;
          if (G.engaged && G.engaged.state !== 'biting') scareFish(G.engaged);
          if (G.t - (G.lastReelSnd || 0) > 0.09) { Sound.reel(); G.lastReelSnd = G.t; }
          if (G.lure.x < G.pierEnd + 50) {
            G.lure = null;
            G.state = ST.IDLE;
            msg('仕掛けを回収した');
          }
        }
      }
      break;
    }
    case ST.BITE: {
      updateLure(dt);
      updateFishes(dt);
      G.biteTimer -= dt;
      if (G.biteTimer <= 0) {
        msg('エサだけ取られた…！');
        Sound.escape();
        scareFish(G.engaged);
        G.lure.dip = 0;
        G.state = ST.WAIT;
      }
      break;
    }
    case ST.FIGHT:
      updateFight(dt);
      updateFishes(dt);
      break;
    default:
      updateFishes(dt);
      break;
  }

  // HUD
  ui.score.textContent = Save.data.score.toLocaleString();
  ui.count.textContent = Save.data.total;
  const hh = Math.floor(G.hour);
  const mm = Math.floor((G.hour - hh) * 60);
  ui.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function updateLure(dt) {
  if (!G.lure) return;
  if (G.lure.dip > 0) G.lure.dip = Math.max(0, G.lure.dip - dt * 18);
}

function updateFishes(dt) {
  const baitX = G.lure ? G.lure.x : null;
  const baitY = G.lure ? waterY(G.lure.x, G.t) + 55 : null;

  G.fishes.forEach((f) => {
    f.wig += dt * (4 + f.speed * 0.1);
    switch (f.state) {
      case 'swim': {
        if (!f.sp.kind) {
          f.x += f.dir * f.speed * dt;
          f.y += Math.sin(f.wig * 0.5) * 6 * dt;
          f.timer -= dt;
          if (f.timer <= 0) {
            f.timer = rand(2, 6);
            if (Math.random() < 0.35) f.dir *= -1;
            f.speed = rand(12, 36);
          }
          if (f.x < 30) { f.x = 30; f.dir = 1; }
          if (f.x > G.W - 20) { f.x = G.W - 20; f.dir = -1; }
          f.y = clamp(f.y, G.seaY + 45, G.H - 40);
        }
        // ルアーへの興味（WAIT中のみ・1匹ずつ）
        if (baitX !== null && !G.engaged && (G.state === ST.WAIT)) {
          // ゴミは真上に仕掛けが来たときだけ「根掛かり」する
          const d = f.sp.kind ? Math.abs(f.x - baitX) * 4 : Math.hypot(f.x - baitX, f.y - baitY);
          if (d < 320) {
            const p = 0.22 * f.curiosity * Math.max(0.1, timeFactor(f.sp)) * dt;
            if (Math.random() < p) {
              f.state = 'approach';
              f.timer = rand(1.5, 3.5);
              G.engaged = f;
            }
          }
        }
        break;
      }
      case 'approach': {
        if (baitX === null || G.engaged !== f) { f.state = 'swim'; if (G.engaged === f) G.engaged = null; break; }
        if (f.sp.kind) {
          // ゴミは動かず、しばらくして根掛かりのようにヒット
          f.timer -= dt;
          if (f.timer <= 0) fishBite(f);
          break;
        }
        const dx = baitX - f.x;
        const dy = baitY - f.y;
        const d = Math.hypot(dx, dy);
        f.dir = dx >= 0 ? 1 : -1;
        if (d < 16) {
          f.state = 'tease';
          f.teaseCount = f.sp.kind ? 0 : irand(1, 3);
          f.timer = rand(0.5, 1.1);
        } else {
          const sp = 55 + f.sp.fight * 30;
          f.x += (dx / d) * sp * dt;
          f.y += (dy / d) * sp * dt;
        }
        break;
      }
      case 'tease': {
        if (baitX === null || G.engaged !== f) { f.state = 'swim'; if (G.engaged === f) G.engaged = null; break; }
        f.x = baitX + Math.sin(f.wig) * 10 - f.dir * 12;
        f.y = baitY + Math.cos(f.wig * 0.7) * 6;
        f.timer -= dt;
        if (f.timer <= 0) {
          if (f.teaseCount > 0) {
            f.teaseCount--;
            f.timer = rand(0.7, 1.7);
            fishNibble(f);
            if (Math.random() < 0.13) {
              msg('見切られた…魚が離れていく');
              scareFish(f);
            }
          } else {
            fishBite(f);
          }
        }
        break;
      }
      case 'biting': {
        if (baitX !== null && !f.sp.kind) {
          f.x = baitX;
          f.y = baitY - 10;
        }
        break;
      }
      case 'flee': {
        if (f.sp.kind) { f.state = 'swim'; break; }
        f.x += f.dir * 130 * dt;
        f.timer -= dt;
        if (f.timer <= 0) f.state = 'swim';
        if (f.x < 30 || f.x > G.W - 20) { f.x = clamp(f.x, 30, G.W - 20); f.dir *= -1; }
        break;
      }
    }
  });
}

function updateFight(dt) {
  const ft = G.fight;
  if (!ft) return;
  ft.wave += dt * 5;

  // 走り⇄休みの切り替え
  ft.modeT -= dt;
  if (ft.modeT <= 0) {
    if (ft.mode === 'run') {
      ft.mode = 'rest';
      ft.modeT = rand(0.8, 1.8) + (1 - ft.st / ft.stMax) * 1.2;
    } else {
      const runChance = 0.35 + ft.sp.fight * 0.55;
      if (Math.random() < runChance * clamp(ft.st / ft.stMax + 0.25, 0, 1)) {
        ft.mode = 'run';
        ft.modeT = rand(0.6, 1.0) + ft.sp.fight * rand(0.5, 1.2);
        if (ft.sp.fight > 0.5) G.shake = 0.25;
      } else {
        ft.modeT = rand(0.5, 1.0);
      }
    }
  }

  const stRatio = clamp(ft.st / ft.stMax, 0, 1);
  const pulse = 0.8 + 0.25 * Math.sin(ft.wave) + 0.1 * Math.sin(ft.wave * 2.7);
  const P = ft.sp.fight * (0.35 + 0.65 * stRatio) * (ft.mode === 'run' ? 1 : 0.3) * pulse;

  // テンション目標値
  let target = P * 58;
  if (G.reeling) {
    target += 42 + (ft.mode === 'run' ? 18 : 0);
  }
  const rate = target > ft.tension ? 130 : 90;
  ft.tension += clamp(target - ft.tension, -rate * dt, rate * dt);
  ft.tension = clamp(ft.tension, 0, 110);

  // 距離
  if (G.reeling) {
    ft.dist -= 3.4 * (1 - P * 0.55) * dt;
    ft.st -= 0.045 * dt;
    if (G.t - (G.lastReelSnd || 0) > 0.08) { Sound.reel(); G.lastReelSnd = G.t; }
  }
  if (ft.mode === 'run') {
    ft.dist += (1.5 + 5.5 * P) * dt * (G.reeling ? 0.45 : 1);
    ft.st -= 0.06 * dt;
  }
  ft.st = Math.max(0.05, ft.st);
  ft.dist = Math.max(0, ft.dist);

  // 魚の暴れ演出
  if (ft.mode === 'run' && Math.random() < dt * 3) {
    const fx = fightScreenX(ft);
    addSplash(fx, waterY(fx, G.t), 4, 0.5 + ft.sp.fight * 0.5);
    addRipple(fx, waterY(fx, G.t), true);
  }

  // 判定
  if (ft.tension >= 100) { endFight('snap'); return; }
  if (ft.dist >= ft.maxLine) { endFight('escape'); return; }
  if (ft.dist <= 1.2) { endFight('landed'); return; }

  // UI更新
  const tp = clamp(ft.tension, 0, 100);
  ui.tensionBar.style.width = `${tp}%`;
  ui.tensionBar.className = tp > 80 ? 'danger' : tp > 55 ? 'warn' : '';
  ui.tensionBar.id = 'tension-bar';
  ui.lineDist.textContent = `残り ${ft.dist.toFixed(1)} m`;
  const dots = Math.ceil(stRatio * 5);
  ui.fishStamina.textContent = `魚の体力 ${'●'.repeat(dots)}${'○'.repeat(5 - dots)}`;
}

function fightScreenX(ft) {
  const lure0 = G.lure ? G.lure.x : G.W * 0.6;
  return clamp(G.pierEnd + (ft.dist / ft.dist0) * (lure0 - G.pierEnd), G.pierEnd + 30, G.W - 30);
}

/* =========================================================
 * 描画処理
 * ========================================================= */
function render() {
  const W = G.W, H = G.H, t = G.t;
  const sky = skyAt(G.hour);

  ctx.save();
  if (G.shake > 0) {
    ctx.translate(rand(-1, 1) * G.shake * 14, rand(-1, 1) * G.shake * 10);
  }

  /* --- 空 --- */
  const skyGrad = ctx.createLinearGradient(0, 0, 0, G.seaY);
  skyGrad.addColorStop(0, rgb(sky.top));
  skyGrad.addColorStop(1, rgb(sky.bottom));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, G.seaY + 12);

  /* --- 星 --- */
  const nightness = 1 - clamp((sky.light - 0.18) / 0.5, 0, 1);
  if (nightness > 0.05) {
    G.stars.forEach((s) => {
      const a = nightness * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.tw)));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, TAU);
      ctx.fill();
    });
  }

  /* --- 太陽・月 --- */
  const sunT = (G.hour - 6) / 12; // 6時〜18時
  if (sunT > -0.05 && sunT < 1.05) {
    const sx = lerp(W * 0.08, W * 0.92, sunT);
    const sy = G.seaY - Math.sin(clamp(sunT, 0, 1) * Math.PI) * (G.seaY * 0.78) - 20;
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90);
    glow.addColorStop(0, 'rgba(255,236,160,0.95)');
    glow.addColorStop(0.25, 'rgba(255,220,120,0.5)');
    glow.addColorStop(1, 'rgba(255,210,100,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, 90, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(sx, sy, 22, 0, TAU); ctx.fill();
  }
  const moonT = ((G.hour + 12) % 24 - 6) / 12;
  if (moonT > 0.02 && moonT < 0.98 && nightness > 0.1) {
    const mx = lerp(W * 0.1, W * 0.9, moonT);
    const my = G.seaY - Math.sin(moonT * Math.PI) * (G.seaY * 0.7) - 30;
    ctx.fillStyle = `rgba(235,240,255,${(0.9 * nightness).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(mx, my, 18, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(sky.top);
    ctx.beginPath(); ctx.arc(mx + 7, my - 5, 15, 0, TAU); ctx.fill();
  }

  /* --- 雲 --- */
  ctx.fillStyle = `rgba(255,255,255,${(0.16 + sky.light * 0.25).toFixed(2)})`;
  G.clouds.forEach((c) => {
    const cx = c.x * W, cy = c.y * H, s = c.s;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 56 * s, 14 * s, 0, 0, TAU);
    ctx.ellipse(cx + 30 * s, cy - 8 * s, 34 * s, 12 * s, 0, 0, TAU);
    ctx.ellipse(cx - 34 * s, cy - 4 * s, 28 * s, 10 * s, 0, 0, TAU);
    ctx.fill();
  });

  /* --- 海 --- */
  const seaGrad = ctx.createLinearGradient(0, G.seaY, 0, H);
  seaGrad.addColorStop(0, rgb(sky.sea));
  seaGrad.addColorStop(1, rgb(lerpColor(sky.sea, [2, 6, 16], 0.75)));
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, G.seaY - 10, W, H - G.seaY + 10);

  // 海底の岩・海藻
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 6; i++) {
    const rx = (i * 0.17 + 0.08) * W;
    ctx.beginPath();
    ctx.ellipse(rx, H - 6, 46 + (i % 3) * 22, 20 + (i % 2) * 10, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20,60,40,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const wx = (i * 0.13 + 0.05) * W;
    ctx.beginPath();
    ctx.moveTo(wx, H);
    ctx.quadraticCurveTo(wx + Math.sin(t * 1.2 + i) * 12, H - 30, wx + Math.sin(t * 0.9 + i * 2) * 18, H - 58 - (i % 3) * 14);
    ctx.stroke();
  }

  /* --- 魚（水中） --- */
  G.fishes.forEach((f) => {
    if (G.fight && G.fight.f === f) return; // ファイト中の魚は別描画
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.translate(f.x, f.y);
    ctx.scale(f.dir, 1);
    const len = clamp(f.size * 1.5, 18, 130);
    ctx.rotate(Math.sin(f.wig) * 0.05);
    drawFishShape(ctx, f.sp, len, f.wig, false);
    ctx.restore();
  });

  /* --- ファイト中の魚 --- */
  if (G.fight) {
    const ft = G.fight;
    const fx = fightScreenX(ft);
    const fy = waterY(fx, t) + 14 + Math.sin(ft.wave * 2) * 8;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.translate(fx, fy);
    ctx.scale(-1, 1); // 沖向き＝引っ張る向き
    ctx.rotate(Math.sin(ft.wave * 3) * 0.3);
    drawFishShape(ctx, ft.sp, clamp(ft.size * 1.5, 24, 150), ft.wave * 4, false);
    ctx.restore();
  }

  /* --- 水面ライン --- */
  ctx.beginPath();
  ctx.moveTo(0, waterY(0, t));
  for (let x = 0; x <= W; x += 14) ctx.lineTo(x, waterY(x, t));
  ctx.strokeStyle = `rgba(255,255,255,${(0.25 + sky.light * 0.3).toFixed(2)})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // キラキラ反射
  ctx.fillStyle = `rgba(255,255,255,${(sky.light * 0.35).toFixed(2)})`;
  for (let i = 0; i < 24; i++) {
    const sx = ((i * 73.7 + t * 24) % W);
    const sy = waterY(sx, t) + 6 + (i % 5) * 9;
    const a = Math.sin(t * 2 + i * 1.7);
    if (a > 0.4) ctx.fillRect(sx, sy, 10 * a, 1.6);
  }

  /* --- 波紋 --- */
  G.ripples.forEach((r) => {
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, r.a).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.32, 0, 0, TAU);
    ctx.stroke();
  });

  /* --- 桟橋 --- */
  drawPier(t, sky);

  /* --- 釣り人とロッド --- */
  drawAngler(t);

  /* --- ライン・ウキ --- */
  drawLineAndLure(t);

  /* --- 飛沫 --- */
  ctx.fillStyle = 'rgba(220,240,255,0.85)';
  G.particles.forEach((p) => {
    ctx.globalAlpha = clamp(1 - p.t / p.life, 0, 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  /* --- 夜の暗さオーバーレイ --- */
  if (sky.light < 0.55) {
    ctx.fillStyle = `rgba(4,8,24,${((0.55 - sky.light) * 0.45).toFixed(2)})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

function drawPier(t, sky) {
  const deckY = G.seaY - 46;
  const end = G.pierEnd;
  // 支柱
  ctx.fillStyle = '#4a3826';
  for (let x = 22; x < end - 8; x += 52) {
    ctx.fillRect(x, deckY + 8, 10, waterY(x, t) - deckY + 26);
  }
  // デッキ
  const deckGrad = ctx.createLinearGradient(0, deckY, 0, deckY + 14);
  deckGrad.addColorStop(0, '#8a6a45');
  deckGrad.addColorStop(1, '#5e4630');
  ctx.fillStyle = deckGrad;
  ctx.fillRect(0, deckY, end, 14);
  // 板の継ぎ目
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let x = 16; x < end; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, deckY); ctx.lineTo(x, deckY + 14); ctx.stroke();
  }
  // 柵
  ctx.fillStyle = '#6e5439';
  ctx.fillRect(0, deckY - 26, end - 28, 5);
  for (let x = 10; x < end - 28; x += 48) ctx.fillRect(x, deckY - 26, 5, 26);
  // クーラーボックス
  ctx.fillStyle = '#d8e4ec';
  ctx.fillRect(14, deckY - 18, 34, 18);
  ctx.fillStyle = '#3a7ca8';
  ctx.fillRect(14, deckY - 18, 34, 5);
}

function drawAngler(t) {
  const deckY = G.seaY - 46;
  const px = Math.max(74, G.pierEnd - 78); // 立ち位置
  const bodyY = deckY - 14;

  ctx.save();
  ctx.fillStyle = '#22303c';
  ctx.strokeStyle = '#22303c';

  // 脚
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(px - 6, deckY); ctx.lineTo(px - 2, bodyY - 12);
  ctx.moveTo(px + 8, deckY); ctx.lineTo(px + 2, bodyY - 12);
  ctx.stroke();
  // 胴体（少し前傾）
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(px, bodyY - 10); ctx.lineTo(px + 7, bodyY - 38);
  ctx.stroke();
  // 頭・帽子
  ctx.beginPath(); ctx.arc(px + 10, bodyY - 48, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9a227';
  ctx.beginPath(); ctx.arc(px + 10, bodyY - 51, 9, Math.PI, 0); ctx.fill();
  ctx.fillRect(px + 1, bodyY - 51, 21, 3);

  // 腕→グリップ
  const grip = rodGrip();
  ctx.strokeStyle = '#22303c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(px + 6, bodyY - 34);
  ctx.lineTo(grip.x, grip.y);
  ctx.stroke();

  // ロッド
  const tip = computeRodTip(t);
  const ang = rodAngle();
  const midX = grip.x + Math.cos(ang) * ROD_LEN * 0.55;
  const midY = grip.y + Math.sin(ang) * ROD_LEN * 0.55;
  ctx.strokeStyle = '#1a1d22';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(grip.x, grip.y);
  ctx.quadraticCurveTo(midX, midY, tip.x, tip.y);
  ctx.stroke();
  // リール
  ctx.fillStyle = '#8a8f98';
  ctx.beginPath(); ctx.arc(grip.x + 8, grip.y + 8, 6, 0, TAU); ctx.fill();
  ctx.restore();

  G.rodTip = tip;
}

const ROD_LEN = 132;
function rodGrip() {
  const deckY = G.seaY - 46;
  const px = Math.max(74, G.pierEnd - 78);
  return { x: px + 20, y: deckY - 40 };
}
function rodAngle() {
  // 状態でロッド角度（ラジアン、上方向が負）
  switch (G.state) {
    case ST.CHARGE: return (-48 - 38 * G.power) * Math.PI / 180;
    case ST.FIGHT: return -26 * Math.PI / 180;
    case ST.FLY: return -30 * Math.PI / 180;
    default: return -46 * Math.PI / 180;
  }
}
function computeRodTip(t) {
  const g = rodGrip();
  const a = rodAngle();
  let tx = g.x + Math.cos(a) * ROD_LEN;
  let ty = g.y + Math.sin(a) * ROD_LEN;
  if (G.state === ST.FIGHT && G.fight) {
    // テンションで穂先が引き込まれる
    const bend = clamp(G.fight.tension / 100, 0, 1) * 0.45;
    const fx = fightScreenX(G.fight);
    const fy = waterY(fx, t);
    tx = lerp(tx, fx, bend * 0.25);
    ty = lerp(ty, fy, bend * 0.55);
  } else if (G.state === ST.BITE) {
    ty += Math.sin(G.t * 30) * 3 + 6;
  }
  return { x: tx, y: ty };
}

function drawLineAndLure(t) {
  const tip = G.rodTip;
  ctx.strokeStyle = 'rgba(230,240,255,0.55)';
  ctx.lineWidth = 1;

  if (G.state === ST.FLY && G.proj) {
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo((tip.x + G.proj.x) / 2, Math.min(tip.y, G.proj.y) - 18, G.proj.x, G.proj.y);
    ctx.stroke();
    drawFloat(G.proj.x, G.proj.y, 0);
    return;
  }

  if ((G.state === ST.WAIT || G.state === ST.BITE) && G.lure) {
    const lx = G.lure.x;
    const ly = waterY(lx, t) + G.lure.dip;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    const sag = 26;
    ctx.quadraticCurveTo((tip.x + lx) / 2, Math.max(tip.y, ly) + sag, lx, ly - 8);
    ctx.stroke();
    drawFloat(lx, ly, G.lure.dip);
    // 水中の糸とエサ
    ctx.strokeStyle = 'rgba(230,240,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(lx, ly + 4);
    ctx.lineTo(lx, ly + 55);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,170,150,0.8)';
    ctx.beginPath(); ctx.arc(lx, ly + 57, 3, 0, TAU); ctx.fill();
    return;
  }

  if (G.state === ST.FIGHT && G.fight) {
    const fx = fightScreenX(G.fight);
    const fy = waterY(fx, t) + 10;
    const tense = clamp(G.fight.tension / 100, 0, 1);
    ctx.strokeStyle = `rgba(255,${Math.round(240 - tense * 160)},${Math.round(255 - tense * 200)},0.8)`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    // テンションが高いほど直線、低いほどたるむ
    const sag = (1 - tense) * 40;
    ctx.quadraticCurveTo((tip.x + fx) / 2, Math.max(tip.y, fy) * 0.5 + Math.min(tip.y, fy) * 0.5 + sag, fx, fy);
    ctx.stroke();
  }
}

function drawFloat(x, y, dip) {
  // 棒ウキ
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(-1.5, -2, 3, 10);
  ctx.fillStyle = '#e0453f';
  ctx.fillRect(-2.5, -14 + dip * 0.4, 5, 13);
  ctx.fillStyle = '#ffd866';
  ctx.fillRect(-2.5, -17 + dip * 0.4, 5, 3);
  ctx.restore();
}

/* ---------------- 魚の描画（汎用） ----------------
 * 原点中心・右向き・len=全長(px)。silhouette=trueで影絵
 */
function drawFishShape(c, sp, len, wig, silhouette) {
  const L = len / 2;
  const h = len * sp.ratio / 2;
  const tailSwing = Math.sin(wig || 0) * h * 0.3;

  if (sp.kind === 'boot') { drawBoot(c, len, silhouette); return; }
  if (sp.kind === 'can') { drawCan(c, len, silhouette); return; }

  const back = silhouette ? [20, 30, 45] : sp.back;
  const belly = silhouette ? [20, 30, 45] : sp.belly;

  // 尾びれ
  c.fillStyle = rgb(back);
  c.beginPath();
  c.moveTo(-L * 0.72, 0);
  c.lineTo(-L, -h * 0.85 + tailSwing);
  c.lineTo(-L * 0.86, tailSwing * 0.5);
  c.lineTo(-L, h * 0.85 + tailSwing);
  c.closePath();
  c.fill();

  // 本体
  const grad = c.createLinearGradient(0, -h, 0, h);
  grad.addColorStop(0, rgb(back));
  grad.addColorStop(0.55, rgb(lerpColor(back, belly, 0.5)));
  grad.addColorStop(1, rgb(belly));
  c.fillStyle = silhouette ? rgb(back) : grad;
  c.beginPath();
  c.moveTo(L, 0);
  c.bezierCurveTo(L * 0.55, -h * 1.15, -L * 0.3, -h * 1.05, -L * 0.78, -h * 0.2);
  c.bezierCurveTo(-L * 0.85, 0, -L * 0.85, 0, -L * 0.78, h * 0.2);
  c.bezierCurveTo(-L * 0.3, h * 1.05, L * 0.55, h * 1.15, L, 0);
  c.closePath();
  c.fill();

  // 背びれ
  c.fillStyle = rgb(back);
  c.beginPath();
  c.moveTo(L * 0.25, -h * 0.95);
  c.quadraticCurveTo(-L * 0.05, -h * 1.7, -L * 0.35, -h * 0.9);
  c.closePath();
  c.fill();
  // 胸びれ
  c.beginPath();
  c.moveTo(L * 0.3, h * 0.25);
  c.quadraticCurveTo(L * 0.05, h * 0.9, L * 0.12, h * 0.3);
  c.closePath();
  c.fill();

  if (!silhouette) {
    // 模様
    c.save();
    c.beginPath();
    c.moveTo(L, 0);
    c.bezierCurveTo(L * 0.55, -h * 1.15, -L * 0.3, -h * 1.05, -L * 0.78, -h * 0.2);
    c.bezierCurveTo(-L * 0.85, 0, -L * 0.85, 0, -L * 0.78, h * 0.2);
    c.bezierCurveTo(-L * 0.3, h * 1.05, L * 0.55, h * 1.15, L, 0);
    c.clip();
    if (sp.pattern === 'vbars') {
      c.fillStyle = `rgba(${sp.back[0] * 0.4},${sp.back[1] * 0.4},${sp.back[2] * 0.4},0.5)`;
      for (let i = -2; i <= 2; i++) {
        c.fillRect(i * L * 0.3 - L * 0.06, -h, L * 0.13, h * 1.4);
      }
    } else if (sp.pattern === 'spots') {
      c.fillStyle = 'rgba(40,50,70,0.4)';
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.arc((((i * 37) % 100) / 100 - 0.5) * L * 1.3, (((i * 53) % 100) / 100 - 0.6) * h, len * 0.022 + 1, 0, TAU);
        c.fill();
      }
    } else if (sp.pattern === 'hline') {
      c.strokeStyle = 'rgba(60,80,110,0.55)';
      c.lineWidth = Math.max(1.5, h * 0.16);
      c.beginPath(); c.moveTo(-L * 0.8, 0); c.lineTo(L * 0.9, 0); c.stroke();
    } else if (sp.pattern === 'yline') {
      c.strokeStyle = 'rgba(224,192,64,0.8)';
      c.lineWidth = Math.max(1.5, h * 0.2);
      c.beginPath(); c.moveTo(-L * 0.8, 0); c.lineTo(L * 0.9, 0); c.stroke();
    }
    c.restore();

    // 目
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(L * 0.62, -h * 0.22, Math.max(2, len * 0.035), 0, TAU); c.fill();
    c.fillStyle = '#111';
    c.beginPath(); c.arc(L * 0.64, -h * 0.22, Math.max(1, len * 0.018), 0, TAU); c.fill();
    // エラ
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(L * 0.42, 0, h * 0.7, -1.1, 1.1);
    c.stroke();
  }
}

function drawBoot(c, len, silhouette) {
  const s = len / 30;
  c.fillStyle = silhouette ? 'rgb(20,30,45)' : '#5a6046';
  c.save();
  c.scale(s, s);
  c.beginPath();
  c.moveTo(-6, -14);
  c.lineTo(2, -14);
  c.lineTo(2, 4);
  c.lineTo(12, 4);
  c.quadraticCurveTo(15, 4, 15, 9);
  c.lineTo(15, 11);
  c.lineTo(-6, 11);
  c.closePath();
  c.fill();
  if (!silhouette) {
    c.fillStyle = '#3e442f';
    c.fillRect(-6, 8, 21, 3);
    c.fillStyle = '#6c7256';
    c.fillRect(-6, -14, 8, 3);
  }
  c.restore();
}

function drawCan(c, len, silhouette) {
  const s = len / 12;
  c.save();
  c.scale(s, s);
  c.rotate(-0.4);
  c.fillStyle = silhouette ? 'rgb(20,30,45)' : '#b04040';
  c.fillRect(-5, -8, 10, 16);
  if (!silhouette) {
    c.fillStyle = '#d8d8dc';
    c.fillRect(-5, -8, 10, 2.5);
    c.fillRect(-5, 5.5, 10, 2.5);
    c.fillStyle = '#e8e8ec';
    c.beginPath(); c.ellipse(0, -8, 5, 1.6, 0, 0, TAU); c.fill();
  }
  c.restore();
}

/* =========================================================
 * 入力
 * ========================================================= */
function pressDown() {
  Sound.ensure();
  switch (G.state) {
    case ST.IDLE: startCharge(); break;
    case ST.WAIT: G.holding = true; G.holdT = 0; break;
    case ST.BITE: hookSet(); break;
    case ST.FIGHT: G.reeling = true; break;
  }
}
function pressUp() {
  switch (G.state) {
    case ST.CHARGE: doCast(); break;
    case ST.WAIT:
      if (G.holding && G.holdT < 0.28) strikeAttempt();
      G.holding = false;
      break;
    case ST.FIGHT: G.reeling = false; break;
    default: G.holding = false;
  }
}

canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); pressDown(); });
window.addEventListener('pointerup', () => pressUp());
window.addEventListener('pointercancel', () => pressUp());
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); pressDown(); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') { e.preventDefault(); pressUp(); }
});

/* ---------------- UIボタン ---------------- */
ui.startBtn.addEventListener('click', () => {
  Sound.ensure();
  ui.title.classList.add('hidden');
  G.state = ST.IDLE;
  populateFishes();
  msg('画面を長押しでキャスト！', 3);
});
ui.catchOk.addEventListener('click', () => {
  ui.catchCard.classList.add('hidden');
  G.state = ST.IDLE;
});
ui.zukanBtn.addEventListener('click', () => { Sound.ensure(); openZukan(); });
ui.zukanClose.addEventListener('click', () => ui.zukanModal.classList.add('hidden'));
ui.muteBtn.addEventListener('click', () => {
  Sound.muted = !Sound.muted;
  Save.data.muted = Sound.muted;
  Save.write();
  ui.muteBtn.textContent = Sound.muted ? '♪ OFF' : '♪ ON';
});

/* =========================================================
 * メインループ
 * ========================================================= */
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

Save.load();
Sound.muted = !!Save.data.muted;
ui.muteBtn.textContent = Sound.muted ? '♪ OFF' : '♪ ON';
populateFishes();
requestAnimationFrame(loop);
