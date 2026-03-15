# BAAL — Changelog

## v5c (2026-03-14)

### 8-Bit Remaster Tileset + Animated Sprites
- **Multi-spritesheet system** — Loads 5 spritesheets: Remaster World (12x12, terrain/items), Character (12x12, 44 animated character types), Bosses (24x24, 6 boss types), FX (8x8, spell effects), and Classic Roguelike (8x8, fallback). Graceful fallback chain: Remaster → Classic → ASCII.
- **Themed dungeon tiles** — Each floor band uses different wall, floor, door, and stair tiles from the World sheet. Grey stone for Dungeon, cave walls for Flooded Caves, stone brick for Crypt, red brick for Forge, frost for Abyss, turret for Baal's Throne.
- **Directional character animation** — Player and monsters have idle, walk, and attack animations in 4 directions (right, down, up, left). 2 frames per state at 500ms. Entities track `facing` direction and `animState`.
- **Player sprite by class/race** — Fighting-Man uses warrior sprite, Cleric uses cleric sprite, Magic-User uses mage sprite. Elf and dwarf races override to dedicated sprites.
- **Monster sprite mapping** — 40+ monsters mapped to Remaster character rows (rat, bat, spider, goblin, skeleton, zombie, orc, gnoll, snake, slime, ghost, flame, spark, imp, demon, etc.). Unmapped monsters fall back to Classic tileset.
- **Boss rendering at 2x size** — Bosses (Baal=dragon, Lich King=reaper, Vampire Lord=lord, Orc Warlord=cyclops) render from the Bosses sheet at double tile size, centered over their position. Visually dramatic.
- **Item sprites from World sheet** — Swords, daggers, axes, hammers, spears, staves, bows, shields, armor, helms, boots, cloaks, potions (colored), scrolls, rings, amulets, food, and gold all have dedicated 12x12 sprites.
- **Default zoom 3x** — CELL_SIZE now 36px (3x of 12px tiles). Zoom range 24-48 (2x-4x), step 6.
- **Facing direction tracking** — `tryMove()` and `moveToward()` update entity facing. `attackMonster()` sets attack animation state. `endTurn()` resets all to idle.

---

## v5b (2026-03-14)

### Full UI Overhaul
- **Bottom HUD bar** — Replaced the 280px right sidebar with a compact bottom HUD bar. Map now takes full screen width. HUD shows identity, HP/MP/XP/hunger bars, stats, equipment sprite icons, faith, nearby monsters with sprites, and action buttons.
- **Equipment sprite icons** — 10 equipment slots rendered as tile sprites from the Oryx spritesheet with hover tooltips showing item details. Falls back to text glyphs in ASCII mode.
- **Monster panel with sprites** — NEARBY monsters now shown with their tile sprite, name, and HP bar in the HUD.
- **Log overlay** — Log messages now overlay the map semi-transparently (bottom-left), expanding on hover. No longer takes a fixed grid row.
- **Minimap overlay** — Minimap moved to a top-right overlay on the map canvas (180x60), with hover opacity.
- **Removed CRT effects** — Scanlines and vignette removed; they clashed with the pixel art tileset.
- **Updated color palette** — Shifted from terminal amber to warmer dungeon tones (parchment text, earthier borders).
- **Default 3x zoom** — CELL_SIZE now defaults to 24px (3x tile scale) to better show off the Oryx art.
- **Mouse wheel zoom** — Scroll wheel on the map zooms between 2x-4x (16px to 32px tiles). Zoom preference persisted to localStorage.
- **Tileset as default** — Tile mode is now the out-of-box experience. ASCII mode still available via F1 toggle.
- **Numpad 0 auto-explore** — Numpad 0 (Insert) now triggers auto-explore, same as O key.

---

## v5 (2026-03-14)

### Multi-File Refactor
- **Split into 5 files** — `index.html`, `data.js`, `engine.js`, `render.js`, `ui.js`. No logic changes — purely structural. Load order: data → engine → render → ui. All globals remain global.

### Brogue-Style Visual Effects
- **Animation loop** — `requestAnimationFrame` at 15 FPS. Tiles animate even when the player is idle. Game logic is unaffected (turn-based state only changes on input).
- **Dancing colors** — Water, lava, and altar tiles subtly shift their foreground color each frame using sine waves with per-tile phase offsets. Water ripples blue, lava flickers orange-red, altars pulse purple.
- **Dynamic lighting** — Light sources (lava, altars, shops, fire elementals, player torch) cast colored light into surrounding tiles with distance falloff and flicker. Uses typed arrays for per-tile light accumulation and additive canvas blending.
- **Combat flash effects** — Red flash on monster hit, bright yellow-white on critical hit, red flash on player when taking damage, white burst on monster kill. Effects fade over 200-400ms.
- **Smooth fog of war** — Explored-but-not-visible tiles now draw with their original colors under a dark overlay (70% opacity), preserving color hints instead of the old flat `#2a2a44`.

### Oryx Tileset Support
- **Tileset renderer** — Loads Oryx Classic Roguelike spritesheet (`ascii_plus.png`, 256x256, 8x8 tiles, 32 columns). Draws at 2x scale with crisp pixel scaling (`imageSmoothingEnabled = false`).
- **Tile mapping** — Terrain, monsters, items, player, and companions mapped to spritesheet tile IDs. Monsters use template key lookup to avoid glyph collisions (e.g., `s` = skeleton vs spider).
- **Water/lava animation** — Spritesheet water and lava tiles alternate between animation frames (matching the TSX timing: water at 600ms, lava at 300ms).
- **F1 toggle** — Press F1 to switch between ASCII and tileset mode. Preference saved to localStorage. Both modes benefit from all Brogue-style effects.
- **drawEntity() helper** — Unified function that renders either a glyph or sprite tile, used throughout the render loop.

---

## v4f (2026-03-14)

### Weapon Properties Activated
- **Weapon speed** — Slow weapons (greatsword, warhammer, halberd, longbow, crossbow) cost an extra turn to recover after attacking. Fast weapons (dagger) grant a bonus action where monsters don't move.
- **Reach attacks (P key)** — DCSS-style lunge: press P then a direction to strike a monster 2 tiles away with reach weapons (spear, halberd). Requires line of sight through the intermediate tile.
- **Cleave** — Battle axe and halberd hit a second adjacent monster for half damage when killing the first target.
- **Weapon tags in UI** — Side panel now shows [fast], [slow], [reach], [cleave] tags on equipped weapons.
- **Weapon status effects** — Dagger has 20% chance to poison monsters on hit. Mace has 20% chance to slow monsters on hit.

### Wand & Spell Balance
- **Wand charges reduced ~30%** — Fire 8→5, Cold 8→5, Lightning 6→4, Poison 10→7, Sleep 8→5, Digging 12→8, Polymorph 5→4.
- **10% wand fizzle chance** — Each zap has a chance to waste a charge with no effect.
- **Wand floor gate raised** — Offensive wands now appear floor 9+ (was 7+), utility wands floor 11+ (was 10+).
- **6 new spells:**
  - Cleric: Cure Poison (4 MP), Sanctuary (8 MP, 50% miss for 10 turns), Smite (6 MP, 3d8 holy, bonus vs undead)
  - Magic-User: Detect Monsters (3 MP, sense all monsters 20 turns), Shield (5 MP, +4 AC 15 turns), Haste (8 MP, act twice per turn 8 turns)
- **Magic Missile scales with level** — Now fires 1 + floor(level/3) missiles at 1d4+1 each, D&D-style.
- **INT scaling improved** — Damage spells get a multiplier from high INT (14 INT = +10%, 18 INT = +20%).

### 8 Unique Named Items
Items with genuine trade-offs, each spawning at most once per run (~3% chance scaling with floor):
- **Frostbrand** (floor 6+) — 1d8+2, slows targets, +1d4 cold damage. Costs 1 HP/turn from the chill.
- **Sword of Kas** (floor 10+) — 2d8+3, crits on 16+. Drains 1 HP per kill.
- **Staff of the Magi** (floor 9+) — +5 spell damage, +20 max MP. No STR bonus to melee.
- **Aegis Shield** (floor 7+) — AC +5, reflects 25% melee damage. -2 DEX.
- **Boots of the Zephyr** (floor 8+) — Always fast speed, negates slow weapon penalty.
- **Crown of Madness** (floor 11+) — +3 INT, +3 WIS. 10% confusion chance per turn.
- **Vampiric Blade** (floor 8+) — 1d6+1 fast, heals 25% of damage dealt. -10 piety on equip.
- **Ring of the Berserker** (floor 5+) — +4 STR, auto-retaliates when hit. Blocks all spellcasting.

### Floor Themes
Each floor band now has distinct colors, terrain, and monster composition:
- **Floors 1-3: Dungeon** — Default stone dungeon.
- **Floors 4-6: Flooded Caves** — Blue-green palette, extra water tiles.
- **Floors 7-9: Crypt** — Grey/bone palette, FOV reduced by 1, 3x undead spawn weight.
- **Floors 10-12: Forge** — Red/orange palette, extra lava tiles.
- **Floors 13-15: Abyss** — Purple palette, extra traps, 3x demon spawn weight.
- **Floor 16: Baal's Throne** — Gold/crimson palette.
- Atmospheric entry messages on each new floor theme.

### Special Room Types
1-2 special rooms per floor (from middle rooms):
- **Armory** — 2-4 weapons/armor from a deeper floor pool, guarded by 1-2 tougher monsters.
- **Library** — 2-3 scrolls (teleport, identify, mapping, enchant, acquirement).
- **Treasure Vault** — 3-5 gold piles + 1 good item, trapped entrances.
- **Crypt Chamber** — 3-5 undead, guaranteed ring or amulet drop.

### Status Effect Counterplay
- **Potion of Antidote** — Cures poison and grants 20-turn poison resistance.
- **Potion of Restoration** — Cures confusion, blindness, and weakness. Heals 5-15 HP if nothing to cure.
- **CON saving throws** — Each turn under a negative status, roll 1d20 + CON mod. On 18+, the status ends early. High-CON races (dwarf, half-orc) now have meaningful status resistance.
- **Poison resistance status** — Blocks monster poison attacks while active.

### Companion Improvements
- **Companion leveling** — Companions earn XP when within 5 tiles of a kill. Level thresholds: 50, 150, 400, 1000, 2500, 5000 XP. Each level: +5 HP, +1 damage bonus.
- **Companion equipment** — Give weapons to companions via the companion chat menu (C key → select companion → Give weapon). Companions use the given weapon's damage dice.
- **Companion level display** — Side panel shows companion level and equipped weapon.
- **Companion reactions** — Companions comment on floor themes with unique dialogue per character (e.g., Torben on the Forge, Aldric in the Crypt, Ghokk in the Abyss).

---

## v4e-b (2026-03-03)

### Weapon System Expansion
- **Weapon categories and speed** — All 12 existing weapons now have `category` (dagger, sword, mace, axe, polearm, ranged, staff) and `speed` (fast, normal, slow) properties for future mechanics.
- **6 new weapons** — Falchion (sword, crit bonus), Flail (armor pierce), Morning Star (armor pierce), Warhammer (two-handed mace, bonus vs undead), Battle Axe (two-handed, cleave), Halberd (two-handed polearm, reach + cleave). Floor-gated: Flail/Morning Star from floor 1+, Falchion/Battle Axe from floor 4+, Warhammer/Halberd from floor 7+.
- **Mace bonus vs undead** — Existing Mace now has `bonusVsUndead: 2`.
- **3 new weapon properties implemented in combat:**
  - `bonusVsUndead` — Flat bonus damage against undead monsters (Mace +2, Warhammer +3)
  - `armorPierce` — Reduces effective monster AC for hit calculation (Flail -2, Morning Star -1)
  - `critBonus` — Lowers crit threshold (Falchion crits on 17+ instead of 19+)
- Properties work consistently across all player attack paths: melee, ranged, and thrown.

### Bug Fixes
- **Debug spawn item fix** — Items spawned via debug mode now display correctly in the log and nearby panel. Was showing "undefined" because `debugSpawnItem()` wrapped items as `{x, y, item}` instead of putting x/y directly on the item object like the rest of the codebase.
- **Inventory wield/wear keyboard fix** — The `w` key (and other action keys) in the inventory screen now works correctly. Previously, pressing any letter tried to both select an item AND perform an action simultaneously, so `w` always tried to equip inventory slot 22 (which didn't exist). Now works as two steps: select an item with its letter key, then press w/t/u/d to act on it.
- **Minimum 1 damage on hit** — Player attacks that hit can no longer deal 0 or negative damage. Added `Math.max(1, dmg)` floor to melee and ranged attack paths.

### Documentation
- **CLAUDE.md trimmed** — Reduced from 408 to ~120 lines. Removed changelog, exhaustive checklists, and granular details that belong in code or other docs. Added explicit "Rules for Claude" section with behavioral guardrails.
- **PRIORITIES.txt** — New file documenting pre-expansion assessment and priority order for next features (item depth, dungeon variety, spell expansion, balance, status effects, companions).

---

## v4e (2026-03-03)

### New Features
- **Alignment system** — Law/Neutral/Chaos alignment inspired by 1974 D&D. Player alignment score ranges from -100 (Chaotic) to +100 (Lawful), shifting based on in-game actions:
  - Killing lawful creatures shifts toward Chaos (-3), killing chaotic creatures shifts toward Law (+3)
  - Betraying neutral creatures gives a larger Chaos shift (-5)
  - Pledging to a god shifts alignment toward that god's alignment (+/-10)
  - Praying and invoking divine abilities shifts alignment incrementally
- **Monster faction system** — Select monsters now have faction tags (lawful or chaotic). When a monster's faction matches the player's alignment faction, it becomes neutral (rendered in cyan) and won't attack:
  - Lawful: Djinn, Naga, Minotaur
  - Chaotic: Harpy, Young Dragon, Imp, Pit Fiend, Shoggoth
  - Double-bump mechanic: first bump warns ("regards you warily"), second bump attacks
  - Neutral monsters are excluded from auto-explore danger checks and companion targeting
- **Alignment detail screen (A key)** — Shows alignment score with visual gradient bar (Chaotic red → Neutral gray → Lawful cyan), current god alignment, and faction relations for all tagged monster types
- **Enhanced god info modal** — DCSS-style god description screens at altars with:
  - God alignment tag (colored: cyan=Lawful, white=Neutral, red=Chaotic)
  - Full flavor text and domain
  - All 4 piety gifts with human-readable descriptions and piety thresholds
  - "Pleases" and "Angers" sections with readable action descriptions
  - Active ability with piety cost and full description
  - Apostasy warning
  - Clickable god cards in full pantheon view with expand-to-detail
- **God alignment tags** — All 8 gods now have alignment: Mithras/Ogun/Nephthys (Lawful), Sekhmet/Thoth (Neutral), Hecate/Tiamat/Zagyg (Chaotic)
- **Force-attack mode (x key)** — Press `x` then a direction to force-attack in that direction, hitting anything there (neutral monsters, companions, NPCs, or empty space). ESC cancels. This replaces the double-bump mechanic — bumping neutral monsters now swaps positions like companions.
- **Debug mode** — Hidden testing mode for development:
  - Type "debug" on title screen to enable, press F2 to open panel
  - Commands: Spawn Monster, Spawn Item, Set Alignment, Set God, Set Piety, Give Gold, Full Heal, Reveal Map, Toggle God Mode, Set Level, Go to Floor, Grant Rune
  - God mode prevents death and auto-heals on lethal damage
  - Does not persist across page loads

### Bestiary Expansion
- **9 new early-game monsters** — Roughly doubles the variety available on floors 1-5:
  - **Dungeon Vermin (floors 1-3):** Cave Worm (slow, regenerates), Viper (fast, poison), Giant Ant (pack AI), Jackal (fastest early creature, pack AI)
  - **Early Humanoid/Beast (floors 2-6):** Gnoll (aggressive hyena-man), Fungoid (slow mushroom, confusion spores)
  - **Non-Western Mythology (floors 3-7):** Jiangshi (Chinese hopping corpse, slow undead, paralyze), Tengu (Japanese crow warrior, flies, dual attack, lawful faction), Kishi (Angolan two-faced demon, cunning AI, confusion, chaotic faction)
- **Confusion statusAtk** — New status attack type. Fungoid, Kishi, and Lamia (fixed from unused `charm` field) can now confuse the player on hit (25% chance, 3-6 turns).
- **10 new mid/late-game monsters** — Fills gaps in creature variety across floors 2-15:
  - **Salthopper (floors 2-5):** Fast aggressive insect with sprint ability (Caves of Qud easter egg). Glass cannon — hits hard but fragile.
  - **Oozes (floors 4-9):** Grey Ooze (amorphous, corrodes armor on hit), Ochre Jelly (amorphous, splits into 2 weaker copies on death)
  - **Shapechangers (floors 5-10):** Mimic (disguises as floor item, ambush attack on approach), Doppelganger (copies player stats when first seen, wears player's face)
  - **Elementals (floors 7-13):** Fire Elemental (fast, fire immune, applies burning), Ice Elemental (applies slowing on hit), Earth Elemental (very high AC/HP, very slow)
  - **Constructs (floors 8-15):** Stone Golem (status immune, lawful faction), Iron Golem (status immune, fire immune, tougher late-game version)
- **Corrode statusAtk** — Grey Ooze acid corrodes armor on hit (30% chance, -2 AC for 10-15 turns). Cured by Potion of Clarity.
- **Burn on hit** — Fire Elemental sets player ablaze on melee hit (40% chance, 3-5 turns burning).
- **Slow on hit** — Ice Elemental freezing touch applies slowing (40% chance, 3-5 turns).
- **Split on death** — Ochre Jelly splits into 2 weaker copies when killed (children don't split again).
- **Mimic disguise system** — Mimics render as random item glyphs (potion, weapon, armor, scroll, wand). Hidden from NEARBY panel and auto-explore danger checks. Reveal on player bump or adjacency with surprise attack.
- **Doppelganger stat scaling** — Copies player level for HP/attack scaling when first alerted. Uses `@` symbol.
- **Sprint mechanic** — Salthopper has 25% chance per turn to close 2-3 extra tiles toward the player.
- **Status immunity** — Golems ignore all status effects (paralysis, sleep, confusion, fear, poison). Shown as "magic resistant" in Look mode.
- **New faction monsters** — Stone Golem (lawful), Balor/Shadow Demon/Oni (chaotic)
- **10 new high-tier monsters** — Fills endgame variety across floors 11-16:
  - **Undead (floors 11-16):** Revenant (fast, relentless, status immune), Death Knight (armored undead warrior, ice lance spell, life drain)
  - **Demons (floors 11-16):** Balor (flying fire demon, dual attack), Shadow Demon (incorporeal, high AC, life drain), Oni (Japanese ogre-demon, fireball, chaotic faction)
  - **Aberrations (floors 11-16):** Gibbering Mouther (confusion aura — passive confusion when adjacent), Mind Flayer (confusion + life drain), Aboleth (psychic blast spell with INT drain)
  - **Mythological (floors 11-16):** Rakshasa (Hindu demon, status immune, cunning), Ammit (Egyptian soul devourer, drains hunger on hit)
- **Confusion aura** — Gibbering Mouther passively confuses adjacent players (20% chance per turn, no attack needed).
- **Psychic blast spell** — Aboleth deals 3d6+5 psychic damage with 30% chance to drain INT.
- **Hunger drain** — Ammit devours 30-60 hunger on each hit, representing soul-eating.

### Bug Fixes
- **Auto-explore altar loop fix** — Items on altar tiles were never picked up because the altar handler in tryMove didn't call autoPickup(). Gold on altars rendered as `$` over the altar `_`, and auto-explore looped trying to collect it. Fixed by adding autoPickup() to the altar handler.
- **Altar G-key fix** — Pressing G while standing on an altar without a god now opens the god info modal as intended. Previously, `_altarGodKey` was set but never read, so G just said "find an altar" even when you were on one.
- **Lamia charm fix** — Lamia's `charm: 'confusion'` field was never read by combat code. Changed to `statusAtk: 'confusion'` which is properly handled.
- **Wands in Scroll of Identify** — Wands can now be identified via Scroll of Identify (were missing from the identify menu filter)

### UI Updates
- Side panel now shows ALIGNMENT section with colored label and numeric score
- `A` key added to controls for alignment screen
- Help screen updated with alignment key binding

---

## v4d (2026-03-03)

### Balance
- **Shop & NPC spawn rate scaling** — Shops and NPCs no longer appear on floor 1. Shop chance scales from ~2% on floor 2 to 7% by floor 7+. NPC chance scales from ~6% on floor 2 to 25% cap on floor 8+.

### Bug Fixes
- **Auto-explore cancellation** — Pressing any direction key now immediately cancels auto-explore and resting, instead of being silently ignored.

### New Features
- **Victory restructure: Rune escape ascent** — The game's win condition has been redesigned. Players must now descend to floor 16, claim the Rune of Baal, then ascend all 16 floors back to the surface to escape. During the ascent:
  - Monsters spawn more frequently per room
  - Monsters are drawn from deeper-floor pools (tougher enemies appear earlier)
  - Monster HP scales up the closer you get to the surface
  - The map info bar displays "ASCENDING" to track your escape status
  - Atmospheric log messages build tension during the climb
- **Win screen with score breakdown** — Victory now displays a detailed score screen showing: character level, turns survived, gold amassed, bosses slain, companions recruited, mutations gained, and faith followed.
- **Thrown weapons** — 4 new throwable item types, used with the `v` key:
  - Throwing Knives (1d4+1 damage, range 6, stack of 5)
  - Javelins (1d6+2 damage, range 8, stack of 3)
  - Throwing Axes (1d8+1 damage, range 5, stack of 3)
  - Throwing Stars (1d3 damage, range 6, stack of 8)
  - STR-based attack bonus. Auto-picked up during explore. Selection menu when carrying multiple types.
- **Wand system** — 7 wand types with randomized unidentified appearances (14 materials). Wands are identified on first use. Each has unique effects:
  - Wand of Fire — 4d6 fire damage
  - Wand of Cold — 3d6+2 cold damage, slows target
  - Wand of Lightning — 3d8 lightning damage
  - Wand of Venom — 2d4 damage + poison
  - Wand of Sleep — puts non-undead, non-boss monsters to sleep
  - Wand of Digging — carves through up to 8 walls in a line
  - Wand of Polymorph — transforms a non-boss monster into a random creature
  - Fire/Cold/Lightning appear from floor 7+; Poison/Sleep/Digging/Polymorph from floor 10+.

### Potions & Status Effects
- **Expanded potion system** — 10 new potions added (20 total types, matching the 20 randomized color appearances):
  - **Negative potions:**
    - Potion of Blindness — reduces FOV to 1 tile for 8-12 turns
    - Potion of Paralysis — skip turns, CON save DC 12 halves duration (5-8 turns base)
    - Potion of Weakness — reduces STR by 3 for 15-25 turns
    - Potion of Amnesia — clears the explored map for the current floor
    - Potion of Liquid Fire — burning damage (2-4 per turn), CON save DC 12 halves duration (4-7 turns base)
  - **Chaotic potions:**
    - Potion of Phasing — randomly teleports the player every 3-4 turns for 10-15 turns
    - Potion of Berserk Rage — auto-attacks nearest creature (including companions), +3 STR, only movement/attack/wait allowed, 8-12 turns
  - **Positive potions:**
    - Potion of Resistance — +3 AC for 20-30 turns
    - Potion of Clarity — instantly cures all negative statuses and reverses stat modifications
    - Potion of Might — +3 STR for 15-25 turns
- **CON saving throws** — New `conSave(dc)` helper. Paralysis and Liquid Fire potions allow a CON save (DC 12) to halve their duration, giving CON more mechanical weight.
- **Bug fix: Potion of Giant Strength** — STR bonus was never reversed when the effect expired. Now properly tracks and removes the bonus.
- All negative potions added to auto-explore/auto-pickup skip lists

### UI Updates
- Title screen subtitle updated to "Seek the Rune. Escape Alive."
- Help screen now includes Goal, Ranged & Thrown sections
- `v` key added to controls for throwing

---

## v4c (2026-03-02)

### New Features
- **Ring/amulet auto-pickup** — `shouldAutoPickup()` and `autoExploreWantsItem()` now include rings and amulets. Identified cursed items (ring_doom, amulet_curse) are skipped.
- **Player-companion place swapping** — Walking into a companion swaps positions instead of overlapping. Added NPC collision checks to `moveToward()` to prevent all NPC stacking.
- **NPC racial hostility** — Each companion NPC has `hatedRaces` and `raceInsults`. Bumping a hostile NPC triggers insult, turns them red, and they attack. Player can fight back. Companions target hostile NPCs. Auto-explore stops near hostile NPCs. Merchants/sage stay neutral.
