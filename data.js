let DEBUG_MODE = false;
let debugTypedBuffer = '';

// ─── RNG ────────────────────────────────────────────────────
const rng = {
  seed: Date.now(),
  next() {
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >> 17;
    this.seed ^= this.seed << 5;
    return (this.seed >>> 0) / 4294967296;
  },
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; },
  pick(arr) { return arr[this.int(0, arr.length - 1)]; },
  shuffle(arr) {
    for(let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  bool(chance=0.5) { return this.next() < chance; },
  dice(n, d, bonus=0) {
    let t = bonus;
    for(let i=0;i<n;i++) t += this.int(1, d);
    return t;
  },
  shuffle(arr) {
    const a = [...arr];
    for(let i=a.length-1;i>0;i--) {
      const j=this.int(0,i);
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }
};

// ─── IDENTIFICATION SYSTEM ───────────────────────────────────
const POTION_APPEARANCES = [
  'crimson','azure','amber','violet','ochre','silver','emerald','obsidian',
  'ivory','rose','chartreuse','slate','golden','pale blue','murky','frothing',
  'bubbling','glowing','smoky','teal'
];
const SCROLL_APPEARANCES = [
  'ZELKUN VARAS','MORIN THEX','ALVAK BENU','SOTH RELAS','FYREN MOKU',
  'BALAN VEXIS','NETH KORR','XAVIL DOON','PRES TORVI','HUSK ELAM',
  'ZORN FALEK','YVEL BRAK','CURIN MOX','DRAL SEMTH','FLOR WEXAN'
];
const RING_APPEARANCES = [
  'iron','bone','jade','onyx','silver','copper','golden','obsidian',
  'twisted','etched','cracked','glowing','rusted','ivory','sapphire'
];
const AMULET_APPEARANCES = [
  'bronze','tarnished','jeweled','leather','carved','gilded',
  'bone','crystal','iron','ancient','warped','silver'
];
const WAND_APPEARANCES = [
  'oak','ebony','ivory','crystal','iron','bone','silver','copper',
  'gnarled','rune-carved','twisted','glass','brass','willow'
];

let GAME_POTION_COLORS = {};
let GAME_SCROLL_LABELS = {};
let GAME_RING_LOOKS = {};      // ringKey -> appearance string
let GAME_AMULET_LOOKS = {};    // amuletKey -> appearance string
let GAME_WAND_LOOKS = {};      // wandKey -> appearance string
let GAME_IDENTIFIED_POTIONS = new Set();
let GAME_IDENTIFIED_SCROLLS = new Set();
let GAME_IDENTIFIED_RINGS = new Set();    // identified ring template keys
let GAME_IDENTIFIED_AMULETS = new Set();  // identified amulet template keys
let GAME_IDENTIFIED_WANDS = new Set();    // identified wand template keys

function assignItemAppearances() {
  const potionEffects = ['mutate','heal','heal_full','restore_mp','temp_str','temp_speed','invisibility','confuse_self','poison_self','gain_xp','blind_self','paralyze_self','weaken_self','amnesia','burn_self','phasing','berserk','magic_resist','clarity','temp_might'];
  const scrollEffects = ['teleport','enchant_weapon','enchant_armor','identify','map_level','mass_fear','curse_items','acquire_item','remove_curse'];
  const colors = [...POTION_APPEARANCES];
  rng.shuffle(colors);
  potionEffects.forEach((eff, i) => { GAME_POTION_COLORS[eff] = colors[i % colors.length]; });
  const labels = [...SCROLL_APPEARANCES];
  rng.shuffle(labels);
  scrollEffects.forEach((eff, i) => { GAME_SCROLL_LABELS[eff] = labels[i % labels.length]; });

  // Rings
  const ringKeys = ['ring_prot','ring_str','ring_int','ring_regen','ring_fire','ring_doom'];
  const ringLooks = rng.shuffle([...RING_APPEARANCES]);
  ringKeys.forEach((k, i) => { GAME_RING_LOOKS[k] = ringLooks[i % ringLooks.length]; });

  // Amulets
  const amuletKeys = ['amulet_life','amulet_MR','amulet_curse'];
  const amuletLooks = rng.shuffle([...AMULET_APPEARANCES]);
  amuletKeys.forEach((k, i) => { GAME_AMULET_LOOKS[k] = amuletLooks[i % amuletLooks.length]; });

  // Wands
  const wandKeys = ['wand_fire','wand_cold','wand_lightning','wand_poison','wand_sleep','wand_digging','wand_polymorph'];
  const wandLooks = rng.shuffle([...WAND_APPEARANCES]);
  wandKeys.forEach((k, i) => { GAME_WAND_LOOKS[k] = wandLooks[i % wandLooks.length]; });

  GAME_IDENTIFIED_POTIONS = new Set();
  GAME_IDENTIFIED_SCROLLS = new Set();
  GAME_IDENTIFIED_RINGS = new Set();
  GAME_IDENTIFIED_AMULETS = new Set();
  GAME_IDENTIFIED_WANDS = new Set();
}

function getItemDisplayName(item) {
  if(item.type === 'potion') {
    if(item.identified || GAME_IDENTIFIED_POTIONS.has(item.effect)) return item.name;
    return `${GAME_POTION_COLORS[item.effect] || 'strange'} potion`;
  }
  if(item.type === 'scroll') {
    if(item.identified || GAME_IDENTIFIED_SCROLLS.has(item.effect)) return item.name;
    return `scroll labeled "${GAME_SCROLL_LABELS[item.effect] || 'XORN BREK'}"`;
  }
  if(item.type === 'ring') {
    // Use item.templateKey if present, otherwise derive from name
    const tkey = item.templateKey;
    if(item.identified || (tkey && GAME_IDENTIFIED_RINGS.has(tkey))) return item.name;
    const look = tkey ? (GAME_RING_LOOKS[tkey] || 'plain') : 'plain';
    return `${look} ring`;
  }
  if(item.type === 'amulet') {
    const tkey = item.templateKey;
    if(item.identified || (tkey && GAME_IDENTIFIED_AMULETS.has(tkey))) return item.name;
    const look = tkey ? (GAME_AMULET_LOOKS[tkey] || 'plain') : 'plain';
    return `${look} amulet`;
  }
  if(item.type === 'wand') {
    const tkey = item.templateKey;
    if(item.identified || (tkey && GAME_IDENTIFIED_WANDS.has(tkey))) {
      return item.charges !== undefined ? `${item.name} (${item.charges})` : item.name;
    }
    const look = tkey ? (GAME_WAND_LOOKS[tkey] || 'plain') : 'plain';
    return `${look} wand`;
  }
  return item.name;
}

function identifyItem(item) {
  item.identified = true;
  if(item.type === 'potion') GAME_IDENTIFIED_POTIONS.add(item.effect);
  if(item.type === 'scroll') GAME_IDENTIFIED_SCROLLS.add(item.effect);
  if(item.type === 'ring' && item.templateKey) GAME_IDENTIFIED_RINGS.add(item.templateKey);
  if(item.type === 'amulet' && item.templateKey) GAME_IDENTIFIED_AMULETS.add(item.templateKey);
  if(item.type === 'wand' && item.templateKey) GAME_IDENTIFIED_WANDS.add(item.templateKey);
}

// ─── RACES ──────────────────────────────────────────────────
const RACES = {
  human: {
    name: 'Human', sym: 'H', color: '#e8c890',
    desc: 'Adaptable and ambitious. Gain bonus skill points and learn faster.',
    bonuses: { str:0, dex:0, con:0, int:0, wis:0, cha:2 },
    passives: ['fast_learner','bonus_feat'],
    startGold: 50,
    flavorText: 'The youngest of the major races, but their ambition knows no bounds.'
  },
  elf: {
    name: 'Elf', sym: 'E', color: '#88ffcc',
    desc: 'Graceful and magical. Bonus INT/DEX, penalty CON. See invisible things.',
    bonuses: { str:-1, dex:2, con:-1, int:2, wis:1, cha:1 },
    passives: ['see_invisible','magic_affinity','light_sleeper'],
    startGold: 40,
    flavorText: 'Ancient beyond reckoning. They remember when the dungeon was young.'
  },
  dwarf: {
    name: 'Dwarf', sym: 'D', color: '#cc8844',
    desc: 'Hardy and stubborn. Bonus CON/STR, resists poison and magic. Slow.',
    bonuses: { str:2, dex:-1, con:3, int:0, wis:1, cha:-1 },
    passives: ['poison_resist','magic_resist_15','danger_sense','stonecunning'],
    startGold: 60,
    flavorText: 'Born underground. They say dwarves can smell gold through solid rock.'
  },
  halfling: {
    name: 'Halfling', sym: 'h', color: '#ffdd88',
    desc: 'Small and nimble. Excellent with slings, hard to hit, can go berserk with luck.',
    bonuses: { str:-2, dex:3, con:1, int:0, wis:1, cha:2 },
    passives: ['lucky','projectile_bonus','small_target','brave'],
    startGold: 45,
    flavorText: 'Underestimated by everyone. Last time anyone makes that mistake.'
  },
  gnome: {
    name: 'Gnome', sym: 'g', color: '#aaccff',
    desc: 'Illusionists and tricksters. High INT/WIS, innate magic, but weak body.',
    bonuses: { str:-2, dex:1, con:-1, int:3, wis:2, cha:0 },
    passives: ['illusion_sense','magic_affinity','tinkerer','gnomish_luck'],
    startGold: 55,
    flavorText: 'They collect things. Not just objects — secrets, grudges, trivia.'
  },
  halforc: {
    name: 'Half-Orc', sym: 'o', color: '#88cc44',
    desc: 'Fierce and resilient. Highest STR. Rage ability. Shrugs off near-death.',
    bonuses: { str:3, dex:0, con:2, int:-2, wis:-1, cha:-2 },
    passives: ['relentless','rage_ability','intimidating','orc_ferocity'],
    startGold: 30,
    flavorText: 'Most things in the dungeon fear them. The rest haven\'t met them yet.'
  },
  tiefling: {
    name: 'Tiefling', sym: 't', color: '#ff6688',
    desc: 'Infernal blood. Fire resistance, darkness vision, but gods distrust them.',
    bonuses: { str:1, dex:1, con:0, int:2, wis:0, cha:1 },
    passives: ['fire_resist','devil_sight','infernal_charm','god_mistrust'],
    startGold: 40,
    flavorText: 'Something ancient stirs in their blood. Something that remembers Hell.'
  },
  lizardman: {
    name: 'Lizardman', sym: 'l', color: '#44dd88',
    desc: 'Primal and savage. Claw attacks, scales for armor, can swim, cold-blooded.',
    bonuses: { str:2, dex:1, con:2, int:-2, wis:0, cha:-2 },
    passives: ['natural_armor','claw_attack','amphibious','cold_blooded','regeneration'],
    startGold: 25,
    flavorText: 'Ancient beyond the elves. Patient beyond the dwarves. Hungry always.'
  }
};

// ─── CLASSES ─────────────────────────────────────────────────
const CLASSES = {
  fightingman: {
    name: 'Fighting-Man', sym: 'F', color: '#ff8844',
    desc: 'Master of arms. Best combat, ranged weapon mastery, can direct companion formations.',
    hpDice: 10, mpBase: 0, mpPerLevel: 0,
    primeStat: 'str',
    saveMod: { poison:2, magic:0, breath:2, death:2 },
    abilities: ['power_strike','steady_aim','formation_bonus','cleave'],
    spells: [],
    weaponBonus: 1, armorTypes: ['all'],
    xpTable: [0,2000,4000,8000,16000,32000,64000,120000,240000,360000,480000,600000,720000,840000,960000,1080000],
    flavorText: 'When the monster charges and the magic fails, you\'ll want one of these.'
  },
  cleric: {
    name: 'Cleric', sym: 'C', color: '#ffee44',
    desc: 'Divine warrior. Heals, turns undead, smites evil, gains power from god devotion.',
    hpDice: 8, mpBase: 10, mpPerLevel: 5,
    primeStat: 'wis',
    saveMod: { poison:2, magic:2, breath:0, death:3 },
    abilities: ['turn_undead','lay_on_hands','divine_smite','sanctuary'],
    spells: ['cure_light','bless','cure_poison','sanctuary_spell','smite','hold_undead','flame_strike','word_of_recall'],
    weaponBonus: 0, armorTypes: ['all'],
    xpTable: [0,1500,3000,6000,12000,25000,50000,100000,200000,300000,400000,500000,600000,700000,800000,900000],
    flavorText: 'Your god grants you power. Try not to disappoint them.'
  },
  magicuser: {
    name: 'Magic-User', sym: 'M', color: '#aa88ff',
    desc: 'Arcane master. Devastating spells, but fragile. Intelligence amplifies all magic.',
    hpDice: 4, mpBase: 20, mpPerLevel: 8,
    primeStat: 'int',
    saveMod: { poison:0, magic:3, breath:0, death:1 },
    abilities: ['arcane_surge','spell_memory','metamagic','identify_item'],
    spells: ['magic_missile','detect_monsters','arcane_shield','sleep','burning_hands','haste','ice_lance','lightning_bolt','fireball','polymorph','disintegrate'],
    weaponBonus: 0, armorTypes: ['robes','cloth'],
    xpTable: [0,2500,5000,10000,20000,40000,80000,150000,300000,450000,600000,750000,900000,1050000,1200000,1350000],
    flavorText: 'The pen is mightier than the sword, unless the pen IS a fireball.'
  }
};

// ─── GODS ────────────────────────────────────────────────────
const GODS = {
  mithras: {
    name: 'Mithras the Unconquered', domain: 'Sun, War, Honor',
    color: '#ffcc44', sym: '☀',
    flavor: 'An ancient bull-slaying deity from Persia. Demands valor and sacrifice. Grants mighty warriors divine strength.',
    gifts: ['combat_bonus', 'radiant_smite', 'divine_shield', 'inspire_allies'],
    anger: ['curses_weapon', 'strikes_blind', 'sends_paladins'],
    pietyGain: ['killing_evil', 'honorable_combat', 'helping_companions'],
    pietyLoss: ['fleeing_combat', 'backstabbing', 'worshiping_chaos'],
    apostasy: 'Mithras blinds you with holy fire and sends his Bull Knights to hunt you.',
    activeAbility: { name: 'Bull\'s Strength', mp: 0, piety: 30, desc: 'Double damage for 20 turns, gain temporary HP.' },
    alignment: 'lawful'
  },
  sekhmet: {
    name: 'Sekhmet the Destroyer', domain: 'Blood, Plague, War',
    color: '#ff4444', sym: '𓁢',
    flavor: 'Lion-headed Egyptian war goddess. Demands blood and revels in destruction. Heals her champions by killing.',
    gifts: ['lifesteal', 'plague_weapon', 'frenzy', 'bloody_regeneration'],
    anger: ['disease_curse', 'berserker_rage_against_you', 'plagues_allies'],
    pietyGain: ['kills', 'taking_damage', 'destroying_items'],
    pietyLoss: ['healing_self_magically', 'fleeing', 'mercy_killing'],
    apostasy: 'Sekhmet plagues you with every disease known to mankind.',
    activeAbility: { name: 'Blood Frenzy', mp: 0, piety: 25, desc: 'Heal for every kill for 15 turns. Attack speed doubled.' },
    alignment: 'neutral'
  },
  thoth: {
    name: 'Thoth of the Scales', domain: 'Magic, Knowledge, Death',
    color: '#8888ff', sym: '𓆑',
    flavor: 'Ibis-headed god of scribes and magic. Rewards learning and accumulation of knowledge and items.',
    gifts: ['spell_power', 'identify_all', 'ghost_knowledge', 'library_access'],
    anger: ['scrambles_spells', 'erases_memory', 'sends_mummies'],
    pietyGain: ['identifying_items', 'learning_spells', 'reading_scrolls', 'finding_new_monsters'],
    pietyLoss: ['burning_books', 'dumping_items', 'staying_ignorant'],
    apostasy: 'Thoth erases your memory, randomly shuffling your spells and scrambling item names.',
    activeAbility: { name: 'Scroll of Heaven', mp: 0, piety: 40, desc: 'Instantly identify all items. Learn one random spell.' },
    alignment: 'neutral'
  },
  hecate: {
    name: 'Hecate of the Crossroads', domain: 'Witchcraft, Moon, Crossroads',
    color: '#cc44cc', sym: '🌙',
    flavor: 'Triple goddess of witchcraft. Favors magic-users and those who walk between worlds. Fickle and ancient.',
    gifts: ['polymorph_allies', 'hex_curse', 'spectral_familiar', 'witchsight'],
    anger: ['polymorph_self', 'attracts_ghosts', 'illusion_madness'],
    pietyGain: ['casting_spells', 'killing_with_magic', 'finding_crossroads_traps'],
    pietyLoss: ['melee_combat', 'destroying_potions', 'turning_undead'],
    apostasy: 'Hecate polymorphs you into a random creature for several floors.',
    activeAbility: { name: 'Triple Aspect', mp: 0, piety: 35, desc: 'Summon three spectral hounds to fight for you.' },
    alignment: 'chaotic'
  },
  ogun: {
    name: 'Ogun of the Iron', domain: 'Iron, War, Craftsmanship',
    color: '#888888', sym: '⚒',
    flavor: 'Yoruba orisha of iron and warfare. Blesses weapons and armor. Demands that iron be used, not abandoned.',
    gifts: ['weapon_enchant', 'iron_skin', 'rust_immunity', 'weapon_repair'],
    anger: ['weapon_rusts', 'armor_crumbles', 'iron_curses'],
    pietyGain: ['using_metal_weapons', 'enchanting_weapons', 'repairing_items'],
    pietyLoss: ['dropping_weapons', 'using_no_armor', 'magic_weapons_only'],
    apostasy: 'Ogun rusts all your metal equipment and curses your weapons to deal half damage.',
    activeAbility: { name: 'Iron Blessing', mp: 0, piety: 30, desc: 'Temporarily enchant your weapon to +5 and give armor +5 AC.' },
    alignment: 'lawful'
  },
  tiamat: {
    name: 'Tiamat the Primordial', domain: 'Dragons, Chaos, The Deep',
    color: '#44ddcc', sym: '🐉',
    flavor: 'Mesopotamian dragon goddess. Ancient beyond measure. Grants draconic power to those who serve chaos.',
    gifts: ['dragon_scales', 'breath_weapon', 'fear_aura', 'dragon_speech'],
    anger: ['dragon_breath_on_you', 'scales_itch', 'dragon_hunt'],
    pietyGain: ['killing_law_monsters', 'collecting_gold', 'exploring_deep'],
    pietyLoss: ['killing_dragons', 'order_alignment', 'refusing_power'],
    apostasy: 'Tiamat sends her dragon brood to hunt you relentlessly.',
    activeAbility: { name: 'Dragon Aspect', mp: 0, piety: 45, desc: 'Gain dragon scales (+8 AC) and a powerful breath weapon for 25 turns.' },
    alignment: 'chaotic'
  },
  nephthys: {
    name: 'Nephthys of Shadows', domain: 'Death, Stealth, Protection',
    color: '#446688', sym: '𓅓',
    flavor: 'Egyptian goddess of the dead and hidden things. Protects those who walk in shadow and honors the fallen.',
    gifts: ['shadow_step', 'death_ward', 'ghost_pact', 'unseen_passage'],
    anger: ['haunted_by_ghosts', 'shadow_blindness', 'death_curse'],
    pietyGain: ['honoring_ghost_kills', 'avoiding_detection', 'not_looting_corpses'],
    pietyLoss: ['desecrating_bodies', 'bright_light', 'being_loud'],
    apostasy: 'Nephthys sends an army of hostile ghosts of your previous characters.',
    activeAbility: { name: 'Shadow Form', mp: 0, piety: 30, desc: 'Become invisible and pass through walls for 10 turns.' },
    alignment: 'lawful'
  },
  zagyg: {
    name: 'Zagyg the Mad', domain: 'Chaos, Randomness, Absurdity',
    color: '#ff88ff', sym: '★',
    flavor: 'THE MEME GOD. Nothing is stable. Everything is hilarious. May your suffering be entertaining.',
    gifts: ['random_everything', 'wild_magic', 'comedy_timing', 'chaos_immunity'],
    anger: ['MORE_random', 'inverse_everything', 'reality_wobbles'],
    pietyGain: ['random_actions', 'dying_and_surviving', 'confusing_monsters'],
    pietyLoss: ['playing_safely', 'planning_ahead', 'refusing_chaos'],
    apostasy: 'Zagyg finds you so amusing in your suffering that things... get worse. Somehow.',
    activeAbility: { name: 'Wild Surge', mp: 0, piety: 1, desc: 'Something happens. Could be anything. Will probably help somehow. Or not. Ha.' },
    isMemeGod: true,
    alignment: 'chaotic'
  }
};

// ─── GOD DESCRIPTIONS ───────────────────────────────────────
const GIFT_DESCRIPTIONS = {
  combat_bonus: '+2 melee attack bonus',
  radiant_smite: 'Attacks deal bonus holy damage to undead',
  divine_shield: 'Chance to block lethal damage once per floor',
  inspire_allies: 'Companions deal +3 damage',
  lifesteal: 'Heal 25% of melee damage dealt',
  plague_weapon: 'Attacks poison enemies',
  frenzy: 'Attack twice per turn when below 50% HP',
  bloody_regeneration: 'Regenerate HP from kills',
  spell_power: '+3 to all spell damage',
  identify_all: 'Identify items on pickup',
  ghost_knowledge: 'See invisible creatures',
  library_access: 'Learn one extra spell per floor',
  polymorph_allies: 'Companions gain random buffs each floor',
  hex_curse: 'Cursed enemies take double spell damage',
  spectral_familiar: 'Summon a permanent spectral cat companion',
  witchsight: 'See through walls within 3 tiles',
  weapon_enchant: '+2 to weapon enchantment',
  iron_skin: '+3 natural AC',
  rust_immunity: 'Equipment cannot be damaged or rusted',
  weapon_repair: 'Weapons never degrade',
  dragon_scales: '+5 natural AC, fire resistance',
  breath_weapon: 'Gain a fire breath attack (3d6)',
  fear_aura: 'Nearby weak enemies flee on sight',
  dragon_speech: 'Dragons are neutral toward you',
  shadow_step: 'Teleport to any shadow within 8 tiles',
  death_ward: 'Survive one lethal hit per floor',
  ghost_pact: 'Player ghosts fight for you instead of against',
  unseen_passage: 'Invisible for first 5 turns of each floor',
  random_everything: 'A random stat changes each floor',
  wild_magic: 'Spells have random bonus effects',
  comedy_timing: '10% chance to dodge any attack via pratfall',
  chaos_immunity: 'Immune to confusion and polymorph'
};

const PIETY_ACTION_DESCRIPTIONS = {
  killing_evil: 'Slaying evil creatures',
  honorable_combat: 'Engaging in fair melee combat',
  helping_companions: 'Fighting alongside companions',
  fleeing_combat: 'Fleeing from enemies',
  backstabbing: 'Attacking unaware enemies',
  worshiping_chaos: 'Serving chaotic gods',
  kills: 'Killing any creature',
  taking_damage: 'Taking damage in combat',
  destroying_items: 'Destroying items',
  healing_self_magically: 'Using healing magic',
  fleeing: 'Running from battle',
  mercy_killing: 'Showing mercy to enemies',
  identifying_items: 'Identifying unknown items',
  learning_spells: 'Learning new spells',
  reading_scrolls: 'Reading scrolls',
  finding_new_monsters: 'Discovering new creatures',
  burning_books: 'Destroying scrolls',
  dumping_items: 'Discarding items carelessly',
  staying_ignorant: 'Ignoring items and knowledge',
  casting_spells: 'Casting spells',
  killing_with_magic: 'Killing with magic',
  finding_crossroads_traps: 'Discovering traps at crossroads',
  melee_combat: 'Using melee attacks',
  destroying_potions: 'Wasting potions',
  turning_undead: 'Turning undead',
  using_metal_weapons: 'Fighting with metal weapons',
  enchanting_weapons: 'Enchanting equipment',
  repairing_items: 'Maintaining equipment',
  dropping_weapons: 'Abandoning weapons',
  using_no_armor: 'Going unarmored',
  magic_weapons_only: 'Using only magical weapons',
  killing_law_monsters: 'Slaying lawful creatures',
  collecting_gold: 'Hoarding treasure',
  exploring_deep: 'Exploring deeper floors',
  killing_dragons: 'Slaying dragons',
  order_alignment: 'Acting lawfully',
  refusing_power: 'Refusing offered power',
  honoring_ghost_kills: 'Defeating restless spirits',
  avoiding_detection: 'Moving unseen',
  not_looting_corpses: 'Leaving the dead undisturbed',
  desecrating_bodies: 'Looting the fallen',
  bright_light: 'Carrying bright light sources',
  being_loud: 'Making excessive noise',
  random_actions: 'Unpredictable behavior',
  dying_and_surviving: 'Surviving near-death',
  confusing_monsters: 'Bewildering enemies',
  playing_safely: 'Playing it safe',
  planning_ahead: 'Being too predictable',
  refusing_chaos: 'Rejecting chaos',
  prayer: 'Praying at altars'
};

// ─── SPELLS ──────────────────────────────────────────────────
const SPELL_DATA = {
  // Cleric
  cure_light: { name:'Cure Light Wounds', mp:3, level:1, school:'divine', target:'self', desc:'Heal 2d6+level HP.', effect:'heal', power:6, cls:['cleric'] },
  bless: { name:'Bless', mp:4, level:1, school:'divine', target:'self', desc:'+2 to hit and saves for 20 turns.', effect:'buff_attack', power:2, cls:['cleric'] },
  hold_undead: { name:'Hold Undead', mp:5, level:2, school:'divine', target:'single', desc:'Paralyze undead enemy.', effect:'paralyze', cls:['cleric'] },
  flame_strike: { name:'Flame Strike', mp:10, level:3, school:'divine', target:'single', desc:'Call divine fire. 5d8 damage.', effect:'damage', power:20, cls:['cleric'] },
  word_of_recall: { name:'Word of Recall', mp:15, level:4, school:'divine', target:'self', desc:'Teleport to dungeon entrance. Emergency escape.', effect:'recall', cls:['cleric'] },
  cure_poison: { name:'Cure Poison', mp:4, level:1, school:'divine', target:'self', desc:'Remove poison from your body.', effect:'cure_poison', cls:['cleric'] },
  sanctuary_spell: { name:'Sanctuary', mp:8, level:2, school:'divine', target:'self', desc:'Divine protection. 50% miss chance for 10 turns.', effect:'sanctuary_spell', cls:['cleric'] },
  smite: { name:'Smite', mp:6, level:2, school:'divine', target:'single', desc:'Holy strike. 3d8 damage, +1d8 vs undead.', effect:'smite', power:8, cls:['cleric'] },
  // Magic-User
  magic_missile: { name:'Magic Missile', mp:2, level:1, school:'arcane', target:'single', desc:'Unerring magical bolts. Scales with level.', effect:'magic_missile', power:4, cls:['magicuser'] },
  sleep: { name:'Sleep', mp:4, level:1, school:'arcane', target:'area', desc:'Put nearby weak enemies to sleep.', effect:'sleep', cls:['magicuser'] },
  burning_hands: { name:'Burning Hands', mp:5, level:1, school:'arcane', target:'cone', desc:'Cone of fire. 3d6 damage.', effect:'damage', power:9, cls:['magicuser'] },
  ice_lance: { name:'Ice Lance', mp:6, level:2, school:'arcane', target:'line', desc:'Piercing shard of ice. 4d6 damage, slows.', effect:'damage', power:12, cls:['magicuser'] },
  lightning_bolt: { name:'Lightning Bolt', mp:10, level:3, school:'arcane', target:'line', desc:'Chain lightning through enemies. 6d6 damage.', effect:'damage', power:18, cls:['magicuser'] },
  fireball: { name:'Fireball', mp:14, level:3, school:'arcane', target:'area', desc:'Explosive ball of fire. 8d6 in radius.', effect:'damage', power:24, cls:['magicuser'] },
  polymorph: { name:'Polymorph Other', mp:20, level:4, school:'arcane', target:'single', desc:'Transform enemy into harmless creature.', effect:'polymorph', cls:['magicuser'] },
  disintegrate: { name:'Disintegrate', mp:30, level:6, school:'arcane', target:'single', desc:'Reduce target to dust. Instant kill on weak, massive damage on strong.', effect:'disintegrate', power:100, cls:['magicuser'] },
  detect_monsters: { name:'Detect Monsters', mp:3, level:1, school:'arcane', target:'self', desc:'Sense all monsters on this floor for 20 turns.', effect:'detect_monsters', cls:['magicuser'] },
  arcane_shield: { name:'Shield', mp:5, level:1, school:'arcane', target:'self', desc:'Magical barrier. +4 AC for 15 turns.', effect:'arcane_shield', cls:['magicuser'] },
  haste: { name:'Haste', mp:8, level:2, school:'arcane', target:'self', desc:'Move at double speed. Act twice per turn for 8 turns.', effect:'haste', cls:['magicuser'] },
  // Fighting-man
  power_strike: { name:'Power Strike', mp:0, level:1, school:'martial', target:'single', desc:'Double damage melee strike (costs 2 turns).', effect:'power_strike', cls:['fightingman'], cost_turns:2 },
  steady_aim: { name:'Steady Aim', mp:0, level:1, school:'martial', target:'self', desc:'Next ranged attack is guaranteed critical hit.', effect:'steady_aim', cls:['fightingman'] },
};

// ─── ITEMS ───────────────────────────────────────────────────
const ITEM_TEMPLATES = {
  // Weapons
  dagger: { name:'Dagger', glyph:')', color:'#aaa', type:'weapon', slot:'weapon', dmg:[1,4,0], twoHand:false, ranged:false, val:5, category:'dagger', speed:'fast', statusOnHit:'poison' },
  shortsword: { name:'Short Sword', glyph:')', color:'#ccc', type:'weapon', slot:'weapon', dmg:[1,6,0], val:15, category:'sword', speed:'normal' },
  longsword: { name:'Long Sword', glyph:')', color:'#ddd', type:'weapon', slot:'weapon', dmg:[1,8,0], val:40, category:'sword', speed:'normal' },
  greatsword: { name:'Greatsword', glyph:')', color:'#eee', type:'weapon', slot:'weapon', dmg:[2,6,0], twoHand:true, val:80, category:'sword', speed:'slow' },
  mace: { name:'Mace', glyph:')', color:'#cc8844', type:'weapon', slot:'weapon', dmg:[1,6,1], bonusVsUndead:2, val:20, category:'mace', speed:'normal', statusOnHit:'slow' },
  waraxe: { name:'War Axe', glyph:')', color:'#cc6633', type:'weapon', slot:'weapon', dmg:[1,8,1], val:35, category:'axe', speed:'normal' },
  spear: { name:'Spear', glyph:'/', color:'#aa8855', type:'weapon', slot:'weapon', dmg:[1,6,2], reach:true, val:15, category:'polearm', speed:'normal' },
  shortbow: { name:'Short Bow', glyph:'(', color:'#aa7733', type:'weapon', slot:'weapon', dmg:[1,6,0], ranged:true, ammo:'arrows', val:30, category:'ranged', speed:'normal' },
  longbow: { name:'Long Bow', glyph:'(', color:'#885522', type:'weapon', slot:'weapon', dmg:[1,8,2], ranged:true, ammo:'arrows', twoHand:true, val:60, category:'ranged', speed:'slow' },
  crossbow: { name:'Crossbow', glyph:'(', color:'#775533', type:'weapon', slot:'weapon', dmg:[2,6,0], ranged:true, ammo:'bolts', twoHand:true, val:50, category:'ranged', speed:'slow' },
  sling: { name:'Sling', glyph:'(', color:'#997755', type:'weapon', slot:'weapon', dmg:[1,4,0], ranged:true, ammo:'stones', val:5, category:'ranged', speed:'fast' },
  staff: { name:'Magical Staff', glyph:'/', color:'#8866cc', type:'weapon', slot:'weapon', dmg:[1,6,0], magic:true, val:100, category:'staff', speed:'normal' },
  falchion: { name:'Falchion', glyph:')', color:'#ddaa77', type:'weapon', slot:'weapon', category:'sword', speed:'normal', dmg:[1,8,0], critBonus:2, val:45 },
  flail: { name:'Flail', glyph:')', color:'#aa8866', type:'weapon', slot:'weapon', category:'flail', speed:'normal', dmg:[1,8,0], armorPierce:2, val:35 },
  warhammer: { name:'Warhammer', glyph:')', color:'#bbbbcc', type:'weapon', slot:'weapon', category:'mace', speed:'slow', dmg:[1,10,0], bonusVsUndead:3, twoHand:true, val:60 },
  battleaxe: { name:'Battle Axe', glyph:')', color:'#cc7744', type:'weapon', slot:'weapon', category:'axe', speed:'slow', dmg:[1,10,1], cleave:true, twoHand:true, val:65 },
  halberd: { name:'Halberd', glyph:'/', color:'#997755', type:'weapon', slot:'weapon', category:'polearm', speed:'slow', dmg:[1,10,1], reach:true, cleave:true, twoHand:true, val:70 },
  morningstar: { name:'Morning Star', glyph:')', color:'#cc9966', type:'weapon', slot:'weapon', category:'flail', speed:'normal', dmg:[1,8,1], armorPierce:1, val:40 },
  wand_fire: { name:'Wand of Fire', glyph:'/', color:'#ff4400', type:'wand', slot:'weapon', dmg:[3,6,0], ranged:true, charges:5, val:200, spellEffect:'fire' },
  wand_cold: { name:'Wand of Cold', glyph:'/', color:'#44ccff', type:'wand', slot:'weapon', dmg:[3,6,2], ranged:true, charges:5, val:180, spellEffect:'cold' },
  wand_lightning: { name:'Wand of Lightning', glyph:'/', color:'#ffff44', type:'wand', slot:'weapon', dmg:[3,8,0], ranged:true, charges:4, val:220, spellEffect:'lightning' },
  wand_poison: { name:'Wand of Venom', glyph:'/', color:'#44cc00', type:'wand', slot:'weapon', dmg:[2,4,0], ranged:true, charges:7, val:120, spellEffect:'poison' },
  wand_sleep: { name:'Wand of Sleep', glyph:'/', color:'#8866cc', type:'wand', slot:'weapon', dmg:[0,0,0], ranged:true, charges:5, val:150, spellEffect:'sleep' },
  wand_digging: { name:'Wand of Digging', glyph:'/', color:'#aa8855', type:'wand', slot:'weapon', dmg:[0,0,0], ranged:false, charges:8, val:100, spellEffect:'dig' },
  wand_polymorph: { name:'Wand of Polymorph', glyph:'/', color:'#ff88ff', type:'wand', slot:'weapon', dmg:[0,0,0], ranged:true, charges:4, val:250, spellEffect:'polymorph' },
  // Armor
  leather: { name:'Leather Armor', glyph:'[', color:'#aa7744', type:'armor', slot:'body', ac:2, val:10 },
  chainmail: { name:'Chain Mail', glyph:'[', color:'#aaaaaa', type:'armor', slot:'body', ac:5, val:75 },
  platemail: { name:'Plate Mail', glyph:'[', color:'#cccccc', type:'armor', slot:'body', ac:8, val:400 },
  robes: { name:'Mage Robes', glyph:'[', color:'#8866cc', type:'armor', slot:'body', ac:1, mpBonus:10, val:50 },
  shield: { name:'Shield', glyph:'(', color:'#aaa', type:'armor', slot:'offhand', ac:1, val:10 },
  large_shield: { name:'Large Shield', glyph:'(', color:'#888', type:'armor', slot:'offhand', ac:2, val:25 },
  helmet: { name:'Helmet', glyph:'[', color:'#aaa', type:'armor', slot:'head', ac:1, val:10 },
  cap_int: { name:'Wizard\'s Cap', glyph:'[', color:'#8866cc', type:'armor', slot:'head', ac:0, intBonus:1, val:80 },
  boots_speed: { name:'Boots of Speed', glyph:'[', color:'#ffcc44', type:'armor', slot:'boots', ac:0, speedBonus:1, val:200 },
  boots_elvenkind: { name:'Elven Boots', glyph:'[', color:'#88ffcc', type:'armor', slot:'boots', ac:0, stealth:true, val:150 },
  cloak_prot: { name:'Cloak of Protection', glyph:'[', color:'#446688', type:'armor', slot:'cloak', ac:2, saveBonus:1, val:200 },
  cloak_inv: { name:'Cloak of Invisibility', glyph:'[', color:'#ccccff', type:'armor', slot:'cloak', ac:0, invisible:true, val:400 },
  // Rings
  ring_prot: { name:'Ring of Protection', glyph:'=', color:'#ffcc44', type:'ring', slot:'ring', ac:1, val:150 },
  ring_str: { name:'Ring of Strength', glyph:'=', color:'#ff8844', type:'ring', slot:'ring', strBonus:2, val:150 },
  ring_int: { name:'Ring of Wizardry', glyph:'=', color:'#8866cc', type:'ring', slot:'ring', intBonus:2, mpBonus:15, val:250 },
  ring_regen: { name:'Ring of Regeneration', glyph:'=', color:'#44ff88', type:'ring', slot:'ring', regen:true, val:350 },
  ring_fire: { name:'Ring of Fire Resistance', glyph:'=', color:'#ff4400', type:'ring', slot:'ring', fireResist:true, val:200 },
  ring_doom: { name:'Ring of Doom', glyph:'=', color:'#660000', type:'ring', slot:'ring', cursed:true, strBonus:-3, ac:-2, val:0, cursedDesc:'This ring is cursed! It saps your strength.' },
  // Amulets/Necklaces
  amulet_life: { name:'Amulet of Life', glyph:'"', color:'#ff4444', type:'amulet', slot:'neck', hpBonus:15, val:300 },
  amulet_MR: { name:'Amulet of Magic Resistance', glyph:'"', color:'#8866cc', type:'amulet', slot:'neck', magicResist:20, val:400 },
  amulet_curse: { name:'Amulet of Strangulation', glyph:'"', color:'#ff0000', type:'amulet', slot:'neck', cursed:true, strangle:true, val:0, cursedDesc:'It tightens! You\'re being strangled!' },
  // Consumables
  potion_mutagen: { name:'Mutagenic Brew', glyph:'!', color:'#44ff44', type:'potion', effect:'mutate', val:60 },
  potion_heal: { name:'Potion of Healing', glyph:'!', color:'#ff4444', type:'potion', effect:'heal', power:15, val:20 },
  potion_heal_greater: { name:'Potion of Greater Healing', glyph:'!', color:'#ff6666', type:'potion', effect:'heal_full', val:50 },
  potion_mana: { name:'Potion of Mana', glyph:'!', color:'#4444ff', type:'potion', effect:'restore_mp', power:20, val:25 },
  potion_str: { name:'Potion of Giant Strength', glyph:'!', color:'#ff8844', type:'potion', effect:'temp_str', power:5, duration:30, val:30 },
  potion_speed: { name:'Potion of Speed', glyph:'!', color:'#ffff44', type:'potion', effect:'temp_speed', duration:20, val:35 },
  potion_invis: { name:'Potion of Invisibility', glyph:'!', color:'#ccccff', type:'potion', effect:'invisibility', duration:25, val:40 },
  potion_conf: { name:'Potion of Confusion', glyph:'!', color:'#ff88cc', type:'potion', effect:'confuse_self', val:0 },
  potion_poison: { name:'Potion of Poison', glyph:'!', color:'#44cc00', type:'potion', effect:'poison_self', val:0 },
  potion_xp: { name:'Potion of Experience', glyph:'!', color:'#cc88ff', type:'potion', effect:'gain_xp', power:500, val:100 },
  potion_blind: { name:'Potion of Blindness', glyph:'!', color:'#334455', type:'potion', effect:'blind_self', duration:15, val:0 },
  potion_paralyze: { name:'Potion of Paralysis', glyph:'!', color:'#777744', type:'potion', effect:'paralyze_self', duration:5, val:0 },
  potion_weakness: { name:'Potion of Weakness', glyph:'!', color:'#886655', type:'potion', effect:'weaken_self', power:4, duration:30, val:0 },
  potion_amnesia: { name:'Potion of Amnesia', glyph:'!', color:'#aabbcc', type:'potion', effect:'amnesia', val:0 },
  potion_fire: { name:'Potion of Liquid Fire', glyph:'!', color:'#ff6600', type:'potion', effect:'burn_self', duration:8, val:0 },
  potion_phasing: { name:'Potion of Phasing', glyph:'!', color:'#88ccff', type:'potion', effect:'phasing', duration:20, val:15 },
  potion_berserk: { name:'Potion of Berserk Rage', glyph:'!', color:'#ff2222', type:'potion', effect:'berserk', duration:10, val:10 },
  potion_resist: { name:'Potion of Resistance', glyph:'!', color:'#aaaaff', type:'potion', effect:'magic_resist', duration:25, val:40 },
  potion_clarity: { name:'Potion of Clarity', glyph:'!', color:'#ffffff', type:'potion', effect:'clarity', val:50 },
  potion_antidote: { name:'Potion of Antidote', glyph:'!', color:'#44ff88', type:'potion', effect:'antidote', val:30 },
  potion_restoration: { name:'Potion of Restoration', glyph:'!', color:'#ffddaa', type:'potion', effect:'restoration', val:45 },
  potion_might: { name:'Potion of Might', glyph:'!', color:'#ffaa44', type:'potion', effect:'temp_might', power:2, duration:20, val:45 },
  // Scrolls
  scroll_tele: { name:'Scroll of Teleportation', glyph:'?', color:'#ffcc44', type:'scroll', effect:'teleport', val:20 },
  scroll_enchant_wpn: { name:'Scroll of Weapon Enchant', glyph:'?', color:'#ffcc44', type:'scroll', effect:'enchant_weapon', val:100 },
  scroll_enchant_arm: { name:'Scroll of Armor Enchant', glyph:'?', color:'#ffcc44', type:'scroll', effect:'enchant_armor', val:100 },
  scroll_id: { name:'Scroll of Identify', glyph:'?', color:'#ffcc44', type:'scroll', effect:'identify', val:30 },
  scroll_mapping: { name:'Scroll of Mapping', glyph:'?', color:'#ffcc44', type:'scroll', effect:'map_level', val:50 },
  scroll_fear: { name:'Scroll of Fear', glyph:'?', color:'#ffcc44', type:'scroll', effect:'mass_fear', val:40 },
  scroll_curse: { name:'Scroll of Curse', glyph:'?', color:'#440000', type:'scroll', effect:'curse_items', val:0 },
  scroll_acquirement: { name:'Scroll of Acquirement', glyph:'?', color:'#ffd700', type:'scroll', effect:'acquire_item', val:500 },
  scroll_remove_curse: { name:'Scroll of Remove Curse', glyph:'?', color:'#ffcc44', type:'scroll', effect:'remove_curse', val:80 },
  // Food
  ration: { name:'Food Ration', glyph:'%', color:'#aa7744', type:'food', nutrition:800, val:3 },
  bread: { name:'Bread', glyph:'%', color:'#ccaa66', type:'food', nutrition:500, val:2 },
  meat: { name:'Meat Chunk', glyph:'%', color:'#cc4444', type:'food', nutrition:600, val:1 },
  fruit: { name:'Strange Fruit', glyph:'%', color:'#ff8844', type:'food', nutrition:400, val:2, rng_effect:true },
  // Ammo
  arrows: { name:'Arrows', glyph:'/', color:'#aa8844', type:'ammo', slot:'ammo', count:20, dmgBonus:0, val:1 },
  bolts: { name:'Crossbow Bolts', glyph:'/', color:'#887755', type:'ammo', slot:'ammo', count:15, dmgBonus:1, val:2 },
  stones: { name:'Sling Stones', glyph:'*', color:'#888', type:'ammo', slot:'ammo', count:30, dmgBonus:0, val:0 },
  // Thrown weapons
  throwing_knife: { name:'Throwing Knives', glyph:')', color:'#aabbcc', type:'thrown', dmg:[1,4,1], count:5, range:6, val:8 },
  javelin: { name:'Javelins', glyph:'/', color:'#aa8855', type:'thrown', dmg:[1,6,2], count:3, range:8, val:12 },
  throwing_axe: { name:'Throwing Axes', glyph:')', color:'#cc7744', type:'thrown', dmg:[1,8,1], count:3, range:5, val:15 },
  throwing_star: { name:'Throwing Stars', glyph:'*', color:'#ccccdd', type:'thrown', dmg:[1,3,0], count:8, range:6, val:5 },
  // Special/magic
  rune_of_baal: { name:'⛧ Rune of Baal ⛧', glyph:'§', color:'#ffd700', type:'quest_item', val:0, unique:true },
};

// ─── UNIQUE ITEMS ─────────────────────────────────────────────
const UNIQUE_ITEMS = {
  frostbrand: { name:'Frostbrand', glyph:')', color:'#44ddff', type:'weapon', slot:'weapon', dmg:[1,8,2], category:'sword', speed:'normal', val:500, minFloor:6,
    unique:true, slowOnHit:true, coldDamage:true, selfBurn:1, desc:'A blade of living ice. Slows enemies on hit, but its chill seeps into the wielder.' },
  sword_of_kas: { name:'Sword of Kas', glyph:')', color:'#cc00ff', type:'weapon', slot:'weapon', dmg:[2,8,3], category:'sword', speed:'normal', critBonus:3, val:800, minFloor:10,
    unique:true, hpDrainOnKill:1, desc:'A legendary blade of terrible power. Crits easily, but drinks the life of its wielder with every kill.' },
  staff_of_magi: { name:'Staff of the Magi', glyph:'/', color:'#ffdd88', type:'weapon', slot:'weapon', dmg:[1,6,0], category:'staff', speed:'normal', magic:true, val:700, minFloor:9,
    unique:true, spellPowerBonus:5, mpBonus:20, noStrBonus:true, desc:'The supreme implement of arcane might. Amplifies all spells, but offers no physical power.' },
  aegis_shield: { name:'Aegis Shield', glyph:'[', color:'#dddd44', type:'armor', slot:'offhand', ac:5, val:600, minFloor:7,
    unique:true, reflectDamage:0.25, dexPenalty:2, desc:'An ancient shield of divine make. Reflects damage back at attackers, but its weight slows the hand.' },
  boots_of_zephyr: { name:'Boots of the Zephyr', glyph:'[', color:'#88ffcc', type:'armor', slot:'boots', ac:1, val:500, minFloor:8,
    unique:true, speedBonus:true, alwaysFast:true, desc:'Boots woven from wind itself. The wearer moves with supernatural speed.' },
  crown_of_madness: { name:'Crown of Madness', glyph:'[', color:'#ff44ff', type:'armor', slot:'head', ac:1, val:600, minFloor:11,
    unique:true, intBonus:3, wisBonus:3, confusionChance:0.1, desc:'A circlet of eldritch metal. Grants terrible insight at the cost of sanity.' },
  vampiric_blade: { name:'Vampiric Blade', glyph:')', color:'#990033', type:'weapon', slot:'weapon', dmg:[1,6,1], category:'sword', speed:'fast', val:550, minFloor:8,
    unique:true, lifestealPct:0.25, pietyDrain:10, desc:'A cursed blade that drinks the blood of the slain. Gods look away from its wielder.' },
  ring_of_berserker: { name:'Ring of the Berserker', glyph:'=', color:'#ff5500', type:'ring', slot:'ring', val:400, minFloor:5,
    unique:true, strBonus:4, autoRetaliate:true, noSpells:true, templateKey:'ring_berserker', desc:'A band of dull iron that burns with rage. Grants enormous strength but silences all magic.' },
};

// ─── MONSTERS ─────────────────────────────────────────────────
const MONSTER_TEMPLATES = {
  rat: { name:'Giant Rat', sym:'r', color:'#886644', hp:[1,6,0], ac:10, atk:[[1,3,0]], xp:2, speed:1.2, floor:[1,3], loot:{meat:0.3}, ai:'normal' },
  bat: { name:'Cave Bat', sym:'b', color:'#776655', hp:[1,4,0], ac:10, atk:[[1,2,0]], xp:2, speed:1.5, floor:[1,2], ai:'fleeing' },
  kobold: { name:'Kobold', sym:'k', color:'#aa5533', hp:[1,6,1], ac:12, atk:[[1,4,0]], xp:5, speed:1, floor:[1,4], loot:{dagger:0.2, stones:0.4}, ai:'pack' },
  goblin: { name:'Goblin', sym:'g', color:'#55aa33', hp:[1,8,1], ac:12, atk:[[1,6,0]], xp:10, speed:1, floor:[1,5], loot:{shortsword:0.1, leather:0.05, potion_heal:0.1}, ai:'coward' },
  orc: { name:'Orc', sym:'o', color:'#44aa22', hp:[2,8,2], ac:14, atk:[[1,8,0]], xp:25, speed:0.9, floor:[3,8], loot:{waraxe:0.2, chainmail:0.05}, ai:'normal' },
  orc_warrior: { name:'Orc Warrior', sym:'O', color:'#33cc11', hp:[3,8,5], ac:15, atk:[[2,6,2]], xp:50, speed:0.9, floor:[4,9], loot:{waraxe:0.4, chainmail:0.15}, ai:'aggressive' },
  zombie: { name:'Zombie', sym:'z', color:'#88aa66', hp:[2,8,2], ac:8, atk:[[1,8,0]], xp:15, speed:0.6, floor:[2,6], undead:true, ai:'slow' },
  skeleton: { name:'Skeleton', sym:'s', color:'#dddddd', hp:[1,8,2], ac:12, atk:[[1,6,0]], xp:20, speed:0.9, floor:[2,7], undead:true, loot:{arrows:0.3}, ai:'normal' },
  skeleton_archer: { name:'Skeleton Archer', sym:'S', color:'#ccccee', hp:[1,8,2], ac:12, atk:[[1,6,2]], xp:30, speed:0.9, floor:[3,8], undead:true, ranged:true, loot:{arrows:0.5, shortbow:0.1}, ai:'archer' },
  ghoul: { name:'Ghoul', sym:'G', color:'#aaddaa', hp:[3,8,3], ac:13, atk:[[1,8,0],[1,4,0]], xp:45, speed:1, floor:[4,8], undead:true, statusAtk:'paralyze', ai:'aggressive' },
  wight: { name:'Wight', sym:'W', color:'#88aacc', hp:[4,8,3], ac:14, atk:[[1,6,1]], xp:65, speed:0.9, floor:[5,10], undead:true, drainLife:1, ai:'aggressive' },
  wraith: { name:'Wraith', sym:'w', color:'#6688cc', hp:[4,8,5], ac:14, atk:[[1,6,2]], xp:90, speed:1.1, floor:[7,13], undead:true, drainLife:2, ai:'aggressive' },
  vampire: { name:'Vampire', sym:'V', color:'#cc2244', hp:[6,8,8], ac:16, atk:[[2,6,3]], xp:200, speed:1.1, floor:[9,14], undead:true, drainLife:3, regen:2, ai:'cunning' },
  giant_spider: { name:'Giant Spider', sym:'s', color:'#885533', hp:[2,8,1], ac:12, atk:[[1,6,0]], xp:30, speed:1.2, floor:[2,6], statusAtk:'poison', ai:'ambush' },
  cave_worm: { name:'Cave Worm', sym:'w', color:'#558833', hp:[1,6,1], ac:9, atk:[[1,4,0]], xp:3, speed:0.6, floor:[1,3], regen:1, ai:'slow' },
  viper: { name:'Viper', sym:'v', color:'#66cc44', hp:[1,4,1], ac:11, atk:[[1,3,0]], xp:8, speed:1.3, floor:[1,4], statusAtk:'poison', ai:'ambush' },
  giant_ant: { name:'Giant Ant', sym:'a', color:'#996633', hp:[1,6,2], ac:12, atk:[[1,4,1]], xp:6, speed:1, floor:[1,4], ai:'pack' },
  jackal: { name:'Jackal', sym:'j', color:'#ccaa55', hp:[1,4,0], ac:10, atk:[[1,3,0]], xp:3, speed:1.4, floor:[1,3], ai:'pack' },
  gnoll: { name:'Gnoll', sym:'H', color:'#bb8844', hp:[2,6,2], ac:13, atk:[[1,6,1]], xp:20, speed:1.1, floor:[2,6], ai:'aggressive' },
  fungoid: { name:'Fungoid', sym:'f', color:'#bb88cc', hp:[2,6,3], ac:10, atk:[[1,4,0]], xp:15, speed:0.7, floor:[2,5], statusAtk:'confusion', ai:'slow' },
  jiangshi: { name:'Jiangshi', sym:'J', color:'#88bbdd', hp:[3,6,4], ac:13, atk:[[1,8,2]], xp:45, speed:0.6, floor:[3,6], undead:true, statusAtk:'paralyze', ai:'slow' },
  tengu: { name:'Tengu', sym:'t', color:'#cc3333', hp:[2,6,3], ac:14, atk:[[1,6,1],[1,4,0]], xp:40, speed:1.2, floor:[3,7], fly:true, ai:'aggressive', faction:'lawful' },
  kishi: { name:'Kishi', sym:'K', color:'#dd6633', hp:[2,6,4], ac:13, atk:[[1,6,2]], xp:35, speed:1, floor:[3,6], statusAtk:'confusion', ai:'cunning', faction:'chaotic' },
  salthopper: { name:'Salthopper', sym:'c', color:'#eeeedd', hp:[1,6,2], ac:11, atk:[[1,8,1]], xp:25, speed:1.4, floor:[2,5], ai:'aggressive', sprint:true },
  grey_ooze: { name:'Grey Ooze', sym:'p', color:'#888888', hp:[3,6,4], ac:8, atk:[[1,6,0]], xp:35, speed:0.6, floor:[4,8], statusAtk:'corrode', ai:'amorphous' },
  ochre_jelly: { name:'Ochre Jelly', sym:'p', color:'#cc9933', hp:[3,8,6], ac:9, atk:[[1,6,1]], xp:55, speed:0.7, floor:[5,9], ai:'amorphous', splitOnDeath:true },
  mimic: { name:'Mimic', sym:'X', color:'#cc8844', hp:[3,8,4], ac:14, atk:[[2,6,2]], xp:60, speed:1, floor:[5,9], ai:'aggressive', disguise:true },
  doppelganger: { name:'Doppelganger', sym:'@', color:'#ddddee', hp:[3,8,5], ac:14, atk:[[1,8,2]], xp:80, speed:1.1, floor:[6,10], ai:'cunning', doppelganger:true },
  fire_elemental: { name:'Fire Elemental', sym:'F', color:'#ff6622', hp:[4,8,8], ac:14, atk:[[2,6,3]], xp:120, speed:1.2, floor:[7,12], ai:'aggressive', fireImmune:true, burnOnHit:true },
  ice_elemental: { name:'Ice Elemental', sym:'F', color:'#88ccff', hp:[4,8,10], ac:15, atk:[[2,6,2]], xp:130, speed:0.9, floor:[7,12], ai:'normal', slowOnHit:true },
  earth_elemental: { name:'Earth Elemental', sym:'F', color:'#886633', hp:[6,8,15], ac:18, atk:[[2,8,4]], xp:150, speed:0.5, floor:[8,13], ai:'slow' },
  stone_golem: { name:'Stone Golem', sym:'Y', color:'#999999', hp:[5,8,12], ac:17, atk:[[2,6,5]], xp:140, speed:0.7, floor:[8,13], ai:'slow', statusImmune:true, faction:'lawful' },
  iron_golem: { name:'Iron Golem', sym:'Y', color:'#667788', hp:[7,8,18], ac:19, atk:[[3,6,6]], xp:250, speed:0.6, floor:[10,15], ai:'slow', statusImmune:true, fireImmune:true },
  cave_troll: { name:'Cave Troll', sym:'T', color:'#557733', hp:[5,8,10], ac:13, atk:[[2,8,3]], xp:100, speed:0.8, floor:[5,10], regen:1, ai:'aggressive' },
  ogre: { name:'Ogre', sym:'O', color:'#885522', hp:[4,8,8], ac:14, atk:[[2,8,5]], xp:80, speed:0.8, floor:[4,9], loot:{waraxe:0.5, gold:0.9}, ai:'aggressive' },
  minotaur: { name:'Minotaur', sym:'M', color:'#885533', hp:[5,8,10], ac:15, atk:[[2,8,5]], xp:150, speed:0.9, floor:[6,11], ai:'aggressive', faction:'lawful' },
  harpy: { name:'Harpy', sym:'h', color:'#cc8844', hp:[2,8,3], ac:12, atk:[[1,6,0],[1,4,0]], xp:55, speed:1.3, floor:[4,9], fly:true, ai:'normal', faction:'chaotic' },
  medusa: { name:'Medusa', sym:'m', color:'#44cc44', hp:[6,8,8], ac:15, atk:[[1,8,2]], xp:250, speed:1, floor:[9,14], gaze:'stone', ai:'cunning' },
  lamia: { name:'Lamia', sym:'L', color:'#cc8855', hp:[5,8,7], ac:14, atk:[[2,6,3]], xp:180, speed:1.1, floor:[7,12], statusAtk:'confusion', ai:'cunning' },
  basilisk: { name:'Basilisk', sym:'B', color:'#668844', hp:[5,8,8], ac:14, atk:[[1,8,3]], xp:200, speed:0.7, floor:[8,13], gaze:'stone', ai:'normal' },
  naga: { name:'Naga', sym:'N', color:'#33aa55', hp:[5,8,10], ac:15, atk:[[2,6,4],[1,4,0]], xp:220, speed:1, floor:[8,13], spells:['poison_spit'], ai:'cunning', faction:'lawful' },
  lich: { name:'Lich', sym:'L', color:'#8866cc', hp:[8,8,15], ac:17, atk:[[2,6,5]], xp:500, speed:1, floor:[11,16], undead:true, spells:['ice_lance','lightning_bolt'], drainLife:3, ai:'cunning' },
  dragon_young: { name:'Young Dragon', sym:'d', color:'#ff6622', hp:[6,8,12], ac:16, atk:[[2,8,5],[2,6,0]], xp:350, speed:1, floor:[9,13], fly:true, breathWeapon:'fire', ai:'aggressive', faction:'chaotic' },
  dragon_ancient: { name:'Ancient Dragon', sym:'D', color:'#ff2200', hp:[10,8,25], ac:20, atk:[[3,8,8],[2,6,5]], xp:1000, speed:1.1, floor:[13,16], fly:true, breathWeapon:'fire', regen:2, ai:'cunning' },
  devil_imp: { name:'Imp', sym:'i', color:'#cc4488', hp:[2,6,2], ac:13, atk:[[1,4,0]], xp:35, speed:1.2, floor:[4,8], fly:true, spells:['magic_missile'], ai:'annoying', faction:'chaotic' },
  devil_pit: { name:'Pit Fiend', sym:'P', color:'#ff2244', hp:[10,8,20], ac:20, atk:[[3,8,10],[3,6,5]], xp:800, speed:1, floor:[13,16], fireImmune:true, ai:'aggressive', faction:'chaotic' },
  beholder: { name:'Beholder', sym:'E', color:'#eeaa22', hp:[7,8,15], ac:18, atk:[[2,6,5]], xp:600, speed:0.7, floor:[11,15], special:'eye_rays', ai:'cunning' },
  djinn: { name:'Djinn', sym:'J', color:'#44aaff', hp:[6,8,10], ac:16, atk:[[2,8,5]], xp:400, speed:1.1, floor:[10,15], fly:true, ai:'normal', faction:'lawful' },
  shoggoth: { name:'Shoggoth', sym:'$', color:'#228833', hp:[8,8,15], ac:12, atk:[[2,8,5],[2,8,5]], xp:500, speed:0.8, floor:[11,15], regen:3, ai:'amorphous', faction:'chaotic' },
  eye_terror: { name:'Eye of Terror', sym:'e', color:'#cc8800', hp:[4,8,8], ac:15, atk:[[1,6,2]], xp:300, speed:0.9, floor:[9,14], special:'paralyze_gaze', ai:'normal' },
  // High-tier monsters
  revenant: { name:'Revenant', sym:'A', color:'#bbbbaa', hp:[5,8,10], ac:15, atk:[[2,8,4]], xp:280, speed:1.3, floor:[11,15], undead:true, statusImmune:true, ai:'aggressive' },
  rakshasa: { name:'Rakshasa', sym:'Q', color:'#ddaa33', hp:[6,8,12], ac:17, atk:[[2,6,4]], xp:350, speed:1.1, floor:[11,15], statusImmune:true, ai:'cunning' },
  oni: { name:'Oni', sym:'O', color:'#cc2233', hp:[7,8,14], ac:16, atk:[[3,8,6]], xp:350, speed:1, floor:[11,15], spells:['fireball'], ai:'aggressive', faction:'chaotic' },
  gibbering_mouther: { name:'Gibbering Mouther', sym:'u', color:'#cc8888', hp:[5,8,10], ac:12, atk:[[2,6,3]], xp:250, speed:0.8, floor:[11,15], confusionAura:true, ai:'amorphous' },
  balor: { name:'Balor', sym:'C', color:'#ff4422', hp:[7,8,15], ac:18, atk:[[3,6,6],[2,6,3]], xp:400, speed:1.1, floor:[12,16], fly:true, fireImmune:true, ai:'aggressive', faction:'chaotic' },
  shadow_demon: { name:'Shadow Demon', sym:'q', color:'#6644aa', hp:[4,8,6], ac:20, atk:[[2,6,3]], xp:300, speed:1.2, floor:[12,15], drainLife:2, ai:'cunning', faction:'chaotic' },
  death_knight: { name:'Death Knight', sym:'R', color:'#4488aa', hp:[7,8,14], ac:19, atk:[[3,6,5]], xp:350, speed:1, floor:[12,16], undead:true, spells:['ice_lance'], drainLife:1, ai:'aggressive' },
  ammit: { name:'Ammit', sym:'n', color:'#cc9922', hp:[7,8,16], ac:17, atk:[[3,6,5],[2,6,3]], xp:450, speed:1, floor:[12,16], hungerDrain:true, ai:'aggressive' },
  mind_flayer: { name:'Mind Flayer', sym:'I', color:'#aa44cc', hp:[6,8,10], ac:16, atk:[[2,6,4]], xp:400, speed:1, floor:[13,16], statusAtk:'confusion', drainLife:2, ai:'cunning' },
  aboleth: { name:'Aboleth', sym:'U', color:'#2266aa', hp:[8,8,18], ac:17, atk:[[2,8,5]], xp:500, speed:0.8, floor:[13,16], spells:['psychic_blast'], ai:'cunning' },
  // Minibosses (unique per run)
  boss_orc_warlord: { name:'Urguk Fleshrender', sym:'O', color:'#ff4400', hp:[10,8,30], ac:18, atk:[[3,8,8]], xp:800, speed:1, floor:[5,5], loot:{waraxe_enchanted:1, chainmail:1, gold:1}, ai:'aggressive', isBoss:true, unique:true },
  boss_vampire_lord: { name:'Lord Sanguis', sym:'V', color:'#ff0022', hp:[12,8,40], ac:20, atk:[[3,6,8],[1,4,0]], xp:1500, speed:1.1, floor:[9,9], drainLife:5, regen:3, ai:'cunning', isBoss:true, unique:true },
  boss_lich_king: { name:'Mortikal the Eternal', sym:'L', color:'#aa44ff', hp:[15,8,50], ac:22, atk:[[3,6,10]], xp:3000, speed:1, floor:[13,13], undead:true, spells:['disintegrate','fireball','ice_lance'], drainLife:5, ai:'cunning', isBoss:true, unique:true },
  boss_baal: { name:'BAAL', sym:'⛧', color:'#ffd700', hp:[20,8,100], ac:25, atk:[[4,8,15],[3,6,10]], xp:10000, speed:1.2, floor:[16,16], special:'all_abilities', ai:'cunning', isBoss:true, finalBoss:true, unique:true }
};

// ─── NPCs ─────────────────────────────────────────────────────
const NPC_TEMPLATES = [
  { id:'torben', name:'Torben Ironhands', sym:'@', color:'#cc8844', role:'companion', cls:'fightingman', personality:'gruff but loyal', hp_base:30, atk:[2,6,5], flavor:'A scarred mercenary who\'s seen everything. Charges 50gp to join.',
    hatedRaces:['tiefling','lizardman'], raceInsults:{ tiefling:'"I don\'t work with devil-blooded filth. Draw steel!"', lizardman:'"A talking lizard? I\'ll make boots out of you!"' } },
  { id:'mirela', name:'Mirela the Quick', sym:'@', color:'#ff88cc', role:'companion', cls:'fightingman', personality:'sarcastic, lightning-fast', hp_base:20, atk:[1,6,3], flavor:'Ex-thief turned sellsword. Cheaper at 30gp.', dexBonus:3,
    hatedRaces:['halforc'], raceInsults:{ halforc:'"Last half-orc I worked with tried to eat me. Nothing personal."' } },
  { id:'brother_aldric', name:'Brother Aldric', sym:'@', color:'#ffee44', role:'companion', cls:'cleric', personality:'pious, concerned', hp_base:22, atk:[1,6,2], healPlayer:true, flavor:'Wandering cleric who heals you each rest. 40gp.',
    hatedRaces:['tiefling'], raceInsults:{ tiefling:'"The taint of Hell is upon you. Begone, fiend!"' } },
  { id:'zelphira', name:'Zelphira the Pale', sym:'@', color:'#8866cc', role:'companion', cls:'magicuser', personality:'aloof, observational', hp_base:15, atk:[1,4,0], canCastMissile:true, flavor:'Fallen court mage. Expensive at 75gp but knows spells.',
    hatedRaces:['halforc','lizardman'], raceInsults:{ halforc:'"How grotesque. I don\'t associate with brutes."', lizardman:'"I don\'t consort with... lizards. Begone."' } },
  { id:'ghokk', name:'Ghokk', sym:'@', color:'#55cc33', role:'companion', cls:'fightingman', personality:'simple, enthusiastic, enormous', hp_base:50, atk:[3,6,8], flavor:'Half-orc of few words, many fists. Wants 60gp and food.',
    hatedRaces:['elf','halfling'], raceInsults:{ elf:'"GHOKK NOT HELP POINTY-EAR! GHOKK SMASH POINTY-EAR!"', halfling:'"TINY ONE LOOK LIKE SNACK. GHOKK HUNGRY!"' } },
  { id:'nyx', name:'Nyx Shadowwhisper', sym:'@', color:'#446688', role:'companion', cls:'rogue', personality:'cryptic, useful, slightly threatening', hp_base:18, atk:[2,6,2], canDisarm:true, flavor:'Appears from nowhere. Has... useful skills. 45gp.',
    hatedRaces:['dwarf'], raceInsults:{ dwarf:'"Dwarves. Too loud, too honest, too... short. We\'re done here."' } },
  { id:'merchant_agmar', name:'Agmar Goldtooth', sym:'@', color:'#ffd700', role:'merchant', personality:'greedy but honest', flavor:'Wandering merchant. Sells varied goods.' },
  { id:'sage_mervyn', name:'Mervyn the Sage', sym:'@', color:'#aaffcc', role:'sage', personality:'eccentric, wise', flavor:'Will identify items for 20gp each. Knows things.' },
];


// ─── MUTATIONS ───────────────────────────────────────────────
const MUTATION_DEFS = {
  extra_eyes:   { name:'Extra Eyes',        pos:'Vision radius +2, spot hidden things.',    neg:'Headaches reduce WIS by 1.',   visBonus:2, wisMod:-1 },
  iron_skin:    { name:'Iron Skin',          pos:'Natural AC +3.',                            neg:'DEX -1 (stiff).',             acBonus:3, dexMod:-1 },
  claws:        { name:'Elongated Claws',   pos:'Unarmed dmg 1d8+STR.',                      neg:'Cannot wear gloves.',         clawDmg:true },
  tentacle:     { name:'Tentacle Arm',      pos:'Extra attack 1d6 per turn.',                neg:'CHA -2 (unsettling).',        extraAtk:true, chaMod:-2 },
  carapace:     { name:'Chitinous Carapace',pos:'AC +2, poison resist.',                     neg:'STR -1 (heavy).',             acBonus:2, poisonResist:true, strMod:-1 },
  biolum:       { name:'Bioluminescence',   pos:'Always lit. CON +1.',                       neg:'Cannot hide in darkness.',    conMod:1, glowing:true },
  regen_slow:   { name:'Slow Regeneration', pos:'Heal 1 HP every 5 turns.',                  neg:'None.',                       regenTurns:5 },
  toxic_blood:  { name:'Toxic Blood',       pos:'Melee attackers take 2 poison damage.',     neg:'Slightly nauseating (CHA-1).',poisonAura:true, chaMod:-1 },
  wings:        { name:'Vestigial Wings',   pos:'Fall damage immune. DEX +1.',               neg:'Shirts never fit right.',     dexMod:1 },
  gills:        { name:'Gills',             pos:'Breathe underwater. Water moves freely.',   neg:'Dry air reduces CON by 1.',   amphibious:true, conMod:-1 },
  telepathy:    { name:'Telepathy',         pos:'Sense monsters through walls (nearby).',    neg:'INT -1 (mental noise).',      telepathy:true, intMod:-1 },
  acid_spit:    { name:'Acid Glands',       pos:'Spit acid 1d6+floor, 3 charges/10 turns.', neg:'Taste is destroyed.',         acidSpit:true },
  leathery_hide:{ name:'Leathery Hide',     pos:'AC +1. Resist fire 10%.',                   neg:'CHA -1.',                    acBonus:1, fireResist10:true, chaMod:-1 },
  compound_eyes:{ name:'Compound Eyes',     pos:'Cannot be surprised. DEX +1.',              neg:'Lights are very bright (WIS-1).', dexMod:1, wisMod:-1 },
  muscle_bulk:  { name:'Muscle Bulk',       pos:'STR +3. Carry weight doubled.',             neg:'DEX -2.',                    strMod:3, dexMod:-2 },
  tail:         { name:'Prehensile Tail',   pos:'Can pick up items behind you. DEX +1.',     neg:'Pants require tailoring.',    dexMod:1 },
  magnetism:    { name:'Magnetic Field',    pos:'Metal weapons occasionally miss (15%).',    neg:'Cannot wear metal armor.',   magnetism:true },
  second_stomach:{ name:'Second Stomach',  pos:'Hunger halved.',                             neg:'Occasionally crave mud.',    halfHunger:true },
};

const MONSTER_SOUNDS = {
  rat:      ['You hear scurrying.', 'Something squeaks nearby.'],
  bat:      ['Leathery wings flutter somewhere.', 'You hear high-pitched squeaking.'],
  kobold:   ['Yipping voices echo.', 'You hear clinking metal in the dark.'],
  goblin:   ['Someone snickers.', 'You hear arguing in a guttural tongue.'],
  orc:      ['Heavy footsteps approach.', 'Guttural breathing echoes.'],
  orc_warrior: ['Armored feet stomp nearby.', 'A war-cry echoes from ahead.'],
  zombie:   ['Wet shuffling. Getting closer.', 'Something moans.'],
  skeleton: ['Bones rattle in the dark.', 'Dry footsteps scrape stone.'],
  skeleton_archer: ['A bowstring twangs somewhere.', 'An arrow skitters across stone.'],
  ghoul:    ['Ragged breathing. Hungry.', 'Something sniffs the air.'],
  wight:    ['Cold silence. Then nothing.', 'The temperature drops.'],
  wraith:   ['A keening wail, distant.', 'The air grows cold.'],
  vampire:  ['Someone is very close. And very still.', 'You hear... nothing. That is worse.'],
  giant_spider: ['Silk drags across stone.', 'Too many legs. Moving fast.'],
  cave_worm: ['Something squirms in the walls.', 'Wet tunneling sounds echo nearby.'],
  viper: ['A dry hiss from the shadows.', 'Something slithers across stone.'],
  giant_ant: ['Chitinous clicking approaches.', 'Many legs skitter in formation.'],
  jackal: ['Yipping cries echo from ahead.', 'Padded feet circle in the dark.'],
  gnoll: ['Hyena-like cackling echoes.', 'Snarling voices argue in the dark.'],
  fungoid: ['A musty, spore-thick smell fills the air.', 'Something squelches wetly.'],
  jiangshi: ['Rhythmic hopping echoes from the dark.', 'A cold, stiff presence draws near.'],
  tengu: ['Feathers rustle overhead.', 'A sharp caw echoes through the corridors.'],
  kishi: ['A honeyed voice whispers your name.', 'Laughter from two mouths at once.'],
  salthopper: ['Chitinous legs scrape against salt-crusted stone.', 'A rapid clicking approaches — fast.'],
  grey_ooze: ['Something wet oozes across the floor.', 'A faint hiss of dissolving stone.'],
  ochre_jelly: ['Gelatinous squelching from somewhere close.', 'A sour, chemical smell fills the air.'],
  mimic: ['You could swear that chest just moved.', 'Something shifts slightly in the dark.'],
  doppelganger: ['Footsteps that sound exactly like yours.', 'You hear your own voice, but from ahead.'],
  fire_elemental: ['Crackling flames echo through the corridor.', 'The air shimmers with intense heat.'],
  ice_elemental: ['Frost crackles along the walls.', 'A bone-deep cold seeps into the corridor.'],
  earth_elemental: ['Stone grinds against stone, slowly.', 'The floor trembles with heavy footfalls.'],
  stone_golem: ['Grinding stone echoes from ahead.', 'Massive footsteps, perfectly spaced.'],
  iron_golem: ['Metal scrapes against the dungeon floor.', 'A deep metallic groan resonates.'],
  cave_troll: ['Rocks crunch under massive weight.', 'Low grunting approaches.'],
  ogre:     ['The floor shakes.', 'Something very large belches.'],
  minotaur: ['A great snort echoes.', 'Hooves pound stone.'],
  harpy:    ['A shriek cuts the air.', 'Wings beat overhead.'],
  lich:     ['Whispering in dead languages.', 'An ancient chill settles over you.'],
  dragon_young: ['A furnace-breath heat wafts your way.', 'Scales scrape stone.'],
  dragon_ancient: ['The dungeon trembles.', 'You smell brimstone.'],
  devil_imp: ['Giggling. Evil giggling.', 'Something fast darts in shadows.'],
  devil_pit: ['The very stones crack under it.', 'A sulphurous reek fills your lungs.'],
  beholder: ['Many eyes blink wetly.', 'A low hum vibrates your skull.'],
  shoggoth: ['Wet, formless sounds approach.', 'Iridescent shapes flicker in shadow.'],
  revenant: ['Relentless footsteps, never stopping.', 'A cold, focused hatred presses toward you.'],
  rakshasa: ['Silken laughter drifts from nowhere.', 'The air smells of incense and deception.'],
  oni: ['A thunderous roar shakes dust from the ceiling.', 'Something massive drags a club across stone.'],
  gibbering_mouther: ['A chorus of maddened whispers fills the corridor.', 'Dozens of mouths babble in no language.'],
  balor: ['Flames roar in the darkness ahead.', 'The crack of a whip echoes like thunder.'],
  shadow_demon: ['The shadows deepen unnaturally.', 'Something cold passes through you.'],
  death_knight: ['Armored boots march with undead precision.', 'A voice commands the dead to rise.'],
  ammit: ['Massive jaws snap in the dark.', 'Something ancient and hungry waits ahead.'],
  mind_flayer: ['Your thoughts feel... watched.', 'A wet, alien presence probes the edges of your mind.'],
  aboleth: ['A vast psychic pressure bears down on you.', 'Ancient thoughts, older than language, echo through stone.'],
};


// ─── TILE CONSTANTS ──────────────────────────────────────────
const TILE = {
  WALL: 0, FLOOR: 1, CORRIDOR: 2, DOOR: 3, STAIRS_DOWN: 4, STAIRS_UP: 5,
  WATER: 6, LAVA: 7, DARK_FLOOR: 8, ALTAR: 9, SHOP: 10, TRAP: 11,
};

const MAP_W = 80;
const MAP_H = 40;
let CELL_SIZE = 36;


// ─── RENDERING ────────────────────────────────────────────────
const TILE_COLORS = {
  [TILE.WALL]:       { ch:'#', fg:'#5566aa', bg:'#0d0d18' },
  [TILE.FLOOR]:      { ch:'.', fg:'#3a3a5c', bg:'#0a0a14' },
  [TILE.CORRIDOR]:   { ch:'.', fg:'#303050', bg:'#0a0a14' },
  [TILE.DOOR]:       { ch:'+', fg:'#cc8833', bg:'#0a0a14' },
  [TILE.STAIRS_DOWN]:{ ch:'>', fg:'#ffcc44', bg:'#0a0a14' },
  [TILE.STAIRS_UP]:  { ch:'<', fg:'#aaffcc', bg:'#0a0a14' },
  [TILE.WATER]:      { ch:'~', fg:'#3377dd', bg:'#0a1828' },
  [TILE.LAVA]:       { ch:'~', fg:'#ff5500', bg:'#200800' },
  [TILE.DARK_FLOOR]: { ch:'.', fg:'#252540', bg:'#0a0a14' },
  [TILE.ALTAR]:      { ch:'_', fg:'#cc44cc', bg:'#0a0a14' },
  [TILE.SHOP]:       { ch:'¥', fg:'#dd44ff', bg:'#0a0a14' },
  [TILE.TRAP]:       { ch:'^', fg:'#996600', bg:'#0a0a14' },
};

const FLOOR_THEMES = {
  dungeon:  { name:'Dungeon',       floors:[1,3],  wall:'#5566aa', floor:'#3a3a5c', corridor:'#303050', bg:'#0d0d18' },
  caves:    { name:'Flooded Caves',  floors:[4,6],  wall:'#447788', floor:'#2a4455', corridor:'#1a3344', bg:'#0a1520', extraWater:true },
  crypt:    { name:'Crypt',          floors:[7,9],  wall:'#777788', floor:'#3a3a44', corridor:'#2a2a33', bg:'#0d0d10', fovReduction:1, undeadBoost:true },
  forge:    { name:'Forge',          floors:[10,12],wall:'#aa5533', floor:'#4a2a1a', corridor:'#3a2010', bg:'#180a05', extraLava:true },
  abyss:    { name:'Abyss',          floors:[13,15],wall:'#7744aa', floor:'#2a1a3a', corridor:'#1a1030', bg:'#0d0818', demonBoost:true, extraTraps:true },
  throne:   { name:'Baal\'s Throne', floors:[16,16],wall:'#aa8833', floor:'#3a2a1a', corridor:'#2a1a10', bg:'#181005' },
};

function getFloorTheme(floor) {
  for(const theme of Object.values(FLOOR_THEMES)) {
    if(floor >= theme.floors[0] && floor <= theme.floors[1]) return theme;
  }
  return FLOOR_THEMES.dungeon;
}

function getThemedTileColors(floor) {
  const theme = getFloorTheme(floor);
  return {
    ...TILE_COLORS,
    [TILE.WALL]:     { ch:'#', fg:theme.wall, bg:theme.bg },
    [TILE.FLOOR]:    { ch:'.', fg:theme.floor, bg:'#0a0a14' },
    [TILE.CORRIDOR]: { ch:'.', fg:theme.corridor, bg:'#0a0a14' },
  };
}
