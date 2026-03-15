// ─── ALTAR / GOD ASSIGNMENT ─────────────────────────────────
// Each game shuffles which god is at which altar
let FLOOR_ALTAR_GODS = {};

function assignAltarGods() {
  const godKeys = Object.keys(GODS);
  const shuffled = rng.shuffle(godKeys);
  FLOOR_ALTAR_GODS = {};
  // Assign gods to floors 1-16, one per altar tile
  shuffled.forEach((gk, i) => {
    FLOOR_ALTAR_GODS[i + 1] = gk;
  });
  // Also some floors may have no altar god (just a generic shrine)
}

// ─── MAP GENERATION (moved to mapgen.js) ────────────────────

// ─── GHOST SYSTEM ────────────────────────────────────────────
let GHOST_GRAVEYARD = JSON.parse(localStorage.getItem('baal_ghosts') || '[]');

function saveGhost(player) {
  const ghost = {
    name: player.name,
    race: player.race,
    cls: player.cls,
    floor: G.floor,
    level: player.level,
    // Save equipped items for ghost to use
    weapon: player.equipped.weapon ? player.equipped.weapon.name : null,
    armor: player.equipped.body ? player.equipped.body.name : null,
    killedBy: G.lastKilledBy || 'unknown',
    date: new Date().toLocaleDateString()
  };
  GHOST_GRAVEYARD.push(ghost);
  if(GHOST_GRAVEYARD.length > 20) GHOST_GRAVEYARD.shift();
  try { localStorage.setItem('baal_ghosts', JSON.stringify(GHOST_GRAVEYARD)); } catch(e) {}
}

function spawnGhost(floor, x, y) {
  const candidates = GHOST_GRAVEYARD.filter(g => Math.abs(g.floor - floor) <= 2);
  if(candidates.length === 0) return null;
  const g = rng.pick(candidates);
  const level = g.level || 1;
  return {
    key: 'ghost',
    name: `Ghost of ${g.name}`,
    sym: 'G', color: '#88aaff',
    x, y,
    hp: rng.dice(level, 8, level * 2),
    maxHp: rng.dice(level, 8, level * 2),
    ac: 12 + level,
    atk: [[level, 6, Math.floor(level/2)]],
    xp: 50 * level,
    undead: true,
    drainLife: Math.floor(level/3),
    isGhost: true,
    ghostData: g,
    confused:0, paralyzed:0, sleeping:0, frightened:0, poisoned:0,
    alerted: true,
    id: `ghost_${Date.now()}`
  };
}

// ─── GAME STATE ──────────────────────────────────────────────
let G = {}; // Global game state

function initPlayer(race, cls, name) {
  const raceData = RACES[race];
  const classData = CLASSES[cls];
  const stats = { str:10, dex:10, con:10, int:10, wis:10, cha:10 };
  
  // Apply race bonuses
  for(const [stat, val] of Object.entries(raceData.bonuses)) {
    stats[stat] += val;
  }
  
  // Class stat bumps
  if(cls === 'fightingman') { stats.str += 2; stats.con += 1; }
  if(cls === 'cleric') { stats.wis += 2; stats.con += 1; }
  if(cls === 'magicuser') { stats.int += 2; stats.wis += 1; }
  if(cls === 'thief')   { stats.dex += 3; stats.str += 1; }
  if(cls === 'druid')   { stats.wis += 2; stats.con += 1; }
  if(cls === 'ranger')  { stats.dex += 2; stats.str += 1; }
  if(cls === 'warlock') { stats.cha += 2; stats.int += 1; }
  
  // Roll extra stats (3d6 for each, keep if better)
  for(const stat of Object.keys(stats)) {
    const roll = rng.dice(3, 6);
    if(roll > stats[stat]) stats[stat] = Math.min(stats[stat] + rng.int(0, 2), 20);
  }
  
  const maxHp = rng.dice(1, classData.hpDice, stats.con - 10) + classData.hpDice;
  const maxMp = classData.mpBase + (stats.int - 10) * 2 + (stats.wis - 10);
  
  const spells = [...classData.spells.slice(0, 3)]; // Start with first few
  
  // Starting equipment
  const startItems = [];
  startItems.push({ ...ITEM_TEMPLATES.ration, id:'start_food1' });
  startItems.push({ ...ITEM_TEMPLATES.ration, id:'start_food2' });
  if(cls === 'fightingman') {
    startItems.push({ ...ITEM_TEMPLATES.shortsword, id:'start_wpn' });
    startItems.push({ ...ITEM_TEMPLATES.leather, id:'start_arm' });
    startItems.push({ ...ITEM_TEMPLATES.shield, id:'start_sh' });
    startItems.push({ ...ITEM_TEMPLATES.shortbow, id:'start_bow' });
    startItems.push({ ...ITEM_TEMPLATES.arrows, id:'start_arrows' });
  } else if(cls === 'cleric') {
    startItems.push({ ...ITEM_TEMPLATES.mace, id:'start_wpn' });
    startItems.push({ ...ITEM_TEMPLATES.leather, id:'start_arm' });
    startItems.push({ ...ITEM_TEMPLATES.shield, id:'start_sh' });
    startItems.push({ ...ITEM_TEMPLATES.potion_heal, id:'start_pot' });
  } else if(cls === 'magicuser') {
    startItems.push({ ...ITEM_TEMPLATES.dagger, id:'start_wpn' });
    startItems.push({ ...ITEM_TEMPLATES.robes, id:'start_arm' });
    startItems.push({ ...ITEM_TEMPLATES.potion_mana, id:'start_pot1' });
    startItems.push({ ...ITEM_TEMPLATES.potion_mana, id:'start_pot2' });
    startItems.push({ ...ITEM_TEMPLATES.scroll_id, id:'start_scroll' });
  } else if(cls === 'thief') {
    startItems.push({ ...ITEM_TEMPLATES.dagger, id:'start_wpn' });
    startItems.push({ ...ITEM_TEMPLATES.leather, id:'start_arm' });
    startItems.push({ ...ITEM_TEMPLATES.dagger, id:'start_wpn2' });
  } else if(cls === 'druid') {
    startItems.push({ ...ITEM_TEMPLATES.staff, id:'start_wpn' });
    startItems.push({ ...ITEM_TEMPLATES.leather, id:'start_arm' });
    startItems.push({ ...ITEM_TEMPLATES.ration, id:'start_food3' });
  } else if(cls === 'ranger') {
    startItems.push({ ...ITEM_TEMPLATES.shortbow, id:'start_bow' });
    startItems.push({ ...ITEM_TEMPLATES.arrows, id:'start_arrows' });
    startItems.push({ ...ITEM_TEMPLATES.arrows, id:'start_arrows2' });
    startItems.push({ ...ITEM_TEMPLATES.leather, id:'start_arm' });
    startItems.push({ ...ITEM_TEMPLATES.dagger, id:'start_wpn' });
  } else if(cls === 'warlock') {
    startItems.push({ ...ITEM_TEMPLATES.dagger, id:'start_wpn' });
    startItems.push({ ...ITEM_TEMPLATES.potion_mana, id:'start_pot1' });
    startItems.push({ ...ITEM_TEMPLATES.potion_mana, id:'start_pot2' });
  }
  
  // Race starting item
  if(race === 'halfling') startItems.push({ ...ITEM_TEMPLATES.sling, id:'race_wpn' });
  if(race === 'lizardman') startItems.push({ ...ITEM_TEMPLATES.meat, id:'race_food' });
  
  const player = {
    name, race, cls,
    level: 1, xp: 0,
    stats,
    hp: maxHp, maxHp,
    mp: maxMp, maxMp,
    baseAC: 10,
    hunger: 1000, maxHunger: 1000,
    gold: raceData.startGold,
    inventory: startItems,
    equipped: {
      weapon: null, offhand: null, body: null, head: null,
      ring1: null, ring2: null, neck: null, cloak: null, boots: null, ammo: null
    },
    spells,
    knownSpells: [...classData.spells],
    god: null, piety: 0,
    alignment: 0, // -100 (Chaotic) to +100 (Lawful), starts Neutral
    status: {}, // temp effects
    passives: [...raceData.passives, ...classData.abilities],
    turns: 0,
    autoExplore: false,
    companions: [],
    rageActive: false,
    steadyAim: false,
    blessActive: false,
  };
  
  // Cleric starts with a chosen faith (handled in char creation step or default)
  if(cls === 'cleric' && G._startingGod) {
    player.god = G._startingGod;
    player.piety = 10;
    log(`You begin your journey in service of ${GODS[player.god].name}.`, 'god');
  }

  // Ranger starts with wolf companion
  if(cls === 'ranger') {
    player.companions.push({
      id: 'ranger_wolf', name: 'Wolf', sym: 'd', color: '#aa8844',
      cls: 'animal', hp: 15, maxHp: 15, atk: [[1,6,2]],
      x: 0, y: 0, companion: true, animal: true, stayPut: false,
      facing: 'd', animState: 'idle', compLevel: 1, xp: 0
    });
  }

  // Warlock starts with pledged god
  if(cls === 'warlock' && G._startingGod) {
    player.god = G._startingGod;
    player.piety = 10;
  }
  
  player.mutations = [];
  
  // Auto-equip starting items
  autoEquipStarting(player);
  
  return player;
}

function autoEquipStarting(player) {
  for(const item of player.inventory) {
    if(item.slot && !player.equipped[item.slot]) {
      if(item.slot === 'ring') {
        if(!player.equipped.ring1) player.equipped.ring1 = item;
        else if(!player.equipped.ring2) player.equipped.ring2 = item;
      } else {
        player.equipped[item.slot] = item;
      }
    }
  }
}

// ─── GAME LOOP ───────────────────────────────────────────────
let G_initialized = false;

function startNewGame(race, cls, name) {
  assignAltarGods();
  assignItemAppearances();
  G = {
    floor: 1,
    player: initPlayer(race, cls, name),
    level: null,
    turn: 0,
    messages: [],
    autoExploreActive: false,
    targeting: false,
    targetX: 0, targetY: 0,
    targetCallback: null,
    selectedInvItem: null,
    killedBosses: [],
    joinedNPCs: [],
    lastKilledBy: null,
    gameOver: false,
    won: false,
    shopItems: [],
    godFledFrom: null,
    ghostSpawnChance: 0.15 + (GHOST_GRAVEYARD.length * 0.02),
    altarGods: {},      // `x,y` -> godKey for current level
    seenMonsters: new Set(),
    seenItems: new Set(),
    lookMode: false,
    lookX: 0, lookY: 0,
    _pendingAltarGods: {},
    noiseTimer: 0,
    templeSpawned: false,
    restingActive: false,
    consumeMenuOpen: false,
    identifyMenuOpen: false,
    alignmentOpen: false,
    debugOpen: false,
    attackMode: false,
    reachMode: false,
    ascending: false,   // true once Rune is picked up — player must escape to surface
    foundUniques: new Set(),
    branch: null,
    branchFloor: 0,
    branchReturnFloor: 0,
    branchReturnPos: null,
    mainDungeonLevel: null,
    completedBranches: [],
    collectedRunes: [],
  };

  G.level = generateLevel(G.floor);
  const [sx, sy] = G.level.startPos;
  G.player.x = sx;
  G.player.y = sy;

  computeFOV();

  log(`Welcome to BAAL, ${name} the ${RACES[race].name} ${CLASSES[cls].name}!`, 'system');
  log('Descend sixteen floors, claim the Rune of Baal, and escape alive.', 'info');
  log('Press ? for help.', 'info');
  
  renderAll();
}

// ─── FOV ─────────────────────────────────────────────────────
function computeFOV() {
  const { player, level } = G;
  let radius = 8 + (player.passives.includes('devil_sight') ? 4 : 0);
  // Mutation: extra eyes
  const eyeMut = player.mutations?.find(m => m.key === 'extra_eyes');
  if(eyeMut) radius += eyeMut.visBonus || 0;
  // Floor theme FOV reduction (crypt darkness)
  const fovTheme = getFloorTheme(G.floor);
  if(fovTheme.fovReduction) radius -= fovTheme.fovReduction;
  // Blindness overrides — can only see adjacent tiles
  if(player.status.blinded > 0) radius = 1;
  
  const prevVisible = level.visible || new Set();
  level.visible = new Set();
  
  // Telepathy mutation — sense nearby monsters through walls
  const hasTelepath = player.mutations?.find(m => m.key === 'telepathy');
  
  // Simple raycasting FOV
  for(let angle=0; angle<360; angle+=1) {
    const rad = angle * Math.PI / 180;
    let rx = player.x + 0.5;
    let ry = player.y + 0.5;
    const dx = Math.cos(rad) * 0.3;
    const dy = Math.sin(rad) * 0.3;
    
    for(let i=0; i<radius/0.3; i++) {
      const tx = Math.floor(rx);
      const ty = Math.floor(ry);
      if(tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) break;
      level.visible.add(`${tx},${ty}`);
      level.explored.add(`${tx},${ty}`);
      const fovTile = level.tiles[ty][tx];
      if(fovTile === TILE.WALL || fovTile === TILE.DOOR) break;
      rx += dx; ry += dy;
    }
  }
  
  // Detect Monsters spell — add all monster tiles to visible set
  if(player.status.detect_monsters > 0) {
    for(const m of level.monsters) level.visible.add(`${m.x},${m.y}`);
  }

  // Obsidian Mirror — permanent monster detection
  if(player.permanentDetect) {
    for(const m of level.monsters) level.visible.add(`${m.x},${m.y}`);
  }

  // Notify on newly visible monsters
  if(G.seenMonsters) {
    for(const m of level.monsters) {
      const k = `${m.x},${m.y}`;
      if(level.visible.has(k) && !G.seenMonsters.has(m.id)) {
        G.seenMonsters.add(m.id);
        const danger = m.isBoss ? 'BOSS! Extremely dangerous!' : 
                       m.xp >= 200 ? 'Very dangerous.' : m.xp >= 50 ? 'Dangerous.' : 'Manageable.';
        log(`You see ${m.name}. ${danger}`, 'warning');
      }
    }
  }
  
  // Notify on newly visible items
  if(G.seenItems) {
    for(const item of level.items) {
      if(item.hidden || item.type === 'trap') continue;
      const k = `${item.x},${item.y}`;
      const iid = item.id || k;
      if(level.visible.has(k) && !G.seenItems.has(iid)) {
        G.seenItems.add(iid);
        if(item.type === 'gold') log(`You spot ${item.amount} gold pieces.`, 'loot');
        else log(`You see: ${getItemDisplayName(item)}.`, 'loot');
      }
    }
  }
}

// ─── ALIGNMENT ──────────────────────────────────────────────
function getAlignmentLabel(score) {
  if(score >= 51) return { label: 'Lawful', color: '#44ccff' };
  if(score >= 21) return { label: 'Somewhat Lawful', color: '#88aacc' };
  if(score >= -20) return { label: 'Neutral', color: '#aaaaaa' };
  if(score >= -50) return { label: 'Somewhat Chaotic', color: '#cc8844' };
  return { label: 'Chaotic', color: '#ff4444' };
}

function getAlignmentFaction(score) {
  if(score >= 21) return 'lawful';
  if(score <= -21) return 'chaotic';
  return 'neutral';
}

function shiftAlignment(amount, reason) {
  const p = G.player;
  const old = p.alignment;
  p.alignment = Math.max(-100, Math.min(100, p.alignment + amount));
  if(p.alignment !== old) {
    const { label } = getAlignmentLabel(p.alignment);
    log(`Your alignment shifts toward ${amount > 0 ? 'Law' : 'Chaos'}: ${label} (${reason})`, 'info');
  }
}

function isMonsterNeutralToPlayer(monster) {
  if(!monster.faction || monster.isBoss || monster.provoked) return false;
  const playerFaction = getAlignmentFaction(G.player.alignment);
  return monster.faction === playerFaction;
}

// ─── STATS/CALCULATIONS ──────────────────────────────────────
function computeAC(player) {
  let ac = player.baseAC;
  const dexMod = Math.floor((player.stats.dex - 10) / 2);
  ac += dexMod;
  
  for(const slot of Object.values(player.equipped)) {
    if(slot && slot.ac) ac += slot.ac + (slot.enchant || 0);
  }
  
  if(player.passives.includes('natural_armor')) ac += 3;
  if(player.status.bless) ac += 2;
  if(player.status.sanctuary) ac += 5;
  if(player.status.arcane_shield) ac += 4;
  if(player.status.bark_skin) ac += 3;
  if(player.status.corroded) ac -= (player.status.corroded_amount || 2);
  
  // Mutation AC bonuses
  if(player.mutations) {
    for(const m of player.mutations) {
      if(m.acBonus) ac += m.acBonus;
    }
  }
  
  return ac;
}

function getAttackBonus(player) {
  let bonus = Math.floor((player.stats.str - 10) / 2);
  bonus += player.level - 1;
  
  const wpn = player.equipped.weapon;
  if(wpn && wpn.enchant) bonus += wpn.enchant;
  if(player.cls === 'fightingman') bonus += player.level >= 6 ? 2 : 1;
  if(player.status.bless) bonus += 2;
  if(player.rageActive) bonus += 3;
  
  return bonus;
}

function getDamageBonus(player) {
  const wpn = player.equipped.weapon;
  let bonus = wpn?.noStrBonus ? 0 : Math.floor((player.stats.str - 10) / 2);
  if(player.cls === 'fightingman') bonus += Math.floor(player.level / 3);
  if(player.rageActive) bonus += 3;
  if(wpn && wpn.enchant) bonus += wpn.enchant;
  return bonus;
}

function getWeaponDamage(player) {
  const wpn = player.equipped.weapon;
  if(!wpn || wpn.ranged) {
    // Unarmed or natural attack
    if(player.passives.includes('claw_attack')) return [1, 6, 0];
    return [1, 3, 0];
  }
  return wpn.dmg || [1, 4, 0];
}

function getXPNeeded(player, lv) {
  const lvl = lv !== undefined ? lv : player.level;
  const table = CLASSES[player.cls].xpTable;
  if(lvl >= table.length) return table[table.length-1];
  return table[lvl] || 0;
}

function gainXP(amount) {
  const p = G.player;
  if(p.passives.includes('fast_learner')) amount = Math.floor(amount * 1.15);
  p.xp += amount;
  
  while(p.level < 16 && p.xp >= getXPNeeded(p)) {
    levelUp(p);
  }
}

function levelUp(player) {
  player.level++;
  const cls = CLASSES[player.cls];
  const hpGain = rng.dice(1, cls.hpDice, Math.floor((player.stats.con-10)/2));
  const mpGain = cls.mpPerLevel + Math.floor((player.stats.int-10)/2) + Math.floor((player.stats.wis-10)/2);
  
  player.maxHp += hpGain;
  player.hp = Math.min(player.hp + hpGain, player.maxHp);
  player.maxMp += mpGain;
  player.mp = Math.min(player.mp + mpGain, player.maxMp);
  
  // Learn new spell every 2 levels for casters
  if(player.cls !== 'fightingman' && player.level % 2 === 0) {
    const allSpells = player.knownSpells;
    const unlearned = allSpells.filter(s => !player.spells.includes(s));
    if(unlearned.length > 0) {
      const newSpell = rng.pick(unlearned);
      player.spells.push(newSpell);
      log(`You have learned ${SPELL_DATA[newSpell]?.name || newSpell}!`, 'good');
    }
  }
  
  log(`*** LEVEL UP! You are now level ${player.level}! +${hpGain} HP, +${mpGain} MP ***`, 'good');
  flash(`LEVEL ${player.level}!`);
}

// ─── MOVEMENT & ACTIONS ──────────────────────────────────────
function setFacing(entity, dx, dy) {
  if(dx > 0) entity.facing = 'r';
  else if(dx < 0) entity.facing = 'l';
  else if(dy > 0) entity.facing = 'd';
  else if(dy < 0) entity.facing = 'u';
}

function tryMove(dx, dy) {
  G._lastMoveDir = [dx, dy];
  const { player, level } = G;
  setFacing(player, dx, dy);
  player.animState = 'walk';

  // Camouflage breaks on movement
  if(player.status.camouflage && (dx !== 0 || dy !== 0)) {
    delete player.status.camouflage;
    delete player.status.invisible;
    log('Your camouflage breaks as you move.', 'info');
  }

  // Weapon speed debt: slow weapons cost a turn after attacking
  if(player.status.speed_debt > 0) {
    delete player.status.speed_debt;
    log('You recover from your heavy swing.', 'info');
    endTurn();
    return true;
  }

  const nx = player.x + dx;
  const ny = player.y + dy;

  if(nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return false;
  
  // Check for monster
  const monster = level.monsters.find(m => m.x===nx && m.y===ny);
  if(monster) {
    // Mimic ambush — reveal and surprise attack the player
    if(monster.disguised) {
      monster.disguised = false;
      log(`The ${monster.disguiseName || 'item'} was a Mimic!`, 'warning');
      monster.alerted = true;
      monsterAttack(monster);
      return true;
    }
    if(monster.neutral) {
      // Swap places with neutral monsters like companions
      monster.x = player.x;
      monster.y = player.y;
      player.x = nx;
      player.y = ny;
      log(`You swap places with the ${monster.name}.`, 'info');
      autoPickup(nx, ny);
      return true;
    }
    attackMonster(monster);
    return true;
  }
  
  // Check for NPC
  const npc = level.npcs?.find(n => n.x===nx && n.y===ny && !n.companion);
  if(npc) {
    if(npc.hostile) {
      // Attack hostile NPC — use same combat math as attackMonster
      const attackBonus = getAttackBonus(player);
      const roll = rng.dice(1, 20, attackBonus);
      const npcAC = 10 + Math.floor((npc.hp_base || 20) / 10);
      const hit = roll >= npcAC;
      if(hit) {
        const [dn, dd, db] = getWeaponDamage(player);
        const dmg = rng.dice(dn, dd, getDamageBonus(player) + db);
        npc.hp -= dmg;
        log(`You hit ${npc.name} for ${dmg} damage!`, 'combat');
        if(npc.hp <= 0) {
          log(`${npc.name} is slain!`, 'good');
          level.npcs = level.npcs.filter(n => n !== npc);
          gainXP(Math.floor((npc.hp_base || 20) * 2));
        }
      } else {
        log(`You swing at ${npc.name} but miss!`, 'combat');
      }
      return true;
    }
    interactNPC(npc);
    return true;
  }

  // Check for companion — swap places
  const comp = player.companions.find(c => c.x===nx && c.y===ny);
  if(comp) {
    comp.x = player.x;
    comp.y = player.y;
    player.x = nx;
    player.y = ny;
    log(`You swap places with ${comp.name}.`, 'info');
    autoPickup(nx, ny);
    return true;
  }

  const tile = level.tiles[ny][nx];
  
  if(tile === TILE.WALL) return false;
  
  if(tile === TILE.DOOR) {
    level.tiles[ny][nx] = TILE.FLOOR;
    log('You open the door.', 'info');
    player.x = nx; player.y = ny;
    return true;
  }
  
  if(tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) {
    player.x = nx; player.y = ny;
    autoPickup(nx, ny);
    return true;
  }
  
  if(tile === TILE.WATER) {
    if(!player.passives.includes('amphibious') && !player.passives.includes('nature_walk')) {
      log('The water slows you.', 'info');
    }
    player.x = nx; player.y = ny;
    return true;
  }
  
  if(tile === TILE.LAVA) {
    if(!player.passives.includes('fire_resist')) {
      const dmg = rng.dice(2, 6, 0);
      player.hp -= dmg;
      log(`The lava burns you for ${dmg} damage!`, 'combat');
      if(player.hp <= 0) { die('the lava'); return true; }
    } else {
      log('The lava flows harmlessly around you.', 'good');
    }
    player.x = nx; player.y = ny;
    autoPickup(nx, ny);
    return true;
  }

  if(tile === TILE.ALTAR) {
    player.x = nx; player.y = ny;
    autoPickup(nx, ny);
    const altarKey = `${nx},${ny}`;
    const altarGodKey = G.level.altarGods?.[altarKey];
    if(altarGodKey && !player.god) {
      const ag = GODS[altarGodKey];
      log(`You stand before the altar of ${ag.name} (${ag.domain}).`, 'god');
      log('Press G for more info or to pledge your faith.', 'god');
    } else if(altarGodKey && player.god && player.god !== altarGodKey) {
      log(`This altar belongs to ${GODS[altarGodKey].name}. Your own god watches.`, 'god');
    } else if(player.god) {
      prayGod();
    } else {
      log('An ancient altar. No god claims it. Press G to offer a prayer.', 'god');
    }
    return true;
  }
  
  if(tile === TILE.SHOP) {
    // Just walk onto shop tile — open with > key like stairs
    player.x = nx; player.y = ny;
    log('You stand before the shop. Press > to enter.', 'info');
    autoPickup(nx, ny);
    return true;
  }
  
  player.x = nx;
  player.y = ny;
  
  // Check for trap
  checkTrap(nx, ny);
  
  // Auto-pickup
  autoPickup(nx, ny);
  
  return true;
}

function checkTrap(x, y) {
  const trap = G.level.items.find(i => i.type==='trap' && i.x===x && i.y===y && !i.triggered);
  if(!trap) return;
  
  const p = G.player;
  
  // DEX-based auto-disarm chance (spotted before triggering)
  const dexMod = Math.floor((p.stats.dex - 10) / 2);
  const wisBonus = (p.stats.wis >= 14 || p.passives.includes('danger_sense')) ? 0.15 : 0;
  const disarmChance = Math.min(0.7, 0.1 + dexMod * 0.05 + wisBonus);
  if(rng.bool(disarmChance)) {
    trap.triggered = true;
    trap.hidden = false; // Reveal on map
    trap.disarmed = true;
    trap.color = '#446644';
    log(`Your quick reflexes disarm the ${trap.subtype}!`, 'good');
    return;
  }

  // WIS detection (spot but don't disarm — still avoidable)
  if(p.stats.wis >= 14 || p.passives.includes('danger_sense')) {
    if(rng.bool(0.4)) {
      log(`You spot a ${trap.subtype} and carefully step around it.`, 'good');
      return;
    }
  }
  
  trap.triggered = true;
  trap.hidden = false; // Reveal triggered trap on map
  log(`You triggered a ${trap.subtype}!`, 'warning');
  
  switch(trap.subtype) {
    case 'dart_trap':
      const dmg = rng.dice(1, 6, 0);
      p.hp -= dmg;
      log(`A dart pierces you for ${dmg} damage!`, 'combat');
      break;
    case 'pit_trap':
      const fall = rng.dice(2, 6, 0);
      p.hp -= fall;
      log(`You fall into a pit! ${fall} damage.`, 'combat');
      break;
    case 'alarm_trap':
      log('An alarm rings! Nearby monsters are alerted!', 'warning');
      G.level.monsters.forEach(m => m.alerted = true);
      break;
    case 'poison_gas':
      if(!p.passives.includes('poison_resist')) {
        p.status.poisoned = 10;
        log('Poisonous gas engulfs you!', 'warning');
      }
      break;
    case 'magic_trap':
      const effects = ['teleport_player', 'drain_mp', 'confusion'];
      const eff = rng.pick(effects);
      if(eff === 'teleport_player') teleportPlayer();
      else if(eff === 'drain_mp') { p.mp = Math.max(0, p.mp - rng.int(5, 15)); log('The trap drains your mana!', 'warning'); }
      else { p.status.confused = 5; log('The trap confuses you!', 'warning'); }
      break;
  }
  
  if(p.hp <= 0) die(`a ${trap.subtype}`);
}

function shouldAutoPickup(item) {
  if(item.type === 'gold') return true;
  if(item.type === 'food' || item.type === 'ammo' || item.type === 'thrown') return true;
  if(item.type === 'quest_item' || item.type === 'rune_artifact') return true;
  if(item.type === 'potion') {
    // Skip if identified as bad
    const knownBad = ['confuse_self','poison_self','blind_self','paralyze_self','weaken_self','amnesia','burn_self','berserk'];
    if(GAME_IDENTIFIED_POTIONS.has(item.effect) && knownBad.includes(item.effect)) return false;
    return true;
  }
  if(item.type === 'scroll') {
    const knownBad = ['curse_items'];
    if(GAME_IDENTIFIED_SCROLLS.has(item.effect) && knownBad.includes(item.effect)) return false;
    return true;
  }
  if(item.type === 'ring') {
    const knownBad = ['ring_doom'];
    if(item.templateKey && GAME_IDENTIFIED_RINGS.has(item.templateKey) && knownBad.includes(item.templateKey)) return false;
    return true;
  }
  if(item.type === 'amulet') {
    const knownBad = ['amulet_curse'];
    if(item.templateKey && GAME_IDENTIFIED_AMULETS.has(item.templateKey) && knownBad.includes(item.templateKey)) return false;
    return true;
  }
  return false;
}

function autoPickup(x, y) {
  const p = G.player;
  const items = G.level.items.filter(i => i.x===x && i.y===y && i.type !== 'trap');
  
  for(const item of items) {
    if(!shouldAutoPickup(item)) continue;

    if(item.type === 'gold') {
      p.gold += item.amount;
      log(`You pick up ${item.amount} gold.`, 'loot');
      G.level.items = G.level.items.filter(i => i !== item);
      gainPiety('collecting_gold', 1);
      continue;
    }

    // Pick up without identifying
    const dname = getItemDisplayName(item);
    p.inventory.push(item);
    log(`You pick up ${dname}.`, 'loot');
    G.level.items = G.level.items.filter(i => i !== item);
    checkRunePickup(item);
  }

  // Log remaining items on tile that weren't auto-picked up
  const remaining = G.level.items.filter(i => i.x===x && i.y===y && i.type !== 'trap' && !i.hidden);
  if(remaining.length > 0) {
    const names = remaining.map(i => getItemDisplayName(i)).join(', ');
    log(`You are standing over: ${names}. Press , to pick up.`, 'loot');
  }
}

function checkRunePickup(item) {
  if(item.type === 'quest_item' && !G.ascending) {
    G.ascending = true;
    log('The Rune pulses with ancient power. The dungeon trembles around you!', 'warning');
    log('You must escape to the surface! Ascend all sixteen floors to freedom!', 'system');
    flash('ESCAPE WITH THE RUNE!');
  }
  // Rune artifact pickup (branch runes)
  if(item.type === 'rune_artifact') {
    G.collectedRunes = G.collectedRunes || [];
    if(!G.collectedRunes.includes(item.name)) {
      G.collectedRunes.push(item.name);
      applyRuneEffect(item);
    }
  }
}

function pickupItems() {
  const p = G.player;
  const allItems = G.level.items.filter(i => i.x===p.x && i.y===p.y && i.type !== 'trap');

  if(allItems.length === 0) { log('Nothing to pick up here.', 'info'); return; }

  // Always auto-grab gold silently first
  const gold = allItems.filter(i => i.type === 'gold');
  for(const g of gold) {
    p.gold += g.amount;
    log(`You pick up ${g.amount} gold.`, 'loot');
    G.level.items = G.level.items.filter(i => i !== g);
  }

  const pickable = G.level.items.filter(i => i.x===p.x && i.y===p.y && i.type !== 'trap');

  if(pickable.length === 0) { endTurn(); return; }

  if(pickable.length === 1) {
    // Single item — pick up silently
    const item = pickable[0];
    p.inventory.push(item);
    log(`You pick up ${getItemDisplayName(item)}.`, 'loot');
    G.level.items = G.level.items.filter(i => i !== item);
    checkRunePickup(item);
    endTurn();
    return;
  }

  // Multiple items — show selection modal
  openPickupModal(pickable);
}

function openPickupModal(items) {
  let html = `<div style="font-family:'VT323',monospace;padding:10px;">
    <h2 style="color:var(--amber);font-size:26px;margin-bottom:10px;">PICK UP WHAT?</h2>`;
  items.forEach((item, i) => {
    const key = String.fromCharCode(97 + i);
    const dname = getItemDisplayName(item);
    // Store item index in level.items via a data index
    html += `<div style="padding:5px 8px;cursor:pointer;font-size:18px;border-bottom:1px solid var(--border);" onclick="pickupModalPick(${i})">
      <span style="color:var(--amber)">${key})</span>
      <span style="color:${item.color||'var(--white)'};margin-left:6px;">${item.glyph||'?'} ${dname}</span>
    </div>`;
  });
  html += `<div style="padding:5px 8px;cursor:pointer;font-size:18px;border-bottom:1px solid var(--border);" onclick="pickupModalAll()">
    <span style="color:var(--amber)">*)</span>
    <span style="color:var(--gray);margin-left:6px;">Pick up all</span>
  </div>`;
  html += `<button class="menu-btn" onclick="closePickupModal()" style="margin-top:10px">Cancel (ESC)</button></div>`;
  
  G.pickupModalItems = items;
  G.pickupModalOpen = true;
  const modal = document.getElementById('modal');
  document.getElementById('modal-content').innerHTML = html;
  modal.style.display = 'flex';
}

window.pickupModalPick = function(idx) {
  const item = G.pickupModalItems?.[idx];
  closePickupModal();
  if(!item) return;
  G.player.inventory.push(item);
  log(`You pick up ${getItemDisplayName(item)}.`, 'loot');
  G.level.items = G.level.items.filter(i => i !== item);
  checkRunePickup(item);
  endTurn();
};

window.pickupModalAll = function() {
  const items = [...(G.pickupModalItems || [])];
  closePickupModal();
  for(const item of items) {
    G.player.inventory.push(item);
    log(`You pick up ${getItemDisplayName(item)}.`, 'loot');
    G.level.items = G.level.items.filter(i => i !== item);
    checkRunePickup(item);
  }
  endTurn();
};

function closePickupModal() {
  G.pickupModalOpen = false;
  G.pickupModalItems = [];
  document.getElementById('modal').style.display = 'none';
}
window.closePickupModal = closePickupModal;

// ─── COMBAT ──────────────────────────────────────────────────

function reachAttack(dx, dy) {
  const { player, level } = G;
  const wpn = player.equipped.weapon;
  if(!wpn?.reach) {
    log('You need a reach weapon (spear, halberd) to lunge.', 'warning');
    return;
  }
  // Target is 2 tiles away in the chosen direction
  const tx = player.x + dx * 2;
  const ty = player.y + dy * 2;
  if(tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) { log('Nothing there.', 'info'); return; }
  // Check there's no wall blocking the path
  const midX = player.x + dx, midY = player.y + dy;
  if(level.tiles[midY]?.[midX] === TILE.WALL) { log('A wall blocks your lunge.', 'info'); return; }
  const monster = level.monsters.find(m => m.x === tx && m.y === ty);
  if(monster) {
    if(monster.neutral) { monster.neutral = false; monster.provoked = true; }
    log(`You lunge with your ${wpn.name}!`, 'combat');
    attackMonster(monster);
    endTurn();
  } else {
    log('Your lunge finds no target.', 'info');
  }
}

function forceAttack(dx, dy) {
  const { player, level } = G;
  const nx = player.x + dx;
  const ny = player.y + dy;

  if(nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) {
    log('You swing at nothing.', 'info');
    endTurn();
    return;
  }

  const tile = level.tiles[ny][nx];
  if(tile === TILE.WALL) {
    log('You strike the wall.', 'info');
    endTurn();
    return;
  }

  // Force-attack a monster (including neutral ones)
  const monster = level.monsters.find(m => m.x === nx && m.y === ny);
  if(monster) {
    if(monster.neutral) {
      monster.neutral = false;
      monster.provoked = true;
      log(`You attack the ${monster.name}!`, 'combat');
    }
    attackMonster(monster);
    endTurn();
    return;
  }

  // Force-attack a companion
  const comp = player.companions.find(c => c.x === nx && c.y === ny);
  if(comp) {
    const [dn, dd, db] = getWeaponDamage(player);
    const dmg = Math.max(1, rng.dice(dn, dd, getDamageBonus(player) + db));
    comp.hp -= dmg;
    log(`You strike ${comp.name} for ${dmg} damage!`, 'combat');
    if(comp.hp <= 0) {
      log(`${comp.name} falls!`, 'warning');
      player.companions = player.companions.filter(c2 => c2 !== comp);
    }
    endTurn();
    return;
  }

  // Force-attack an NPC
  const npc = level.npcs?.find(n => n.x === nx && n.y === ny);
  if(npc) {
    const attackBonus = getAttackBonus(player);
    const roll = rng.dice(1, 20, attackBonus);
    const npcAC = 10 + Math.floor((npc.hp_base || 20) / 10);
    if(roll >= npcAC) {
      const [dn, dd, db] = getWeaponDamage(player);
      const dmg = Math.max(1, rng.dice(dn, dd, getDamageBonus(player) + db));
      npc.hp -= dmg;
      log(`You hit ${npc.name} for ${dmg} damage!`, 'combat');
      npc.hostile = true;
      if(npc.hp <= 0) {
        log(`${npc.name} is slain!`, 'good');
        level.npcs = level.npcs.filter(n => n !== npc);
        gainXP(Math.floor((npc.hp_base || 20) * 2));
      }
    } else {
      log(`You swing at ${npc.name} but miss!`, 'combat');
      npc.hostile = true;
    }
    endTurn();
    return;
  }

  log('You swing at empty air.', 'info');
  endTurn();
}

function attackMonster(monster) {
  const p = G.player;
  p.animState = 'atk';
  if(typeof setFacing === 'function') setFacing(p, monster.x - p.x, monster.y - p.y);

  // Check confusion
  if(p.status.confused > 0 && rng.bool(0.3)) {
    log('You are confused and flail wildly!', 'warning');
    return;
  }
  
  const attackBonus = getAttackBonus(p);
  const roll = rng.dice(1, 20, attackBonus);
  const wpn = p.equipped.weapon;
  const effectiveAC = monster.ac - (wpn?.armorPierce || 0);

  let hit = roll >= effectiveAC - 10;
  const critThreshold = 19 - (wpn?.critBonus || 0);
  const crit = roll >= critThreshold;

  if(hit || crit) {
    const [dn, dd, db] = getWeaponDamage(p);
    let dmg = rng.dice(dn, dd, getDamageBonus(p) + db);
    if(monster.undead && wpn?.bonusVsUndead) dmg += wpn.bonusVsUndead;
    if(crit) dmg *= 2;
    if(p.status.power_strike) { dmg *= 2; delete p.status.power_strike; }
    if(p.cls === 'fightingman' && p.equipped.weapon?.name?.includes('Bow')) {
      dmg += Math.floor(p.stats.dex / 4); // DEX bonus for ranged
    }
    
    // Check for blessed weapon (from god)
    if(p.status.blessed_weapon) dmg += rng.dice(1, 6, 0);

    dmg = Math.max(1, dmg);
    monster.hp -= dmg;

    // Combat flash effect
    if(typeof addTileEffect === 'function') {
      addTileEffect(monster.x, monster.y, crit ? [255,255,100] : [255,80,60], crit ? 400 : 200);
    }

    let msg = crit ? `CRITICAL HIT! You strike ${monster.name} for ${dmg} damage!` : `You hit ${monster.name} for ${dmg} damage.`;
    log(msg, 'combat');
    
    gainPiety('kills', 0.5);
    gainPiety('honorable_combat', 0.3);

    // Unique weapon effects
    if(wpn?.coldDamage) {
      const cold = rng.dice(1, 4, 0);
      monster.hp -= cold;
      log(`Frost crackles for ${cold} additional cold damage!`, 'combat');
    }
    if(wpn?.slowOnHit && !monster.slowed) {
      monster.slowed = 5;
      monster.speed = (monster.speed || 1) * 0.5;
    }
    // Poison blade (thief ability)
    if(p.status.poison_blade > 0 && !monster.statusImmune) {
      monster.poisoned = rng.int(3, 6);
      p.status.poison_blade--;
      if(p.status.poison_blade <= 0) { delete p.status.poison_blade; log('The venom on your blade fades.', 'info'); }
    }
    // Player-inflicted status via weapon
    if(wpn?.statusOnHit && rng.bool(0.2)) {
      if(wpn.statusOnHit === 'poison' && !monster.statusImmune) {
        monster.poisoned = rng.int(3, 6);
        log(`Your ${wpn.name} poisons ${monster.name}!`, 'combat');
      }
      if(wpn.statusOnHit === 'slow' && !monster.slowed) {
        monster.slowed = 5;
        monster.speed = (monster.speed || 1) * 0.5;
        log(`Your ${wpn.name} staggers ${monster.name}!`, 'combat');
      }
    }
    if(wpn?.lifestealPct && dmg > 0) {
      const lheal = Math.max(1, Math.floor(dmg * wpn.lifestealPct));
      p.hp = Math.min(p.maxHp, p.hp + lheal);
    }
    if(wpn?.spellPowerBonus && p.status.spell_power_boost === undefined) {
      // Staff of the Magi passive: tracked via weapon, applied in castSpell
    }

    // Status effects from weapon
    if(p.status.sekhmet_frenzy && monster.hp <= 0) {
      const heal = rng.int(2, 6);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      log(`Sekhmet's blessing heals you for ${heal}!`, 'god');
    }
    
    if(monster.hp <= 0) {
      // Sword of Kas: drains HP on kill
      if(wpn?.hpDrainOnKill) {
        p.hp -= wpn.hpDrainOnKill;
        if(p.hp <= 0) { die('the Sword of Kas'); return; }
      }
      killMonster(monster);
      // Cleave: if weapon has cleave and we killed the target, hit an adjacent enemy for half damage
      if(wpn?.cleave) {
        const adj = G.level.monsters.find(m => m.hp > 0 && Math.abs(m.x - p.x) <= 1 && Math.abs(m.y - p.y) <= 1);
        if(adj) {
          const cleaveDmg = Math.max(1, Math.floor(dmg / 2));
          adj.hp -= cleaveDmg;
          log(`Your ${wpn.name} cleaves into ${adj.name} for ${cleaveDmg}!`, 'combat');
          if(adj.hp <= 0) killMonster(adj);
        }
      }
    }
  } else {
    log(`You miss ${monster.name}.`, 'combat');
  }

  // Weapon speed: slow weapons incur a speed debt (skip next turn)
  const hasAlwaysFast = p.equipped.boots?.alwaysFast;
  if(wpn?.speed === 'slow' && !hasAlwaysFast) {
    p.status.speed_debt = 1;
  }
  // Fast weapons (or Boots of the Zephyr) grant a bonus action
  if(wpn?.speed === 'fast' || hasAlwaysFast) {
    p._bonusAction = true;
  }
}

function monsterAttack(monster) {
  const p = G.player;
  const ac = computeAC(p);
  
  for(const atk of monster.atk) {
    const [dn, dd, db] = atk;
    const roll = rng.dice(1, 20, db);
    
    // Sanctuary check
    if(p.status.sanctuary && rng.bool(0.5)) {
      log(`${monster.name} is turned away by sanctuary!`, 'good');
      continue;
    }
    
    if(roll >= ac - 10) {
      let dmg = rng.dice(dn, dd, db);
      
      // Resistances
      if(monster.breathWeapon === 'fire' && p.passives.includes('fire_resist')) dmg = Math.floor(dmg/2);
      if(monster.breathWeapon === 'fire' && p.equipped.ring1?.fireResist) dmg = Math.floor(dmg*0.75);
      
      // God protection
      if(p.god === 'mithras' && p.status.divine_shield) dmg = Math.floor(dmg * 0.5);
      
      p.hp -= dmg;
      if(typeof addTileEffect === 'function') addTileEffect(p.x, p.y, [255,50,50], 250);
      log(`${monster.name} hits you for ${dmg} damage!`, 'combat');
      
      // Drain life
      if(monster.drainLife) {
        const drain = Math.min(monster.drainLife, rng.int(1, monster.drainLife));
        const stat = rng.pick(['str','con','dex']);
        p.stats[stat] -= drain;
        log(`${monster.name} drains your ${stat.toUpperCase()} by ${drain}!`, 'warning');
        if(p.stats[stat] <= 0) { die(`stat drain from ${monster.name}`); return; }
        gainPiety('taking_damage', 1);
      }
      
      // Status effects
      if(monster.statusAtk === 'paralyze' && rng.bool(0.3)) {
        p.status.paralyzed = rng.int(3, 8);
        log('You are paralyzed!', 'warning');
      }
      if(monster.statusAtk === 'poison' && !p.passives.includes('poison_resist') && !p.status.poison_resist && rng.bool(0.3)) {
        p.status.poisoned = rng.int(5, 15);
        log('You are poisoned!', 'warning');
      }
      if(monster.statusAtk === 'confusion' && rng.bool(0.25)) {
        p.status.confused = rng.int(3, 6);
        log('You are confused!', 'warning');
      }
      if(monster.statusAtk === 'corrode' && rng.bool(0.3)) {
        p.status.corroded = rng.int(10, 15);
        p.status.corroded_amount = 2;
        log('The acid corrodes your armor! AC reduced.', 'warning');
      }
      // Elemental on-hit effects
      if(monster.burnOnHit && rng.bool(0.4)) {
        p.status.burning = rng.int(3, 5);
        log(`${monster.name} sets you ablaze!`, 'warning');
      }
      if(monster.slowOnHit && rng.bool(0.4)) {
        p.status.slowed = rng.int(3, 5);
        log(`${monster.name}'s freezing touch slows you!`, 'warning');
      }
      // Hunger drain (Ammit soul-eating)
      if(monster.hungerDrain) {
        const drain = rng.int(30, 60);
        p.hunger = Math.max(0, p.hunger - drain);
        log(`${monster.name} devours a piece of your soul! You feel ravenous.`, 'warning');
      }
      if(monster.gaze === 'stone' && rng.bool(0.1)) {
        log('The petrifying gaze turns you to stone! You die.', 'death');
        die(`${monster.name}'s petrifying gaze`);
        return;
      }
      
      if(p.hp <= 0) { die(monster.name); return; }
      gainPiety('taking_damage', 1);

      // Aegis Shield reflect
      if(p.equipped.offhand?.reflectDamage && dmg > 0) {
        const reflected = Math.max(1, Math.floor(dmg * p.equipped.offhand.reflectDamage));
        monster.hp -= reflected;
        log(`The Aegis reflects ${reflected} damage back at ${monster.name}!`, 'combat');
        if(monster.hp <= 0) { killMonster(monster); return; }
      }
      // Ring of the Berserker auto-retaliate
      const retal = [p.equipped.ring1, p.equipped.ring2].find(r => r?.autoRetaliate);
      if(retal && Math.abs(monster.x - p.x) <= 1 && Math.abs(monster.y - p.y) <= 1) {
        const [rdn, rdd, rdb] = getWeaponDamage(p);
        const rdmg = Math.max(1, rng.dice(rdn, rdd, getDamageBonus(p) + rdb));
        monster.hp -= rdmg;
        log(`The ring burns with rage — you retaliate for ${rdmg}!`, 'combat');
        if(monster.hp <= 0) { killMonster(monster); return; }
      }

      // Mutation chance from certain monsters
      if(monster.statusAtk || monster.drainLife || monster.gaze || monster.breathWeapon) {
        if(rng.bool(0.04)) tryGrantMutation('monster_attack');
      }
    } else {
      log(`${monster.name} misses you.`, 'combat');
    }
  }
  
  // Breath weapon
  if(monster.breathWeapon && rng.bool(0.3)) {
    const bdmg = rng.dice(3, 6, 0);
    const fdmg = p.passives.includes('fire_resist') ? Math.floor(bdmg/2) : bdmg;
    p.hp -= fdmg;
    log(`${monster.name} breathes ${monster.breathWeapon} for ${fdmg} damage!`, 'combat');
    if(p.hp <= 0) { die(`${monster.name}'s breath`); return; }
  }
  
  // Monster spells
  if(monster.spells && rng.bool(0.25)) {
    const spell = rng.pick(monster.spells);
    castMonsterSpell(monster, spell);
  }
}

function killMonster(monster) {
  const p = G.player;
  if(typeof addTileEffect === 'function') addTileEffect(monster.x, monster.y, [255,255,255], 300);
  G.level.monsters = G.level.monsters.filter(m => m !== monster);

  log(`You kill ${monster.name}!`, 'good');
  gainXP(monster.xp);
  gainPiety('kills', 2);
  gainPiety('killing_evil', monster.undead ? 3 : 1);

  // Companion XP sharing — nearby companions gain XP
  for(const comp of p.companions) {
    const dist = Math.abs(comp.x - monster.x) + Math.abs(comp.y - monster.y);
    if(dist <= 5) {
      comp.xp = (comp.xp || 0) + monster.xp;
      const compLevelThresholds = [50, 150, 400, 1000, 2500, 5000];
      const compLevel = comp.compLevel || 1;
      if(compLevel <= compLevelThresholds.length && comp.xp >= compLevelThresholds[compLevel - 1]) {
        comp.compLevel = (comp.compLevel || 1) + 1;
        comp.maxHp = (comp.maxHp || comp.hp) + 5;
        comp.hp += 5;
        comp.atk[0][2] += 1; // +1 damage bonus
        log(`${comp.name} grows stronger! (Level ${comp.compLevel})`, 'good');
      }
    }
  }

  // Alignment shifts from faction kills
  if(monster.faction === 'lawful') shiftAlignment(-3, 'slaying a lawful creature');
  else if(monster.faction === 'chaotic') shiftAlignment(3, 'slaying a chaotic creature');
  if(monster.neutral) shiftAlignment(-5, 'betraying a neutral creature');

  // Split on death (Ochre Jelly)
  if(monster.splitOnDeath && monster.maxHp > 4) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    let spawned = 0;
    for(const [dx,dy] of dirs) {
      if(spawned >= 2) break;
      const sx = monster.x + dx;
      const sy = monster.y + dy;
      if(sx<0||sx>=MAP_W||sy<0||sy>=MAP_H) continue;
      const tile = G.level.tiles[sy][sx];
      if(tile===TILE.WALL||tile===TILE.LAVA) continue;
      if(G.level.monsters.some(m=>m.x===sx&&m.y===sy)) continue;
      if(sx===p.x&&sy===p.y) continue;
      const template = MONSTER_TEMPLATES[monster.key];
      if(!template) continue;
      const child = createMonster(monster.key, template, sx, sy, G.floor);
      child.hp = Math.floor(monster.maxHp / 3);
      child.maxHp = child.hp;
      child.splitOnDeath = false; // children don't split again
      child.alerted = true;
      G.level.monsters.push(child);
      spawned++;
    }
    if(spawned > 0) log(`The ${monster.name} splits into ${spawned} smaller blobs!`, 'warning');
  }

  if(monster.isBoss) {
    G.killedBosses.push(monster.key);
    log(`*** ${monster.name} is defeated! ***`, 'good');
    flash('BOSS DEFEATED!');
    if(monster.finalBoss) {
      checkWinCondition();
    }
  }
  
  // Loot drops
  if(monster.loot) {
    for(const [itemKey, chance] of Object.entries(monster.loot)) {
      if(itemKey === 'gold' && rng.bool(chance)) {
        const goldAmt = rng.int(G.floor * 10, G.floor * 50);
        G.level.items.push({ type:'gold', glyph:'$', color:'#ffd700', name:'Gold', amount:goldAmt, x:monster.x, y:monster.y });
        continue;
      }
      if(rng.bool(chance)) {
        const template = ITEM_TEMPLATES[itemKey];
        if(template) {
          const item = { ...template, id:`drop_${Date.now()}_${rng.int(0,9999)}`, x:monster.x, y:monster.y };
          G.level.items.push(item);
        }
      }
    }
  }
  
  // Lifesteal healing
  if(p.god === 'sekhmet' && p.piety >= 50) {
    const heal = rng.int(1, 4);
    p.hp = Math.min(p.maxHp, p.hp + heal);
  }
  
  // Ghost pact (Nephthys)
  if(monster.isGhost && p.god === 'nephthys') {
    gainPiety('honoring_ghost_kills', 5);
    log('Nephthys is pleased by your dominance over the ghost.', 'god');
  }
}

function castMonsterSpell(monster, spell) {
  const p = G.player;
  switch(spell) {
    case 'magic_missile':
      const dmg = rng.dice(1, 6, 2);
      p.hp -= dmg;
      log(`${monster.name} fires a magic missile for ${dmg} damage!`, 'combat');
      break;
    case 'ice_lance':
      const idmg = rng.dice(2, 6, 0);
      p.hp -= idmg;
      p.status.slowed = 3;
      log(`${monster.name} fires an ice lance for ${idmg} damage! You are slowed.`, 'combat');
      break;
    case 'lightning_bolt':
      const ldmg = rng.dice(3, 6, 0);
      p.hp -= ldmg;
      log(`${monster.name} fires a lightning bolt for ${ldmg} damage!`, 'combat');
      break;
    case 'disintegrate':
      if(rng.bool(0.3)) {
        log(`${monster.name} fires a disintegration ray! You are hit!`, 'death');
        die(`${monster.name}'s disintegration ray`);
        return;
      }
      const ddmg = rng.dice(5, 6, 10);
      p.hp -= ddmg;
      log(`${monster.name} fires a disintegration ray for ${ddmg} damage!`, 'combat');
      break;
    case 'fireball':
      const fbdmg = rng.dice(4, 6, 0);
      const fres = p.passives.includes('fire_resist') ? Math.floor(fbdmg/2) : fbdmg;
      p.hp -= fres;
      log(`${monster.name} hurls a fireball for ${fres} damage!`, 'combat');
      break;
    case 'poison_spit':
      if(!p.passives.includes('poison_resist')) {
        p.status.poisoned = 8;
        const pdmg = rng.dice(1, 6, 0);
        p.hp -= pdmg;
        log(`${monster.name} spits poison for ${pdmg} damage! You are poisoned.`, 'combat');
      }
      break;
    case 'psychic_blast':
      const psdmg = rng.dice(3, 6, 5);
      p.hp -= psdmg;
      log(`${monster.name} unleashes a psychic blast for ${psdmg} damage!`, 'combat');
      if(rng.bool(0.3)) {
        const stat = 'int';
        p.stats[stat] -= rng.int(1, 2);
        log(`Your mind reels — INT drained!`, 'warning');
        if(p.stats[stat] <= 0) { die(`${monster.name}'s psychic assault`); return; }
      }
      break;
  }
  if(p.hp <= 0) die(monster.name);
}

// ─── MONSTER AI ──────────────────────────────────────────────
function updateMonsters() {
  const { level, player } = G;
  
  for(const monster of [...level.monsters]) {
    // Status-immune creatures ignore all status effects
    if(monster.statusImmune) {
      monster.paralyzed = 0; monster.sleeping = 0; monster.confused = 0;
      monster.frightened = 0; monster.poisoned = 0;
    }
    if(monster.paralyzed > 0) { monster.paralyzed--; continue; }
    if(monster.sleeping > 0) {
      monster.sleeping--;
      // Noise can wake
      if(rng.bool(0.1)) { monster.sleeping = 0; monster.alerted = true; }
      continue;
    }
    if(monster.confused > 0) {
      monster.confused--;
      // Random movement
      const dx = rng.int(-1,1);
      const dy = rng.int(-1,1);
      const nx = monster.x + dx;
      const ny = monster.y + dy;
      if(nx>=0 && nx<MAP_W && ny>=0 && ny<MAP_H && level.tiles[ny][nx] !== TILE.WALL) {
        monster.x = nx; monster.y = ny;
      }
      continue;
    }
    
    // Faction neutrality check
    monster.neutral = isMonsterNeutralToPlayer(monster);
    if(monster.neutral) continue; // neutral monsters don't act aggressively

    const dist = Math.sqrt((monster.x-player.x)**2 + (monster.y-player.y)**2);
    const inFOV = level.visible?.has(`${monster.x},${monster.y}`);

    // Mimic reveal — springs ambush when player is adjacent
    if(monster.disguised && dist <= 1.5) {
      monster.disguised = false;
      log(`The ${monster.disguiseName} was a Mimic!`, 'warning');
      monster.alerted = true;
      monsterAttack(monster); // surprise attack
      continue;
    }
    if(monster.disguised) continue; // stay hidden if player isn't close

    // Doppelganger — copies player stats when first alerted
    if(monster.doppelganger && inFOV && !monster._copied) {
      monster._copied = true;
      const pLevel = player.level || 1;
      monster.hp = Math.floor(monster.hp * (1 + pLevel * 0.15));
      monster.maxHp = monster.hp;
      monster.atk = monster.atk.map(a => [a[0], a[1], a[2] + Math.floor(pLevel / 2)]);
      log('The Doppelganger shifts — it wears your face!', 'warning');
    }

    // Thief stealth: unalerted monsters have reduced detection range
    if(G.player.cls === 'thief' && !monster.alerted) {
      const stealthRange = Math.max(2, 5 - Math.floor(G.player.stats.dex / 5));
      if(dist > stealthRange) continue;
    }

    if(inFOV && !monster.alerted) monster.alerted = true;

    if(!monster.alerted && dist > 10) continue;

    // Fear check
    if(monster.frightened > 0) {
      monster.frightened--;
      fleeFrom(monster, player.x, player.y);
      continue;
    }
    
    switch(monster.ai) {
      case 'normal':
      case 'aggressive':
        if(dist <= 1.5) {
          monsterAttack(monster);
        } else if(monster.alerted) {
          moveToward(monster, player.x, player.y);
          // Sprint — close extra tiles toward player
          if(monster.sprint && dist > 2 && rng.bool(0.25)) {
            const newDist = Math.sqrt((monster.x-player.x)**2 + (monster.y-player.y)**2);
            if(newDist > 1.5) moveToward(monster, player.x, player.y);
            if(newDist > 2.5) moveToward(monster, player.x, player.y);
          }
        }
        break;
      case 'coward':
        if(dist <= 1.5) {
          monsterAttack(monster);
        } else if(monster.hp < monster.maxHp * 0.3) {
          fleeFrom(monster, player.x, player.y);
        } else if(monster.alerted) {
          moveToward(monster, player.x, player.y);
        }
        break;
      case 'archer':
        if(dist >= 2 && dist <= 8 && inFOV) {
          // Ranged attack
          const roll = rng.dice(1, 20, 2);
          if(roll >= computeAC(player) - 10) {
            const dmg = rng.dice(1, 6, 2);
            player.hp -= dmg;
            log(`${monster.name} fires an arrow for ${dmg} damage!`, 'combat');
            if(player.hp <= 0) { die(monster.name); return; }
          } else {
            log(`${monster.name}'s arrow misses.`, 'combat');
          }
        } else if(dist < 2) {
          monsterAttack(monster);
        } else {
          moveToward(monster, player.x, player.y);
        }
        break;
      case 'cunning':
        if(dist <= 1.5) {
          monsterAttack(monster);
        } else if(monster.alerted) {
          // Smarter pathing
          moveToward(monster, player.x, player.y);
        }
        break;
      case 'slow':
        if(G.turn % 2 === 0) {
          if(dist <= 1.5) monsterAttack(monster);
          else if(monster.alerted) moveToward(monster, player.x, player.y);
        }
        break;
      case 'pack':
        // Alert nearby same-type monsters
        if(inFOV && !monster.alerted) {
          level.monsters.filter(m => m.key === monster.key && Math.sqrt((m.x-monster.x)**2+(m.y-monster.y)**2) < 5).forEach(m => m.alerted = true);
        }
        if(dist <= 1.5) monsterAttack(monster);
        else if(monster.alerted) moveToward(monster, player.x, player.y);
        break;
      case 'amorphous':
        // Can move through walls sometimes
        if(dist <= 1.5) monsterAttack(monster);
        else if(monster.alerted) {
          if(rng.bool(0.3)) {
            // Phase through wall
            monster.x += Math.sign(player.x - monster.x);
            monster.y += Math.sign(player.y - monster.y);
          } else {
            moveToward(monster, player.x, player.y);
          }
        }
        break;
      default:
        if(dist <= 1.5) monsterAttack(monster);
        else if(monster.alerted) moveToward(monster, player.x, player.y);
    }
    
    // Confusion aura — chance to confuse player just by being adjacent
    if(monster.confusionAura && dist <= 1.5 && !player.status.confused && rng.bool(0.2)) {
      player.status.confused = rng.int(2, 4);
      log(`The ${monster.name}'s gibbering madness overwhelms your senses!`, 'warning');
    }

    // Regeneration
    if(monster.regen && G.turn % (4 - monster.regen) === 0) {
      monster.hp = Math.min(monster.maxHp, monster.hp + monster.regen);
    }
    
    // Poison tick on monster
    if(monster.poisoned > 0) {
      monster.poisoned--;
      monster.hp -= 1;
      if(monster.hp <= 0) killMonster(monster);
    }
  }
  
  // Companion AI
  updateCompanions();
  // NPC wandering AI
  updateNPCs();
}

function moveToward(monster, tx, ty) {
  const { level } = G;
  const dx = Math.sign(tx - monster.x);
  const dy = Math.sign(ty - monster.y);
  
  // Try diagonal first, then cardinal
  const moves = [[dx,dy],[dx,0],[0,dy],[-dy,dx],[dy,-dx]];
  
  for(const [mx, my] of moves) {
    const nx = monster.x + mx;
    const ny = monster.y + my;
    if(nx<0||nx>=MAP_W||ny<0||ny>=MAP_H) continue;
    const tile = level.tiles[ny][nx];
    if(tile === TILE.WALL) continue;
    if(level.monsters.some(m => m !== monster && m.x===nx && m.y===ny)) continue;
    if(G.player.x === nx && G.player.y === ny) continue;
    // Don't stack on companions or other NPCs
    if(G.player.companions.some(c => c !== monster && c.x===nx && c.y===ny)) continue;
    if(level.npcs?.some(n => n !== monster && n.x===nx && n.y===ny)) continue;
    if(typeof setFacing === 'function') setFacing(monster, mx, my);
    monster.animState = 'walk';
    monster.x = nx; monster.y = ny;
    // Open doors
    if(tile === TILE.DOOR) level.tiles[ny][nx] = TILE.FLOOR;
    break;
  }
}

function fleeFrom(monster, fx, fy) {
  const dx = -Math.sign(fx - monster.x);
  const dy = -Math.sign(fy - monster.y);
  const nx = monster.x + dx;
  const ny = monster.y + dy;
  if(nx>=0&&nx<MAP_W&&ny>=0&&ny<MAP_H&&G.level.tiles[ny][nx]!==TILE.WALL) {
    monster.x = nx; monster.y = ny;
  }
}

function updateCompanions() {
  const p = G.player;
  for(const comp of [...p.companions]) {
    // Cursed Prince gold drain
    if(comp.goldDrain) {
      p.gold -= comp.goldDrain;
      if(p.gold <= 0) {
        p.gold = 0;
        log(`${comp.name}: "No gold? How tiresome. Farewell."`, 'info');
        p.companions = p.companions.filter(c => c !== comp);
        continue;
      }
    }
    // Find nearest visible hostile monster within engage range (skip neutrals)
    const target = G.level.monsters.filter(m => !m.neutral && !m.disguised).reduce((closest, m) => {
      const d = Math.sqrt((m.x-comp.x)**2+(m.y-comp.y)**2);
      if(d > 10) return closest;
      const cd = closest ? Math.sqrt((closest.x-comp.x)**2+(closest.y-comp.y)**2) : Infinity;
      return d < cd ? m : closest;
    }, null);

    // Also check for hostile NPCs as targets
    const hostileNPC = !target ? (G.level.npcs || []).filter(n => n.hostile && n !== comp).reduce((closest, n) => {
      const d = Math.sqrt((n.x-comp.x)**2+(n.y-comp.y)**2);
      if(d > 10) return closest;
      const cd = closest ? Math.sqrt((closest.x-comp.x)**2+(closest.y-comp.y)**2) : Infinity;
      return d < cd ? n : closest;
    }, null) : null;

    const enemy = target || hostileNPC;

    if(enemy) {
      const dist = Math.sqrt((enemy.x-comp.x)**2+(enemy.y-comp.y)**2);
      if(dist <= 1.5) {
        const dmg = rng.dice(...comp.atk);
        enemy.hp -= dmg;
        log(`${comp.name} attacks ${enemy.name} for ${dmg} damage!`, 'info');
        if(enemy.hp <= 0) {
          if(enemy.hostile) {
            log(`${comp.name} slays ${enemy.name}!`, 'good');
            G.level.npcs = G.level.npcs.filter(n => n !== enemy);
          } else {
            killMonster(enemy);
          }
        }
      } else {
        // Always pursue enemies regardless of stay mode
        moveToward(comp, enemy.x, enemy.y);
      }
    } else if(!comp.stayPut) {
      // Follow player if not told to stay
      const dist = Math.sqrt((comp.x-p.x)**2+(comp.y-p.y)**2);
      if(dist > 2) moveToward(comp, p.x, p.y);
    }
    // else: stayPut=true and no enemy — stand still

    // Companion healing
    if(comp.healPlayer && G.turn % 10 === 0 && p.hp < p.maxHp * 0.5) {
      const heal = rng.int(3, 8);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      log(`${comp.name} heals you for ${heal} HP.`, 'good');
    }
    // Companion spells
    if(comp.canCastMissile && enemy && Math.sqrt((enemy.x-comp.x)**2+(enemy.y-comp.y)**2) <= 6 && rng.bool(0.3)) {
      const mdmg = rng.dice(1, 6, 2);
      enemy.hp -= mdmg;
      log(`${comp.name} fires a magic missile for ${mdmg} damage!`, 'info');
      if(enemy.hp <= 0) {
        if(enemy.hostile) {
          log(`${comp.name} destroys ${enemy.name}!`, 'good');
          G.level.npcs = G.level.npcs.filter(n => n !== enemy);
        } else {
          killMonster(enemy);
        }
      }
    }
  }
}

// NPC wandering AI (pre-hire NPCs in level.npcs)
function updateNPCs() {
  const { level, player } = G;
  if(!level.npcs) return;
  for(const npc of level.npcs) {
    if(npc.companion) continue; // Already handled by updateCompanions

    // Hostile NPC — chase and attack the player
    if(npc.hostile) {
      const dist = Math.sqrt((npc.x-player.x)**2+(npc.y-player.y)**2);
      if(dist <= 1.5) {
        const dmg = rng.dice(...(npc.atk || [1,6,0]));
        const pAC = computeAC(player);
        const hitRoll = rng.int(1,20) + 2;
        if(hitRoll < pAC) {
          log(`${npc.name} swings but you block!`, 'combat');
        } else {
          player.hp -= dmg;
          log(`${npc.name} hits you for ${dmg} damage!`, 'combat');
          if(player.hp <= 0) { die(npc.name); return; }
        }
      } else {
        moveToward(npc, player.x, player.y);
      }
      continue;
    }

    // Find nearest monster
    const enemy = level.monsters.reduce((closest, m) => {
      const d = Math.sqrt((m.x-npc.x)**2+(m.y-npc.y)**2);
      if(d > 8) return closest;
      const cd = closest ? Math.sqrt((closest.x-npc.x)**2+(closest.y-npc.y)**2) : Infinity;
      return d < cd ? m : closest;
    }, null);

    if(enemy) {
      // Engage enemy
      const d = Math.sqrt((enemy.x-npc.x)**2+(enemy.y-npc.y)**2);
      if(d <= 1.5) {
        const dmg = rng.int(2, 8);
        enemy.hp -= dmg;
        if(enemy.hp <= 0) killMonster(enemy);
      } else {
        moveToward(npc, enemy.x, enemy.y);
      }
    } else {
      // Wander toward player loosely (stay within 8 tiles)
      const dist = Math.sqrt((npc.x-player.x)**2+(npc.y-player.y)**2);
      if(dist > 8) {
        moveToward(npc, player.x, player.y);
      } else if(rng.bool(0.3)) {
        // Random wander
        const dx = rng.int(-1,1), dy = rng.int(-1,1);
        const nx2 = npc.x+dx, ny2 = npc.y+dy;
        if(nx2>=0&&nx2<MAP_W&&ny2>=0&&ny2<MAP_H&&level.tiles[ny2][nx2]!==TILE.WALL
          && !level.monsters.some(m=>m.x===nx2&&m.y===ny2)
          && !level.npcs.some(n=>n!==npc&&n.x===nx2&&n.y===ny2)
          && !(nx2===player.x&&ny2===player.y)) {
          npc.x = nx2; npc.y = ny2;
        }
      }
    }
  }
}


// ─── MUTATIONS ────────────────────────────────────────────────
function tryGrantMutation(source) {
  const p = G.player;
  const allKeys = Object.keys(MUTATION_DEFS);
  const haveMut = new Set(p.mutations.map(m => m.key));
  const available = allKeys.filter(k => !haveMut.has(k));
  if(available.length === 0) { log('You cannot mutate further.', 'warning'); return; }
  
  const key = rng.pick(available);
  const def = MUTATION_DEFS[key];
  p.mutations.push({ key, ...def });
  
  // Apply stat modifiers
  if(def.strMod)  p.stats.str  = Math.max(1, p.stats.str  + def.strMod);
  if(def.dexMod)  p.stats.dex  = Math.max(1, p.stats.dex  + def.dexMod);
  if(def.conMod)  p.stats.con  = Math.max(1, p.stats.con  + def.conMod);
  if(def.intMod)  p.stats.int  = Math.max(1, p.stats.int  + def.intMod);
  if(def.wisMod)  p.stats.wis  = Math.max(1, p.stats.wis  + def.wisMod);
  if(def.chaMod)  p.stats.cha  = Math.max(1, p.stats.cha  + def.chaMod);
  if(def.poisonResist) p.passives.push('poison_resist');
  if(def.amphibious)   p.passives.push('amphibious');
  
  log(`⚠ MUTATION: ${def.name}! ${def.pos}`, 'warning');
  flash('MUTATION!');
  
  // Zagyg loves mutations
  if(p.god === 'zagyg') {
    gainPiety('mutating', 8);
    log('Zagyg cackles with delight!', 'god');
  }
  
  // Update mutation count display
  updateMutIndicator();
}

function applyMutationEffects() {
  const p = G.player;
  for(const mut of p.mutations) {
    if(mut.regenTurns && G.turn % mut.regenTurns === 0) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
    }
    if(mut.halfHunger && G.turn % 2 === 0) {
      p.hunger = Math.min(p.maxHunger, p.hunger + 1); // Effectively halves hunger drain
    }
  }
}

function getMutationACBonus() {
  const p = G.player;
  return p.mutations.reduce((sum, m) => sum + (m.acBonus || 0), 0);
}

function updateMutIndicator() {
  const p = G.player;
  const el = document.getElementById('mut-indicator');
  const cnt = document.getElementById('mut-count');
  if(el && p.mutations.length > 0) {
    el.style.display = 'block';
    cnt.textContent = `(${p.mutations.length})`;
  }
}

function openMutScreen() {
  const p = G.player;
  const el = document.getElementById('mut-screen');
  el.classList.add('visible');
  const listEl = document.getElementById('mut-list');
  if(p.mutations.length === 0) {
    listEl.innerHTML = '<p style="color:var(--gray);font-size:13px;padding:10px;">No mutations yet. Try drinking unknown potions...</p>';
  } else {
    listEl.innerHTML = p.mutations.map(m => `
      <div class="mut-entry">
        <div class="mut-name">☣ ${m.name}</div>
        <div class="mut-pos">✓ ${m.pos}</div>
        <div class="mut-neg">✗ ${m.neg}</div>
      </div>
    `).join('');
  }
  G.mutOpen = true;
}

function closeMutScreen() {
  document.getElementById('mut-screen').classList.remove('visible');
  G.mutOpen = false;
}
// ─── SOUND / NOISE SYSTEM ─────────────────────────────────────
function doMonsterNoise() {
  const { level, player } = G;
  if(!level) return;
  
  // Chance to hear a nearby but not-yet-seen monster
  const unheard = level.monsters.filter(m => {
    if(level.visible?.has(`${m.x},${m.y}`)) return false; // Already seen
    const dist = Math.sqrt((m.x-player.x)**2+(m.y-player.y)**2);
    return dist <= 12 && dist >= 2;
  });
  
  if(unheard.length > 0 && rng.bool(0.3)) {
    const m = rng.pick(unheard);
    const sounds = MONSTER_SOUNDS[m.key];
    if(sounds) {
      log(rng.pick(sounds), 'warning');
    } else {
      const generic = ['Something moves in the dark.', 'You hear shuffling.', 'A presence lurks ahead.'];
      log(rng.pick(generic), 'warning');
    }
  }
}

// ─── LOOK COMMAND ────────────────────────────────────────────
function enterLookMode() {
  G.lookMode = true;
  G.lookX = G.player.x;
  G.lookY = G.player.y;
  log('LOOK MODE — Arrow keys to look, ESC to exit', 'system');
  renderLookCursor();
}

function exitLookMode() {
  G.lookMode = false;
  const li = document.getElementById('look-info');
  if(li) li.style.display = 'none';
  renderAll();
}

function moveLook(dx, dy) {
  G.lookX = Math.max(0, Math.min(MAP_W-1, G.lookX + dx));
  G.lookY = Math.max(0, Math.min(MAP_H-1, G.lookY + dy));
  renderLookCursor();
}

function renderLookCursor() {
  const { level, player } = G;
  const key = `${G.lookX},${G.lookY}`;
  const visible = level.visible?.has(key);
  const li = document.getElementById('look-info');
  if(!li) return;
  
  if(!visible) {
    li.style.display = 'block';
    li.textContent = 'You cannot see there.';
    renderAll();
    overlayLookBox();
    return;
  }
  
  const tile = level.tiles[G.lookY][G.lookX];
  const tileNames = {
    0:'Wall', 1:'Floor', 2:'Corridor', 3:'Door', 4:'Stairs Down', 5:'Stairs Up',
    6:'Water', 7:'Lava', 8:'Dark Floor', 9:'Altar', 10:'Shop', 11:'Trap'
  };
  
  let desc = tileNames[tile] || 'Unknown';
  
  // Check for player
  if(G.lookX === player.x && G.lookY === player.y) {
    desc = `${player.name} (you) — ${RACES[player.race].name} ${CLASSES[player.cls].name}, HP:${player.hp}/${player.maxHp}`;
  }
  
  // Check for monster
  const monster = level.monsters.find(m => m.x===G.lookX && m.y===G.lookY);
  if(monster) {
    if(monster.disguised) {
      desc = `You see ${monster.disguiseName || 'something'} on the ground.`;
    } else {
      const pct = Math.round((monster.hp/monster.maxHp)*100);
      const health = pct > 75 ? 'healthy' : pct > 50 ? 'wounded' : pct > 25 ? 'badly wounded' : 'near death';
      const tags = [];
      if(monster.undead) tags.push('undead');
      if(monster.isBoss) tags.push('BOSS');
      if(monster.fly) tags.push('flying');
      if(monster.statusImmune) tags.push('magic resistant');
      desc = `${monster.name} — ${health} (${monster.hp}/${monster.maxHp} HP)${tags.length ? ' ['+tags.join(',')+']' : ''}`;
    }
  }
  
  // Check for NPC
  const npc = level.npcs?.find(n => n.x===G.lookX && n.y===G.lookY);
  if(npc) desc = `${npc.name} — ${npc.personality || npc.role}`;
  
  // Check for item
  const item = level.items.find(i => i.x===G.lookX && i.y===G.lookY && !i.hidden);
  if(item && !item.hidden) {
    const lookName = getItemDisplayName(item);
    const cursedHint = (item.cursed && item.identified) ? ' (cursed!)' : '';
    if(monster || npc) desc += ` (also: ${lookName}${cursedHint})`;
    else desc = lookName + cursedHint;
  }
  
  // Altar god
  if(tile === TILE.ALTAR) {
    const ag = level.altarGods?.[key];
    if(ag && GODS[ag]) desc = `Altar of ${GODS[ag].name} (${GODS[ag].domain})`;
    else desc = 'Ancient Altar';
  }
  
  li.style.display = 'block';
  li.textContent = `(${G.lookX},${G.lookY}) ${desc}`;
  
  renderAll();
  overlayLookBox();
}

function overlayLookBox() {
  if(!canvas) return;
  const { ox, oy } = getViewOffset();
  const px = (G.lookX - ox) * CELL_SIZE;
  const py = (G.lookY - oy) * CELL_SIZE;
  ctx.strokeStyle = '#00ccff';
  ctx.lineWidth = 2;
  ctx.strokeRect(px+1, py+1, CELL_SIZE-2, CELL_SIZE-2);
}

// ─── FOV WITH SEEN NOTIFICATIONS ─────────────────────────────
// ─── TURN MANAGEMENT ─────────────────────────────────────────
function endTurn() {
  if(G.gameOver) return;
  G.turn++;

  const p = G.player;
  // Reset animation states to idle (attack/walk animations are transient)
  p.animState = 'idle';
  if(G.level) G.level.monsters.forEach(m => { m.animState = 'idle'; });
  
  // Hunger
  if(p.hungerImmune) { /* Heart Scarab — skip hunger */ } else {
    p.hunger -= 1;
    if(p.hunger <= 0) {
      p.hunger = 0;
      const starveDmg = rng.int(1, 3);
      p.hp -= starveDmg;
      if(G.turn % 10 === 0) log('You are starving!', 'warning');
      if(p.hp <= 0) { die('starvation'); return; }
    }
  }

  // Poison tick
  if(p.status.poisoned > 0) {
    p.status.poisoned--;
    const pdmg = rng.int(1, 3);
    p.hp -= pdmg;
    if(G.turn % 3 === 0) log(`Poison deals ${pdmg} damage.`, 'warning');
    if(p.hp <= 0) { die('poison'); return; }
  }
  
  // Burning tick
  if(p.status.burning > 0) {
    const fdmg = rng.int(2, 4);
    p.hp -= fdmg;
    if(G.turn % 2 === 0) log(`You burn for ${fdmg} damage!`, 'warning');
    if(p.hp <= 0) { die('immolation'); return; }
  }

  // Phasing tick — random teleport every 3-4 turns
  if(p.status.phasing > 0 && G.turn % rng.int(3,4) === 0) {
    const walkable = [];
    for(let y=0; y<MAP_H; y++) for(let x=0; x<MAP_W; x++) {
      const t = G.level.tiles[y][x];
      if((t===TILE.FLOOR||t===TILE.CORRIDOR) && !G.level.monsters.some(m=>m.x===x&&m.y===y)) walkable.push([x,y]);
    }
    if(walkable.length > 0) {
      const [nx, ny] = rng.pick(walkable);
      p.x = nx; p.y = ny;
      p.companions.forEach(c => { c.x = nx+1; c.y = ny; });
      log('Reality shifts — you phase to a new location!', 'warning');
      computeFOV();
    }
  }

  // Berserk tick — auto-attack nearest creature (including companions)
  if(p.status.berserk > 0) {
    const allTargets = [
      ...G.level.monsters.filter(m => G.level.visible?.has(`${m.x},${m.y}`)),
      ...G.level.npcs.filter(n => G.level.visible?.has(`${n.x},${n.y}`)),
    ];
    // Include companions
    for(const c of p.companions) {
      if(G.level.visible?.has(`${c.x},${c.y}`)) allTargets.push(c);
    }
    if(allTargets.length > 0) {
      const nearest = allTargets.sort((a,b) =>
        (Math.abs(a.x-p.x)+Math.abs(a.y-p.y)) - (Math.abs(b.x-p.x)+Math.abs(b.y-p.y))
      )[0];
      const dist = Math.abs(nearest.x-p.x) + Math.abs(nearest.y-p.y);
      if(dist <= 1) {
        // Adjacent — attack
        const bDmg = rng.dice(1, 6, (p.status.berserk_dmg || 3));
        nearest.hp -= bDmg;
        log(`In a blind rage you strike ${nearest.name} for ${bDmg}!`, 'combat');
        if(nearest.hp <= 0) {
          if(G.level.monsters.includes(nearest)) killMonster(nearest);
          else {
            // Killed a companion or NPC
            log(`${nearest.name} falls to your berserker fury!`, 'death');
            p.companions = p.companions.filter(c => c !== nearest);
            G.level.npcs = G.level.npcs.filter(n => n !== nearest);
          }
        }
      }
    }
  }

  // Natural HP + MP regen when no enemies visible
  const inCombat = G.level?.monsters.some(m => G.level.visible?.has(`${m.x},${m.y}`));
  if(!inCombat) {
    if(G.turn % 5 === 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 1);
    if(G.turn % 12 === 0 && p.mp < p.maxMp) p.mp = Math.min(p.maxMp, p.mp + 1);
  }

  // Regeneration (ring)
  if(p.equipped.ring1?.regen || p.equipped.ring2?.regen) {
    if(G.turn % 10 === 0) p.hp = Math.min(p.maxHp, p.hp + 1);
  }

  // Druid regen spell
  if(p.status.regen_spell > 0 && G.turn % 1 === 0) {
    p.hp = Math.min(p.maxHp, p.hp + 2);
  }
  if(p.passives.includes('regeneration') && G.turn % 8 === 0) {
    p.hp = Math.min(p.maxHp, p.hp + 1);
  }
  
  // Class-based MP regen (always, in/out of combat)
  const mpRate = p.cls === 'magicuser' ? 5 : p.cls === 'cleric' ? 7 : 0;
  if(mpRate > 0 && G.turn % mpRate === 0 && p.mp < p.maxMp) {
    p.mp = Math.min(p.maxMp, p.mp + 1);
  }
  
  // Status effect countdown
  const skipCountdown = new Set(['speed_debt','temp_str_amount','corroded_amount','berserk_dmg','weakened_amount','might_amount','poison_resist','shiftForm','poison_blade','called_shot','camouflage']);

  // CON saving throw: chance to shake off negative statuses early (18+ on d20 + CON mod)
  const conMod = Math.floor((p.stats.con - 10) / 2);
  const negStatuses = ['poisoned','confused','paralyzed','blinded','weakened','slowed','burning','corroded'];
  for(const ns of negStatuses) {
    if(p.status[ns] > 1 && rng.dice(1, 20, conMod) >= 18) {
      delete p.status[ns];
      if(ns === 'weakened') { p.stats.str += (p.status.weakened_amount||4); delete p.status.weakened_amount; }
      if(ns === 'corroded') delete p.status.corroded_amount;
      if(ns === 'blinded') computeFOV();
      log(`Your constitution overcomes the ${ns} effect!`, 'good');
    }
  }
  for(const [status, val] of Object.entries(p.status)) {
    if(skipCountdown.has(status)) continue;
    if(typeof val === 'number' && val > 0) {
      p.status[status]--;
      if(p.status[status] <= 0) {
        delete p.status[status];
        if(status === 'invisible') log('You are no longer invisible.', 'info');
        if(status === 'confused') log('You are no longer confused.', 'info');
        if(status === 'bless') log('Your blessing fades.', 'info');
        if(status === 'temp_str') {
          p.stats.str -= (p.status.temp_str_amount || 4);
          delete p.status.temp_str_amount;
          log('Your supernatural strength fades.', 'info');
        }
        if(status === 'blinded') { log('Your vision returns!', 'good'); computeFOV(); }
        if(status === 'burning') log('The flames die out. You stop burning.', 'good');
        if(status === 'corroded') { delete p.status.corroded_amount; log('The acid corrosion fades. Your armor recovers.', 'good'); }
        if(status === 'slowed') log('You are no longer slowed.', 'good');
        if(status === 'phasing') log('Reality stabilizes. You stop phasing.', 'good');
        if(status === 'berserk') { log('The blood rage subsides. You regain control.', 'good'); delete p.status.berserk_dmg; }
        if(status === 'magic_resist') log('Your magical resistance fades.', 'info');
        if(status === 'weakened') {
          p.stats.str += (p.status.weakened_amount || 4);
          delete p.status.weakened_amount;
          log('Your strength returns!', 'good');
        }
        if(status === 'might') {
          const amt = p.status.might_amount || 2;
          p.stats.str -= amt; p.stats.dex -= amt; p.stats.con -= amt;
          delete p.status.might_amount;
          log('The surge of might fades.', 'info');
        }
        if(status === 'shifted') { revertShapeshift(); }
        if(status === 'arcane_shield') log('Your magical shield dissipates.', 'info');
        if(status === 'bark_skin') log('The bark coating flakes away.', 'info');
        if(status === 'regen_spell') log('The natural regeneration fades.', 'info');
        if(status === 'detect_monsters') log('Your heightened senses fade.', 'info');
        if(status === 'haste') log('Time resumes its normal flow.', 'info');
        if(status === 'sanctuary') log('The divine ward fades.', 'info');
      }
    }
  }
  
  // God wrath countdown
  if(G.godFledFrom && G.turn % 50 === 0) {
    applyGodWrath(G.godFledFrom);
  }
  
  // Zagyg random events
  if(p.god === 'zagyg' && G.turn % 30 === 0) {
    zagyRandomEvent();
  }
  
  // Unique item effects per turn
  if(p.equipped.weapon?.selfBurn) {
    p.hp -= p.equipped.weapon.selfBurn;
    if(G.turn % 10 === 0) log('The Frostbrand\'s chill seeps into your bones.', 'warning');
    if(p.hp <= 0) { die('the Frostbrand\'s chill'); return; }
  }
  if(p.equipped.head?.confusionChance && rng.bool(p.equipped.head.confusionChance)) {
    if(!p.status.confused) {
      p.status.confused = 2;
      log('The Crown of Madness floods your mind with visions!', 'warning');
    }
  }

  // Mutation effects
  applyMutationEffects();
  
  // Monster noises (every ~8 turns, random)
  G.noiseTimer = (G.noiseTimer || 0) + 1;
  if(G.noiseTimer >= 8 && rng.bool(0.4)) {
    doMonsterNoise();
    G.noiseTimer = 0;
  }
  
  // Bonus action: weapon speed (fast) or haste spell — skip monster update
  if(p._bonusAction) {
    delete p._bonusAction;
    computeFOV();
    renderAll();
    return; // Player acts again before monsters move
  }
  // Haste: every other turn, grant a bonus action
  if(p.status.haste > 0 && G.turn % 2 === 0) {
    p._bonusAction = true;
  }

  // Update monsters
  updateMonsters();
  
  // Ghost spawn
  if(rng.bool(G.ghostSpawnChance / 500) && GHOST_GRAVEYARD.length > 0) {
    const attempts = 10;
    for(let a=0; a<attempts; a++) {
      const gx = rng.int(0, MAP_W-1);
      const gy = rng.int(0, MAP_H-1);
      if(G.level.tiles[gy][gx] === TILE.FLOOR && !G.level.visible?.has(`${gx},${gy}`)) {
        const ghost = spawnGhost(G.floor, gx, gy);
        if(ghost) {
          G.level.monsters.push(ghost);
          log(`You sense a chill presence...`, 'warning');
        }
        break;
      }
    }
  }
  
  computeFOV();
  renderAll();
  
  // Autosave every 10 turns
  if(G.turn % 10 === 0 && !G.gameOver) saveGame();

  // Auto-explore
  if(G.autoExploreActive && !G.gameOver) {
    setTimeout(autoExploreStep, 50);
  }
}

// ─── AUTO-EXPLORE ────────────────────────────────────────────
// Returns true if auto-explore should pick up this item
function autoExploreWantsItem(item) {
  if(item.type === 'gold') return true;
  if(item.type === 'food' || item.type === 'ammo' || item.type === 'thrown') return true;
  if(item.type === 'quest_item' || item.type === 'rune_artifact') return true;
  if(item.type === 'potion') {
    // Pick up if unidentified or known to be beneficial
    const knownBad = ['confuse_self','poison_self','blind_self','paralyze_self','weaken_self','amnesia','burn_self','berserk'];
    if(GAME_IDENTIFIED_POTIONS.has(item.effect) && knownBad.includes(item.effect)) return false;
    return true;
  }
  if(item.type === 'scroll') {
    const knownBad = ['curse_items'];
    if(GAME_IDENTIFIED_SCROLLS.has(item.effect) && knownBad.includes(item.effect)) return false;
    return true;
  }
  if(item.type === 'ring') {
    const knownBad = ['ring_doom'];
    if(item.templateKey && GAME_IDENTIFIED_RINGS.has(item.templateKey) && knownBad.includes(item.templateKey)) return false;
    return true;
  }
  if(item.type === 'amulet') {
    const knownBad = ['amulet_curse'];
    if(item.templateKey && GAME_IDENTIFIED_AMULETS.has(item.templateKey) && knownBad.includes(item.templateKey)) return false;
    return true;
  }
  return false;
}

function autoExploreStep() {
  if(!G.autoExploreActive || G.gameOver) return;
  
  const p = G.player;
  const level = G.level;
  
  // Check for danger or starvation
  const nearMonster = level.monsters.some(m =>
    !m.neutral && !m.disguised && Math.sqrt((m.x-p.x)**2+(m.y-p.y)**2) <= 6 && level.visible?.has(`${m.x},${m.y}`)
  );
  const nearHostileNPC = (level.npcs || []).some(n =>
    n.hostile && Math.sqrt((n.x-p.x)**2+(n.y-p.y)**2) <= 6 && level.visible?.has(`${n.x},${n.y}`)
  );
  if(nearMonster || nearHostileNPC || p.hp < p.maxHp * 0.3) {
    G.autoExploreActive = false;
    log('Auto-explore stopped: danger nearby.', 'warning');
    return;
  }
  if(p.hunger <= 0 || (p.hunger / p.maxHunger) < 0.15) {
    G.autoExploreActive = false;
    log('Auto-explore stopped: starving!', 'warning');
    return;
  }

  // Shared BFS path finder (returns path array or null if unreachable)
  function bfsPath(tx, ty) {
    const vis = new Set([`${p.x},${p.y}`]);
    const q = [[p.x, p.y, []]];
    while(q.length > 0) {
      const [cx, cy, cpath] = q.shift();
      for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const nx2 = cx+dx, ny2 = cy+dy;
        const k2 = `${nx2},${ny2}`;
        if(nx2<0||nx2>=MAP_W||ny2<0||ny2>=MAP_H||vis.has(k2)) continue;
        vis.add(k2);
        if(level.tiles[ny2][nx2] === TILE.WALL) continue;
        const np = [...cpath, [nx2,ny2]];
        if(nx2===tx && ny2===ty) return np;
        q.push([nx2,ny2,np]);
      }
    }
    return null;
  }

  // Try to path toward visible wanted items (must be walkable destination)
  const wantedItems = level.items.filter(i =>
    !i.hidden && i.type !== 'trap' &&
    level.visible?.has(`${i.x},${i.y}`) &&
    level.tiles[i.y]?.[i.x] !== TILE.WALL &&
    autoExploreWantsItem(i)
  );
  wantedItems.sort((a,b) =>
    Math.sqrt((a.x-p.x)**2+(a.y-p.y)**2) - Math.sqrt((b.x-p.x)**2+(b.y-p.y)**2)
  );

  for(const item of wantedItems) {
    const ipath = bfsPath(item.x, item.y);
    if(!ipath || ipath.length === 0) continue; // Unreachable — skip
    const [nx, ny] = ipath[0];
    const moved = tryMove(nx - p.x, ny - p.y);
    if(moved) { endTurn(); return; }
    // If tryMove failed somehow, skip this item and try next
  }

  // BFS to find nearest unexplored tile
  const visited = new Set();
  const queue = [[p.x, p.y, []]];
  visited.add(`${p.x},${p.y}`);
  
  let target = null;
  let path = null;
  
  outer: while(queue.length > 0) {
    const [cx, cy, cpath] = queue.shift();
    
    for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      
      if(nx<0||nx>=MAP_W||ny<0||ny>=MAP_H||visited.has(key)) continue;
      visited.add(key);
      
      const tile = level.tiles[ny][nx];
      if(tile === TILE.WALL) continue;
      
      const newPath = [...cpath, [nx, ny]];
      
      if(!level.explored.has(key)) {
        // Don't target altar/shop tiles — they interrupt movement
        const tileType = level.tiles[ny][nx];
        if(tileType === TILE.ALTAR || tileType === TILE.SHOP) {
          // Mark as explored so we don't target them again, but skip as destinations
          level.explored.add(key);
          queue.push([nx, ny, newPath]);
          continue;
        }
        target = [nx, ny];
        path = newPath;
        break outer;
      }
      
      if(tile !== TILE.WALL) {
        queue.push([nx, ny, newPath]);
      }
    }
  }
  
  if(!target || !path || path.length === 0) {
    G.autoExploreActive = false;
    log('Auto-explore: map fully explored.', 'info');
    return;
  }
  
  const prevX = p.x, prevY = p.y;
  const [nx, ny] = path[0];
  const moved = tryMove(nx - p.x, ny - p.y);
  if(!moved || (p.x === prevX && p.y === prevY)) {
    // Didn't actually move (blocked or intercepted by altar/shop/etc) — stop
    G.autoExploreActive = false;
    return;
  }
  
  endTurn();
}

// ─── DRUID SHAPESHIFTING ─────────────────────────────────────
function applyShapeshift(form) {
  const p = G.player;
  // Store original stats
  p._originalForm = {
    maxHp: p.maxHp, hp: p.hp, baseAC: p.baseAC,
    str: p.stats.str, dex: p.stats.dex, con: p.stats.con
  };
  p.status.shifted = 30;
  p.status.shiftForm = form;

  if(form === 1) { // Wolf
    p.stats.str += 3;
    p.stats.dex += 2;
    p.baseAC -= 2;
    log('You transform into a wolf! Fast and fierce.', 'good');
  } else if(form === 2) { // Bear
    const hpBoost = Math.floor(p.maxHp * 0.5);
    p.maxHp += hpBoost;
    p.hp += hpBoost;
    p.baseAC += 4;
    log('You transform into a bear! Tough and mighty.', 'good');
  } else if(form === 3) { // Hawk
    const hpLoss = Math.floor(p.maxHp * 0.3);
    p.maxHp -= hpLoss;
    p.hp = Math.min(p.hp, p.maxHp);
    p.status.fly = 30;
    log('You transform into a hawk! Swift and airborne.', 'good');
  }
}

function revertShapeshift() {
  const p = G.player;
  if(!p._originalForm) return;
  const orig = p._originalForm;
  p.stats.str = orig.str;
  p.stats.dex = orig.dex;
  p.stats.con = orig.con;
  p.baseAC = orig.baseAC;
  p.maxHp = orig.maxHp;
  p.hp = Math.min(p.hp, p.maxHp);
  delete p._originalForm;
  delete p.status.shifted;
  delete p.status.shiftForm;
  delete p.status.fly;
  log('You return to your natural form.', 'info');
}

// ─── SPELLS / ABILITIES ──────────────────────────────────────
function castSpell(spellKey) {
  const p = G.player;
  const spell = SPELL_DATA[spellKey];
  if(!spell) return;

  // Ring of the Berserker blocks spellcasting
  if([p.equipped.ring1, p.equipped.ring2].some(r => r?.noSpells) && spell.mp > 0) {
    log('The Ring of the Berserker burns with fury — you cannot cast spells!', 'warning');
    return;
  }

  if(spell.mp > 0 && p.mp < spell.mp) {
    log('Not enough mana!', 'warning');
    return;
  }
  
  p.mp -= spell.mp;
  gainPiety('casting_spells', 1);
  
  switch(spell.effect) {
    case 'heal':
      const heal = rng.dice(2, 6, p.level);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      log(`You are healed for ${heal} HP.`, 'good');
      break;
    case 'heal_full':
      p.hp = p.maxHp;
      log('You are fully healed!', 'good');
      break;
    case 'restore_mp':
      p.mp = Math.min(p.maxMp, p.mp + spell.power + spell.mp);
      log('Your mana is restored.', 'good');
      break;
    case 'buff_attack':
      p.status.bless = 20;
      log('You feel divinely blessed!', 'good');
      break;
    case 'damage':
      // Target nearest visible monster
      const nearest = getNearestMonster();
      if(!nearest) { log('No target!', 'warning'); p.mp += spell.mp; return; }
      let dmg = rng.dice(spell.power/3|0 || 2, 6, p.stats.int - 10);
      // INT scaling: high INT gives a multiplier (14 INT = +10%, 18 INT = +20%)
      const intScale = 1 + Math.max(0, (p.stats.int - 12)) * 0.05;
      dmg = Math.floor(dmg * intScale);
      if(p.passives.includes('magic_affinity')) dmg = Math.floor(dmg * 1.2);
      if(p.status.spell_power_boost) dmg += 3;
      if(p.equipped.weapon?.spellPowerBonus) dmg += p.equipped.weapon.spellPowerBonus;
      nearest.hp -= dmg;
      log(`Your ${spell.name} hits ${nearest.name} for ${dmg} damage!`, 'combat');
      gainPiety('killing_with_magic', 1);
      if(nearest.hp <= 0) killMonster(nearest);
      break;
    case 'paralyze':
      const ptarget = getNearestMonster(m => m.undead);
      if(!ptarget) { log('No undead nearby!', 'warning'); p.mp += spell.mp; return; }
      ptarget.paralyzed = rng.int(3, 8);
      log(`${ptarget.name} is held!`, 'good');
      break;
    case 'sleep':
      let slept = 0;
      G.level.monsters.filter(m => {
        const d = Math.sqrt((m.x-p.x)**2+(m.y-p.y)**2);
        return d <= 6 && G.level.visible?.has(`${m.x},${m.y}`) && m.hp <= 10 + p.level * 2;
      }).slice(0,3).forEach(m => { m.sleeping = rng.int(5, 15); slept++; });
      log(slept ? `${slept} enemies fall asleep!` : 'No suitable targets.', slept ? 'good' : 'warning');
      break;
    case 'recall':
      log('You are teleported to the dungeon entrance!', 'system');
      // Emergency teleport to start
      const [sx, sy] = G.level.startPos;
      p.x = sx; p.y = sy;
      break;
    case 'polymorph':
      const polytarget = getNearestMonster();
      if(!polytarget) { log('No target!', 'warning'); p.mp += spell.mp; return; }
      polytarget.sym = rng.pick(['r','b','k']);
      polytarget.hp = rng.int(1, 5);
      polytarget.maxHp = polytarget.hp;
      polytarget.atk = [[1,3,0]];
      polytarget.xp = 1;
      log(`${polytarget.name} is polymorphed into a harmless creature!`, 'good');
      polytarget.name = 'Polymorphed Creature';
      break;
    case 'disintegrate':
      const dtarget = getNearestMonster();
      if(!dtarget) { log('No target!', 'warning'); p.mp += spell.mp; return; }
      if(dtarget.hp <= 50 || rng.bool(0.3)) {
        log(`${dtarget.name} is disintegrated!`, 'combat');
        killMonster(dtarget);
      } else {
        const ddmg = rng.dice(5, 8, p.stats.int - 10);
        dtarget.hp -= ddmg;
        log(`Disintegrate deals ${ddmg} to ${dtarget.name}!`, 'combat');
        if(dtarget.hp <= 0) killMonster(dtarget);
      }
      break;
    case 'power_strike':
      p.status.power_strike = 1;
      log('You prepare a devastating power strike!', 'info');
      break;
    case 'steady_aim':
      p.steadyAim = true;
      log('You take careful aim. Next ranged attack is a guaranteed critical hit.', 'info');
      break;
    case 'cure_poison':
      if(p.status.poisoned) {
        delete p.status.poisoned;
        log('The poison is purged from your body!', 'good');
      } else {
        log('You are not poisoned.', 'info');
        p.mp += spell.mp; // refund
      }
      break;
    case 'sanctuary_spell':
      p.status.sanctuary = 10;
      log('A divine ward surrounds you! Enemies struggle to strike you.', 'good');
      break;
    case 'smite': {
      const starget = getNearestMonster();
      if(!starget) { log('No target!', 'warning'); p.mp += spell.mp; return; }
      let sdmg = rng.dice(3, 8, p.stats.wis - 10);
      if(starget.undead) sdmg += rng.dice(1, 8, 0);
      if(p.passives.includes('magic_affinity')) sdmg = Math.floor(sdmg * 1.2);
      starget.hp -= sdmg;
      log(`Holy fire smites ${starget.name} for ${sdmg} damage!${starget.undead ? ' The undead burns!' : ''}`, 'combat');
      if(starget.hp <= 0) killMonster(starget);
      break;
    }
    case 'detect_monsters':
      p.status.detect_monsters = 20;
      log('Your senses expand. You feel the presence of all creatures on this floor.', 'good');
      break;
    case 'arcane_shield':
      p.status.arcane_shield = 15;
      log('A shimmering magical barrier surrounds you! +4 AC.', 'good');
      break;
    case 'haste':
      p.status.haste = 8;
      log('Time slows around you. You move with supernatural speed!', 'good');
      break;
    case 'magic_missile': {
      const mmTarget = getNearestMonster();
      if(!mmTarget) { log('No target!', 'warning'); p.mp += spell.mp; return; }
      const missiles = 1 + Math.floor(p.level / 3);
      let totalDmg = 0;
      for(let i = 0; i < missiles; i++) totalDmg += rng.dice(1, 4, 1);
      if(p.passives.includes('magic_affinity')) totalDmg = Math.floor(totalDmg * 1.2);
      if(p.status.spell_power_boost) totalDmg += 3;
      mmTarget.hp -= totalDmg;
      log(`${missiles} magic missile${missiles>1?'s':''} strike${missiles===1?'s':''} ${mmTarget.name} for ${totalDmg} damage!`, 'combat');
      gainPiety('killing_with_magic', 1);
      if(mmTarget.hp <= 0) killMonster(mmTarget);
      break;
    }

    // ─── THIEF SPELLS ───
    case 'backstab': {
      const btarget = getNearestMonster(m => !m.alerted);
      if(!btarget) { log('No unaware targets nearby!', 'warning'); p.mp += spell.mp; return; }
      const [dn, dd, db] = getWeaponDamage(p);
      let bdmg = rng.dice(dn, dd, getDamageBonus(p) + db) * 3;
      bdmg = Math.max(1, bdmg);
      btarget.hp -= bdmg;
      log(`You backstab ${btarget.name} for ${bdmg} damage!`, 'combat');
      if(typeof addTileEffect === 'function') addTileEffect(btarget.x, btarget.y, [255,255,100], 400);
      if(btarget.hp <= 0) killMonster(btarget);
      break;
    }
    case 'smoke_bomb':
      p.status.invisible = 5;
      log('You hurl a smoke bomb! You vanish in a cloud of smoke.', 'good');
      break;
    case 'poison_blade':
      p.status.poison_blade = 5;
      log('You coat your blade with deadly venom. Next 5 attacks will poison.', 'good');
      break;
    case 'shadow_step': {
      const starget = getNearestMonster();
      if(!starget) { log('No target!', 'warning'); p.mp += spell.mp; return; }
      // Teleport behind target (opposite side from player)
      const sdx = Math.sign(starget.x - p.x);
      const sdy = Math.sign(starget.y - p.y);
      const stx = starget.x + sdx;
      const sty = starget.y + sdy;
      if(stx >= 0 && stx < MAP_W && sty >= 0 && sty < MAP_H && G.level.tiles[sty][stx] !== TILE.WALL) {
        p.x = stx; p.y = sty;
        log(`You shadow-step behind ${starget.name}!`, 'good');
      } else {
        p.x = starget.x - sdx; p.y = starget.y - sdy;
        log(`You shadow-step near ${starget.name}!`, 'good');
      }
      break;
    }
    case 'detect_traps':
      G.level.items.filter(i => i.type === 'trap' && !i.triggered).forEach(t => { t.hidden = false; });
      log('Your senses heighten. All traps on this floor are revealed!', 'good');
      break;

    // ─── DRUID SPELLS ───
    case 'shapeshift': {
      if(p.status.shifted) {
        // Revert existing shift
        revertShapeshift();
        break;
      }
      const form = spell.power; // 1=wolf, 2=bear, 3=hawk
      applyShapeshift(form);
      break;
    }
    case 'entangle': {
      let entangled = 0;
      G.level.monsters.filter(m => {
        const d = Math.sqrt((m.x-p.x)**2+(m.y-p.y)**2);
        return d <= 4 && G.level.visible?.has(`${m.x},${m.y}`) && !m.statusImmune;
      }).forEach(m => { m.paralyzed = 5; entangled++; });
      log(entangled ? `Grasping roots entangle ${entangled} enemies!` : 'No enemies in range.', entangled ? 'good' : 'warning');
      break;
    }
    case 'bark_skin':
      p.status.bark_skin = 20;
      log('Your skin hardens to tough bark. +3 AC!', 'good');
      break;
    case 'regen_spell':
      p.status.regen_spell = 15;
      log('Natural energy flows through you. Regenerating!', 'good');
      break;
    case 'summon_animal': {
      // Summon wolf companion (max 1 summoned animal at a time)
      if(p.companions.some(c => c.summoned)) {
        log('You already have a summoned companion.', 'warning');
        p.mp += spell.mp;
        return;
      }
      const wx = p.x + 1, wy = p.y;
      const wolf = {
        id: 'summoned_wolf', name: 'Summoned Wolf', sym: 'd', color: '#88aa44',
        cls: 'animal', hp: 12 + p.level * 2, maxHp: 12 + p.level * 2, atk: [[1,6,p.level]],
        x: wx, y: wy, companion: true, animal: true, summoned: true, stayPut: false,
        facing: 'd', animState: 'idle', compLevel: 1, xp: 0
      };
      p.companions.push(wolf);
      log('A wolf materializes from the shadows to aid you!', 'good');
      break;
    }
    case 'poison_cloud': {
      let poisoned = 0;
      G.level.monsters.filter(m => {
        const d = Math.sqrt((m.x-p.x)**2+(m.y-p.y)**2);
        return d <= 3 && G.level.visible?.has(`${m.x},${m.y}`) && !m.statusImmune;
      }).forEach(m => { m.poisoned = rng.int(5,10); poisoned++; });
      log(poisoned ? `A toxic cloud engulfs ${poisoned} enemies!` : 'No enemies in range.', poisoned ? 'good' : 'warning');
      break;
    }

    // ─── RANGER SPELLS ───
    case 'tracking':
      p.status.detect_monsters = 30;
      log('You focus your senses. All creatures on this floor are revealed!', 'good');
      break;
    case 'called_shot':
      p.status.called_shot = 1;
      log('You line up a perfect shot. Next ranged attack: +4 hit, +1d6 damage.', 'info');
      break;
    case 'camouflage':
      p.status.camouflage = 10;
      p.status.invisible = 10;
      log('You blend into your surroundings. Invisible while stationary.', 'good');
      break;

    // ─── WARLOCK SPELLS ───
    case 'eldritch_blast': {
      const etarget = getNearestMonster();
      if(!etarget) { log('No target!', 'warning'); return; }
      let edmg = Math.floor((p.piety || 0) * 0.5) + rng.dice(2, 6, 0);
      if(p.passives.includes('magic_affinity')) edmg = Math.floor(edmg * 1.2);
      etarget.hp -= edmg;
      log(`Eldritch energy strikes ${etarget.name} for ${edmg} damage!`, 'combat');
      if(typeof addTileEffect === 'function') addTileEffect(etarget.x, etarget.y, [170,60,200], 300);
      gainPiety('casting_spells', 2);
      if(etarget.hp <= 0) killMonster(etarget);
      break;
    }
    case 'hex': {
      const htarget = getNearestMonster();
      if(!htarget) { log('No target!', 'warning'); p.mp += spell.mp; return; }
      htarget.hexed = 15;
      htarget.ac -= 2;
      log(`You place a hex on ${htarget.name}! Its defenses crumble.`, 'combat');
      break;
    }
    case 'dark_pact': {
      const sacrifice = Math.floor(p.maxHp * 0.2);
      const restore = Math.floor(p.maxMp * 0.4);
      if(p.hp <= sacrifice + 1) { log('Too dangerous — you would die!', 'warning'); return; }
      p.hp -= sacrifice;
      p.mp = Math.min(p.maxMp, p.mp + restore);
      log(`You sacrifice ${sacrifice} HP and restore ${restore} MP!`, 'warning');
      gainPiety('taking_damage', 3);
      break;
    }
    case 'soul_drain': {
      const sdtarget = getNearestMonster();
      if(!sdtarget) { log('No target!', 'warning'); p.mp += spell.mp; return; }
      const sddmg = rng.dice(3, 6, Math.floor((p.piety||0) * 0.3));
      sdtarget.hp -= sddmg;
      const sdheal = Math.floor(sddmg * 0.5);
      p.hp = Math.min(p.maxHp, p.hp + sdheal);
      log(`You drain ${sdtarget.name}'s soul for ${sddmg} damage, healing ${sdheal}!`, 'combat');
      if(sdtarget.hp <= 0) killMonster(sdtarget);
      break;
    }
    case 'dimensional_rift': {
      const walkable = [];
      for(let y=0; y<MAP_H; y++) for(let x=0; x<MAP_W; x++) {
        if(G.level.explored.has(`${x},${y}`) && (G.level.tiles[y][x]===TILE.FLOOR||G.level.tiles[y][x]===TILE.CORRIDOR) && !G.level.monsters.some(m=>m.x===x&&m.y===y)) {
          walkable.push([x,y]);
        }
      }
      if(walkable.length > 0) {
        const [nx, ny] = rng.pick(walkable);
        p.x = nx; p.y = ny;
        log('Reality tears open — you step through the rift!', 'good');
      } else {
        log('The rift fails to form.', 'warning');
        p.mp += spell.mp;
      }
      break;
    }
  }

  closeSpellScreen();
  endTurn();
}

function getNearestMonster(filter) {
  const p = G.player;
  return G.level.monsters
    .filter(m => G.level.visible?.has(`${m.x},${m.y}`) && (!filter || filter(m)))
    .sort((a,b) => (Math.sqrt((a.x-p.x)**2+(a.y-p.y)**2)) - (Math.sqrt((b.x-p.x)**2+(b.y-p.y)**2)))[0] || null;
}

// Turn Undead (Cleric)
function turnUndead() {
  if(G.player.cls !== 'cleric') { log('Only Clerics can turn undead!', 'warning'); return; }
  const p = G.player;
  let turned = 0;
  
  G.level.monsters.filter(m => m.undead && G.level.visible?.has(`${m.x},${m.y}`)).forEach(m => {
    const roll = rng.dice(1, 20, Math.floor((p.stats.wis-10)/2) + p.level);
    if(roll >= 15) {
      m.frightened = rng.int(5, 15);
      turned++;
    } else if(roll >= 10 && m.hp <= p.level * 5) {
      killMonster(m);
      log(`${m.name} is destroyed by divine power!`, 'good');
    }
  });
  
  if(turned > 0) log(`You turn ${turned} undead!`, 'good');
  else log('Your turning attempt fails.', 'info');
  
  endTurn();
}

// ─── GOD SYSTEM ──────────────────────────────────────────────
function gainPiety(action, amount) {
  const p = G.player;
  if(!p.god) return;
  if(p.cls === 'warlock') amount *= 2;
  const god = GODS[p.god];
  if(!god.pietyGain.includes(action) && !['kills','taking_damage'].includes(action)) return;
  
  p.piety = Math.min(100, p.piety + amount);
  
  // God gifts at piety thresholds
  if(p.piety === 25) grantGodGift(1);
  if(p.piety === 50) grantGodGift(2);
  if(p.piety === 75) grantGodGift(3);
}

function grantGodGift(tier) {
  const p = G.player;
  const god = GODS[p.god];
  const gift = god.gifts[tier-1] || god.gifts[0];
  
  switch(gift) {
    case 'combat_bonus': p.status.blessed_weapon = 999; log(`${god.name} blesses your weapon!`, 'god'); break;
    case 'lifesteal': p.status.lifesteal = 999; log(`${god.name} grants you lifesteal!`, 'god'); break;
    case 'spell_power': p.status.spell_power_boost = 999; log(`${god.name} amplifies your magic!`, 'god'); break;
    case 'shadow_step': p.status.shadow_step = 999; log(`${god.name} grants shadow step!`, 'god'); break;
    case 'dragon_scales': p.baseAC += 3; log(`${god.name} grants you draconic scales! AC +3`, 'god'); break;
    case 'weapon_enchant':
      const wpn = p.equipped.weapon;
      if(wpn) { wpn.enchant = (wpn.enchant||0)+1; log(`${god.name} enchants your ${wpn.name}!`, 'god'); }
      break;
    default:
      // Heal
      const heal = rng.int(10, 30);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      log(`${god.name} is pleased and restores ${heal} HP!`, 'god');
  }
}

function useGodAbility() {
  const p = G.player;
  if(!p.god) { log('You worship no god.', 'info'); return; }
  const god = GODS[p.god];
  const ability = god.activeAbility;
  
  if(p.piety < ability.piety) {
    log(`Insufficient piety! Need ${ability.piety}.`, 'warning');
    return;
  }
  
  p.piety -= ability.piety;
  log(`You invoke ${god.name}'s ${ability.name}!`, 'god');

  // Alignment shift from divine invocation
  if(god.alignment === 'lawful') shiftAlignment(2, 'divine invocation');
  else if(god.alignment === 'chaotic') shiftAlignment(-2, 'divine invocation');

  switch(p.god) {
    case 'mithras':
      p.status.divine_shield = 20;
      const hpBonus = rng.int(10, 20);
      p.hp = Math.min(p.maxHp + hpBonus, p.hp + hpBonus);
      p.status.double_damage = 20;
      log('You are empowered with the Unconquered Sun\'s strength!', 'god');
      break;
    case 'sekhmet':
      p.status.sekhmet_frenzy = 15;
      log('Blood Frenzy! You will heal from every kill!', 'god');
      break;
    case 'thoth':
      p.inventory.forEach(i => { identifyItem(i); });
      log("All your items are revealed by Thoth's wisdom!", 'god');
      break;
    case 'hecate':
      // Summon spectral hounds
      for(let i=0; i<3; i++) {
        const hx = p.x + rng.int(-2,2);
        const hy = p.y + rng.int(-2,2);
        G.level.monsters.push({
          key:'spectral_hound', name:'Spectral Hound', sym:'d', color:'#8866cc',
          x:hx, y:hy, hp:15, maxHp:15, ac:14, atk:[[1,6,2]], xp:0,
          undead:true, friendly:true, confused:0, paralyzed:0, sleeping:0, frightened:0, poisoned:0,
          alerted:true, id:`hound_${Date.now()}_${i}`, ai:'normal'
        });
      }
      log('Three spectral hounds appear to serve you!', 'god');
      break;
    case 'ogun':
      p.status.iron_blessing = 30;
      log('Ogun blesses your iron! +5 to attack and AC for 30 turns.', 'god');
      break;
    case 'tiamat':
      p.status.dragon_aspect = 25;
      p.baseAC += 8;
      p.status.breath_fire = 25;
      log('Dragon Aspect! You grow scales and breathe fire!', 'god');
      break;
    case 'nephthys':
      p.status.shadow_form = 10;
      log('You become one with shadow. You are invisible and can pass through walls briefly.', 'god');
      break;
    case 'zagyg':
      zagyRandomEvent(true);
      break;
  }
  
  endTurn();
}

function zagyRandomEvent(forced=false) {
  const events = [
    () => { G.level.monsters.forEach(m => m.confused = 5); log('Zagyg! All monsters are confused!', 'god'); },
    () => { G.player.hp = Math.min(G.player.maxHp, G.player.hp + rng.int(20, 50)); log('Zagyg heals you! (for now)', 'god'); },
    () => { teleportPlayer(); log('Zagyg teleports you!', 'god'); },
    () => {
      const item = generateItem(G.floor);
      item.x = G.player.x; item.y = G.player.y;
      G.level.items.push(item);
      log(`Zagyg drops a ${item.name} at your feet!`, 'god');
    },
    () => {
      const n = rng.int(2,5);
      for(let i=0;i<n;i++) {
        const key = rng.pick(Object.keys(MONSTER_TEMPLATES).filter(k => !MONSTER_TEMPLATES[k].isBoss));
        const mv = MONSTER_TEMPLATES[key];
        const mx = G.player.x + rng.int(-4,4);
        const my = G.player.y + rng.int(-4,4);
        if(mx>=0&&mx<MAP_W&&my>=0&&my<MAP_H&&G.level.tiles[my][mx]!==TILE.WALL) {
          G.level.monsters.push(createMonster(key, mv, mx, my, G.floor));
        }
      }
      log('Zagyg summons monsters! Hilarious!', 'god');
    },
    () => { G.player.stats.str = Math.max(1,rng.int(3,18)); log('Zagyg randomizes your STR!', 'god'); },
    () => { G.player.gold += rng.int(100,500); log('Zagyg gives you gold! It\'s raining gold!', 'god'); },
    () => { G.player.hp -= rng.dice(1,6,0); log('Zagyg pokes you for fun.', 'god'); },
    () => { G.player.status.speed_boost = 15; log('Zagyg makes you really fast for a bit!', 'god'); },
    () => {
      [G.player.stats.str, G.player.stats.dex] = [G.player.stats.dex, G.player.stats.str];
      log('Zagyg swaps your STR and DEX!', 'god');
    },
  ];
  
  const event = rng.pick(events);
  event();
}

function applyGodWrath(godKey) {
  const god = GODS[godKey];
  const p = G.player;
  const wrath = rng.pick(god.anger);
  
  switch(wrath) {
    case 'curses_weapon':
      if(p.equipped.weapon) { p.equipped.weapon.cursed = true; p.equipped.weapon.enchant = (p.equipped.weapon.enchant||0) - 2; }
      log(`${god.name} curses your weapon in fury!`, 'god');
      break;
    case 'strikes_blind':
      p.status.blinded = 10;
      log(`${god.name} blinds you!`, 'god');
      break;
    case 'disease_curse':
      p.status.poisoned = 20;
      log(`${god.name} plagues you with disease!`, 'god');
      break;
    case 'scrambles_spells':
      p.spells = rng.shuffle(p.spells);
      log(`${god.name} scrambles your spell memory!`, 'god');
      break;
    case 'weapon_rusts':
      if(p.equipped.weapon) { p.equipped.weapon.enchant = (p.equipped.weapon.enchant||0) - 1; }
      log(`${god.name} rusts your weapon!`, 'god');
      break;
    default:
      const dmg = rng.dice(2, 6, 5);
      p.hp -= dmg;
      log(`${god.name}'s wrath strikes you for ${dmg} damage!`, 'god');
      if(p.hp <= 0) die(`the wrath of ${god.name}`);
  }
}

function abandonGod() {
  const p = G.player;
  if(!p.god) return;
  const oldGod = p.god;
  G.godFledFrom = oldGod;
  log(`You abandon ${GODS[oldGod].name}!`, 'god');
  log(`${GODS[oldGod].name} is FURIOUS!`, 'warning');
  log(GODS[oldGod].apostasy, 'god');
  if(p.cls === 'warlock') {
    log('Your patron abandons you. Without divine power, the void claims your soul.', 'death');
    die('divine abandonment');
    return;
  }
  applyGodWrath(oldGod);
  p.god = null;
  p.piety = 0;
  closeGodScreen();
}

function joinGod(godKey) {
  const p = G.player;
  if(p.god) abandonGod();
  p.god = godKey;
  p.piety = 5;
  G.godFledFrom = null;
  log(`You kneel before ${GODS[godKey].name}!`, 'god');
  log(GODS[godKey].flavor, 'god');

  // Alignment shift from pledging
  const godAlign = GODS[godKey].alignment;
  if(godAlign === 'lawful') shiftAlignment(10, `pledging to ${GODS[godKey].name}`);
  else if(godAlign === 'chaotic') shiftAlignment(-10, `pledging to ${GODS[godKey].name}`);
  else {
    const shift = p.alignment > 0 ? -5 : (p.alignment < 0 ? 5 : 0);
    if(shift) shiftAlignment(shift, `pledging to ${GODS[godKey].name}`);
  }

  closeGodScreen();
  endTurn();
}

function prayGod() {
  const p = G.player;
  if(!p.god) {
    // Faithless — check if standing on an altar to open god info
    const tile = G.level.tiles[p.y][p.x];
    if(tile === TILE.ALTAR) {
      const altarKey = `${p.x},${p.y}`;
      const altarGodKey = G.level.altarGods?.[altarKey];
      if(altarGodKey && GODS[altarGodKey]) {
        openGodScreen(altarGodKey);
        return;
      }
    }
    log('You have no faith. Find an altar to pledge yourself to a god.', 'god');
    return;
  }
  // Prayer: gain small piety, chance of gift
  gainPiety('prayer', 2);
  const godAlign = GODS[p.god].alignment;
  if(godAlign === 'lawful') shiftAlignment(1, 'prayer');
  else if(godAlign === 'chaotic') shiftAlignment(-1, 'prayer');
  log(`You pray to ${GODS[p.god].name}.`, 'god');
  if(p.hp < p.maxHp * 0.3 && p.piety >= 30) {
    const heal = rng.int(5, 15);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    p.piety -= 10;
    log(`${GODS[p.god].name} heals you for ${heal} HP!`, 'god');
  }
  endTurn();
}

// ─── ITEMS / INVENTORY ───────────────────────────────────────
function useItem(item) {
  const p = G.player;
  
  if(item.type === 'food') {
    p.hunger = Math.min(p.maxHunger, p.hunger + item.nutrition);
    p.inventory = p.inventory.filter(i => i !== item);
    log(`You eat the ${item.name}.`, 'info');
    if(item.rng_effect) {
      const effs = [
        () => { p.hp = Math.min(p.maxHp, p.hp + rng.int(5,15)); log('It tastes strange and heals you!', 'good'); },
        () => { p.status.confused = 5; log('It makes you feel dizzy.', 'warning'); },
        () => { p.stats.str += 1; log('You feel stronger!', 'good'); },
        () => { p.mp = Math.min(p.maxMp, p.mp + rng.int(5,10)); log('Your mind clears!', 'good'); },
      ];
      rng.pick(effs)();
    }
    endTurn();
    return;
  }
  
  if(item.type === 'potion') {
    applyPotion(item);
    p.inventory = p.inventory.filter(i => i !== item);
    endTurn();
    return;
  }
  
  if(item.type === 'scroll') {
    applyScroll(item);
    p.inventory = p.inventory.filter(i => i !== item);
    gainPiety('reading_scrolls', 1);
    endTurn();
    return;
  }
}

function conSave(dc) {
  const p = G.player;
  const conMod = Math.floor((p.stats.con - 10) / 2);
  return rng.dice(1, 20, conMod) >= dc;
}

function applyPotion(item) {
  const p = G.player;
  const wasKnown = item.identified || GAME_IDENTIFIED_POTIONS.has(item.effect);
  const dispName = getItemDisplayName(item);
  identifyItem(item);
  if(!wasKnown) {
    log(`You drink the ${dispName}... it is a ${item.name}!`, 'info');
  } else {
    log(`You drink the ${item.name}.`, 'info');
  }
  
  switch(item.effect) {
    case 'mutate':
      tryGrantMutation('potion');
      break;
    case 'heal':
      const heal = (item.power || 10) + Math.floor(p.level * 1.5);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      log(`You are healed for ${heal} HP!`, 'good');
      break;
    case 'heal_full':
      p.hp = p.maxHp;
      log('You are fully healed!', 'good');
      break;
    case 'restore_mp':
      p.mp = Math.min(p.maxMp, p.mp + (item.power || 15));
      log('Your mana is restored!', 'good');
      break;
    case 'temp_str': {
      const strAmt = item.power || 4;
      p.status.temp_str = item.duration || 20;
      p.status.temp_str_amount = strAmt;
      p.stats.str += strAmt;
      log(`Your strength surges to ${p.stats.str}!`, 'good');
      break;
    }
    case 'temp_speed':
      p.status.speed_boost = item.duration || 15;
      log('You move with incredible speed!', 'good');
      break;
    case 'invisibility':
      p.status.invisible = item.duration || 20;
      log('You fade from sight!', 'good');
      break;
    case 'confuse_self':
      p.status.confused = 8;
      log('The world spins!', 'warning');
      break;
    case 'poison_self':
      if(!p.passives.includes('poison_resist')) {
        p.status.poisoned = 10;
        log('It tastes awful! You are poisoned!', 'warning');
      } else {
        log('The poison has no effect on you.', 'good');
      }
      break;
    case 'gain_xp':
      gainXP(item.power || 300);
      log('You feel wiser!', 'good');
      break;
    case 'blind_self':
      p.status.blinded = item.duration || 15;
      log('Everything goes dark! You can barely see!', 'warning');
      computeFOV();
      break;
    case 'paralyze_self': {
      let dur = item.duration || 5;
      if(conSave(12)) {
        dur = Math.max(1, Math.floor(dur / 2));
        log('You feel your limbs stiffen, but you fight it off partially!', 'warning');
      } else {
        log('Your body locks up! You cannot move!', 'warning');
      }
      p.status.paralyzed = dur;
      break;
    }
    case 'weaken_self': {
      const amount = item.power || 4;
      p.status.weakened = item.duration || 30;
      p.status.weakened_amount = amount;
      p.stats.str -= amount;
      log(`Your muscles wither! STR reduced by ${amount}!`, 'warning');
      break;
    }
    case 'amnesia':
      if(G.level?.explored) {
        G.level.explored = new Set();
        log('Your memories dissolve... where are you? The map fades from your mind!', 'warning');
        computeFOV();
      }
      break;
    case 'burn_self': {
      let dur = item.duration || 8;
      if(conSave(12)) {
        dur = Math.max(2, Math.floor(dur / 2));
        log('The potion ignites in your stomach! You resist the worst of it!', 'warning');
      } else {
        log('The potion ignites in your stomach! You are burning alive!', 'warning');
      }
      p.status.burning = dur;
      break;
    }
    case 'phasing':
      p.status.phasing = item.duration || 20;
      log('Reality shifts around you! You begin flickering in and out of existence!', 'warning');
      break;
    case 'berserk':
      p.status.berserk = item.duration || 10;
      p.status.berserk_dmg = 3;
      log('BLOOD RAGE! You lose control and attack everything in sight!', 'warning');
      break;
    case 'magic_resist':
      p.status.magic_resist = item.duration || 25;
      log('A shimmering ward surrounds you. You feel resistant to magic!', 'good');
      break;
    case 'clarity':
      let cured = [];
      if(p.status.confused) { delete p.status.confused; cured.push('confusion'); }
      if(p.status.blinded) { delete p.status.blinded; cured.push('blindness'); computeFOV(); }
      if(p.status.paralyzed) { delete p.status.paralyzed; cured.push('paralysis'); }
      if(p.status.poisoned) { delete p.status.poisoned; cured.push('poison'); }
      if(p.status.berserk) { delete p.status.berserk; delete p.status.berserk_dmg; cured.push('berserk rage'); }
      if(p.status.phasing) { delete p.status.phasing; cured.push('phasing'); }
      if(p.status.burning) { delete p.status.burning; cured.push('burning'); }
      if(p.status.corroded) { delete p.status.corroded; delete p.status.corroded_amount; cured.push('corrosion'); }
      if(p.status.slowed) { delete p.status.slowed; cured.push('slowing'); }
      if(p.status.weakened) {
        p.stats.str += (p.status.weakened_amount || 4);
        delete p.status.weakened; delete p.status.weakened_amount;
        cured.push('weakness');
      }
      if(cured.length > 0) {
        log(`Crystal clarity washes over you! Cured: ${cured.join(', ')}.`, 'good');
      } else {
        log('A wave of clarity washes over you. Your mind feels sharp!', 'good');
      }
      break;
    case 'antidote':
      if(p.status.poisoned) {
        delete p.status.poisoned;
        p.status.poison_resist = 20;
        log('The antidote purges the poison! You feel resistant to venom.', 'good');
      } else {
        p.status.poison_resist = 20;
        log('You drink the antidote. You feel resistant to poison for a while.', 'good');
      }
      break;
    case 'restoration':
      let restored = [];
      if(p.status.confused) { delete p.status.confused; restored.push('confusion'); }
      if(p.status.blinded) { delete p.status.blinded; restored.push('blindness'); computeFOV(); }
      if(p.status.weakened) { p.stats.str += (p.status.weakened_amount||4); delete p.status.weakened; delete p.status.weakened_amount; restored.push('weakness'); }
      if(restored.length > 0) {
        log(`You feel restored! Cured: ${restored.join(', ')}.`, 'good');
      } else {
        log('A warm glow suffuses your body. You feel restored!', 'good');
        p.hp = Math.min(p.maxHp, p.hp + rng.int(5, 15));
      }
      break;
    case 'temp_might': {
      const amt = item.power || 2;
      p.status.might = item.duration || 20;
      p.status.might_amount = amt;
      p.stats.str += amt;
      p.stats.dex += amt;
      p.stats.con += amt;
      log(`Power surges through you! STR, DEX, CON +${amt}!`, 'good');
      break;
    }
  }
}

function applyScroll(item) {
  const p = G.player;
  const wasKnown = item.identified || GAME_IDENTIFIED_SCROLLS.has(item.effect);
  const dispName = getItemDisplayName(item);
  identifyItem(item);
  if(!wasKnown) {
    log(`You read the ${dispName}... it is a ${item.name}!`, 'info');
  } else {
    log(`You read the ${item.name}.`, 'info');
  }
  
  switch(item.effect) {
    case 'teleport':
      teleportPlayer();
      break;
    case 'enchant_weapon':
      if(p.equipped.weapon) {
        p.equipped.weapon.enchant = (p.equipped.weapon.enchant||0) + 1;
        p.equipped.weapon.name = p.equipped.weapon.name.replace(/^\+\d+ /, '') ;
        p.equipped.weapon.name = `+${p.equipped.weapon.enchant} ${p.equipped.weapon.name}`;
        log(`Your ${p.equipped.weapon.name} glows!`, 'good');
      } else log('You have no weapon equipped.', 'warning');
      break;
    case 'enchant_armor':
      if(p.equipped.body) {
        p.equipped.body.enchant = (p.equipped.body.enchant||0)+1;
        log(`Your armor glows!`, 'good');
      } else log('You have no armor equipped.', 'warning');
      break;
    case 'identify':
      openIdentifyMenu();
      break;
    case 'map_level':
      G.level.tiles.forEach((row,y) => row.forEach((_,x) => G.level.explored.add(`${x},${y}`)));
      log('The dungeon layout is revealed!', 'good');
      break;
    case 'mass_fear':
      G.level.monsters.filter(m => G.level.visible?.has(`${m.x},${m.y}`)).forEach(m => { m.frightened = rng.int(8, 15); });
      log('All visible monsters flee in terror!', 'good');
      break;
    case 'curse_items':
      const item2 = p.equipped.weapon || p.equipped.body;
      if(item2) { item2.cursed = true; log(`Your ${item2.name} is cursed!`, 'warning'); }
      break;
    case 'acquire_item':
      const acquired = generateItem(G.floor + 3); // Good item
      acquired.enchant = (acquired.enchant||0) + rng.int(1,2);
      p.inventory.push(acquired);
      log(`A fine ${acquired.name} materializes in your hands!`, 'loot');
      break;
    case 'remove_curse':
      let rcFound = false;
      for(const eq of Object.values(p.equipped)) {
        if(eq && eq.cursed) {
          eq.cursed = false;
          eq.identified = true;
          log(`The curse on your ${eq.name} is lifted!`, 'good');
          rcFound = true;
        }
      }
      if(!rcFound) log('You feel protective energy wash over you.', 'good');
      break;
  }
}

function teleportPlayer() {
  const p = G.player;
  for(let i=0; i<100; i++) {
    const tx = rng.int(0, MAP_W-1);
    const ty = rng.int(0, MAP_H-1);
    if(G.level.tiles[ty][tx] === TILE.FLOOR) {
      p.x = tx; p.y = ty;
      log('You are teleported!', 'system');
      computeFOV();
      return;
    }
  }
}

function equipItem(item) {
  const p = G.player;
  
  if(item.type === 'weapon' || item.type === 'wand') {
    if(p.equipped.weapon?.cursed) { log('Your current weapon is cursed and cannot be removed!', 'warning'); return; }
    p.equipped.weapon = item;
    log(`You wield the ${item.name}.`, 'info');
  } else if(item.type === 'armor') {
    const slot = item.slot;
    if(slot === 'ring') {
      if(!p.equipped.ring1) { p.equipped.ring1 = item; log(`You put on the ${item.name}.`, 'info'); }
      else if(!p.equipped.ring2) { p.equipped.ring2 = item; log(`You put on the ${item.name}.`, 'info'); }
      else { log('You can only wear 2 rings!', 'warning'); return; }
    } else {
      if(p.equipped[slot]?.cursed) { log('Your current equipment is cursed!', 'warning'); return; }
      p.equipped[slot] = item;
      // Apply bonuses
      if(item.strBonus) p.stats.str += item.strBonus;
      if(item.intBonus) p.stats.int += item.intBonus;
      if(item.mpBonus) { p.maxMp += item.mpBonus; p.mp += item.mpBonus; }
      log(`You equip the ${item.name}.`, 'info');
    }
  } else if(item.type === 'amulet') {
    if(p.equipped.neck?.cursed) { log('Your amulet is cursed!', 'warning'); return; }
    p.equipped.neck = item;
    if(item.strangle) {
      log(item.cursedDesc, 'warning');
      p.status.strangling = 999;
    }
    if(item.hpBonus) { p.maxHp += item.hpBonus; p.hp += item.hpBonus; }
    log(`You wear the ${item.name}.`, 'info');
  } else if(item.type === 'ammo') {
    p.equipped.ammo = item;
    log(`You nock the ${item.name}.`, 'info');
  }
  
  // Rings and amulets are identified on equip
  if(item.type === 'ring' || item.type === 'amulet') {
    const wasKnown = item.identified || (item.templateKey && (GAME_IDENTIFIED_RINGS.has(item.templateKey) || GAME_IDENTIFIED_AMULETS.has(item.templateKey)));
    identifyItem(item);
    if(!wasKnown) log(`It is ${item.name}!`, 'good');
  }

  // Cursed item effects — revealed on equip
  if(item.cursed) {
    item.identified = true;
    if(item.cursedDesc) log(item.cursedDesc, 'warning');
    else log(`The ${item.name} is cursed!`, 'warning');
    if(item.strBonus && item.strBonus < 0) p.stats.str += item.strBonus;
  }

  // Unique item equip effects
  if(item.unique) {
    if(item.dexPenalty) { p.stats.dex -= item.dexPenalty; log(`The ${item.name} is heavy. DEX -${item.dexPenalty}.`, 'warning'); }
    if(item.wisBonus) p.stats.wis += item.wisBonus;
    if(item.mpBonus && item.type === 'weapon') { p.maxMp += item.mpBonus; p.mp += item.mpBonus; }
    if(item.pietyDrain && p.god) {
      p.piety = Math.max(0, p.piety - item.pietyDrain);
      log('The gods recoil from this dark artifact!', 'warning');
    }
    if(item.noSpells) log('A surge of rage silences your spellcasting ability!', 'warning');
    if(item.desc) log(item.desc, 'info');
  }
}

function unequipItem(item) {
  const p = G.player;
  if(item.cursed) { log(`The ${item.name} is cursed and won't come off!`, 'warning'); return; }
  
  for(const [slot, eq] of Object.entries(p.equipped)) {
    if(eq === item) {
      // Remove bonuses
      if(item.strBonus) p.stats.str -= item.strBonus;
      if(item.intBonus) p.stats.int -= item.intBonus;
      if(item.mpBonus) { p.maxMp -= item.mpBonus; p.mp = Math.min(p.mp, p.maxMp); }
      if(item.hpBonus) { p.maxHp -= item.hpBonus; p.hp = Math.min(p.hp, p.maxHp); }
      // Unique item unequip
      if(item.dexPenalty) p.stats.dex += item.dexPenalty;
      if(item.wisBonus) p.stats.wis -= item.wisBonus;
      p.equipped[slot] = null;
      log(`You remove the ${item.name}.`, 'info');
      return;
    }
  }
}

function fireRanged() {
  const p = G.player;
  const weapon = p.equipped.weapon;
  if(!weapon || !weapon.ranged) { log('You have no ranged weapon equipped!', 'warning'); return; }

  if(weapon.type === 'wand') {
    if(weapon.charges <= 0) { log('The wand is empty!', 'warning'); return; }
    weapon.charges--;
    // Identify wand on first use
    if(!weapon.identified) {
      identifyItem(weapon);
      log(`It's a ${weapon.name}!`, 'good');
    }
    // 10% fizzle chance
    if(rng.bool(0.1)) {
      log('The wand fizzles and sputters!', 'warning');
      endTurn();
      return;
    }
    fireWand(weapon);
    return;
  }

  const ammo = p.equipped.ammo;
  if(!ammo || ammo.count <= 0) { log('No ammunition!', 'warning'); return; }
  ammo.count--;
  if(ammo.count <= 0) { p.equipped.ammo = null; }

  const target = getNearestMonster();
  if(!target) { log('No target in sight!', 'warning'); return; }

  const calledShotBonus = p.status.called_shot ? 4 : 0;
  const atkBonus = getAttackBonus(p) + (p.cls === 'fightingman' ? Math.floor(p.stats.dex/4) : 0) + calledShotBonus;
  const roll = rng.dice(1, 20, atkBonus);
  const effectiveAC = target.ac - (weapon?.armorPierce || 0);
  const critThreshold = 19 - (weapon?.critBonus || 0);
  const crit = p.steadyAim || roll >= critThreshold;
  p.steadyAim = false;

  if(crit || roll >= effectiveAC - 10) {
    const [dn, dd, db] = weapon.dmg || [1, 6, 0];
    let dmg = rng.dice(dn, dd, getDamageBonus(p) + db + (ammo?.dmgBonus||0));
    // Ranger called shot
    if(p.status.called_shot) {
      dmg += rng.dice(1, 6, 0);
      delete p.status.called_shot;
    }
    if(target.undead && weapon?.bonusVsUndead) dmg += weapon.bonusVsUndead;
    if(crit) dmg *= 2;
    dmg = Math.max(1, dmg);
    target.hp -= dmg;
    log(`You ${crit?'critically ':''} hit ${target.name} with your ${weapon.name} for ${dmg} damage!`, 'combat');
    if(target.hp <= 0) killMonster(target);
  } else {
    log(`You miss ${target.name}.`, 'combat');
  }

  gainPiety('using_metal_weapons', 0.5);
  endTurn();
}

function fireWand(wand) {
  const p = G.player;
  const effect = wand.spellEffect;

  // Digging wand — special: carves through walls ahead
  if(effect === 'dig') {
    const lastDir = G._lastMoveDir || [1,0];
    let [dx, dy] = lastDir;
    let cx = p.x + dx, cy = p.y + dy;
    let dug = 0;
    while(cx >= 0 && cx < MAP_W && cy >= 0 && cy < MAP_H && dug < 8) {
      if(G.level.tiles[cy][cx] === TILE.WALL) {
        G.level.tiles[cy][cx] = TILE.CORRIDOR;
        dug++;
      }
      cx += dx; cy += dy;
    }
    log(dug > 0 ? `The wand blasts through ${dug} wall${dug>1?'s':''}!` : 'The wand hums but nothing happens.', dug > 0 ? 'good' : 'info');
    endTurn();
    return;
  }

  const target = getNearestMonster();
  if(!target) { log('No target in sight!', 'warning'); return; }

  switch(effect) {
    case 'fire': {
      const [dn, dd, db] = wand.dmg;
      const dmg = rng.dice(dn, dd, db);
      target.hp -= dmg;
      log(`A bolt of fire strikes ${target.name} for ${dmg} damage!`, 'combat');
      if(target.hp <= 0) killMonster(target);
      break;
    }
    case 'cold': {
      const [dn, dd, db] = wand.dmg;
      const dmg = rng.dice(dn, dd, db);
      target.hp -= dmg;
      target.speed = (target.speed || 1) * 0.5;
      log(`A ray of frost hits ${target.name} for ${dmg} damage! It slows down.`, 'combat');
      if(target.hp <= 0) killMonster(target);
      break;
    }
    case 'lightning': {
      const [dn, dd, db] = wand.dmg;
      const dmg = rng.dice(dn, dd, db);
      target.hp -= dmg;
      log(`Lightning arcs into ${target.name} for ${dmg} damage!`, 'combat');
      if(target.hp <= 0) killMonster(target);
      break;
    }
    case 'poison': {
      const [dn, dd, db] = wand.dmg;
      const dmg = rng.dice(dn, dd, db);
      target.hp -= dmg;
      target.poisoned = (target.poisoned || 0) + 5;
      log(`Venom sprays ${target.name} for ${dmg} damage! It is poisoned!`, 'combat');
      if(target.hp <= 0) killMonster(target);
      break;
    }
    case 'sleep': {
      if(target.undead || target.isBoss) {
        log(`${target.name} resists the sleep magic!`, 'warning');
      } else {
        target.sleeping = rng.int(5, 12);
        log(`${target.name} falls into a magical slumber!`, 'good');
      }
      break;
    }
    case 'polymorph': {
      if(target.isBoss) {
        log(`${target.name} resists the polymorph!`, 'warning');
      } else {
        const eligible = Object.entries(MONSTER_TEMPLATES).filter(([k,v]) => !v.unique && !v.isBoss);
        if(eligible.length > 0) {
          const [newKey, newTemplate] = rng.pick(eligible);
          const oldName = target.name;
          Object.assign(target, {
            key: newKey, name: newTemplate.name, sym: newTemplate.sym, color: newTemplate.color,
            ac: newTemplate.ac, xp: newTemplate.xp, ai: newTemplate.ai,
            atk: newTemplate.atk.map(a => [...a]),
          });
          const newHp = rng.dice(newTemplate.hp[0], newTemplate.hp[1], newTemplate.hp[2]);
          target.hp = newHp; target.maxHp = newHp;
          log(`${oldName} transforms into ${target.name}!`, 'good');
        }
      }
      break;
    }
    default: {
      const [dn, dd, db] = wand.dmg || [1,6,0];
      const dmg = rng.dice(dn, dd, db);
      target.hp -= dmg;
      log(`The wand zaps ${target.name} for ${dmg} damage!`, 'combat');
      if(target.hp <= 0) killMonster(target);
    }
  }

  endTurn();
}

function throwItem() {
  const p = G.player;
  const throwables = p.inventory.filter(i => i.type === 'thrown' && i.count > 0);
  if(throwables.length === 0) { log('You have nothing to throw!', 'warning'); return; }

  const target = getNearestMonster();
  if(!target) { log('No target in sight!', 'warning'); return; }

  // Pick the first throwable (or show menu if multiple types)
  if(throwables.length === 1) {
    executeThrow(throwables[0], target);
  } else {
    openThrowMenu(throwables, target);
  }
}

function executeThrow(item, target) {
  const p = G.player;
  const dist = Math.sqrt((target.x - p.x)**2 + (target.y - p.y)**2);

  if(item.range && dist > item.range) {
    log(`${target.name} is too far to reach with ${getItemDisplayName(item)}!`, 'warning');
    return;
  }

  item.count--;
  if(item.count <= 0) {
    p.inventory = p.inventory.filter(i => i !== item);
  }

  const strMod = Math.floor((p.stats.str - 10) / 2);
  const atkBonus = getAttackBonus(p) + strMod;
  const roll = rng.dice(1, 20, atkBonus);
  const effectiveAC = target.ac - (item?.armorPierce || 0);
  const critThreshold = 19 - (item?.critBonus || 0);
  const crit = roll >= critThreshold;

  if(crit || roll >= effectiveAC - 10) {
    const [dn, dd, db] = item.dmg || [1,4,0];
    let dmg = rng.dice(dn, dd, strMod + db);
    if(target.undead && item?.bonusVsUndead) dmg += item.bonusVsUndead;
    if(crit) dmg *= 2;
    if(dmg < 1) dmg = 1;
    target.hp -= dmg;
    const itemName = item.name.replace(/s$/, '');
    log(`You ${crit ? 'critically ' : ''}hit ${target.name} with a ${itemName} for ${dmg} damage!`, 'combat');
    if(target.hp <= 0) killMonster(target);
  } else {
    log(`Your ${item.name.replace(/s$/, '')} misses ${target.name}.`, 'combat');
  }

  endTurn();
}

function openThrowMenu(throwables, target) {
  let html = `<div style="font-family:'VT323',monospace;padding:10px;">
    <h2 style="color:var(--amber);font-size:26px;margin-bottom:10px;">THROW WHAT?</h2>`;
  throwables.forEach((item, i) => {
    const key = String.fromCharCode(97 + i);
    const dname = getItemDisplayName(item);
    html += `<div style="padding:5px 8px;cursor:pointer;font-size:18px;border-bottom:1px solid var(--border);" onclick="throwMenuPick(${i})">
      <span style="color:var(--amber)">${key})</span>
      <span style="color:${item.color||'var(--white)'};margin-left:6px;">${item.glyph||'?'} ${dname} (${item.count})</span>
    </div>`;
  });
  html += `<button class="menu-btn" onclick="closeThrowMenu()" style="margin-top:10px">Cancel (ESC)</button></div>`;

  G._throwTarget = target;
  G._throwItems = throwables;
  G.throwMenuOpen = true;
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal').style.display = 'flex';
}

window.throwMenuPick = function(idx) {
  const item = G._throwItems?.[idx];
  const target = G._throwTarget;
  closeThrowMenu();
  if(item && target) executeThrow(item, target);
};

function closeThrowMenu() {
  G.throwMenuOpen = false;
  G._throwTarget = null;
  G._throwItems = null;
  document.getElementById('modal').style.display = 'none';
}

// ─── BRANCH DUNGEONS ─────────────────────────────────────────
function enterBranch(branchKey) {
  const branch = BRANCHES[branchKey];
  if(!branch) return;

  G.mainDungeonLevel = G.level;
  G.branchReturnFloor = G.floor;
  G.branchReturnPos = [G.player.x, G.player.y];
  G.branch = branchKey;
  G.branchFloor = 1;

  log(branch.entryMsg, 'system');
  if(branch.floorMsgs && branch.floorMsgs[0]) log(branch.floorMsgs[0], 'warning');
  flash(branch.name.toUpperCase());

  G.level = generateBranchLevel(branchKey, 1);
  const [sx, sy] = G.level.startPos;
  G.player.x = sx; G.player.y = sy;
  G.player.companions.forEach(c => { c.x = sx+1; c.y = sy; });
  computeFOV();
  renderAll();
}

function exitBranch() {
  const branchName = BRANCHES[G.branch]?.name || 'the depths';
  G.level = G.mainDungeonLevel;
  G.floor = G.branchReturnFloor;
  const [rx, ry] = G.branchReturnPos;
  G.player.x = rx; G.player.y = ry;
  G.player.companions.forEach(c => { c.x = rx+1; c.y = ry; });
  G.branch = null;
  G.branchFloor = 0;
  G.mainDungeonLevel = null;
  G.branchReturnFloor = 0;
  G.branchReturnPos = null;

  log(`You emerge from ${branchName}. The main dungeon stretches before you.`, 'system');
  computeFOV();
  renderAll();
}

function applyRuneEffect(item) {
  const key = item.name;
  if(key === 'Heart Scarab') {
    G.player.hungerImmune = true;
    log('The Heart Scarab pulses with ancient power. You will never hunger again.', 'good');
  } else if(key === 'Obsidian Mirror') {
    G.player.permanentDetect = true;
    log('The Obsidian Mirror reveals all. Every creature on every floor is known to you.', 'good');
  } else if(key === 'Golden Bough') {
    G.player.freeDeath = true;
    log('The Golden Bough glows with pale light. Death will not claim you... this once.', 'good');
  }

  // Mark branch as completed
  if(G.branch) {
    G.completedBranches = G.completedBranches || [];
    if(!G.completedBranches.includes(G.branch)) {
      G.completedBranches.push(G.branch);
      log(`*** ${BRANCHES[G.branch].name} COMPLETED ***`, 'good');
      flash('BRANCH COMPLETE!');
    }
  }
}

// ─── STAIRS ──────────────────────────────────────────────────
function descend() {
  const { player, level } = G;
  const tile = level.tiles[player.y][player.x];

  if(tile === TILE.SHOP) {
    openShop();
    return;
  }

  // Branch portal
  if(tile === TILE.PORTAL) {
    const branchKey = level.portalBranches?.[`${player.x},${player.y}`];
    if(branchKey && BRANCHES[branchKey]) {
      enterBranch(branchKey);
      return;
    }
  }

  // Branch floor transition
  if(G.branch) {
    if(tile !== TILE.STAIRS_DOWN) {
      log('You are not on stairs leading down.', 'info');
      return;
    }
    G.branchFloor++;
    const branch = BRANCHES[G.branch];
    log(`You descend deeper into ${branch.name}. (${G.branch} floor ${G.branchFloor})`, 'system');
    if(branch.floorMsgs && branch.floorMsgs[G.branchFloor-1]) {
      log(branch.floorMsgs[G.branchFloor-1], 'warning');
    }
    flash(`${branch.name.toUpperCase()} - ${G.branchFloor}`);
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.1));
    G.level = generateBranchLevel(G.branch, G.branchFloor);
    const [sx, sy] = G.level.startPos;
    player.x = sx; player.y = sy;
    player.companions.forEach(c => { c.x = sx+1; c.y = sy; });
    computeFOV();
    renderAll();
    return;
  }

  if(tile !== TILE.STAIRS_DOWN) {
    log('You are not on stairs leading down.', 'info');
    return;
  }

  if(G.floor >= 16) {
    log('The dungeon ends here. There is no deeper path.', 'warning');
    return;
  }

  G.floor++;
  log(`You descend to floor ${G.floor}.`, 'system');
  flash(`FLOOR ${G.floor}`);

  // Floor theme entry message
  const entryTheme = getFloorTheme(G.floor);
  const themeMessages = {
    'Dungeon': null,
    'Flooded Caves': 'The air grows damp. Water drips from the ceiling and pools on the floor.',
    'Crypt': 'A deathly chill settles in. The walls are lined with ancient bones.',
    'Forge': 'Waves of heat roll through the corridors. The stone glows red in places.',
    'Abyss': 'Reality warps at the edges of your vision. The air hums with dark energy.',
    "Baal's Throne": 'The walls pulse with crimson light. You feel an immense presence watching.',
  };
  if(themeMessages[entryTheme.name]) log(themeMessages[entryTheme.name], 'warning');

  // Companion reactions to floor themes
  const compReactions = {
    'Flooded Caves': {
      'Torben Ironhands': '"Water. Hate water. Rusts the blade."',
      'Mirela the Quick': '"Watch your footing. These stones are slick."',
      'Brother Aldric': '"Water... the element of purification. We are tested."',
      'Ghokk': '"GHOKK NOT LIKE WET."',
    },
    'Crypt': {
      'Torben Ironhands': '"Stay close. The dead don\'t rest easy here."',
      'Brother Aldric': '"I sense many restless spirits. My prayers will shield us."',
      'Zelphira the Pale': '"Fascinating... the necromantic energy here is palpable."',
    },
    'Forge': {
      'Torben Ironhands': '"Now THIS is where a weapon is born. Fine heat."',
      'Ghokk': '"HOT. GHOKK LIKE HOT. REMIND OF HOME."',
    },
    'Abyss': {
      'Brother Aldric': '"Gods preserve us. This place is an abomination."',
      'Zelphira the Pale': '"The veil between planes is thin here. Be careful what you wish for."',
      'Nyx Shadowwhisper': '"Even I don\'t like this place. Too many shadows that move on their own."',
    },
    "Baal's Throne": {
      'Torben Ironhands': '"This is it. Whatever happens — it\'s been an honor."',
      'Brother Aldric': '"The final trial. May the gods grant us strength."',
      'Ghokk': '"GHOKK SMASH BIG DEMON. GHOKK NOT AFRAID."',
    },
  };
  const reactions = compReactions[entryTheme.name];
  if(reactions) {
    for(const comp of G.player.companions) {
      if(reactions[comp.name]) {
        log(`${comp.name}: ${reactions[comp.name]}`, 'info');
      }
    }
  }

  // Rest bonus between floors
  player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.15));

  G.level = generateLevel(G.floor);
  const [sx, sy] = G.level.startPos;
  player.x = sx; player.y = sy;

  // Update companion positions
  player.companions.forEach(c => { c.x = sx + 1; c.y = sy; });

  computeFOV();
  renderAll();

  if(G.floor >= 16) log('You sense the Rune of Baal nearby... and something ancient.', 'warning');
  endTurn();
}

function ascend() {
  const { player, level } = G;
  const tile = level.tiles[player.y][player.x];
  if(tile !== TILE.STAIRS_UP) { log('No upward path here.', 'info'); return; }

  // Branch ascent
  if(G.branch) {
    if(G.branchFloor <= 1) {
      exitBranch();
      return;
    }
    G.branchFloor--;
    const branch = BRANCHES[G.branch];
    log(`You ascend in ${branch.name}. (Floor ${G.branchFloor})`, 'system');
    G.level = generateBranchLevel(G.branch, G.branchFloor);
    const [sx, sy] = G.level.startPos;
    player.x = sx; player.y = sy;
    player.companions.forEach(c => { c.x = sx+1; c.y = sy; });
    computeFOV();
    renderAll();
    return;
  }

  const hasRune = player.inventory.some(i => i.type === 'quest_item');

  if(G.floor <= 1) {
    if(hasRune) {
      winGame();
      return;
    }
    log('You cannot leave without the Rune of Baal!', 'warning');
    return;
  }

  G.floor--;
  if(G.ascending) {
    log(`You ascend to floor ${G.floor}. ${16 - G.floor} floors from the depths, ${G.floor} to go!`, 'system');
    flash(`ASCENDING — FLOOR ${G.floor}`);
    if(G.floor <= 3) log('You can almost taste fresh air... but the darkness closes in.', 'warning');
  } else {
    log(`You ascend to floor ${G.floor}.`, 'system');
  }

  G.level = generateLevel(G.floor);
  const [sx, sy] = G.level.startPos;
  player.x = sx; player.y = sy;
  player.companions.forEach(c => { c.x = sx+1; c.y = sy; });

  computeFOV();
  renderAll();
  endTurn();
}

// ─── SHOPS ───────────────────────────────────────────────────
function openShop() {
  // Generate shop inventory
  const shopItems = [];
  for(let i=0; i<8; i++) {
    const item = generateItem(G.floor);
    if(!item.cursed) {
      item.price = Math.max(10, (item.val || 10) * rng.int(1, 3));
      shopItems.push(item);
    }
  }
  
  let shopHTML = `
    <div style="font-family:'VT323',monospace; padding:10px;">
      <h2 style="color:var(--gold); font-size:28px;">⚜ DUNGEON EMPORIUM ⚜</h2>
      <p style="font-family:'Share Tech Mono';font-size:13px;color:var(--gray);">Gold: ${G.player.gold}gp</p>
      <div style="margin:10px 0;">
  `;
  
  shopItems.forEach((item, i) => {
    const key = String.fromCharCode(97 + i);
    const sname = getItemDisplayName(item);
    shopHTML += `<div style="padding:5px;cursor:pointer;border-bottom:1px solid var(--border);" onclick="buyItem(${i})">
      <span style="color:var(--amber)">${key})</span>
      <span style="color:${item.color||'var(--white)'}"> ${item.glyph||'?'} ${sname}</span>
      <span style="color:var(--gold);float:right">${item.price}gp</span>
    </div>`;
  });
  
  shopHTML += `</div>
    <button class="menu-btn" onclick="closeShop()">Leave Shop</button>
  </div>`;
  
  G.shopItems = shopItems;
  G.inShop = true;
  
  // Show in dedicated modal (not the title overlay)
  const modal = document.getElementById('modal');
  document.getElementById('modal-content').innerHTML = shopHTML;
  modal.style.display = 'flex';
}

function buyItem(index) {
  const item = G.shopItems[index];
  if(!item) return;
  if(G.player.gold < item.price) { log('Not enough gold!', 'warning'); return; }
  G.player.gold -= item.price;
  delete item.price;
  G.player.inventory.push(item);
  log(`You buy the ${item.name}.`, 'loot');
  G.shopItems.splice(index, 1);
  closeShop();
}

function closeShop() {
  G.inShop = false;
  document.getElementById('modal').style.display = 'none';
}

// ─── NPC INTERACTION ──────────────────────────────────────────
function interactNPC(npc) {
  const p = G.player;

  // Racial hostility check — NPC hates player's race
  if(npc.hatedRaces && npc.hatedRaces.includes(p.race) && !npc.hostile) {
    const insult = npc.raceInsults?.[p.race] || '"I don\'t deal with your kind!"';
    log(`${npc.name}: ${insult}`, 'warning');
    npc.hostile = true;
    npc.color = '#ff2222';
    log(`${npc.name} attacks you!`, 'combat');
    // Immediate attack
    const dmg = rng.dice(...(npc.atk || [1,6,0]));
    const pAC = computeAC(p);
    const hitRoll = rng.int(1,20) + 2;
    if(hitRoll < pAC) {
      log(`${npc.name} swings but you block!`, 'combat');
    } else {
      p.hp -= dmg;
      log(`${npc.name} hits you for ${dmg} damage!`, 'combat');
      if(p.hp <= 0) { die(npc.name); }
    }
    return;
  }

  // Already hostile — player bumps to attack (handled in tryMove)
  if(npc.hostile) return;

  if(npc.role === 'companion') {
    const baseCost = npc.cost || 50;
    // CHA modifier reduces cost
    const chaMod = Math.floor((p.stats.cha - 10) / 2);
    const cost = Math.max(5, baseCost - chaMod * 5);
    const costStr = cost !== baseCost ? `${cost}gp (reduced from ${baseCost}gp by CHA)` : `${cost}gp`;
    if(p.gold >= cost) {
      if(confirm(`Hire ${npc.name} for ${costStr}?\n"${npc.flavor}"`)) {
        p.gold -= cost;
        npc.companion = true;
        npc.x = p.x + 1; npc.y = p.y;
        p.companions.push(npc);
        G.joinedNPCs.push(npc.id);
        log(`${npc.name} joins your party!`, 'good');
        if(chaMod > 0) log(`Your charisma saved you ${chaMod * 5}gp.`, 'good');
        log(getCompanionQuip(npc.id), 'info');
      }
    } else {
      const needed = cost - p.gold;
      if(p.stats.cha >= 18) log(`${npc.name}: "Normally I'd make an exception for someone as charming as you, but you need ${needed}gp more."`, 'info');
      else log(`${npc.name}: "${npc.flavor}" (Need ${needed}gp more!)`, 'info');
    }
  } else if(npc.role === 'merchant') {
    openShop();
  } else if(npc.role === 'sage') {
    if(p.gold >= 20) {
      const unidentified = p.inventory.filter(i => !i.identified);
      if(unidentified.length > 0) {
        p.gold -= 20;
        const item = unidentified[0];
        identifyItem(item);
        log(`Mervyn identifies your ${item.name} for 20gp.`, 'info');
      } else {
        log('Mervyn: "All your items are already known to you."', 'info');
      }
    } else {
      log('Mervyn: "20 gold for identification. Come back when you can pay."', 'info');
    }
  }
}

function getCompanionQuip(id) {
  const quips = {
    torben: '"Don\'t expect me to carry your stuff. I fight, nothing else."',
    mirela: '"Try to keep up. I\'ve seen slower snails."',
    brother_aldric: '"May the light guide our path, friend. Though it\'s very dark down here."',
    zelphira: '"How... quaint. This dungeon. I\'ve seen worse. Briefly."',
    ghokk: '"GHOKK SMASH." (waves enthusiastically)',
    nyx: '"Don\'t ask questions. Just don\'t."',
  };
  return quips[id] || '"Let\'s go."';
}

// ─── SEARCH ──────────────────────────────────────────────────
function searchArea() {
  const p = G.player;
  const range = 1 + (p.stats.wis >= 14 ? 1 : 0) + (p.passives.includes('danger_sense') ? 1 : 0);
  
  let found = false;
  G.level.items.forEach(item => {
    if(item.type === 'trap' && item.hidden) {
      const d = Math.sqrt((item.x-p.x)**2+(item.y-p.y)**2);
      if(d <= range && rng.bool(0.4 + p.stats.wis * 0.01)) {
        item.hidden = false;
        log(`You find a ${item.subtype}!`, 'good');
        found = true;
      }
    }
  });
  
  // Secret doors
  if(rng.bool(0.1)) {
    log('You find nothing of note.', 'info');
  } else if(!found) {
    log('Your search reveals nothing.', 'info');
  }
  
  endTurn();
}

// ─── DEATH / WIN ──────────────────────────────────────────────
function die(cause) {
  if(G.gameOver) return;
  if(G.player.freeDeath) {
    G.player.freeDeath = false;
    G.player.hp = 1;
    log('The Golden Bough shatters! You are pulled back from the brink of death!', 'good');
    flash('DEATH DENIED!');
    return;
  }
  if(G.player.status.godmode) {
    G.player.hp = G.player.maxHp;
    log(`[GOD MODE] Survived lethal damage from ${cause}.`, 'system');
    return;
  }
  G.gameOver = true;
  G.lastKilledBy = cause;
  deleteSave(); // Permadeath — remove save
  saveGhost(G.player);
  
  const p = G.player;
  const deathMsg = `
    <h1 style="color:var(--red)">YOU HAVE DIED</h1>
    <h2>${p.name} the ${RACES[p.race].name} ${CLASSES[p.cls].name}</h2>
    <p style="color:var(--red)">Slain by: ${cause}</p>
    <p>Level ${p.level} · Floor ${G.floor} of 16</p>
    <p>Turns survived: ${G.turn}</p>
    <p>Gold amassed: ${p.gold}</p>
    <p style="color:var(--gray);">Your ghost will haunt these halls...</p>
    <button class="menu-btn" onclick="location.reload()">Play Again</button>
  `;
  
  document.getElementById('modal-content').innerHTML = deathMsg;
  document.getElementById('modal').style.display = 'flex';
}

function winGame() {
  G.gameOver = true;
  G.won = true;
  deleteSave();

  const p = G.player;
  const godName = p.god ? GODS[p.god]?.name || 'None' : 'None';
  const compCount = p.companions.length;
  const mutCount = p.mutations?.length || 0;
  const bossCount = G.killedBosses?.length || 0;

  const winMsg = `
    <h1 style="color:var(--gold);text-shadow:0 0 30px rgba(255,215,0,0.5)">⛧ VICTORY ⛧</h1>
    <h2 style="color:var(--amber)">You have escaped with the Rune of Baal!</h2>
    <p style="color:var(--gold);font-size:20px;font-family:'VT323',monospace;">${p.name} the ${RACES[p.race].name} ${CLASSES[p.cls].name}</p>
    <div style="text-align:left;margin:20px auto;max-width:360px;font-family:'Share Tech Mono',monospace;font-size:13px;line-height:2;">
      <div style="border:1px solid var(--border);padding:12px;">
        <div style="color:var(--amber);font-size:15px;text-align:center;margin-bottom:8px;font-family:'VT323',monospace;letter-spacing:2px;">— FINAL SCORE —</div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Character Level</span><span style="color:var(--white)">${p.level}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Turns Survived</span><span style="color:var(--white)">${G.turn}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Gold Amassed</span><span style="color:var(--gold)">${p.gold} gp</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Bosses Slain</span><span style="color:var(--red)">${bossCount}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Companions</span><span style="color:var(--cyan)">${compCount}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Mutations</span><span style="color:var(--green)">${mutCount}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Faith</span><span style="color:var(--purple)">${godName}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Branches Completed</span><span style="color:var(--purple)">${(G.completedBranches||[]).length}/3</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray)">Runes Collected</span><span style="color:var(--gold)">${(G.collectedRunes||[]).length}/3</span></div>
      </div>
      ${(G.collectedRunes||[]).length > 0 ? `<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">
        <div style="color:var(--gold);font-size:14px;text-align:center;margin-bottom:4px;">— RUNES —</div>
        ${(G.collectedRunes||[]).map(r => `<div style="color:var(--gold);text-align:center;font-size:13px;">* ${r}</div>`).join('')}
      </div>` : ''}
    </div>
    <p style="color:var(--gray);font-style:italic;">Baal himself trembles at your name.<br>The surface world welcomes its champion.</p>
    <button class="menu-btn" onclick="location.reload()" style="border-color:var(--gold);color:var(--gold);">Play Again</button>
  `;

  document.getElementById('modal-content').innerHTML = winMsg;
  document.getElementById('modal').style.display = 'flex';
}

function checkWinCondition() {
  if(!G.ascending) return;
  const p = G.player;
  const hasRune = p.inventory.some(i => i.type === 'quest_item');
  if(hasRune) {
    log('The Rune burns in your pack. You must escape to the surface!', 'warning');
  }
}
