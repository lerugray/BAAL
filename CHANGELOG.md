# BAAL — Changelog

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
