// ─── MAP GENERATION ──────────────────────────────────────────
class Room {
  constructor(x, y, w, h) { this.x=x; this.y=y; this.w=w; this.h=h; }
  center() { return [Math.floor(this.x+this.w/2), Math.floor(this.y+this.h/2)]; }
  contains(x, y) { return x>=this.x && x<this.x+this.w && y>=this.y && y<this.y+this.h; }
  intersects(other) {
    return this.x < other.x+other.w+1 && this.x+this.w+1 > other.x &&
           this.y < other.y+other.h+1 && this.y+this.h+1 > other.y;
  }
  carve(tiles) {
    for(let y=this.y; y<this.y+this.h; y++) {
      for(let x=this.x; x<this.x+this.w; x++) {
        tiles[y][x] = TILE.FLOOR;
      }
    }
  }
}

function generateLevel(floor) {
  const tiles = Array.from({length:MAP_H}, ()=>Array(MAP_W).fill(TILE.WALL));
  const rooms = [];
  const items = [];
  const monsters = [];
  const npcs = [];
  let portalBranches = null;

  const numRooms = rng.int(10, 18);

  for(let attempt=0; attempt<200 && rooms.length<numRooms; attempt++) {
    const w = rng.int(4, 14);
    const h = rng.int(4, 10);
    const x = rng.int(1, MAP_W - w - 1);
    const y = rng.int(1, MAP_H - h - 1);
    const room = new Room(x, y, w, h);
    if(!rooms.some(r => r.intersects(room))) {
      rooms.push(room);
    }
  }

  // Carve rooms
  for(const r of rooms) {
    r.carve(tiles);
  }

  // Connect rooms
  for(let i=1; i<rooms.length; i++) {
    const [ax, ay] = rooms[i-1].center();
    const [bx, by] = rooms[i].center();
    // Horizontal then vertical
    let cx = ax, cy = ay;
    while(cx !== bx) {
      tiles[cy][cx] = TILE.CORRIDOR;
      cx += cx < bx ? 1 : -1;
    }
    while(cy !== by) {
      tiles[cy][cx] = TILE.CORRIDOR;
      cy += cy < by ? 1 : -1;
    }
    tiles[cy][cx] = TILE.CORRIDOR;
  }

  // Place doors at room entrances
  for(const r of rooms) {
    const walls = [
      [r.x-1, r.y+Math.floor(r.h/2)], [r.x+r.w, r.y+Math.floor(r.h/2)],
      [r.x+Math.floor(r.w/2), r.y-1], [r.x+Math.floor(r.w/2), r.y+r.h]
    ];
    for(const [dx, dy] of walls) {
      if(dy>=0 && dy<MAP_H && dx>=0 && dx<MAP_W && tiles[dy][dx]===TILE.CORRIDOR) {
        if(rng.bool(0.5)) tiles[dy][dx] = TILE.DOOR;
      }
    }
  }

  // Stairs
  const startRoom = rooms[0];
  const endRoom = rooms[rooms.length-1];
  const [sx, sy] = startRoom.center();
  const [ex, ey] = endRoom.center();

  if(floor > 1) tiles[sy][sx] = TILE.STAIRS_UP;
  tiles[ey][ex] = TILE.STAIRS_DOWN;

  // Special tiles + temple chance
  const hasTemple = !G.templeSpawned && rng.bool(0.12); // 12% chance, once per game
  let altarCount = 0;
  for(let i=2; i<rooms.length-1; i++) {
    const r = rooms[i];
    const [cx, cy] = r.center();
    const roll = rng.next();
    if(roll < 0.08 && floor >= 1) {
      // Altar — assign a god
      tiles[cy][cx] = TILE.ALTAR;
      const godKeys = Object.keys(GODS);
      const godKey = FLOOR_ALTAR_GODS[altarCount % godKeys.length] || rng.pick(godKeys);
      // Store in a level-wide map (set below)
      if(!G._pendingAltarGods) G._pendingAltarGods = {};
      G._pendingAltarGods[`${cx},${cy}`] = godKey;
      altarCount++;
    } else if(roll < (floor <= 1 ? 0.08 : Math.min(0.15, 0.08 + floor * 0.01))) {
      // Shop chance scales with floor: 0% floor 1, ~2% floor 2, ramping to 7% by floor 7+
      tiles[cy][cx] = TILE.SHOP;
    }
    // Traps
    if(rng.bool(0.15)) {
      const tx = rng.int(r.x+1, r.x+r.w-2);
      const ty = rng.int(r.y+1, r.y+r.h-2);
      items.push(createTrap(tx, ty, floor));
    }
  }

  // Temple: fill a whole room with altars
  if(hasTemple && rooms.length > 5) {
    const templeRoom = rooms[Math.floor(rooms.length * 0.6)];
    for(let ty2=templeRoom.y; ty2<templeRoom.y+templeRoom.h; ty2++) {
      for(let tx2=templeRoom.x; tx2<templeRoom.x+templeRoom.w; tx2++) {
        if(tiles[ty2][tx2] === TILE.FLOOR) {
          tiles[ty2][tx2] = TILE.ALTAR;
          const godKeys = Object.keys(GODS);
          const godKey = rng.pick(godKeys);
          if(!G._pendingAltarGods) G._pendingAltarGods = {};
          G._pendingAltarGods[`${tx2},${ty2}`] = godKey;
        }
      }
    }
    log('You sense a place of great power nearby...', 'god');
    G.templeSpawned = true;
  }

  // Water and lava in deeper floors
  if(floor >= 5) {
    for(let i=0; i<rng.int(2, 8); i++) {
      const r = rng.pick(rooms.slice(1, -1));
      const lx = rng.int(r.x+1, r.x+r.w-2);
      const ly = rng.int(r.y+1, r.y+r.h-2);
      tiles[ly][lx] = floor >= 10 && rng.bool(0.3) ? TILE.LAVA : TILE.WATER;
    }
  }

  // Floor theme terrain
  const theme = getFloorTheme(floor);
  if(theme.extraWater) {
    for(let i=0; i<rng.int(5, 15); i++) {
      const r = rng.pick(rooms.slice(1, -1));
      const wx = rng.int(r.x+1, r.x+r.w-2);
      const wy = rng.int(r.y+1, r.y+r.h-2);
      if(tiles[wy][wx] === TILE.FLOOR) tiles[wy][wx] = TILE.WATER;
    }
  }
  if(theme.extraLava) {
    for(let i=0; i<rng.int(5, 12); i++) {
      const r = rng.pick(rooms.slice(1, -1));
      const lx = rng.int(r.x+1, r.x+r.w-2);
      const ly = rng.int(r.y+1, r.y+r.h-2);
      if(tiles[ly][lx] === TILE.FLOOR) tiles[ly][lx] = TILE.LAVA;
    }
  }
  if(theme.extraTraps) {
    for(let i=0; i<rng.int(3, 6); i++) {
      const r = rng.pick(rooms.slice(1, -1));
      const tx = rng.int(r.x+1, r.x+r.w-2);
      const ty = rng.int(r.y+1, r.y+r.h-2);
      if(tiles[ty][tx] === TILE.FLOOR) tiles[ty][tx] = TILE.TRAP;
    }
  }

  // Shafts (one-way descent) — floors 3-14, 1-2 per level, never on final floors
  if(floor >= 3 && floor <= 14) {
    const numShafts = rng.int(0, 2);
    for(let i = 0; i < numShafts; i++) {
      const r = rng.pick(rooms.slice(1, -1));
      if(!r) continue;
      const sx = rng.int(r.x+1, r.x+r.w-2);
      const sy = rng.int(r.y+1, r.y+r.h-2);
      if(tiles[sy][sx] === TILE.FLOOR) tiles[sy][sx] = TILE.SHAFT;
    }
  }

  // Special rooms (1-2 per floor from middle rooms)
  const earlyEligible = Object.entries(MONSTER_TEMPLATES).filter(([k, v]) => !v.unique && !v.branch && v.floor[0] <= floor && v.floor[1] >= floor);
  if(rooms.length >= 5) {
    const midRooms = rooms.slice(2, -1);
    const numSpecial = rng.int(1, Math.min(2, midRooms.length));
    const specialTypes = ['armory','library','vault','crypt_chamber'];
    for(let s=0; s<numSpecial; s++) {
      const sRoom = rng.pick(midRooms);
      const sType = rng.pick(specialTypes);
      const [cx, cy] = sRoom.center();
      switch(sType) {
        case 'armory':
          for(let a=0; a<rng.int(2,4); a++) {
            const ai = generateItem(Math.min(16, floor+2));
            if(ai.type === 'weapon' || ai.type === 'armor') {
              ai.x = rng.int(sRoom.x+1, sRoom.x+sRoom.w-2);
              ai.y = rng.int(sRoom.y+1, sRoom.y+sRoom.h-2);
              items.push(ai);
            }
          }
          // Guard monsters
          for(let g=0; g<rng.int(1,2); g++) {
            if(earlyEligible.length > 0) {
              const [mk, mv] = rng.pick(earlyEligible);
              const gm = createMonster(mk, mv, cx+g, cy, floor);
              gm.hp = Math.floor(gm.hp * 1.3);
              gm.maxHp = Math.floor(gm.maxHp * 1.3);
              monsters.push(gm);
            }
          }
          break;
        case 'library':
          for(let l=0; l<rng.int(2,3); l++) {
            const si = { ...ITEM_TEMPLATES[rng.pick(['scroll_tele','scroll_id','scroll_mapping','scroll_enchant_wpn','scroll_enchant_arm','scroll_acquirement'])], id:`item_${Date.now()}_${rng.int(0,9999)}` };
            si.x = rng.int(sRoom.x+1, sRoom.x+sRoom.w-2);
            si.y = rng.int(sRoom.y+1, sRoom.y+sRoom.h-2);
            items.push(si);
          }
          break;
        case 'vault':
          for(let v=0; v<rng.int(3,5); v++) {
            items.push({ type:'gold', glyph:'$', color:'#ffcc00', amount:rng.int(floor*10, floor*40), x:rng.int(sRoom.x+1,sRoom.x+sRoom.w-2), y:rng.int(sRoom.y+1,sRoom.y+sRoom.h-2) });
          }
          const vaultItem = generateItem(Math.min(16, floor+3));
          vaultItem.x = cx; vaultItem.y = cy;
          items.push(vaultItem);
          // Trap the vault
          if(tiles[cy-1]?.[cx] === TILE.FLOOR) tiles[cy-1][cx] = TILE.TRAP;
          if(tiles[cy+1]?.[cx] === TILE.FLOOR) tiles[cy+1][cx] = TILE.TRAP;
          break;
        case 'crypt_chamber':
          for(let u=0; u<rng.int(3,5); u++) {
            const undeadTypes = Object.entries(MONSTER_TEMPLATES).filter(([k,v]) => v.undead && !v.branch && v.floor[0] <= floor && v.floor[1] >= floor);
            if(undeadTypes.length > 0) {
              const [uk, uv] = rng.pick(undeadTypes);
              const ux = rng.int(sRoom.x+1, sRoom.x+sRoom.w-2);
              const uy = rng.int(sRoom.y+1, sRoom.y+sRoom.h-2);
              if(!monsters.some(m => m.x===ux && m.y===uy)) {
                monsters.push(createMonster(uk, uv, ux, uy, floor));
              }
            }
          }
          // Guaranteed ring or amulet
          const accItem = generateItem(floor);
          accItem.x = cx; accItem.y = cy;
          items.push(accItem);
          break;
      }
    }
  }

  // Place items
  for(let i=1; i<rooms.length; i++) {
    const r = rooms[i];
    const numItems = rng.int(0, 2);
    for(let j=0; j<numItems; j++) {
      const ix = rng.int(r.x, r.x+r.w-1);
      const iy = rng.int(r.y, r.y+r.h-1);
      if(tiles[iy][ix] === TILE.FLOOR || tiles[iy][ix] === TILE.CORRIDOR) {
        const item = generateItem(floor);
        item.x = ix; item.y = iy;
        items.push(item);
      }
    }
    // Gold
    if(rng.bool(0.45)) {
      const [cx, cy] = r.center();
      items.push({ type:'gold', glyph:'$', color:'#ffd700', name:'Gold', amount:rng.int(floor*5, floor*30), x:cx, y:cy });
    }
  }

  // Quest item on floor 16
  if(floor === 16) {
    const [ex2, ey2] = endRoom.center();
    const runeItem = { ...ITEM_TEMPLATES.rune_of_baal, x:ex2-1, y:ey2-1 };
    items.push(runeItem);
  }

  // Place monsters — during ascent, use deeper monster pool and spawn more
  const isAscending = G.ascending;
  const monsterFloor = isAscending ? Math.min(16, floor + Math.floor((16 - floor) * 0.5)) : floor;
  let eligibleMonsters = Object.entries(MONSTER_TEMPLATES).filter(([k, v]) => {
    return !v.unique && !v.branch && v.floor[0] <= monsterFloor && v.floor[1] >= floor;
  });
  // Theme monster bias: double the weight of themed monsters
  if(theme.undeadBoost) {
    const undead = eligibleMonsters.filter(([k, v]) => v.undead);
    eligibleMonsters = eligibleMonsters.concat(undead, undead); // 3x weight
  }
  if(theme.demonBoost) {
    const demons = eligibleMonsters.filter(([k, v]) => v.faction === 'chaotic');
    eligibleMonsters = eligibleMonsters.concat(demons, demons);
  }

  for(let i=1; i<rooms.length; i++) {
    const r = rooms[i];
    const baseMonsters = Math.min(3, 1 + Math.floor(floor/4));
    const ascentBonus = isAscending ? Math.floor((16 - floor) / 4) + 1 : 0;
    const numMonsters = rng.int(0, baseMonsters + ascentBonus);
    for(let j=0; j<numMonsters; j++) {
      const [mk, mv] = rng.pick(eligibleMonsters);
      const mx = rng.int(r.x, r.x+r.w-1);
      const my = rng.int(r.y, r.y+r.h-1);
      if((tiles[my][mx] === TILE.FLOOR || tiles[my][mx] === TILE.CORRIDOR) &&
         !monsters.some(m => m.x===mx && m.y===my)) {
        const ascentHpScale = isAscending ? 1 + (16 - floor) * 0.06 : 1;
        const m = createMonster(mk, mv, mx, my, monsterFloor);
        m.hp = Math.floor(m.hp * ascentHpScale);
        m.maxHp = Math.floor(m.maxHp * ascentHpScale);
        monsters.push(m);
      }
    }
  }

  // Boss monster
  const bossKeys = Object.keys(MONSTER_TEMPLATES).filter(k => {
    const v = MONSTER_TEMPLATES[k];
    return v.isBoss && !v.branch && v.floor[0] === floor && !G.killedBosses?.includes(k);
  });
  if(bossKeys.length > 0) {
    const bk = bossKeys[0];
    const bv = MONSTER_TEMPLATES[bk];
    const [bx, by] = endRoom.center();
    monsters.push(createMonster(bk, bv, bx+1, by+1, floor, true));
  }

  // NPC (chance scales with floor: 0% floor 1, ~6% floor 2, ramping to 25% by floor 8+)
  const npcChance = floor <= 1 ? 0 : Math.min(0.25, floor * 0.03);
  if(rng.bool(npcChance)) {
    const availNPCs = NPC_TEMPLATES.filter(n => !G.joinedNPCs?.includes(n.id));
    if(availNPCs.length > 0) {
      const npc = rng.pick(availNPCs);
      const r = rooms[Math.floor(rooms.length/2)];
      const [nx, ny] = r.center();
      npcs.push({ ...npc, x:nx+1, y:ny, hp:npc.hp_base, maxHp:npc.hp_base, aiState:'idle', companion:false });
    }
  }

  // Branch portals
  if(!G.branch) { // only on main dungeon floors
    for(const [bk, branch] of Object.entries(BRANCHES)) {
      if(floor === branch.entryFloor && !G.completedBranches?.includes(bk)) {
        // Place portal in a middle room
        if(rooms.length >= 4) {
          const portalRoom = rooms[Math.floor(rooms.length / 2)];
          const [px, py] = portalRoom.center();
          tiles[py][px] = TILE.PORTAL;
          if(!portalBranches) portalBranches = {};
          portalBranches[`${px},${py}`] = bk;
        }
      }
    }
  }

  const altarGods = G._pendingAltarGods || {};
  G._pendingAltarGods = {};
  return { tiles, rooms, items, monsters, npcs, startPos: [sx, sy], explored: new Set(), altarGods, portalBranches };
}

function createTrap(x, y, floor) {
  const trapTypes = ['dart_trap','pit_trap','alarm_trap','poison_gas','magic_trap'];
  return { type:'trap', subtype: rng.pick(trapTypes), x, y, glyph:'^', color:'#884400', hidden:true, triggered:false, floor };
}

function createMonster(key, template, x, y, floor, isBoss=false) {
  const hp = rng.dice(template.hp[0], template.hp[1], template.hp[2]);
  const scaledHp = Math.floor(hp * (1 + floor * 0.05));
  const m = {
    key, ...template,
    x, y,
    hp: isBoss ? scaledHp * 2 : scaledHp,
    maxHp: isBoss ? scaledHp * 2 : scaledHp,
    atk: template.atk.map(a => [...a]),
    confused: 0, paralyzed: 0, sleeping: 0, frightened: 0, poisoned: 0,
    alerted: false, neutral: false, provoked: false,
    id: `${key}_${x}_${y}_${Date.now()}`,
  };
  // Mimic disguise — looks like a random item on the floor
  if(template.disguise) {
    m.disguised = true;
    const disguises = [
      { sym:'!', color:'#ff8844', name:'a potion' },
      { sym:')', color:'#cccccc', name:'a weapon' },
      { sym:']', color:'#8888cc', name:'some armor' },
      { sym:'?', color:'#eeddaa', name:'a scroll' },
      { sym:'/', color:'#66aacc', name:'a wand' },
    ];
    const d = rng.pick(disguises);
    m.disguiseSym = d.sym;
    m.disguiseColor = d.color;
    m.disguiseName = d.name;
  }
  return m;
}

function generateItem(floor) {
  // Chance to spawn a unique item (3% base, scales with floor)
  if(!G.foundUniques) G.foundUniques = new Set();
  const uniqueChance = 0.02 + floor * 0.005;
  if(rng.bool(uniqueChance)) {
    const eligible = Object.entries(UNIQUE_ITEMS).filter(([k, v]) => floor >= v.minFloor && !G.foundUniques.has(k));
    if(eligible.length > 0) {
      const [key, template] = rng.pick(eligible);
      G.foundUniques.add(key);
      const item = { ...template, id: `unique_${key}_${Date.now()}`, uniqueKey: key };
      if(item.type === 'ring') item.templateKey = key;
      return item;
    }
  }

  const roll = rng.next();
  let pool;
  if(roll < 0.20) {
    pool = ['ration','bread','meat','fruit','cheese','jerky','honeycomb','mushroom_food'];
    if(floor >= 5) pool.push('royal_jelly');
    if(floor >= 8) pool.push('elven_waybread');
  }
  else if(roll < 0.35) {
    pool = ['potion_heal','potion_mana','potion_str','potion_speed','potion_invis','potion_conf','potion_poison','potion_xp',
            'potion_blind','potion_weakness','potion_clarity','potion_might','potion_resist','potion_antidote','potion_restoration'];
    if(floor >= 4) pool.push('potion_mutagen','potion_paralyze','potion_amnesia','potion_fire','potion_berserk');
    if(floor >= 6) pool.push('potion_phasing');
  }
  else if(roll < 0.55) pool = ['scroll_tele','scroll_id','scroll_id','scroll_mapping','scroll_fear','scroll_enchant_wpn','scroll_enchant_arm','scroll_curse','scroll_acquirement','scroll_remove_curse'];
  else if(roll < 0.65) {
    pool = ['arrows','bolts','stones','throwing_knife','throwing_star'];
    if(floor >= 3) pool.push('javelin','throwing_axe');
  }
  else {
    // Equipment — weighted by floor
    const wpnPool = ['dagger','shortsword','sling'];
    if(floor >= 2) wpnPool.push('mace','shortbow','spear');
    if(floor >= 4) wpnPool.push('longsword','waraxe','flail','crossbow');
    if(floor >= 6) wpnPool.push('morningstar','greatsword','longbow','falchion','battleaxe');
    if(floor >= 8) wpnPool.push('staff','warhammer','halberd');
    if(floor >= 9) wpnPool.push('wand_fire','wand_cold','wand_lightning');
    if(floor >= 11) wpnPool.push('wand_poison','wand_sleep','wand_digging','wand_polymorph');
    const armPool = ['leather','shield'];
    if(floor >= 3) armPool.push('chainmail','helmet','large_shield');
    if(floor >= 6) armPool.push('platemail','cap_int','cloak_prot','boots_speed','boots_elvenkind');
    const accPool = ['ring_prot','ring_str','ring_fire'];
    if(floor >= 4) accPool.push('ring_int','ring_regen','amulet_life');
    if(floor >= 7) accPool.push('amulet_MR','cloak_inv');
    if(rng.bool(0.01)) { // Rare cursed
      pool = ['ring_doom','amulet_curse','scroll_curse'];
    } else {
      const which = rng.next();
      if(which < 0.5) pool = wpnPool;
      else if(which < 0.75) pool = armPool;
      else pool = accPool;
    }
  }

  const key = rng.pick(pool);
  const template = ITEM_TEMPLATES[key] || ITEM_TEMPLATES.ration;
  const item = { ...template, id: `item_${Date.now()}_${rng.int(0,9999)}`, templateKey: key };
  // Track template key for rings/amulets/wands so we can identify the type globally
  if(item.type === 'wand') {
    item.templateKey = key;
    item.charges = rng.int(3, item.charges + 5);  // Randomize charges per instance
  }

  // Enchantment chance increases with floor depth
  if((item.type === 'weapon' || item.type === 'armor') && rng.bool(floor * 0.04)) {
    item.enchant = rng.int(1, Math.min(5, Math.floor(floor/3)+1));
    item.name = `+${item.enchant} ${item.name}`;
  }
  // Cursed items — hidden until equipped
  if(!item.cursed && rng.bool(0.05)) {
    item.cursed = true;
    item.enchant = (item.enchant || 0) - rng.int(1, 3);
    // Curse not shown in name until identified
  }

  return item;
}

// ─── BRANCH LEVEL GENERATION ─────────────────────────────────
function generateBranchLevel(branchKey, branchFloor) {
  const branch = BRANCHES[branchKey];
  if(!branch) return generateLevel(1); // fallback

  const tiles = Array.from({length:MAP_H}, ()=>Array(MAP_W).fill(TILE.WALL));
  const rooms = [];
  const items = [];
  const monsters = [];

  // Same BSP room generation as main dungeon
  const numRooms = rng.int(8, 14);
  for(let i=0; i<numRooms; i++) {
    const w = rng.int(4, 12);
    const h = rng.int(4, 8);
    const x = rng.int(1, MAP_W - w - 1);
    const y = rng.int(1, MAP_H - h - 1);
    const room = new Room(x, y, w, h);
    if(rooms.some(r => r.intersects(room))) continue;
    room.carve(tiles);
    rooms.push(room);
  }
  if(rooms.length < 3) {
    // Force at least 3 rooms
    for(let i=rooms.length; i<3; i++) {
      const w = rng.int(4, 8);
      const h = rng.int(4, 6);
      const x = rng.int(1, MAP_W - w - 1);
      const y = rng.int(1, MAP_H - h - 1);
      const room = new Room(x, y, w, h);
      room.carve(tiles);
      rooms.push(room);
    }
  }

  // Connect rooms with corridors
  for(let i=1; i<rooms.length; i++) {
    const [ax, ay] = rooms[i-1].center();
    const [bx, by] = rooms[i].center();
    if(rng.bool(0.5)) {
      for(let x=Math.min(ax,bx); x<=Math.max(ax,bx); x++) tiles[ay][x] = TILE.CORRIDOR;
      for(let y=Math.min(ay,by); y<=Math.max(ay,by); y++) tiles[y][bx] = TILE.CORRIDOR;
    } else {
      for(let y=Math.min(ay,by); y<=Math.max(ay,by); y++) tiles[y][ax] = TILE.CORRIDOR;
      for(let x=Math.min(ax,bx); x<=Math.max(ax,bx); x++) tiles[by][x] = TILE.CORRIDOR;
    }
  }

  // Place doors
  for(let i=1; i<rooms.length; i++) {
    const r = rooms[i];
    for(let x=r.x; x<r.x+r.w; x++) {
      for(let y of [r.y, r.y+r.h-1]) {
        if(x > r.x && x < r.x+r.w-1 && tiles[y][x] === TILE.CORRIDOR && rng.bool(0.5)) {
          tiles[y][x] = TILE.DOOR;
        }
      }
    }
    for(let y=r.y; y<r.y+r.h; y++) {
      for(let x of [r.x, r.x+r.w-1]) {
        if(y > r.y && y < r.y+r.h-1 && tiles[y][x] === TILE.CORRIDOR && rng.bool(0.5)) {
          tiles[y][x] = TILE.DOOR;
        }
      }
    }
  }

  // Stairs
  const startRoom = rooms[0];
  const endRoom = rooms[rooms.length-1];
  const [sx, sy] = startRoom.center();
  const [ex, ey] = endRoom.center();
  tiles[sy][sx] = TILE.STAIRS_UP; // back to previous floor / exit

  const isLastFloor = branchFloor >= branch.depth;
  if(!isLastFloor) {
    tiles[ey][ex] = TILE.STAIRS_DOWN; // next branch floor
  }

  // Branch theme terrain (extra water/lava based on theme)
  const themeData = FLOOR_THEMES[branch.theme];
  if(themeData?.extraWater) {
    for(let i=0; i<rng.int(8, 20); i++) {
      if(rooms.length < 2) break;
      const r = rng.pick(rooms.slice(1));
      const wx = rng.int(r.x+1, r.x+r.w-2);
      const wy = rng.int(r.y+1, r.y+r.h-2);
      if(tiles[wy][wx] === TILE.FLOOR) tiles[wy][wx] = TILE.WATER;
    }
  }
  if(themeData?.extraLava) {
    for(let i=0; i<rng.int(5, 15); i++) {
      if(rooms.length < 2) break;
      const r = rng.pick(rooms.slice(1));
      const lx = rng.int(r.x+1, r.x+r.w-2);
      const ly = rng.int(r.y+1, r.y+r.h-2);
      if(tiles[ly][lx] === TILE.FLOOR) tiles[ly][lx] = TILE.LAVA;
    }
  }

  // Traps
  for(const r of rooms.slice(1)) {
    if(rng.bool(0.2)) {
      const tx = rng.int(r.x+1, r.x+r.w-2);
      const ty = rng.int(r.y+1, r.y+r.h-2);
      if(tiles[ty][tx] === TILE.FLOOR) {
        tiles[ty][tx] = TILE.TRAP;
      }
    }
  }

  // Place items (fewer than main dungeon — branches are combat focused)
  for(let i=1; i<rooms.length; i++) {
    const r = rooms[i];
    if(rng.bool(0.4)) {
      const item = generateItem(G.floor + branchFloor);
      item.x = rng.int(r.x+1, r.x+r.w-2);
      item.y = rng.int(r.y+1, r.y+r.h-2);
      items.push(item);
    }
    if(rng.bool(0.3)) {
      items.push({ type:'gold', glyph:'$', color:'#ffd700', name:'Gold', amount:rng.int(20, 80), x:rng.int(r.x+1,r.x+r.w-2), y:rng.int(r.y+1,r.y+r.h-2) });
    }
  }

  // Place branch monsters
  const branchMonsters = branch.monsterKeys.map(k => [k, MONSTER_TEMPLATES[k]]).filter(([k,v]) => v);
  for(let i=1; i<rooms.length; i++) {
    const r = rooms[i];
    const num = rng.int(1, 2 + branchFloor);
    for(let j=0; j<num; j++) {
      if(branchMonsters.length === 0) break;
      const [mk, mv] = rng.pick(branchMonsters);
      const mx = rng.int(r.x+1, r.x+r.w-2);
      const my = rng.int(r.y+1, r.y+r.h-2);
      if((tiles[my][mx] === TILE.FLOOR || tiles[my][mx] === TILE.CORRIDOR) &&
         !monsters.some(m => m.x===mx && m.y===my)) {
        const m = createMonster(mk, mv, mx, my, G.floor + branchFloor);
        // Scale monster HP with branch depth
        const depthScale = 1 + branchFloor * 0.15;
        m.hp = Math.floor(m.hp * depthScale);
        m.maxHp = Math.floor(m.maxHp * depthScale);
        monsters.push(m);
      }
    }
  }

  // Boss on last floor
  if(isLastFloor && branch.boss) {
    const bossTemplate = MONSTER_TEMPLATES[branch.boss];
    if(bossTemplate) {
      const bm = createMonster(branch.boss, bossTemplate, ex, ey, G.floor + branchFloor, true);
      monsters.push(bm);
    }

    // Place rune item near boss
    if(branch.runeKey && ITEM_TEMPLATES[branch.runeKey]) {
      const runeItem = { ...ITEM_TEMPLATES[branch.runeKey], x: ex-1, y: ey, id: `rune_${branch.runeKey}` };
      items.push(runeItem);
    }
  }

  return {
    tiles, rooms, items, monsters, npcs: [],
    startPos: [sx, sy],
    explored: new Set(),
    altarGods: {},
    branch: branchKey,
    branchFloor: branchFloor
  };
}
