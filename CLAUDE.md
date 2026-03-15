# BAAL — Project Brief
*For use as context in Claude Code or future Claude sessions.*
*Current build: Baal_v4e.html — single HTML file, ~7,030 lines.*
*Created by Ray Weiss.*

---

## What This Is

A traditional roguelike built as a single self-contained HTML file using vanilla JS and a canvas renderer. Inspired by 1974 D&D, DCSS, and Wizardry. The player descends 16 floors to retrieve the Rune of Baal, then ascends back to the surface to win. Death is permanent. The file runs directly in any browser with no build step, no dependencies, and no server.

The font is VT323 (Google Fonts CDN) for the map canvas and Share Tech Mono for the UI. Everything else is pure JS/CSS/HTML.

## How to Run
Open `Baal_v4e.html` in a web browser. No build step, no dependencies, no server needed.

---

## Rules for Claude

- **No refactoring** unless explicitly asked. Don't reorganize code, rename variables, or "clean up" existing patterns.
- **No new dependencies.** No libraries, no frameworks, no CDN additions beyond the existing Google Fonts link.
- **Single file.** Everything stays in the one HTML file until a split is explicitly requested.
- **Discuss before implementing.** Ray prefers to talk through changes before code is written.
- **Don't guess about other roguelikes.** When referencing DCSS, Caves of Qud, NetHack, etc., always web search for accurate info. Do NOT guess about their mechanics, monsters, or features.
- **Update documentation** when features are added. Keep `CHANGELOG.md` current.
- **Edit the multi-file build** (`index.html`, `data.js`, `engine.js`, `render.js`, `ui.js`). `Baal_v4e.html` is kept as a single-file backup.
- **Don't bloat CLAUDE.md.** This file is for project structure, conventions, and behavioral rules — not a changelog, wiki, or session memory. When asked to "remember" something, use the memory file, not this file. Only add to CLAUDE.md if it's a permanent project rule or architectural constraint.

---

## File Architecture

Multi-file layout. Load order: `data.js` → `engine.js` → `render.js` → `ui.js`. All globals remain global (no modules).

```
index.html    HTML shell, CSS styles, Google Fonts, <script> tags
data.js       RNG, identification system, all data constants (races, classes, gods,
              spells, items, monsters, NPCs, mutations, TILE enum, TILE_COLORS, FLOOR_THEMES)
engine.js     Game state (G), initPlayer, startNewGame, generateLevel, FOV, alignment,
              stats/calculations, movement, combat, monster AI, companion AI, mutations,
              sound/noise, look command, turn management, auto-explore, spells, god system,
              items/inventory, stairs, shops, NPC interaction, search, death/win
render.js     Animation loop, canvas init, renderAll, dancing colors, dynamic lighting,
              combat flash effects, tileset loader/mapper, drawEntity, updateSidePanel,
              renderMinimap, updateLogPanel, log()
ui.js         Alignment screen, flash messages, UI screens (inventory, god, spells, help),
              character creation, input handling, companion chat, save/quit, debug, entry point
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
  ascending,      // bool — true once Rune is picked up, player must escape to surface
  templeSpawned,  // bool — temple only spawns once per game
  killedBosses,   // array of boss keys
  joinedNPCs,     // array of NPC ids already recruited
  gameOver, won,
  // ... plus UI state flags (invOpen, spellOpen, godOpen, etc.)
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
  alignment,           // -100 (Chaotic) to +100 (Lawful), default 0 (Neutral)
}
```

---

## Save System

Uses `localStorage` key `'baal_save_v3'`. Autosaves every 10 turns. Save is deleted on death (permadeath) or give-up. All identification state (potions, scrolls, rings, amulets, wands) is saved and restored.

**Important:** Levels are regenerated on floor change — only the current floor is saved. Adding new fields to the player or G object requires backward-compatible defaults in the load function.

---

## Future Development Notes

### When to refactor (single file → multi-file)
The file is ~7,030 lines. It remains manageable as-is until:
- Adding a second dungeon branch (Lair, Crypt, etc.)
- Adding a 4th+ class or 9th+ race
- Adding multiplayer or any server component
- File exceeds ~8,000 lines

### Electron / Steam
Trivial to package with Electron when ready. Save system already uses localStorage (Electron maps this to AppData correctly). Would need a settings screen, fullscreen support, and platform builds.

---

## Other Documentation

- `CHANGELOG.md` — Full version history with detailed change descriptions
- `PRIORITIES.txt` — Pre-expansion assessment and priority order for next features
- `BAAL_PROJECT.md` — Older project doc, kept for reference
