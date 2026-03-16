let canvas, ctx;

// ─── SOUND SYSTEM ───────────────────────────────────────────
const SFX_PATH = 'oryx_8-bit_sounds/';
const SFX_CACHE = {};
let sfxEnabled = true;
let sfxVolume = 0.4;

function playSound(path) {
  if(!sfxEnabled) return;
  const full = SFX_PATH + path;
  if(!SFX_CACHE[full]) {
    SFX_CACHE[full] = new Audio(full);
    SFX_CACHE[full].volume = sfxVolume;
  }
  const snd = SFX_CACHE[full].cloneNode();
  snd.volume = sfxVolume;
  snd.play().catch(() => {}); // ignore autoplay restrictions
}

// Semantic sound triggers
const SFX = {
  hit:          () => playSound('impacts/hit.wav'),
  miss:         () => playSound('abilities/woosh_a.wav'),
  critHit:      () => playSound('impacts/impact_a.wav'),
  playerHit:    () => playSound('impacts/impact_b.wav'),
  kill:         () => playSound('impacts/boom_a.wav'),
  shoot:        () => playSound('abilities/shoot_a.wav'),
  spell:        () => playSound('abilities/spell_a.wav'),
  heal:         () => playSound('abilities/heal_a.wav'),
  fire:         () => playSound('abilities/fire_a.wav'),
  lightning:    () => playSound('abilities/lightning_a.wav'),
  teleport:     () => playSound('abilities/teleport.wav'),
  sorcery:      () => playSound('abilities/sorcery.wav'),
  summon:       () => playSound('abilities/summon.wav'),
  door:         () => playSound('misc/open.wav'),
  stairs:       () => playSound('misc/step.wav'),
  pickup:       () => playSound('misc/collect_a.wav'),
  gold:         () => playSound('interface/gold.wav'),
  levelUp:      () => playSound('interface/level_up.wav'),
  death:        () => playSound('interface/lose_a.wav'),
  select:       () => playSound('interface/select_a.wav'),
  click:        () => playSound('interface/click.wav'),
  error:        () => playSound('interface/error.wav'),
  trap:         () => playSound('impacts/spike_trap_a.wav'),
  poison:       () => playSound('status/poison.wav'),
  confuse:      () => playSound('status/confuse.wav'),
  curse:        () => playSound('status/curse.wav'),
  freeze:       () => playSound('status/freeze.wav'),
  mutation:     () => playSound('status/mutation.wav'),
  skeleton:     () => playSound('creatures/skeleton.wav'),
  snake:        () => playSound('creatures/snake.wav'),
  wings:        () => playSound('creatures/wings.wav'),
  swarm:        () => playSound('creatures/swarm.wav'),
  explode:      () => playSound('impacts/explode_a.wav'),
  score:        () => playSound('interface/score.wav'),
  coin:         () => playSound('interface/coin.wav'),
  paper:        () => playSound('interface/paper.wav'),
};

// ─── ANIMATION LOOP ──────────────────────────────────────────
let animFrameId = null;
let lastRenderTime = 0;
const ANIM_FPS = 15;
const ANIM_INTERVAL = 1000 / ANIM_FPS;
let animTime = 0;

function startAnimLoop() {
  if(animFrameId) return;
  animFrameId = requestAnimationFrame(animTick);
}

function stopAnimLoop() {
  if(animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
}

function animTick(timestamp) {
  animFrameId = requestAnimationFrame(animTick);
  if(timestamp - lastRenderTime < ANIM_INTERVAL) return;
  lastRenderTime = timestamp;
  animTime = timestamp;
  if(G && G.level && !G.gameOver) renderAll();
}

// ─── ZOOM ────────────────────────────────────────────────────
const MIN_CELL_SIZE = 24;
const MAX_CELL_SIZE = 48;
const ZOOM_STEP = 6;

function initZoom() {
  const saved = localStorage.getItem('baal_zoom');
  if(saved) CELL_SIZE = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, parseInt(saved)));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    CELL_SIZE = e.deltaY < 0
      ? Math.min(MAX_CELL_SIZE, CELL_SIZE + ZOOM_STEP)
      : Math.max(MIN_CELL_SIZE, CELL_SIZE - ZOOM_STEP);
    localStorage.setItem('baal_zoom', CELL_SIZE);
    renderAll();
  }, { passive: false });
}

// Draw a single tile sprite to a small canvas (for HUD icons)
function drawSpriteToCanvas(targetCanvas, tileId) {
  if(!tilesetReady || tileId === undefined) return;
  const tctx = targetCanvas.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  const sx = (tileId % SHEET_COLS) * TILE_PX;
  const sy = Math.floor(tileId / SHEET_COLS) * TILE_PX;
  tctx.drawImage(tilesetImg, sx, sy, TILE_PX, TILE_PX, 0, 0, targetCanvas.width, targetCanvas.height);
}

function initCanvas() {
  canvas = document.getElementById('map-canvas');
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resizeCanvas();
  initZoom();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if(!canvas) return;
  const panel = document.getElementById('map-panel');
  if(!panel) return;
  const w = panel.clientWidth;
  const h = panel.clientHeight;
  if(w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
    canvas.width = w;
    canvas.height = h;
    if(ctx) ctx.imageSmoothingEnabled = false;
  }
}

function getViewOffset() {
  if(!G.player) return {ox:0, oy:0, cols:MAP_W, rows:MAP_H};
  const cols = Math.floor(canvas.width / CELL_SIZE);
  const rows = Math.floor(canvas.height / CELL_SIZE);
  // Center on look/stair-find cursor when active
  const cx = (G.lookMode || G.stairFindMode) && G.lookX !== undefined ? G.lookX : G.player.x;
  const cy = (G.lookMode || G.stairFindMode) && G.lookY !== undefined ? G.lookY : G.player.y;
  let ox = cx - Math.floor(cols/2);
  let oy = cy - Math.floor(rows/2);
  ox = Math.max(0, Math.min(MAP_W - cols, ox));
  oy = Math.max(0, Math.min(MAP_H - rows, oy));
  return { ox, oy, cols, rows };
}

// ─── DANCING COLORS ──────────────────────────────────────────
function getDancingColor(baseColor, tile, mx, my) {
  if(tile !== TILE.WATER && tile !== TILE.LAVA && tile !== TILE.ALTAR) return baseColor;
  const t = animTime * 0.001;
  const r = parseInt(baseColor.slice(1,3), 16);
  const g = parseInt(baseColor.slice(3,5), 16);
  const b = parseInt(baseColor.slice(5,7), 16);
  // Per-tile phase offset so adjacent tiles don't pulse in sync
  const phase = mx * 7.3 + my * 13.7;
  let variance = 0, speed = 1;
  if(tile === TILE.WATER) { variance = 25; speed = 1.5; }
  else if(tile === TILE.LAVA) { variance = 35; speed = 2.5; }
  else if(tile === TILE.ALTAR) { variance = 18; speed = 0.8; }
  const nr = Math.max(0, Math.min(255, r + Math.sin(t * speed + phase) * variance));
  const ng = Math.max(0, Math.min(255, g + Math.sin(t * speed + phase + 2.1) * variance * 0.7));
  const nb = Math.max(0, Math.min(255, b + Math.sin(t * speed + phase + 4.2) * variance * 0.5));
  return `rgb(${Math.round(nr)},${Math.round(ng)},${Math.round(nb)})`;
}

// ─── DYNAMIC LIGHTING ───────────────────────────────────────
const LIGHT_SOURCES = {
  [TILE.LAVA]:  { r: 255, g: 100, b: 30, radius: 4, flicker: 0.15 },
  [TILE.ALTAR]: { r: 180, g: 60, b: 200, radius: 3, flicker: 0.1 },
  [TILE.SHOP]:  { r: 200, g: 80, b: 255, radius: 2, flicker: 0.05 },
};

const MONSTER_LIGHTS = {
  fire_elemental: { r: 255, g: 120, b: 40, radius: 3, flicker: 0.2 },
  balor:          { r: 255, g: 80,  b: 20, radius: 3, flicker: 0.15 },
};

const lightR = new Float32Array(MAP_W * MAP_H);
const lightG = new Float32Array(MAP_W * MAP_H);
const lightB = new Float32Array(MAP_W * MAP_H);

function computeLighting(ox, oy, cols, rows) {
  lightR.fill(0); lightG.fill(0); lightB.fill(0);
  const level = G.level;
  if(!level) return;
  const sources = [];
  // Tile-based lights (only scan viewport + radius margin)
  const margin = 6;
  for(let y = Math.max(0, oy - margin); y < Math.min(MAP_H, oy + rows + margin); y++) {
    for(let x = Math.max(0, ox - margin); x < Math.min(MAP_W, ox + cols + margin); x++) {
      const light = LIGHT_SOURCES[level.tiles[y][x]];
      if(light) sources.push({ x, y, ...light });
    }
  }
  // Monster lights
  for(const m of level.monsters) {
    const ml = MONSTER_LIGHTS[m.key || m.templateKey];
    if(ml) sources.push({ x: m.x, y: m.y, ...ml });
  }
  // Player torch
  sources.push({ x: G.player.x, y: G.player.y, r: 180, g: 160, b: 120, radius: 6, flicker: 0.04 });
  // Accumulate
  for(const src of sources) {
    const f = 1 + Math.sin(animTime * 0.003 + src.x * 7 + src.y * 13) * src.flicker;
    const r2 = src.radius * src.radius;
    for(let dy = -src.radius; dy <= src.radius; dy++) {
      for(let dx = -src.radius; dx <= src.radius; dx++) {
        const tx = src.x + dx, ty = src.y + dy;
        if(tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) continue;
        const d2 = dx*dx + dy*dy;
        if(d2 > r2) continue;
        const intensity = (1 - Math.sqrt(d2) / src.radius) * f;
        const idx = ty * MAP_W + tx;
        lightR[idx] += src.r * intensity * 0.004;
        lightG[idx] += src.g * intensity * 0.004;
        lightB[idx] += src.b * intensity * 0.004;
      }
    }
  }
}

function applyLighting(px, py, mx, my) {
  const idx = my * MAP_W + mx;
  const lr = lightR[idx], lg = lightG[idx], lb = lightB[idx];
  if(lr < 0.01 && lg < 0.01 && lb < 0.01) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(${Math.min(255,Math.round(lr*255))},${Math.min(255,Math.round(lg*255))},${Math.min(255,Math.round(lb*255))},0.3)`;
  ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
  ctx.globalCompositeOperation = 'source-over';
}

// ─── COMBAT / SPELL FLASH EFFECTS ───────────────────────────
const tileEffects = [];

function addTileEffect(x, y, color, duration) {
  duration = duration || 200;
  tileEffects.push({ x, y, color, startTime: animTime || performance.now(), duration });
}

function renderTileEffects(ox, oy) {
  for(let i = tileEffects.length - 1; i >= 0; i--) {
    const fx = tileEffects[i];
    const elapsed = (animTime || performance.now()) - fx.startTime;
    if(elapsed > fx.duration) { tileEffects.splice(i, 1); continue; }
    const alpha = (1 - elapsed / fx.duration) * 0.5;
    const px = (fx.x - ox) * CELL_SIZE;
    const py = (fx.y - oy) * CELL_SIZE;
    if(px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) continue;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${fx.color[0]},${fx.color[1]},${fx.color[2]},${alpha})`;
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ─── TILESET ─────────────────────────────────────────────────

// --- Spritesheet descriptors ---
const SHEETS = {
  world:     { img: null, ready: false, path: 'oryx_8-bit_remaster/8-Bit_Remaster_World.png',     tileSize: 12, cols: 23 },
  character: { img: null, ready: false, path: 'oryx_8-bit_remaster/8-Bit_Remaster_Character.png',  tileSize: 12, cols: 24 },
  bosses:    { img: null, ready: false, path: 'oryx_8-bit_remaster/8-Bit_Remaster_Bosses.png',     tileSize: 24, cols: 24 },
  fx:        { img: null, ready: false, path: 'oryx_8-bit_remaster/8-Bit_Remaster_FX.png',         tileSize: 8,  cols: 8 },
  classic:   { img: null, ready: false, path: 'oryx_classic_roguelike/Classic Roguelike/TMX Examples/ascii_plus.png', tileSize: 8, cols: 32 },
};

let useTileset = true;

// Legacy aliases kept for code that still references them directly
let tilesetImg = null;
let tilesetReady = false;
const TILE_PX = 8;
const SHEET_COLS = 32;

function loadTileset() {
  // Load all five sheets
  for(const key of Object.keys(SHEETS)) {
    const sheet = SHEETS[key];
    sheet.img = new Image();
    sheet.img.onload = () => {
      sheet.ready = true;
      if(key === 'classic') { tilesetReady = true; tilesetImg = sheet.img; }
    };
    sheet.img.onerror = () => { console.warn(`Sheet "${key}" not found at ${sheet.path}`); };
    sheet.img.src = sheet.path;
  }

  // Restore user preference (default: tileset on)
  const saved = localStorage.getItem('baal_tileset');
  if(saved !== null) useTileset = saved === 'true';
}

// --- Generic sheet draw ---
function drawFromSheet(sheetKey, tileId, dx, dy, destSize) {
  const sheet = SHEETS[sheetKey];
  if(!sheet || !sheet.ready || tileId === undefined) return false;
  destSize = destSize || CELL_SIZE;
  const sx = (tileId % sheet.cols) * sheet.tileSize;
  const sy = Math.floor(tileId / sheet.cols) * sheet.tileSize;
  ctx.drawImage(sheet.img, sx, sy, sheet.tileSize, sheet.tileSize, dx, dy, destSize, destSize);
  return true;
}

// Legacy single-tile draw (Classic sheet only)
function drawTile(tileId, dx, dy) {
  return drawFromSheet('classic', tileId, dx, dy);
}

// --- Themed terrain (World sheet) ---
// World sheet is 23 columns of 12x12 tiles.
// Tile IDs are row*23 + col. Key IDs verified against 8-Bit_Remaster_World.txt:
//
// Row 0: wall_block variants (grey=0 stone=1 red=2 ice=3 hedge=4 cave=5 frost=6 turret=7 dirt=8)
// Row 2: stair_down variants (grey=46 stone=47 red=48 ice=49 hedge=50 cave=51 frost=52 turret=53 dirt=54)
// Row 3: stair_up variants  (grey=69 stone=70 red=71 ice=72 hedge=73 cave=74 frost=75 turret=76 dirt=77)
// Row 4: floor_*_dot variants (dark=92 grey=93 cold=94 mud=95 moss=96 dirt=97 frost=98 red=99)
//        liquid_water_1=102 liquid_water_2=103 liquid_lava_1=106 liquid_lava_2=107
// Row 5: floor_* plain (dark=115 grey=116 cold=117 mud=118 moss=119 dirt=120 frost=121 red=122 pit=123)
// Row 6: doors (wood_closed=138 wood_open=139 iron_closed=140 iron_open=141 magic_closed=142 magic_open=143)
// Row 7: scenery (crate=167 crate_open=168 firepit=177 firepit_lit_1=178 firepit_lit_2=179 gravestone=175)
// Row 8: objects (sword=187 dagger=188 axe=189 hammer=190 spear=191 staff=192 bow=193 arrows=194
//         stones=195 potion_red=197 potion_blue=198 potion_green=199 turkey=200)
// Row 9: objects (helm=207 boots=208 chest_armor=210 cloak=211 scroll=214 ring=215 amulet=216 gold=226)
// Row 10: hex (230-233)

const THEMED_TERRAIN = {
  dungeon: {
    wall: 0, floor: 115, floor_dot: 92, corridor: 92,
    door: 138, stairs_down: 46, stairs_up: 69,
    water: [102,103], lava: [106,107],
    trap: 230, altar: [178,179], shop: 167, portal: 230, shaft: 123, shaft: 123
  },
  caves: {
    wall: 5, floor: 119, floor_dot: 96, corridor: 96,
    door: 138, stairs_down: 51, stairs_up: 74,
    water: [102,103], lava: [106,107],
    trap: 230, altar: [178,179], shop: 167, portal: 230, shaft: 123, shaft: 123
  },
  crypt: {
    wall: 1, floor: 116, floor_dot: 93, corridor: 93,
    door: 140, stairs_down: 47, stairs_up: 70,
    water: [102,103], lava: [106,107],
    trap: 175, altar: [178,179], shop: 167, portal: 230, shaft: 123
  },
  forge: {
    wall: 2, floor: 122, floor_dot: 99, corridor: 99,
    door: 140, stairs_down: 48, stairs_up: 71,
    water: [102,103], lava: [106,107],
    trap: 230, altar: [178,179], shop: 167, portal: 230, shaft: 123
  },
  abyss: {
    wall: 6, floor: 121, floor_dot: 98, corridor: 98,
    door: 142, stairs_down: 52, stairs_up: 75,
    water: [102,103], lava: [106,107],
    trap: 231, altar: [178,179], shop: 167, portal: 230, shaft: 123
  },
  throne: {
    wall: 7, floor: 118, floor_dot: 95, corridor: 95,
    door: 142, stairs_down: 54, stairs_up: 77,
    water: [102,103], lava: [106,107],
    trap: 232, altar: [178,179], shop: 167, portal: 230, shaft: 123
  },
  duat: {
    wall: 5, floor: 120, floor_dot: 97, corridor: 97,
    door: 138, stairs_down: 54, stairs_up: 77,
    water: [102,103], lava: [106,107],
    trap: 230, altar: [178,179], shop: 167, portal: 230, shaft: 123
  },
  mictlan: {
    wall: 2, floor: 122, floor_dot: 99, corridor: 99,
    door: 140, stairs_down: 48, stairs_up: 71,
    water: [102,103], lava: [106,107],
    trap: 231, altar: [178,179], shop: 167, portal: 231, shaft: 123
  },
  tartarus: {
    wall: 6, floor: 121, floor_dot: 98, corridor: 98,
    door: 142, stairs_down: 52, stairs_up: 75,
    water: [102,103], lava: [106,107],
    trap: 232, altar: [178,179], shop: 167, portal: 232, shaft: 123
  }
};

// Map TILE enum → THEMED_TERRAIN key name
const TILE_TO_TERRAIN_KEY = {
  [TILE.WALL]:        'wall',
  [TILE.FLOOR]:       'floor',
  [TILE.CORRIDOR]:    'corridor',
  [TILE.DOOR]:        'door',
  [TILE.STAIRS_DOWN]: 'stairs_down',
  [TILE.STAIRS_UP]:   'stairs_up',
  [TILE.WATER]:       'water',
  [TILE.LAVA]:        'lava',
  [TILE.DARK_FLOOR]:  'floor_dot',
  [TILE.ALTAR]:       'altar',
  [TILE.SHOP]:        'shop',
  [TILE.TRAP]:        'trap',
  [TILE.PORTAL]:      'portal',
  [TILE.SHAFT]:       'shaft',
};

// Map floor number → theme key
function getThemeKey(floor) {
  // Branch theme override
  if(G && G.branch && THEMED_TERRAIN[G.branch]) return G.branch;
  const theme = getFloorTheme(floor);
  const name = theme.name.toLowerCase();
  if(name.includes('cave'))   return 'caves';
  if(name.includes('crypt'))  return 'crypt';
  if(name.includes('forge'))  return 'forge';
  if(name.includes('abyss'))  return 'abyss';
  if(name.includes('throne')) return 'throne';
  if(name.includes('duat'))   return 'duat';
  if(name.includes('mictlan'))return 'mictlan';
  if(name.includes('tartarus'))return 'tartarus';
  return 'dungeon';
}

// Returns the world-sheet tile ID (or [id1,id2] for animated) for a given TILE type on a floor.
function getTerrainTile(tileType, floor) {
  const themeKey = getThemeKey(floor);
  const theme = THEMED_TERRAIN[themeKey] || THEMED_TERRAIN.dungeon;
  const terrainKey = TILE_TO_TERRAIN_KEY[tileType];
  if(!terrainKey) return theme.floor;
  const val = theme[terrainKey];
  return val !== undefined ? val : theme.floor;
}

// --- Character animation (Character sheet, 24 cols, 44 rows) ---
// Each character occupies 1 row of 24 tiles:
//   idle: col = dir + frame*4  (dir: r=0 d=1 u=2 l=3, frame: 0 or 1)
//   walk: col = 8 + dir*2 + frame
//   atk:  col = 16 + dir*2 + frame

const DIR_INDEX = { r:0, d:1, u:2, l:3 };

// Character row indices on the Character sheet
const CHAR_ROWS = {
  wizard:0, druid:1, mage:2, healer:3, sage:4, monk:5, paladin:6, cleric:7,
  archer:8, thief:9, warrior:10, valkyrie:11, knight:12, barbarian:13, bard:14,
  elf:15, dwarf:16, pirate:17, king:18, queen:19,
  gobwar:20, gobarcher:21, skel:22, skelwar:23, skelarcher:24, skelmage:25,
  zombie:26, orc:27, cyclops:28, flayer:29, demon:30, gnoll:31,
  snake:32, slime:33, rat:34, spider:35, wolf:36, cat:37, bat:38,
  imp:39, fairie:40, ghost:41, flame:42, spark:43
};

function getCharTileId(charRow, facing, state) {
  const d = DIR_INDEX[facing] || 1; // default facing down
  const frame = Math.floor(animTime / 500) % 2;
  let col;
  if(state === 'walk')     col = 8  + d * 2 + frame;
  else if(state === 'atk') col = 16 + d * 2 + frame;
  else                     col = d  + frame * 4; // idle
  return charRow * 24 + col;
}

// --- Boss animation (Bosses sheet, 24 cols, same column layout as characters but 24x24 tiles) ---
const BOSS_ROWS = {
  dragon:0, beholder:1, demon:2, cyclops:3, reaper:4, lord:5
};

function getBossTileId(bossRow, facing, state) {
  // Same column layout as character sheet
  const d = DIR_INDEX[facing] || 1;
  const frame = Math.floor(animTime / 500) % 2;
  let col;
  if(state === 'walk')     col = 8  + d * 2 + frame;
  else if(state === 'atk') col = 16 + d * 2 + frame;
  else                     col = d  + frame * 4;
  return bossRow * 24 + col;
}

// --- Monster → character row mapping ---
const MONSTER_CHAR_ROW = {
  rat: 34, bat: 38, spider: 35, kobold: 20, goblin: 20,
  orc: 27, orc_warrior: 27, skeleton: 22, zombie: 26, gnoll: 31,
  viper: 32, cave_worm: 32, giant_ant: 35, jackal: 36,
  grey_ooze: 33, ochre_jelly: 33, ghost_player: 41, ghost: 41, wraith: 41,
  fire_elemental: 42, ice_elemental: 43, earth_elemental: 28,
  devil_imp: 39, devil_pit: 30, mind_flayer: 29,
  lich: 25, death_knight: 23, balor: 30, shadow_demon: 41,
  oni: 27, demon: 30, ogre: 28, troll: 13,
  fungoid: 33, revenant: 23, rakshasa: 30,
  ghoul: 26, minotaur: 27, lamia: 32, harpy: 38,
  basilisk: 32, naga: 32, stone_golem: 28, iron_golem: 28,
  doppelganger: 9, mimic: 33, shoggoth: 33,
  gibbering_mouther: 33, aboleth: 29, ammit: 28,
  jiangshi: 26, tengu: 38, kishi: 36, salthopper: 35,
  // Duat branch
  scarab_swarm: 35, mummy_warrior: 26, anubis_guard: 27, sand_golem: 28, sphinx: 36,
  // Mictlan branch
  obsidian_jaguar: 36, feathered_serpent: 32, tzitzimime: 30, bone_dancer: 22, blood_elemental: 42,
  // Tartarus branch
  shade: 41, fury: 38, titan: 28, cerberus: 36, styx_boatman: 41,
  // Main dungeon mid-game
  manticore: 36, phase_spider: 35, wyvern: 38, clay_golem: 28, dark_elf: 15,
  djinn: 4, skeleton_archer: 24, wight: 25, lich: 25, beholder: 29,
};

// --- Boss → boss row mapping ---
const BOSS_ROW = {
  boss_baal: 0,           // dragon
  boss_lich_king: 4,      // reaper
  boss_vampire_lord: 5,   // lord
  boss_orc_warlord: 3,    // cyclops
  dragon_ancient: 0,      // dragon
  dragon_young: 0,        // dragon
  beholder: 1,
  ammit_boss: 3,
  mictlan_boss: 2,
  tartarus_boss: 4,
};

// --- Player class → character row ---
const PLAYER_CHAR_ROW = {
  fightingman: 10, // warrior
  cleric: 7,       // cleric
  magicuser: 2,    // mage
  thief: 9,
  druid: 1,
  ranger: 8,
  warlock: 0,
};

// Race overrides for player sprite (used when race is visually distinct)
const PLAYER_RACE_ROW = {
  elf: 15,
  dwarf: 16,
};

// Race tint colors — applied as a semi-transparent overlay on the player sprite
const RACE_TINT = {
  halforc:  'rgba(40, 160, 20, 0.6)',
  tiefling: 'rgba(190, 20, 20, 0.55)',
  lizardman:'rgba(20, 170, 40, 0.6)',
  gnome:    'rgba(120, 60, 180, 0.35)',
  halfling: 'rgba(180, 140, 60, 0.3)',
};

// --- Item → world tile mapping (Remaster) ---
// More specific mappings by template key, falling back to glyph
const ITEM_KEY_WORLD_TILE = {
  // Weapons
  dagger: 188, shortsword: 187, longsword: 187, sword: 187, falchion: 187,
  greatsword: 187, waraxe: 189, axe: 189, battleaxe: 189,
  mace: 190, morningstar: 190, flail: 190, warhammer: 190,
  spear: 191, halberd: 191, staff: 192, quarterstaff: 192,
  shortbow: 193, longbow: 193, crossbow: 193, sling: 193,
  // Ammo
  arrows: 194, bolts: 194, stones: 195, sling_bullets: 195,
  throwing_knife: 188, throwing_axe: 189, javelin: 191, throwing_star: 195,
  // Armor
  leather: 210, chainmail: 210, platemail: 210, scale_mail: 210,
  shield: 184, large_shield: 184, buckler: 186,
  helmet: 207, cap_int: 207, helm: 207, boots_speed: 208, boots_elvenkind: 208, boots: 208, gloves: 209,
  cloak_prot: 211, cloak_inv: 211, cloak: 211, robes: 212, robe: 212, cape: 213,
  // Potions (all map to red potion — color is randomized anyway)
  potion_heal: 197, potion_mana: 198, potion_poison: 199, potion_str: 197,
  potion_speed: 198, potion_invis: 199, potion_conf: 197, potion_xp: 198,
  potion_blind: 197, potion_weakness: 199, potion_clarity: 198, potion_might: 197,
  potion_resist: 198, potion_mutagen: 199, potion_paralyze: 197, potion_amnesia: 199,
  potion_fire: 197, potion_berserk: 197, potion_phasing: 198,
  potion_antidote: 199, potion_restoration: 198, potion_heal_full: 197, potion_restore_mp: 198,
  // Scrolls
  scroll_tele: 214, scroll_id: 214, scroll_mapping: 214, scroll_fear: 214,
  scroll_enchant_wpn: 214, scroll_enchant_arm: 214, scroll_curse: 214,
  scroll_acquirement: 214, scroll_remove_curse: 214,
  // Rings & Amulets
  ring_prot: 215, ring_str: 215, ring_int: 215, ring_fire: 215,
  ring_regen: 215, ring_doom: 215, ring_berserker: 215,
  amulet_life: 216, amulet_MR: 216, amulet_curse: 216,
  // Food
  ration: 200, bread: 200, meat: 200, fruit: 200, strange_fruit: 200,
  // Wands
  wand_fire: 192, wand_cold: 192, wand_lightning: 192, wand_poison: 192,
  wand_sleep: 192, wand_digging: 192, wand_polymorph: 192,
  // Gold
  gold: 226,
};

const ITEM_GLYPH_WORLD_TILE = {
  ')': 187,  // sword (default weapon)
  '[': 210,  // chest armor
  '/': 192,  // staff
  '!': 197,  // potion red
  '?': 214,  // scroll
  '=': 215,  // ring
  '"': 216,  // amulet
  '%': 200,  // turkey (food)
  '$': 226,  // gold
  '*': 195,  // stones
  '(': 193,  // bow (ranged weapon)
  ']': 184,  // shield
};

// --- Classic Roguelike fallback data (unchanged from original) ---
const TILE_MAP = {
  terrain: {
    [TILE.WALL]:        99,
    [TILE.FLOOR]:       250,
    [TILE.CORRIDOR]:    250,
    [TILE.DOOR]:        107,
    [TILE.STAIRS_DOWN]: 252,
    [TILE.STAIRS_UP]:   251,
    [TILE.WATER]:       32,
    [TILE.LAVA]:        34,
    [TILE.DARK_FLOOR]:  250,
    [TILE.ALTAR]:       108,
    [TILE.SHOP]:        230,
    [TILE.TRAP]:        246,
    [TILE.PORTAL]:      230,
  },
  player: 160,
  companion: 161,
};

function getAnimatedTileId(id) {
  const frame = Math.floor(animTime / 600) % 2;
  if(id === 32) return frame ? 33 : 32;
  if(id === 37) return frame ? 38 : 37;
  const fast = Math.floor(animTime / 300) % 2;
  if(id === 34) return fast ? 35 : 34;
  return id;
}

const MONSTER_TILE_MAP = {
  rat: 132, bat: 133, kobold: 134, goblin: 135, orc: 136,
  skeleton: 148, zombie: 149, ghoul: 150, wraith: 151, ghost_player: 151,
  spider: 137, cave_worm: 138, viper: 139, giant_ant: 140, jackal: 141,
  gnoll: 142, fungoid: 143, jiangshi: 144, tengu: 145, kishi: 146,
  salthopper: 147, grey_ooze: 152, ochre_jelly: 153, mimic: 154,
  doppelganger: 160, fire_elemental: 155, ice_elemental: 156, earth_elemental: 157,
  stone_golem: 158, iron_golem: 159, orc_warrior: 136, ogre: 162,
  troll: 163, lamia: 164, harpy: 165, minotaur: 166,
  basilisk: 167, naga: 168, lich: 169, dragon_young: 170, dragon_ancient: 171,
  devil_imp: 172, devil_pit: 173, beholder: 174, shoggoth: 175,
  revenant: 176, death_knight: 177, balor: 178, shadow_demon: 179,
  oni: 180, gibbering_mouther: 181, mind_flayer: 182, aboleth: 183,
  rakshasa: 184, ammit: 185,
  boss_orc_warlord: 186, boss_vampire_lord: 187, boss_lich_king: 188, boss_baal: 189,
};

const ITEM_TILE_MAP = {
  ')': 198, '[': 200, '/': 199, '!': 224, '?': 231, '=': 229,
  '"': 226, '%': 197, '$': 227, '*': 202, '§': 203,
};

// --- Tile lookup helpers (used by renderAll and HUD) ---

function getMonsterTile(monster) {
  // Classic fallback tile
  return MONSTER_TILE_MAP[monster.key || monster.templateKey] ||
         TILE_MAP.terrain[TILE.FLOOR];
}

function getItemTile(item) {
  // Classic fallback tile
  return ITEM_TILE_MAP[item.glyph] || 231;
}

// Remaster world tile for an item (returns undefined if no mapping)
function getItemWorldTile(item) {
  const key = item.templateKey || item.key;
  if(key && ITEM_KEY_WORLD_TILE[key] !== undefined) return ITEM_KEY_WORLD_TILE[key];
  if(item.glyph && ITEM_GLYPH_WORLD_TILE[item.glyph] !== undefined) return ITEM_GLYPH_WORLD_TILE[item.glyph];
  return undefined;
}

// Build entityInfo for a monster — includes all available fallback layers
function getMonsterEntityInfo(monster) {
  const mKey = monster.key || monster.templateKey;
  const info = { facing: monster.facing || 'd', animState: monster.animState || 'idle' };

  // Boss check first
  if(BOSS_ROW[mKey] !== undefined) info.bossRow = BOSS_ROW[mKey];
  // Remaster character
  if(MONSTER_CHAR_ROW[mKey] !== undefined) info.charRow = MONSTER_CHAR_ROW[mKey];
  // Classic fallback
  const classicId = MONSTER_TILE_MAP[mKey];
  if(classicId !== undefined) info.classicTile = classicId;

  return info;
}

// Shapeshift form → character row
const SHIFT_FORM_ROW = { 1: CHAR_ROWS.wolf, 2: CHAR_ROWS.barbarian, 3: CHAR_ROWS.bat };

// Build entityInfo for the player
function getPlayerEntityInfo() {
  const p = G.player;
  // Shapeshift overrides sprite
  if(p.status.shiftForm && SHIFT_FORM_ROW[p.status.shiftForm] !== undefined) {
    const info = { charRow: SHIFT_FORM_ROW[p.status.shiftForm], facing: p.facing || 'd', animState: p.animState || 'idle' };
    info.classicTile = TILE_MAP.player;
    return info;
  }
  let row = PLAYER_RACE_ROW[p.race];
  if(row === undefined) row = PLAYER_CHAR_ROW[p.cls] || 10;
  const info = { charRow: row, facing: p.facing || 'd', animState: p.animState || 'idle' };
  info.classicTile = TILE_MAP.player; // fallback
  // Race tinting (only if using class sprite, not race-specific sprite)
  if(!PLAYER_RACE_ROW[p.race] && RACE_TINT[p.race]) {
    info.tint = RACE_TINT[p.race];
  }
  return info;
}

// Build entityInfo for a companion
function getCompanionEntityInfo(comp) {
  if(!SHEETS.character.ready) return null;
  // Companions have a cls or class-like key; try to map them
  const cls = comp.cls || comp.class;
  let row = null;
  if(cls === 'cleric' || cls === 'healer') row = CHAR_ROWS.cleric;
  else if(cls === 'magicuser' || cls === 'mage' || cls === 'wizard') row = CHAR_ROWS.mage;
  else if(cls === 'fightingman' || cls === 'warrior' || cls === 'fighter') row = CHAR_ROWS.warrior;
  else if(cls === 'thief' || cls === 'rogue') row = CHAR_ROWS.thief;
  else if(cls === 'archer' || cls === 'ranger') row = CHAR_ROWS.archer;
  // Race-based fallback
  if(row === null && comp.race === 'elf') row = CHAR_ROWS.elf;
  if(row === null && comp.race === 'dwarf') row = CHAR_ROWS.dwarf;
  if(row === null) row = CHAR_ROWS.warrior; // generic fallback
  return { charRow: row, facing: comp.facing || 'd', animState: comp.animState || 'idle' };
}

// Build entityInfo for a terrain tile — always returns something usable
function getTerrainEntityInfo(tileType, floor) {
  const info = {};
  // Always include world tile ID (used if world sheet is ready)
  info.worldTile = getTerrainTile(tileType, floor);
  // Always include classic fallback
  const classicId = TILE_MAP.terrain[tileType];
  if(classicId !== undefined) info.classicTile = getAnimatedTileId(classicId);
  return info;
}

// Build entityInfo for an item — includes both remaster and classic fallback
function getItemEntityInfo(item) {
  const info = {};
  const wt = getItemWorldTile(item);
  if(wt !== undefined) info.worldTile = wt;
  info.classicTile = getItemTile(item);
  return info;
}

// Build entityInfo for an NPC (pre-hire, wandering)
function getNpcEntityInfo(npc) {
  // Try to use companion logic
  if(SHEETS.character.ready) {
    const cls = npc.cls || npc.class;
    let row = null;
    if(cls === 'cleric' || cls === 'healer') row = CHAR_ROWS.healer;
    else if(cls === 'magicuser' || cls === 'mage' || cls === 'wizard') row = CHAR_ROWS.sage;
    else if(cls === 'fightingman' || cls === 'warrior' || cls === 'fighter') row = CHAR_ROWS.knight;
    else if(cls === 'thief' || cls === 'rogue') row = CHAR_ROWS.thief;
    else row = CHAR_ROWS.bard; // generic NPC
    return { charRow: row, facing: npc.facing || 'd', animState: npc.animState || 'idle' };
  }
  return null;
}

// --- drawSpriteToCanvas (for HUD icons — works with any sheet) ---
function drawSpriteToCanvas(targetCanvas, tileId, sheetKey) {
  sheetKey = sheetKey || 'classic';
  const sheet = SHEETS[sheetKey];
  if(!sheet || !sheet.ready || tileId === undefined) return;
  const tctx = targetCanvas.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  const sx = (tileId % sheet.cols) * sheet.tileSize;
  const sy = Math.floor(tileId / sheet.cols) * sheet.tileSize;
  tctx.drawImage(sheet.img, sx, sy, sheet.tileSize, sheet.tileSize, 0, 0, targetCanvas.width, targetCanvas.height);
}

// --- Unified draw helper: Remaster → Classic → ASCII ---
function drawEntity(px, py, ch, color, entityInfo) {
  // If entityInfo is a plain number, treat it as a classic tile ID (backward compat)
  if(typeof entityInfo === 'number') {
    entityInfo = { classicTile: entityInfo };
  }

  if(!useTileset || !entityInfo) {
    ctx.fillStyle = color;
    ctx.fillText(ch, px, py);
    return;
  }

  // Remaster boss sprite (draws at 2x, offset so it centers over the cell)
  if(entityInfo.bossRow !== undefined && SHEETS.bosses.ready) {
    const tileId = getBossTileId(entityInfo.bossRow, entityInfo.facing || 'd', entityInfo.animState || 'idle');
    const bossSize = CELL_SIZE * 2;
    const offsetX = px - Math.floor(CELL_SIZE / 2);
    const offsetY = py - Math.floor(CELL_SIZE / 2);
    drawFromSheet('bosses', tileId, offsetX, offsetY, bossSize);
    return;
  }

  // Remaster character sprite (player, monster, companion, NPC)
  if(entityInfo.charRow !== undefined && SHEETS.character.ready) {
    const tileId = getCharTileId(entityInfo.charRow, entityInfo.facing || 'd', entityInfo.animState || 'idle');
    drawFromSheet('character', tileId, px, py);
    // Apply race tint on offscreen canvas so source-atop only affects this sprite
    if(entityInfo.tint) {
      const sheet = SHEETS.character;
      const oc = document.createElement('canvas');
      oc.width = CELL_SIZE; oc.height = CELL_SIZE;
      const ox = oc.getContext('2d');
      ox.imageSmoothingEnabled = false;
      const sx = (tileId % sheet.cols) * sheet.tileSize;
      const sy = Math.floor(tileId / sheet.cols) * sheet.tileSize;
      ox.drawImage(sheet.img, sx, sy, sheet.tileSize, sheet.tileSize, 0, 0, CELL_SIZE, CELL_SIZE);
      ox.globalCompositeOperation = 'source-atop';
      ox.fillStyle = entityInfo.tint;
      ox.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
      ctx.drawImage(oc, px, py);
    }
    return;
  }

  // Remaster world tile (terrain, items)
  if(entityInfo.worldTile !== undefined && SHEETS.world.ready) {
    let tid = entityInfo.worldTile;
    if(Array.isArray(tid)) tid = tid[Math.floor(animTime / 500) % tid.length];
    drawFromSheet('world', tid, px, py);
    return;
  }

  // Classic fallback tile
  if(entityInfo.classicTile !== undefined && SHEETS.classic.ready) {
    drawFromSheet('classic', entityInfo.classicTile, px, py);
    return;
  }

  // ASCII fallback
  ctx.fillStyle = color;
  ctx.fillText(ch, px, py);
}

// ─── MAIN RENDER ─────────────────────────────────────────────
function renderAll() {
  if(!canvas) return;
  const { level, player } = G;
  if(!level) return;

  // Ensure canvas fills the map panel (handles deferred layout)
  resizeCanvas();
  if(canvas.width === 0 || canvas.height === 0) return;

  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `${CELL_SIZE}px 'VT323', monospace`;
  ctx.textBaseline = 'top';

  const { ox, oy, cols, rows } = getViewOffset();

  // Compute dynamic lighting
  computeLighting(ox, oy, cols, rows);

  const themedColors = getThemedTileColors(G.floor);

  for(let row=0; row<rows; row++) {
    for(let col=0; col<cols; col++) {
      const mx = ox + col;
      const my = oy + row;
      if(mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) continue;

      const key = `${mx},${my}`;
      const visible = level.visible?.has(key);
      const explored = level.explored.has(key);

      if(!explored && !visible) continue;

      const tile = level.tiles[my][mx];
      const tileInfo = themedColors[tile] || themedColors[TILE.WALL];

      const px = col * CELL_SIZE;
      const py = row * CELL_SIZE;

      if(visible) {
        // Draw background
        ctx.fillStyle = tileInfo.bg;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        // Check for entities
        const item = level.items.find(i => i.x===mx && i.y===my);
        const monster = level.monsters.find(m => m.x===mx && m.y===my);
        const npc = level.npcs?.find(n => n.x===mx && n.y===my && !n.companion);

        // Draw terrain first (behind entities)
        const terrainInfo = getTerrainEntityInfo(tile, G.floor);
        const fg = getDancingColor(tileInfo.fg, tile, mx, my);
        drawEntity(px, py, tileInfo.ch, fg, terrainInfo);

        // Draw entity on top of terrain
        if(mx === player.x && my === player.y) {
          drawEntity(px, py, '@', '#ffffff', getPlayerEntityInfo());
        } else if(monster && !monster.disguised) {
          const mColor = monster.isBoss ? '#ffd700' : (monster.neutral ? '#44ccff' : monster.color);
          drawEntity(px, py, monster.sym, mColor, getMonsterEntityInfo(monster));
        } else if(monster && monster.disguised) {
          drawEntity(px, py, monster.disguiseSym || '?', monster.disguiseColor || '#ffcc44', getItemEntityInfo(monster));
        } else if(npc) {
          drawEntity(px, py, npc.sym || '@', npc.color || '#ffcc44', getNpcEntityInfo(npc));
        } else if(item && !item.hidden) {
          drawEntity(px, py, item.glyph || '?', item.color || '#ffcc44', getItemEntityInfo(item));
        }

        // Companions on this tile
        const comp = player.companions.find(c => c.x===mx && c.y===my);
        if(comp) {
          drawEntity(px, py, '@', '#44ff88', getCompanionEntityInfo(comp));
        }

        // Dynamic lighting overlay
        applyLighting(px, py, mx, my);

        // Targeting cursor
        if(G.targeting && G.targetX === mx && G.targetY === my) {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.strokeRect(px+1, py+1, CELL_SIZE-2, CELL_SIZE-2);
        }

      } else if(explored) {
        // Smooth fog of war: draw tile normally then darken
        ctx.fillStyle = tileInfo.bg;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        drawEntity(px, py, tileInfo.ch, tileInfo.fg, getTerrainEntityInfo(tile, G.floor));
        ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // Combat/spell flash effects
  renderTileEffects(ox, oy);

  // Map info
  const floorLabel = G.ascending ? `Floor ${G.floor} of 16 ▲ ASCENDING` : `Floor ${G.floor} of 16`;
  document.getElementById('map-info').textContent = `${floorLabel}  |  Turn ${G.turn}`;

  // Draw targeting/look cursor overlay
  if((G.lookMode || G.stairFindMode || G.targetMode) && G.lookX !== undefined) {
    if(typeof overlayLookBox === 'function') overlayLookBox();
    // Draw targeting line for ranged
    if(G.targetMode && ctx) {
      const { ox, oy } = getViewOffset();
      const px = (G.player.x - ox) * CELL_SIZE + CELL_SIZE/2;
      const py = (G.player.y - oy) * CELL_SIZE + CELL_SIZE/2;
      const tx = (G.lookX - ox) * CELL_SIZE + CELL_SIZE/2;
      const ty = (G.lookY - oy) * CELL_SIZE + CELL_SIZE/2;
      ctx.strokeStyle = 'rgba(255,100,50,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  updateSidePanel();
  updateLogPanel();
}

function updateSidePanel() {
  const p = G.player;
  if(!p) return;

  // Identity
  document.getElementById('sp-name').textContent = p.name;
  document.getElementById('sp-class').textContent = `${RACES[p.race].name} ${CLASSES[p.cls].name}`;
  const xpNeeded = getXPNeeded(p);
  document.getElementById('sp-level').textContent = `Lv ${p.level}`;

  // Vitals
  document.getElementById('hp-text').textContent = `${p.hp}/${p.maxHp}`;
  document.getElementById('hp-bar').style.width = `${(p.hp/p.maxHp)*100}%`;
  document.getElementById('hp-bar').style.background = p.hp < p.maxHp*0.25 ? '#ff0000' : p.hp < p.maxHp*0.5 ? '#ff8800' : 'var(--red)';

  document.getElementById('mp-text').textContent = `${p.mp}/${p.maxMp}`;
  document.getElementById('mp-bar').style.width = `${p.maxMp > 0 ? (p.mp/p.maxMp)*100 : 0}%`;

  const xpPct = xpNeeded > 0 ? ((p.xp - getXPNeeded(p, p.level-1)) / (xpNeeded - getXPNeeded(p, p.level-1))) * 100 : 0;
  document.getElementById('xp-bar').style.width = `${Math.max(0, Math.min(100, xpPct))}%`;
  const xpTextEl = document.getElementById('xp-text');
  if(xpTextEl) xpTextEl.textContent = `${p.xp}/${xpNeeded}`;

  const hungerPct = (p.hunger / p.maxHunger) * 100;
  document.getElementById('hunger-bar').style.width = `${hungerPct}%`;
  let hungerText = 'Satiated';
  if(hungerPct < 15) hungerText = 'STARVING!';
  else if(hungerPct < 30) hungerText = 'Hungry';
  else if(hungerPct < 50) hungerText = 'Peckish';
  document.getElementById('hunger-text').textContent = hungerText;

  // Stats
  const ac = computeAC(p);
  document.getElementById('s-str').textContent = p.stats.str;
  document.getElementById('s-dex').textContent = p.stats.dex;
  document.getElementById('s-con').textContent = p.stats.con;
  document.getElementById('s-int').textContent = p.stats.int;
  document.getElementById('s-wis').textContent = p.stats.wis;
  document.getElementById('s-cha').textContent = p.stats.cha;
  document.getElementById('s-ac').textContent = ac;
  document.getElementById('s-gold').textContent = p.gold;

  // Equipment strip (sprite icons)
  updateEquipStrip();

  // God display
  const godEl = document.getElementById('god-display');
  if(p.god) {
    const godData = GODS[p.god];
    const pietyDisp = Math.floor(p.piety);
    godEl.innerHTML = `<div class="god-name" style="font-size:13px;">${godData.name}</div>
      <div style="font-size:10px;color:var(--gray)">Piety ${pietyDisp}/100</div>
      <div style="height:6px;background:#111;border:1px solid var(--border);border-radius:1px;margin-top:2px;"><div class="piety-bar" style="width:${pietyDisp}%"></div></div>`;
  } else {
    godEl.innerHTML = `<span style="color:var(--gray);font-size:10px;">No god</span>`;
  }

  // Alignment
  const alignEl = document.getElementById('alignment-display');
  if(alignEl) {
    const { label, color } = getAlignmentLabel(p.alignment || 0);
    alignEl.innerHTML = `<span style="color:${color};font-size:11px;">${label}</span>`;
  }

  // Companions (compact)
  const compEl = document.getElementById('companions-list');
  if(p.companions.length === 0) {
    compEl.innerHTML = '';
  } else {
    compEl.innerHTML = p.companions.map(c => {
      const lvl = c.compLevel || 1;
      return `<span style="color:var(--green);font-size:11px;">${c.name.split(' ')[0]} L${lvl} ${c.hp}/${c.maxHp}</span>`;
    }).join('<br>');
  }

  // Mutations indicator
  updateMutIndicator();

  // Monster panel
  updateMonsterPanel();

  // Minimap
  renderMinimap();
}

const EQUIP_SLOTS = ['weapon','ranged','offhand','body','head','ring1','ring2','neck','cloak','boots','ammo'];
const EQUIP_SLOT_LABELS = ['Wpn','Off','Body','Head','R1','R2','Neck','Clk','Boot','Ammo'];

function updateEquipStrip() {
  const p = G.player;
  const strip = document.getElementById('equip-strip');
  if(!strip) return;

  // Initialize icons once
  if(!strip._initialized) {
    strip.innerHTML = '';
    for(let i = 0; i < EQUIP_SLOTS.length; i++) {
      const div = document.createElement('div');
      div.className = 'equip-icon';
      div.dataset.slot = EQUIP_SLOTS[i];
      const c = document.createElement('canvas');
      c.width = 12; c.height = 12;
      c.style.cssText = 'width:24px;height:24px;image-rendering:pixelated;';
      div.appendChild(c);
      const tip = document.createElement('div');
      tip.className = 'equip-tooltip';
      div.appendChild(tip);
      strip.appendChild(div);
    }
    strip._initialized = true;
  }

  const icons = strip.querySelectorAll('.equip-icon');
  icons.forEach((icon, i) => {
    const item = p.equipped[EQUIP_SLOTS[i]];
    const c = icon.querySelector('canvas');
    const tip = icon.querySelector('.equip-tooltip');
    if(item) {
      if(useTileset) {
        const wt = getItemWorldTile(item);
        if(wt !== undefined && SHEETS.world.ready) {
          drawSpriteToCanvas(c, wt, 'world');
        } else {
          drawSpriteToCanvas(c, getItemTile(item), 'classic');
        }
      } else {
        const tctx = c.getContext('2d');
        tctx.clearRect(0,0,8,8);
        tctx.fillStyle = item.cursed ? '#cc3333' : '#5ac8d8';
        tctx.font = '7px monospace';
        tctx.textBaseline = 'top';
        tctx.fillText(item.glyph || '?', 1, 0);
      }
      let label = item.name;
      if(EQUIP_SLOTS[i] === 'weapon') {
        if(item.speed === 'fast') label += ' [fast]';
        if(item.speed === 'slow') label += ' [slow]';
        if(item.reach) label += ' [reach]';
        if(item.cleave) label += ' [cleave]';
      }
      tip.textContent = label;
      icon.style.borderColor = item.cursed ? 'var(--red)' : 'var(--border)';
    } else {
      const tctx = c.getContext('2d');
      tctx.clearRect(0,0,8,8);
      tctx.fillStyle = '#333';
      tctx.font = '6px monospace';
      tctx.textBaseline = 'top';
      tctx.fillText(EQUIP_SLOT_LABELS[i], 0, 1);
      tip.textContent = EQUIP_SLOT_LABELS[i];
      icon.style.borderColor = 'var(--border)';
    }
  });
}

function updateMonsterPanel() {
  const { level, player } = G;
  const el = document.getElementById('monster-panel');
  if(!el || !level) return;

  // Monsters
  const visMonsters = level.monsters.filter(m => level.visible?.has(`${m.x},${m.y}`) && !m.disguised);
  visMonsters.sort((a,b) => {
    const da = Math.sqrt((a.x-player.x)**2+(a.y-player.y)**2);
    const db = Math.sqrt((b.x-player.x)**2+(b.y-player.y)**2);
    return da - db;
  });

  // Items under player feet
  const underfoot = level.items.filter(i =>
    !i.hidden && i.type !== 'trap' &&
    i.x === player.x && i.y === player.y
  );

  // Other visible items (non-hidden, non-trap, not under player)
  const visItems = level.items.filter(i =>
    !i.hidden && i.type !== 'trap' &&
    level.visible?.has(`${i.x},${i.y}`) &&
    !(i.x === player.x && i.y === player.y)
  );
  visItems.sort((a,b) => {
    const da = Math.sqrt((a.x-player.x)**2+(a.y-player.y)**2);
    const db = Math.sqrt((b.x-player.x)**2+(b.y-player.y)**2);
    return da - db;
  });

  let html = '';

  // Underfoot items first
  if(underfoot.length > 0) {
    html += `<div style="font-size:11px;color:var(--gray);font-family:'Share Tech Mono';margin-bottom:2px;">underfoot:</div>`;
    html += underfoot.slice(0, 3).map(item => {
      const dname = getItemDisplayName(item);
      const wt = getItemWorldTile(item);
      const hasWorldTile = wt !== undefined && SHEETS.world.ready;
      const itemSpriteHtml = useTileset ? `<canvas class="hud-mon-sprite" width="${hasWorldTile?12:8}" height="${hasWorldTile?12:8}" data-tileid="${hasWorldTile?wt:getItemTile(item)}" data-sheet="${hasWorldTile?'world':'classic'}"></canvas>` : `<span style="color:${item.color||'var(--white)'}">${item.glyph||'?'}</span>`;
      return `<div class="hud-mon-entry">${itemSpriteHtml} <span style="color:${item.color||'var(--white)'};">${dname}</span></div>`;
    }).join('');
    if(underfoot.length > 0) html += `<div style="border-top:1px solid #1a1a2a;margin:2px 0;"></div>`;
  }

  // Monsters (up to 4) with sprite icons
  html += visMonsters.slice(0, 4).map(m => {
    const pct = Math.max(0, Math.min(100, (m.hp/m.maxHp)*100));
    const barColor = pct > 60 ? '#00ff88' : pct > 30 ? '#ffaa00' : '#ff3333';
    const nameColor = m.neutral ? 'color:#44ccff' : '';
    const mKey = m.key || m.templateKey;
    const charRow = MONSTER_CHAR_ROW[mKey];
    const hasRemaster = charRow !== undefined && SHEETS.character.ready;
    const spriteSize = hasRemaster ? 12 : 8;
    const sheetKey = hasRemaster ? 'character' : 'classic';
    const spriteId = hasRemaster ? getCharTileId(charRow, m.facing || 'd', 'idle') : getMonsterTile(m);
    const spriteHtml = useTileset ? `<canvas class="hud-mon-sprite" width="${spriteSize}" height="${spriteSize}" data-tileid="${spriteId}" data-sheet="${sheetKey}"></canvas>` : `<span style="font-size:14px;width:20px;display:inline-block;text-align:center;${nameColor}">${m.sym}</span>`;
    return `<div class="hud-mon-entry">
      ${spriteHtml}
      <span style="${nameColor};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.name}</span>
      <div class="hud-mon-bar"><div class="hud-mon-bar-inner" style="width:${pct}%;background:${barColor}"></div></div>
    </div>`;
  }).join('');

  // Items (up to 5 total entries, share space with monsters)
  const itemSlots = Math.max(0, 5 - visMonsters.slice(0,4).length);
  if(visItems.length > 0 && itemSlots > 0) {
    if(visMonsters.length > 0) html += `<div style="border-top:1px solid #1a1a2a;margin:2px 0;"></div>`;
    html += visItems.slice(0, itemSlots).map(item => {
      const dname = getItemDisplayName(item);
      const wt = getItemWorldTile(item);
      const hasWorldTile = wt !== undefined && SHEETS.world.ready;
      const itemSpriteHtml = useTileset ? `<canvas class="hud-mon-sprite" width="${hasWorldTile?12:8}" height="${hasWorldTile?12:8}" data-tileid="${hasWorldTile?wt:getItemTile(item)}" data-sheet="${hasWorldTile?'world':'classic'}"></canvas>` : `<span style="color:${item.color||'var(--white)'}">${item.glyph||'?'}</span>`;
      return `<div class="hud-mon-entry">${itemSpriteHtml} <span style="color:${item.color||'var(--white)'};">${dname}</span></div>`;
    }).join('');
  }

  if(!html) {
    el.innerHTML = '<span style="color:var(--gray);font-size:11px;">Nothing nearby</span>';
    return;
  }
  el.innerHTML = html;
  // Render sprite canvases for monsters
  if(useTileset) {
    el.querySelectorAll('canvas[data-tileid]').forEach(c => {
      const sheetKey = c.dataset.sheet || 'classic';
      drawSpriteToCanvas(c, parseInt(c.dataset.tileid), sheetKey);
    });
  }
}

function renderMinimap() {
  const mc = document.getElementById('minimap-canvas');
  if(!mc || !G.level) return;
  const mctx = mc.getContext('2d');
  const { tiles, explored, visible, monsters, npcs } = G.level;
  const p = G.player;
  
  const W = mc.width;
  const H = mc.height;
  const scaleX = W / MAP_W;
  const scaleY = H / MAP_H;
  
  mctx.fillStyle = '#0a0a0f';
  mctx.fillRect(0, 0, W, H);
  
  for(let y=0; y<MAP_H; y++) {
    for(let x=0; x<MAP_W; x++) {
      const k = `${x},${y}`;
      if(!explored.has(k)) continue;
      const isVis = visible?.has(k);
      const tile = tiles[y][x];
      
      let col;
      if(tile === TILE.WALL) col = isVis ? '#334' : '#222';
      else if(tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) col = '#ffcc44';
      else if(tile === TILE.ALTAR) col = '#cc44cc';
      else if(tile === TILE.SHOP) col = '#dd44ff';
      else if(tile === TILE.LAVA) col = '#ff4400';
      else if(tile === TILE.WATER) col = '#2266cc';
      else col = isVis ? '#3a3a5a' : '#1a1a2e';
      
      mctx.fillStyle = col;
      mctx.fillRect(Math.floor(x*scaleX), Math.floor(y*scaleY), Math.max(1,Math.floor(scaleX)+1), Math.max(1,Math.floor(scaleY)+1));
    }
  }
  
  // Visible monsters
  for(const m of monsters) {
    if(!visible?.has(`${m.x},${m.y}`)) continue;
    mctx.fillStyle = m.isBoss ? '#ffd700' : '#ff3333';
    mctx.fillRect(Math.floor(m.x*scaleX)-1, Math.floor(m.y*scaleY)-1, 3, 3);
  }
  
  // Player
  mctx.fillStyle = '#ffffff';
  mctx.fillRect(Math.floor(p.x*scaleX)-1, Math.floor(p.y*scaleY)-1, 3, 3);
}

function updateLogPanel() {
  const el = document.getElementById('log-panel');
  const recent = G.messages.slice(-8);
  el.innerHTML = recent.map(m => `<div class="log-msg log-${m.type}">${m.text}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}

// ─── LOGGING ─────────────────────────────────────────────────
function log(text, type='info') {
  if(!G || !G.messages) { if(!G) G = {}; if(!G.messages) G.messages = []; }
  G.messages.push({ text, type });
  if(G.messages.length > 500) G.messages.shift();
}

