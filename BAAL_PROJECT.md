# BAAL — Project Brief
*For use as context in Claude Code or future Claude sessions.*
*Current build: Baal_v4c.html — single HTML file, ~5,550 lines.*
*Created by Ray Weiss.*

---

## What This Is

A traditional roguelike built as a single self-contained HTML file using vanilla JS and a canvas renderer. Inspired by 1974 D&D, DCSS, and Wizardry. The player descends 16 floors to retrieve the Rune of Baal. Death is permanent. The file runs directly in any browser with no build step, no dependencies, and no server.

The font is VT323 (Google Fonts CDN) for the map canvas and Share Tech Mono for the UI. Everything else is pure JS/CSS/HTML.

---

## File Architecture

Single file layout (top to bottom):

```
<head>        CSS styles, Google Fonts
<body>        HTML panels (overlay, game-container, screens)
<script>
  RNG                     Seeded xorshift RNG with shuffle/dice helpers
  IDENTIFICATION SYSTEM   Appearance randomization for potions/scrolls/rings/amulets
  DATA: RACES             8 races (human, elf, dwarf, halfling, gnome, halforc, tiefling, lizardman)
  DATA: CLASSES           3 classes (fightingman, cleric, magicuser)
  DATA: GODS              8 gods (Mithras, Sekhmet, Thoth, Hecate, Ogun, Tiamat, Nephthys, Zagyg)
  DATA: SPELLS            Spells/abilities keyed by string
  DATA: ITEM_TEMPLATES    All item definitions (~40 items)
  DATA: MONSTER_TEMPLATES ~30 monster types + boss variants
  DATA: NPC_TEMPLATES     Hireable companions (Torben, Mirela, etc.)
  DATA: MUTATION_DEFS     18 mutation types
  MAP GENERATION          BSP-style room/corridor dungeon, 16 floors
  GHOST SYSTEM            Player ghosts persist in localStorage
  GAME STATE              initPlayer(), startNewGame(), G object
  FOV                     Shadowcasting
  RENDERING               Canvas tile renderer, side panel, minimap
  LOGGING                 Log panel with color-coded message types
  STATS/CALCULATIONS      AC, attack bonus, damage bonus, XP tables
  MOVEMENT & ACTIONS      tryMove(), checkTrap(), autoPickup(), pickupItems()
  COMBAT                  attackMonster(), monsterAttack(), killMonster()
  MONSTER AI              updateMonsters(), updateCompanions(), updateNPCs()
  MUTATIONS               tryGrantMutation(), applyMutationEffects()
  SOUND/NOISE             Ambient monster noise system
  LOOK COMMAND            L key cursor mode
  TURN MANAGEMENT         endTurn() — hunger, poison, regen, status ticks
  AUTO-EXPLORE            O key BFS pathfinding with item pickup
  SPELLS/ABILITIES        castSpell(), class abilities
  GOD SYSTEM              Piety, gifts, wrath, abandonment
  ITEMS/INVENTORY         useItem(), applyPotion(), applyScroll(), equipItem()
  STAIRS                  descend(), ascend()
  SHOPS                   openShop(), buyItem()
  NPC INTERACTION         interactNPC(), companion chat (C key)
  GOD SCREEN              Pantheon display, altar interaction
  CHARACTER CREATION      3-step: race → class → name
  INPUT HANDLING          handleKey(), handleInvKey(), handleSpellKey()
  MENUS                   Consume, identify, pickup, companion chat modals
  COMPANION CHAT          C key — follow/stay orders per companion
  SAVE/QUIT SYSTEM        localStorage save, quit/continue/give-up
  ENTRY POINT             window.onload
```

---

## Global State Object (G)

Everything live is in `G`. Key fields:

```js
G = {
  floor,          // 1–16
  turn,           // turn counter
  player,         // player object (see below)
  level,          // current level (tiles, items, monsters, npcs, explored Set, visible Set)
  messages,       // log array
  autoExploreActive,
  restingActive,
  lookMode, lookX, lookY,
  invOpen, spellOpen, godOpen, inShop,
  consumeMenuOpen, identifyMenuOpen, pickupModalOpen, companionChatOpen,
  shopItems,
  templeSpawned,  // bool — temple only spawns once per game
  killedBosses,   // array of boss keys
  joinedNPCs,     // array of NPC ids already recruited
  gameOver, won,
  godFledFrom,
  seenMonsters, seenItems,  // Sets for discovery logging
}
```

Player object key fields:
```js
player = {
  name, race, cls,
  x, y,
  hp, maxHp, mp, maxMp,
  level, xp,
  hunger, maxHunger,   // 1000 max, ticks down each turn
  gold,
  stats: { str, dex, con, int, wis, cha },
  equipped: { weapon, offhand, body, head, ring1, ring2, neck, cloak, boots, ammo },
  inventory: [],       // item objects
  companions: [],      // companion objects (hired NPCs)
  passives: [],        // string array of passive abilities
  spells: [],          // spell key strings
  mutations: [],       // mutation objects
  status: {},          // temp effects: poisoned, confused, paralyzed, invisible, etc.
  god,                 // god key string or null
  piety,               // 0–100
}
```

---

## Identification System

Four item types have randomized appearances per game, shuffled in `assignItemAppearances()` called at game start.

| Type    | Appearance pool              | Identified by                         | Global tracking            |
|---------|------------------------------|---------------------------------------|----------------------------|
| potion  | 20 color names               | drinking, scroll of identify, Thoth   | `GAME_IDENTIFIED_POTIONS`  |
| scroll  | 15 fantasy word labels       | reading, scroll of identify, Thoth    | `GAME_IDENTIFIED_SCROLLS`  |
| ring    | 15 material/appearance names | equipping, scroll of identify, Thoth  | `GAME_IDENTIFIED_RINGS`    |
| amulet  | 12 material/appearance names | equipping, scroll of identify, Thoth  | `GAME_IDENTIFIED_AMULETS`  |

Once one item of a type is identified, all others of the same type are known globally for that run. Rings and amulets carry a `templateKey` property (e.g. `'ring_str'`) for this purpose.

Cursed items look normal until equipped (rings/amulets) or until a remove-curse scroll is used.

---

## Map Generation

`generateLevel(floor)` — BSP-style:
- Generates 6–12 rooms with random dimensions
- Connects rooms with L-shaped corridors
- Places items (0–2 per room), monsters (0–3 per room, scaling with floor), gold (45% chance per room)
- **Current spawn chances (BALANCE NOTE — see section below):**
  - Shop tile: ~7% per room (roll < 0.15 after altar check at < 0.08) — **too high on floor 1**
  - Altar: ~8% per room
  - NPC: 35% flat per floor regardless of floor number — **too high on floor 1**
  - Temple: 12% chance, max once per game, requires floor to have 5+ rooms
  - Trap: 15% per room
- `TILE` enum: WALL=0, FLOOR=1, CORRIDOR=2, DOOR=3, STAIRS_DOWN=4, STAIRS_UP=5, WATER=6, LAVA=7, DARK_FLOOR=8, ALTAR=9, SHOP=10, TRAP=11

---

## Rendering

Canvas-based, tile size 20px, VT323 font. Key colors:

| Tile        | Char | FG color   |
|-------------|------|------------|
| Wall        | #    | #5566aa    |
| Floor       | .    | #3a3a5c    |
| Corridor    | .    | #303050    |
| Door        | +    | #cc8833    |
| Stairs down | >    | #ffcc44    |
| Stairs up   | <    | #aaffcc    |
| Altar       | _    | #cc44cc    |
| Shop        | ¥    | #dd44ff    |
| Trap        | ^    | #996600    |

Explored-but-not-visible tiles render in `#2a2a44`.

The right side panel contains: character stats, bars (HP/MP/XP/hunger), equipment slots, faith/god display, companions, NEARBY panel (monsters + items in FOV including underfoot), mutations count, minimap.

---

## Key Bindings

```
hjklyubn / numpad / arrows   Move/attack
. / 5                        Wait
R (shift)                    Rest until healed
O                            Auto-explore (BFS, picks up wanted items)
Tab                          Auto-attack nearest
,                            Pick up item (modal if multiple)
i                            Inventory
e                            Eat food
q                            Quaff potion
r                            Read scroll
z                            Spells/abilities
g                            Pray (only works if you have a faith)
>                            Descend stairs / enter shop
<                            Ascend stairs
L                            Look mode (cursor, shows item/monster info)
s                            Search for traps
c                            Companion chat (follow/stay orders)
m / ~                        Mutations screen
?                            Help
ESC                          Cancel / close menus
```

---

## Auto-Explore Logic

- BFS from player position to nearest unexplored tile
- Stops on: visible enemy within 6 tiles, HP < 30%, hunger < 15%
- Before exploring, detours toward visible wanted items:
  - Gold, food, ammo: always picked up
  - Potions: picked up unless identified as harmful (confuse_self, poison_self)
  - Scrolls: picked up unless identified as harmful (curse_items)
  - Rings/amulets: NOT auto-picked up (unimplemented — could be added)
- Altar and shop tiles are skipped as BFS targets (marked explored on first sight to prevent loop bug)
- If tryMove succeeds but player didn't actually move (altar interaction etc.), stops immediately

---

## Save System

Uses `localStorage` key `'baal_save_v3'`. Saves: floor, turn, player object, level (tiles + explored set), identification state (all four GAME_IDENTIFIED_* sets + appearance maps), messages (last 100), killedBosses, joinedNPCs, templeSpawned flag.

- Autosave every 10 turns
- Deleted on death (permadeath)
- Deleted on give-up
- "SAVE & QUIT" button in side panel → saves + returns to title, shows Continue button
- "GIVE UP" button → confirm dialog, deletes save, shows death screen

---

## Balance Notes & Known Issues

### Spawn rates (NEEDS TUNING)
- **Shops and NPCs appear too frequently on floor 1.** Current NPC rate is flat 35% per floor regardless of depth. Should scale with floor, probably 0% on floor 1, ~5% on floor 2, ramping to ~20% on floor 8+.
- **Shop tile rate** (~7% per room) also too high for early floors. DCSS/NetHack philosophy: shops should feel like a lucky find, especially early.
- **Suggested approach:** Scale both by floor number, gate floor 1 entirely for both.

### NPC hostility idea (not implemented)
- Low CHA NPCs should insult and possibly attack instead of offering to join
- Race-based friction: e.g. orc NPCs hostile to elves/halflings, etc.
- Would add flavor and make CHA a more meaningful dump-stat penalty

### Auto-pickup
- Rings and amulets are not auto-picked up during auto-explore (intentional — they're unidentified and could be cursed)
- Potions/scrolls auto-picked up on walk-over unless identified as bad

### Identification
- Rings/amulets identified on equip, by scroll of identify, by Thoth ability, or by Mervyn the sage
- Shop displays unidentified names for potions/scrolls/rings/amulets correctly

---

## Future Development Notes

### When to refactor (single file → multi-file)
The file is ~5,400 lines and growing. It remains manageable as-is until:
- Adding a second dungeon branch (Lair, Crypt, etc.)
- Adding a 4th+ class or 9th+ race
- Adding multiplayer or any server component
- File exceeds ~8,000 lines

Suggested split when that time comes:
- `index.html` — shell, CSS
- `data.js` — all CONST data (races, classes, gods, items, monsters, mutations, spells)
- `engine.js` — game state, turn logic, combat, movement, AI
- `render.js` — canvas renderer, side panel, minimap
- `ui.js` — all modals, menus, key handling, character creation

### Electron packaging
Trivial when ready. Electron wraps a single HTML file natively. No changes to game code required. Estimated effort: one afternoon to set up package.json and main.js wrapper.

### Steam release considerations
- Needs a proper main menu / settings screen
- Needs fullscreen support (just CSS + canvas resize)
- Would need Windows/Mac/Linux Electron builds
- Save system already uses localStorage (Electron maps this to AppData/Application Support correctly)
- Score/leaderboard would need a backend or be local-only

---

## Implemented Systems Checklist

- [x] Procedural dungeon generation (16 floors)
- [x] FOV (shadowcasting)
- [x] 8 races with stat bonuses and passives
- [x] 3 classes with spell lists and abilities
- [x] 8 gods with piety, gifts, wrath, active abilities
- [x] Temple rooms (once per game)
- [x] Altar interaction (pledge faith, change god)
- [x] Unidentified potions (randomized colors per game)
- [x] Unidentified scrolls (randomized labels per game)
- [x] Unidentified rings (randomized appearances per game)
- [x] Unidentified amulets (randomized appearances per game)
- [x] Cursed items (hidden until equipped or identified)
- [x] Scroll of Remove Curse
- [x] Scroll of Identify (opens identify menu)
- [x] 18 mutations (mutagenic brew, mutation traps, etc.)
- [x] Ghost system (player ghosts from previous runs)
- [x] NPC companions with follow/stay AI (C key orders)
- [x] Pre-hire NPC wandering AI
- [x] DCSS-style monster panel (nearby section)
- [x] Underfoot item display in nearby panel
- [x] Look mode (L key cursor)
- [x] Minimap
- [x] Auto-explore (O key) with item pickup and danger stopping
- [x] Extended rest (R key) with HP/MP regen
- [x] Natural HP/MP regeneration out of combat
- [x] Traps (dart, pit, alarm, poison gas, magic) with DEX-based disarm chance
- [x] Shop system with key/click interface
- [x] Save/load/quit/give-up via localStorage
- [x] Item pickup modal (multiple items on same tile)
- [x] Consume menu (multiple potions/food)
- [x] Ghost graveyard persists across sessions
- [x] Sound/hearing system (ambient monster noise)
- [x] Monster discovery log
- [x] Item discovery log (unidentified names)
- [x] Formation rank bonus (Fighting-Man with companions)
- [x] Ranged combat
- [x] Turn undead (Cleric)
- [x] Companion spells (magic-user companion casts magic missile)
- [x] Companion healing (cleric companion heals player)
- [x] Byline: "A Game by Ray Weiss"
- [x] Ring/amulet auto-pickup (walk-over and auto-explore, skips identified cursed)
- [x] Player-companion place swapping (bump to swap, NPCs can't force swap)
- [x] NPC racial hostility (insults, turns hostile, attackable, companions help fight)

---

## Changelog

### v4c (2026-03-02)
1. **Ring/amulet auto-pickup** — `shouldAutoPickup()` and `autoExploreWantsItem()` now include rings and amulets. Identified cursed items (ring_doom, amulet_curse) are skipped.
2. **Player-companion place swapping** — Walking into a companion swaps positions instead of overlapping. Added NPC collision checks to `moveToward()` to prevent all NPC stacking.
3. **NPC racial hostility** — Each companion NPC has `hatedRaces` and `raceInsults`. Bumping a hostile NPC triggers insult, turns them red, and they attack. Player can fight back. Companions target hostile NPCs. Auto-explore stops near hostile NPCs. Merchants/sage stay neutral.

---

## Not Yet Implemented (Ideas Log)

- [x] NPC hostility based on racial friction (v4c)
- [ ] Shop and NPC spawn rate scaling by floor depth
- [x] Rings/amulets in auto-explore pickup (v4c — skips identified cursed items)
- [ ] Sub-levels / branch dungeons (Lair, Crypt, etc.)
- [ ] More races and classes
- [ ] Thrown weapons
- [ ] Wand system
- [ ] Trap creation/disarm as active ability
- [ ] Item crafting (enchanting via blacksmith NPC?)
- [ ] Named/unique items
- [ ] Proper win screen with score breakdown
- [ ] Sound effects (Web Audio API)
- [ ] Settings screen (font size, tile size, color themes)
- [ ] Fullscreen mode
