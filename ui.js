// Helper to create an inline sprite canvas HTML string for use in DOM content
function spriteHTML(tileId, sheetKey, size) {
  size = size || 16;
  const srcSize = sheetKey === 'world' ? 12 : (sheetKey === 'character' ? 12 : 8);
  return `<canvas class="inline-sprite" width="${srcSize}" height="${srcSize}" style="width:${size}px;height:${size}px;image-rendering:pixelated;vertical-align:middle;" data-tileid="${tileId}" data-sheet="${sheetKey}"></canvas>`;
}

// Helper to render all inline sprite canvases in a container element
function renderInlineSprites(container) {
  if(!container) return;
  container.querySelectorAll('canvas.inline-sprite[data-tileid]').forEach(c => {
    const sheetKey = c.dataset.sheet || 'classic';
    if(typeof drawSpriteToCanvas === 'function') {
      drawSpriteToCanvas(c, parseInt(c.dataset.tileid), sheetKey);
    }
  });
}

// ─── ALIGNMENT SCREEN ──────────────────────────────────────
function openAlignmentScreen() {
  const p = G.player;
  const el = document.getElementById('alignment-screen');
  el.classList.add('visible');
  const content = document.getElementById('alignment-content');

  const score = p.alignment || 0;
  const { label, color } = getAlignmentLabel(score);
  const pct = ((score + 100) / 200) * 100; // 0% = -100 Chaotic, 100% = +100 Lawful

  let html = '';

  // Alignment bar
  html += `<div style="margin:15px 0;">`;
  html += `<div style="text-align:center;font-size:22px;color:${color};margin-bottom:8px;">${label} (${score})</div>`;
  html += `<div style="position:relative;height:20px;background:linear-gradient(to right, #ff4444, #cc8844, #aaaaaa, #88aacc, #44ccff);border:1px solid var(--border);border-radius:3px;">`;
  html += `<div style="position:absolute;top:-2px;left:${pct}%;transform:translateX(-50%);width:4px;height:24px;background:#fff;border:1px solid #000;"></div>`;
  html += `</div>`;
  html += `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--gray);margin-top:4px;font-family:'Share Tech Mono';"><span>Chaotic (-100)</span><span>Neutral (0)</span><span>Lawful (+100)</span></div>`;
  html += `</div>`;

  // God section
  if(p.god) {
    const god = GODS[p.god];
    const alignColors = { lawful: '#44ccff', neutral: '#aaaaaa', chaotic: '#ff4444' };
    const alignLabel = god.alignment.charAt(0).toUpperCase() + god.alignment.slice(1);
    html += `<div style="margin:12px 0;padding:8px;border:1px solid var(--border);">`;
    html += `<div style="color:${god.color};font-size:18px;">${god.sym} ${god.name}</div>`;
    html += `<div style="color:${alignColors[god.alignment]};font-size:14px;font-family:'Share Tech Mono';">Alignment: ${alignLabel}</div>`;
    html += `</div>`;
  }

  // Faction relations
  html += `<div style="margin-top:12px;"><div style="color:var(--cyan);font-size:20px;border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:8px;">Faction Relations</div>`;
  const playerFaction = getAlignmentFaction(score);

  const factionMonsters = Object.entries(MONSTER_TEMPLATES).filter(([k, v]) => v.faction && !v.isBoss);
  const lawfulMons = factionMonsters.filter(([k, v]) => v.faction === 'lawful');
  const chaoticMons = factionMonsters.filter(([k, v]) => v.faction === 'chaotic');

  html += `<div style="font-size:16px;color:#44ccff;margin-top:8px;">LAWFUL</div>`;
  for(const [k, mon] of lawfulMons) {
    const isNeutral = playerFaction === 'lawful';
    const status = isNeutral ? '<span style="color:#44ccff">Neutral</span>' : '<span style="color:#ff4444">Hostile</span>';
    const monGlyph = useTileset && MONSTER_CHAR_ROW[k] !== undefined ? spriteHTML(getCharTileId(MONSTER_CHAR_ROW[k], 'd', 'idle'), 'character', 18) : `<span style="color:${mon.color}">${mon.sym}</span>`;
    html += `<div style="font-size:14px;font-family:'Share Tech Mono';padding:2px 8px;">${monGlyph} ${mon.name} — ${status} <span style="color:var(--gray)">(floor ${mon.floor[0]}-${mon.floor[1]})</span></div>`;
  }

  html += `<div style="font-size:16px;color:#ff4444;margin-top:8px;">CHAOTIC</div>`;
  for(const [k, mon] of chaoticMons) {
    const isNeutral = playerFaction === 'chaotic';
    const status = isNeutral ? '<span style="color:#44ccff">Neutral</span>' : '<span style="color:#ff4444">Hostile</span>';
    const monGlyph = useTileset && MONSTER_CHAR_ROW[k] !== undefined ? spriteHTML(getCharTileId(MONSTER_CHAR_ROW[k], 'd', 'idle'), 'character', 18) : `<span style="color:${mon.color}">${mon.sym}</span>`;
    html += `<div style="font-size:14px;font-family:'Share Tech Mono';padding:2px 8px;">${monGlyph} ${mon.name} — ${status} <span style="color:var(--gray)">(floor ${mon.floor[0]}-${mon.floor[1]})</span></div>`;
  }

  html += `</div>`;

  // Explanation
  html += `<div style="margin-top:15px;padding:10px;border:1px solid var(--border);font-size:13px;font-family:'Share Tech Mono';color:var(--gray);">`;
  html += `Lawful creatures are neutral toward lawful characters. Chaotic creatures are neutral toward chaotic characters. `;
  html += `Killing neutral creatures carries a heavy alignment penalty. Your alignment shifts through combat, prayer, and divine service.`;
  html += `</div>`;

  content.innerHTML = html;
  renderInlineSprites(document.getElementById('alignment-content'));
  G.alignmentOpen = true;
}

function closeAlignmentScreen() {
  document.getElementById('alignment-screen').classList.remove('visible');
  G.alignmentOpen = false;
}
window.closeAlignmentScreen = closeAlignmentScreen;

// ─── FLASH MESSAGE ────────────────────────────────────────────
function flash(msg) {
  const el = document.getElementById('flash-msg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}

// ─── UI SCREENS ──────────────────────────────────────────────
function openInventory() {
  const p = G.player;
  const el = document.getElementById('inv-screen');
  el.classList.add('visible');
  
  const listEl = document.getElementById('inv-list');
  listEl.innerHTML = '';
  
  if(p.inventory.length === 0) {
    listEl.innerHTML = '<p style="color:var(--gray);font-size:14px;padding:10px;">Inventory empty.</p>';
    return;
  }
  
  p.inventory.forEach((item, i) => {
    const key = String.fromCharCode(97 + i);
    const isEquipped = Object.values(p.equipped).includes(item);
    const div = document.createElement('div');
    div.className = 'inv-item';
    const dispName = getItemDisplayName(item);
    const showCursed = item.cursed && item.identified;
    const itemGlyph = useTileset ? spriteHTML(typeof getItemWorldTile === 'function' ? (getItemWorldTile(item) || getItemTile(item)) : 231, typeof getItemWorldTile === 'function' && getItemWorldTile(item) !== undefined ? 'world' : 'classic', 18) : `<span style="color:${item.color||'var(--white)'}">${item.glyph||'?'}</span>`;
    div.innerHTML = `
      <span class="item-key">${key})</span>
      ${itemGlyph}
      <span class="item-name ${isEquipped?'equipped':''} ${showCursed?'item-cursed':''}">${dispName}${isEquipped?' (worn)':''}${showCursed?' ✗':''}</span>
    `;
    div.onclick = () => showItemDetail(item, i);
    listEl.appendChild(div);
  });

  renderInlineSprites(document.getElementById('inv-list'));
  G.invOpen = true;
  G.invSelectedIdx = null;
}

function showItemDetail(item, idx) {
  G.invSelectedIdx = idx;
  const p = G.player;
  const isEquipped = Object.values(p.equipped).includes(item);
  const detail = document.getElementById('inv-detail');
  
  let statsText = '';
  if(item.dmg) statsText += `Damage: ${item.dmg[0]}d${item.dmg[1]}+${item.dmg[2]+(item.enchant||0)} `;
  if(item.ac) statsText += `AC: +${item.ac+(item.enchant||0)} `;
  if(item.strBonus) statsText += `STR: ${item.strBonus>0?'+':''}${item.strBonus} `;
  if(item.intBonus) statsText += `INT: ${item.intBonus>0?'+':''}${item.intBonus} `;
  if(item.mpBonus) statsText += `MP: +${item.mpBonus} `;
  if(item.hpBonus) statsText += `HP: +${item.hpBonus} `;
  if(item.charges !== undefined) statsText += `Charges: ${item.charges} `;
  if(item.count !== undefined) statsText += `Count: ${item.count} `;
  if(item.nutrition !== undefined) statsText += `Nutrition: ${item.nutrition} `;
  if(item.price) statsText += `Value: ${item.val}gp `;
  
  const dispItemName = getItemDisplayName(item);
  const showCursedDetail = item.cursed && item.identified;
  detail.innerHTML = `
    <h3>${dispItemName}</h3>
    <div class="item-desc">${showCursedDetail && item.cursedDesc ? item.cursedDesc : getItemDescription(item)}</div>
    <div class="item-stats">${statsText}</div>
    <div class="item-actions">
      ${item.slot || item.type==='weapon' || item.type==='wand' || item.type==='armor' || item.type==='amulet' ? 
        (isEquipped ? 
          `<button onclick="unequipFromInv(${idx})">Take off (t)</button>` : 
          `<button onclick="equipFromInv(${idx})">Wield/Wear (w)</button>`) 
        : ''}
      ${item.type==='food'||item.type==='potion'||item.type==='scroll' ? `<button onclick="useFromInv(${idx})">Use (u)</button>` : ''}
      <button onclick="dropFromInv(${idx})">Drop (d)</button>
    </div>
  `;
}

function getItemDescription(item) {
  const descs = {
    weapon: 'A weapon for combat.',
    armor: 'Equipment to protect you.',
    potion: 'A liquid with magical properties.',
    scroll: 'A scroll inscribed with arcane text.',
    food: 'Sustenance for the long journey.',
    ring: 'A magical ring.',
    amulet: 'A magical amulet.',
    wand: 'A wand crackling with magical energy.',
    ammo: 'Ammunition for a ranged weapon.',
  };
  return descs[item.type] || 'A mysterious item.';
}

function equipFromInv(idx) {
  equipItem(G.player.inventory[idx]);
  openInventory();
  endTurn();
}

function unequipFromInv(idx) {
  unequipItem(G.player.inventory[idx]);
  openInventory();
  endTurn();
}

function useFromInv(idx) {
  useItem(G.player.inventory[idx]);
  closeInventory();
}

function dropFromInv(idx) {
  const item = G.player.inventory[idx];
  if(Object.values(G.player.equipped).includes(item)) {
    if(item.cursed) { log('You cannot drop a cursed equipped item!', 'warning'); return; }
    unequipItem(item);
  }
  item.x = G.player.x; item.y = G.player.y;
  G.level.items.push(item);
  G.player.inventory.splice(idx, 1);
  log(`You drop the ${item.name}.`, 'info');
  openInventory();
}

function closeInventory() {
  document.getElementById('inv-screen').classList.remove('visible');
  G.invOpen = false;
  renderAll();
}

function openSpellScreen() {
  const p = G.player;
  const el = document.getElementById('spell-screen');
  el.classList.add('visible');
  
  const listEl = document.getElementById('spell-list');
  
  if(p.spells.length === 0 && p.cls === 'fightingman') {
    listEl.innerHTML = `
      <div style="font-family:'Share Tech Mono';font-size:13px;color:var(--gray);margin-bottom:10px">MARTIAL ABILITIES:</div>
    `;
  }
  
  const abilities = [...p.spells];
  // Add class abilities
  if(p.cls === 'fightingman') abilities.push('power_strike', 'steady_aim');
  if(p.cls === 'cleric') abilities.push('turn_undead_ability');
  
  listEl.innerHTML = '';
  
  abilities.forEach((key, i) => {
    const spell = SPELL_DATA[key];
    if(!spell) return;
    const letter = String.fromCharCode(97 + i);
    const canCast = p.mp >= spell.mp;
    
    const div = document.createElement('div');
    div.className = 'spell-entry';
    div.style.opacity = canCast ? '1' : '0.4';
    div.innerHTML = `
      <span class="spell-key">${letter})</span>
      <span class="spell-name">${spell.name}</span>
      <span class="spell-cost">${spell.mp > 0 ? spell.mp + ' MP' : 'Free'}</span>
      <span class="spell-level">Lv.${spell.level}</span>
    `;
    div.onclick = () => { if(canCast) { castSpell(key); } };
    listEl.appendChild(div);
    
    const descDiv = document.createElement('div');
    descDiv.className = 'spell-desc';
    descDiv.textContent = spell.desc;
    listEl.appendChild(descDiv);
  });
  
  G.spellOpen = true;
}

function closeSpellScreen() {
  document.getElementById('spell-screen').classList.remove('visible');
  G.spellOpen = false;
}

function renderGodAlignmentTag(god) {
  const colors = { lawful:'#44ccff', neutral:'#aaaaaa', chaotic:'#ff4444' };
  const labels = { lawful:'Lawful', neutral:'Neutral', chaotic:'Chaotic' };
  const c = colors[god.alignment] || '#aaaaaa';
  return `<span class="god-alignment-tag" style="color:${c};border-color:${c}">${labels[god.alignment] || 'Neutral'}</span>`;
}

function renderGodDetail(godKey, god, opts = {}) {
  const showPledge = opts.showPledge || false;
  const showAbandon = opts.showAbandon || false;
  const showInvoke = opts.showInvoke || false;
  const showPiety = opts.showPiety || false;
  const compact = opts.compact || false;

  let h = `<div class="god-card god-card-expanded" style="border-color:${god.color};${compact ? '' : 'max-width:600px;margin:0 auto 15px;'}">`;
  h += `<h3 style="font-size:${compact ? 20 : 26}px;color:${god.color}">${god.sym} ${god.name} ${renderGodAlignmentTag(god)}</h3>`;
  h += `<div class="god-domain">${god.domain}</div>`;
  h += `<div class="god-flavor" style="margin:8px 0;">${god.flavor}</div>`;

  if(showPiety) {
    h += `<div style="margin:8px 0;">`;
    h += `<div class="bar-label"><span style="color:var(--gray)">Piety: ${G.player.piety}/100</span></div>`;
    h += `<div class="bar-outer"><div class="piety-bar" style="width:${G.player.piety}%"></div></div></div>`;
  }

  // Gifts section
  const thresholds = [10, 30, 60, 90];
  h += `<div class="god-detail-section"><h4>Piety Gifts</h4>`;
  god.gifts.forEach((g, i) => {
    const desc = GIFT_DESCRIPTIONS[g] || g;
    h += `<div class="god-detail-gift"><span class="gift-thresh">[${thresholds[i]}★]</span> ${desc}</div>`;
  });
  h += `</div>`;

  // Active ability
  h += `<div class="god-detail-section"><h4>Active Ability</h4>`;
  h += `<div style="color:var(--cyan);font-size:13px;font-family:'Share Tech Mono';margin-left:10px;">`;
  h += `<strong>${god.activeAbility.name}</strong> (${god.activeAbility.piety} piety) — ${god.activeAbility.desc}</div></div>`;

  // Pleases / Angers
  h += `<div class="god-detail-section"><h4>Pleases</h4>`;
  god.pietyGain.forEach(a => {
    const desc = PIETY_ACTION_DESCRIPTIONS[a] || a;
    h += `<div class="god-detail-piety gain">+ ${desc}</div>`;
  });
  h += `</div>`;
  h += `<div class="god-detail-section"><h4>Angers</h4>`;
  god.pietyLoss.forEach(a => {
    const desc = PIETY_ACTION_DESCRIPTIONS[a] || a;
    h += `<div class="god-detail-piety loss">- ${desc}</div>`;
  });
  h += `</div>`;

  // Apostasy warning
  h += `<div style="margin-top:6px;color:#884444;font-size:12px;font-family:'Share Tech Mono';font-style:italic;">Apostasy: ${god.apostasy}</div>`;

  h += `</div>`;

  // Buttons
  if(showPledge || showAbandon || showInvoke) {
    h += `<div style="margin-top:10px;">`;
    if(showInvoke) h += `<button class="menu-btn" onclick="useGodAbility()">⚡ Invoke ${god.activeAbility.name}</button>`;
    if(showPledge) h += `<button class="menu-btn" onclick="joinGod('${godKey}')" style="border-color:${god.color}">⛧ Pledge to ${god.name}</button>`;
    if(showAbandon) h += `<button class="menu-btn" onclick="abandonGod()" style="color:var(--red);border-color:#440000">✗ Abandon ${god.name}</button>`;
    h += `</div>`;
  }
  return h;
}

function openGodScreen(featuredGodKey) {
  const p = G.player;
  const el = document.getElementById('god-screen');
  el.classList.add('visible');

  const content = document.getElementById('god-content');

  if(p.god) {
    // Currently following a god — show full detail with piety bar and ability button
    const god = GODS[p.god];
    let html = renderGodDetail(p.god, god, { showInvoke:true, showAbandon:true, showPiety:true });
    html += `<button class="menu-btn" onclick="closeGodScreen()" style="margin-top:8px">Close</button>`;
    content.innerHTML = html;
  } else if(featuredGodKey && GODS[featuredGodKey]) {
    // At an altar — show featured god with full detail + pledge button
    const fg = GODS[featuredGodKey];
    let html = `<p style="font-family:'Share Tech Mono';font-size:13px;color:var(--amber);margin-bottom:10px">You stand at the altar of:</p>`;
    html += renderGodDetail(featuredGodKey, fg, { showPledge:true });
    html += `<button class="menu-btn" onclick="openGodScreen()" style="margin-top:5px">See Full Pantheon</button>`;
    html += `<button class="menu-btn" onclick="closeGodScreen()">Leave Altar</button>`;
    content.innerHTML = html;
  } else {
    // Read-only full pantheon
    let html = `<p style="font-family:'Share Tech Mono';font-size:13px;color:var(--amber);margin-bottom:15px">⛧ Seek an altar to pledge your faith. ⛧</p>`;
    html += `<p style="font-family:'Share Tech Mono';font-size:12px;color:var(--gray);margin-bottom:10px">Click a god to see full details.</p>`;
    html += `<div class="god-grid" id="god-grid-browse">`;
    for(const [key, god] of Object.entries(GODS)) {
      html += `<div class="god-card god-card-clickable" style="opacity:0.85;" onclick="openGodDetail('${key}')">`;
      html += `<h3 style="color:${god.color}">${god.sym} ${god.name} ${renderGodAlignmentTag(god)}</h3>`;
      html += `<div class="god-domain">${god.domain}</div>`;
      html += `<div class="god-flavor">${god.flavor}</div>`;
      html += `</div>`;
    }
    html += `</div><button class="menu-btn" onclick="closeGodScreen()" style="margin-top:15px">Close</button>`;
    content.innerHTML = html;
  }

  G.godOpen = true;
}

function openGodDetail(godKey) {
  if(!GODS[godKey]) return;
  const god = GODS[godKey];
  const content = document.getElementById('god-content');
  let html = renderGodDetail(godKey, god, { compact:false });
  html += `<div style="margin-top:10px;">`;
  html += `<button class="menu-btn" onclick="openGodScreen()">← Back to Pantheon</button>`;
  html += `<button class="menu-btn" onclick="closeGodScreen()">Close</button>`;
  html += `</div>`;
  content.innerHTML = html;
}

function closeGodScreen() {
  document.getElementById('god-screen').classList.remove('visible');
  G.godOpen = false;
}

function showHelp() {
  document.getElementById('help-screen').classList.add('visible');
}

function closeHelp() {
  document.getElementById('help-screen').classList.remove('visible');
}

// ─── CHARACTER CREATION ──────────────────────────────────────
let ccSelectedRace = null;
let ccSelectedClass = null;

function showCharCreate() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('char-create-screen').style.display = 'flex';
  document.getElementById('char-create-screen').style.alignItems = 'center';
  document.getElementById('char-create-screen').style.justifyContent = 'center';
  document.getElementById('char-create-screen').style.width = '100%';
  showCCStep(1);
}

function showTitleFromCC() {
  document.getElementById('char-create-screen').style.display = 'none';
  document.getElementById('title-screen').style.display = 'block';
}

function ccBack(step) {
  showCCStep(step);
}

function showCCStep(step) {
  document.getElementById('cc-step1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('cc-step2').style.display = step === 2 ? 'block' : 'none';
  document.getElementById('cc-step3').style.display = step === 3 ? 'block' : 'none';
  
  if(step === 1) buildRaceGrid();
  if(step === 2) buildClassGrid();
  if(step === 3) buildSummary();
}

function buildRaceGrid() {
  const grid = document.getElementById('race-grid');
  grid.innerHTML = '';
  const raceEntries = Object.entries(RACES);
  raceEntries.forEach(([key, race], i) => {
    const div = document.createElement('div');
    div.className = `char-option ${ccSelectedRace === key ? 'selected' : ''}`;
    div.innerHTML = `
      <h3><span style="color:var(--gray);font-size:14px;">${i+1}.</span> ${race.sym} ${race.name}</h3>
      <p>${race.desc}</p>
      <div class="bonus">Passives: ${race.passives.join(', ')}</div>
    `;
    div.onclick = () => {
      ccSelectedRace = key;
      buildRaceGrid();
      setTimeout(() => showCCStep(2), 200);
    };
    grid.appendChild(div);
  });
  grid._entries = raceEntries; // store for keyboard access
}

function buildClassGrid() {
  const grid = document.getElementById('class-grid');
  grid.innerHTML = '';
  const classEntries = Object.entries(CLASSES);
  classEntries.forEach(([key, cls], i) => {
    const div = document.createElement('div');
    div.className = `char-option ${ccSelectedClass === key ? 'selected' : ''}`;
    div.innerHTML = `
      <h3><span style="color:var(--gray);font-size:14px;">${i+1}.</span> ${cls.sym} ${cls.name}</h3>
      <p>${cls.desc}</p>
      <div class="bonus">HD: d${cls.hpDice} · ${cls.flavorText}</div>
    `;
    div.onclick = () => {
      ccSelectedClass = key;
      buildClassGrid();
      setTimeout(() => showCCStep(3), 200);
    };
    grid.appendChild(div);
  });
  grid._entries = classEntries;
}

let ccSelectedGod = null;

function buildSummary() {
  if(!ccSelectedRace || !ccSelectedClass) return;
  const race = RACES[ccSelectedRace];
  const cls = CLASSES[ccSelectedClass];
  const summary = document.getElementById('cc-summary');
  
  const stats = { str:10, dex:10, con:10, int:10, wis:10, cha:10 };
  for(const [s,v] of Object.entries(race.bonuses)) stats[s] += v;
  if(ccSelectedClass === 'fightingman') { stats.str+=2; stats.con+=1; }
  if(ccSelectedClass === 'cleric') { stats.wis+=2; stats.con+=1; }
  if(ccSelectedClass === 'magicuser') { stats.int+=2; stats.wis+=1; }
  
  let godPickerHTML = '';
  if(ccSelectedClass === 'cleric' || ccSelectedClass === 'warlock') {
    godPickerHTML = `
      <div style="color:var(--amber);margin-top:10px">Starting Faith (${ccSelectedClass === 'warlock' ? 'Warlocks choose a patron' : 'Clerics choose a patron'}):</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px;">
        ${Object.entries(GODS).map(([k,g]) => `
          <div onclick="ccPickGod('${k}')" style="padding:5px;border:1px solid ${ccSelectedGod===k?'var(--purple)':'var(--border)'};cursor:pointer;font-family:'Share Tech Mono';font-size:11px;background:${ccSelectedGod===k?'#0f0a1a':'transparent'};text-align:center;">
            <div style="color:var(--purple);font-family:'VT323';font-size:16px;">${g.sym} ${g.name.split(' ')[0]}</div>
            <div style="color:var(--gray);font-size:10px;">${g.domain.split(',')[0]}</div>
          </div>
        `).join('')}
        <div onclick="ccPickGod(null)" style="padding:5px;border:1px solid ${ccSelectedGod===null?'var(--red)':'var(--border)'};cursor:pointer;font-family:'Share Tech Mono';font-size:11px;background:${ccSelectedGod===null?'#1a0808':'transparent'};text-align:center;">
          <div style="color:var(--red);font-family:'VT323';font-size:16px;">✗ None</div>
          <div style="color:var(--gray);font-size:10px;">Faithless</div>
        </div>
      </div>
    `;
  }
  
  summary.innerHTML = `
    <div style="color:var(--amber)">Race:</div> <div style="color:var(--white)">${race.name} — ${race.flavorText}</div>
    <div style="color:var(--amber);margin-top:5px">Class:</div> <div style="color:var(--white)">${cls.name} — ${cls.flavorText}</div>
    <div style="color:var(--amber);margin-top:8px">Starting Stats:</div>
    <div style="color:var(--cyan)">STR:${stats.str} DEX:${stats.dex} CON:${stats.con} INT:${stats.int} WIS:${stats.wis} CHA:${stats.cha}</div>
    <div style="color:var(--gray);margin-top:5px">Starting Gold: ${race.startGold}gp · HP Dice: d${cls.hpDice}</div>
    ${godPickerHTML}
  `;
}

function ccPickGod(godKey) {
  ccSelectedGod = godKey;
  buildSummary();
}

function startGame() {
  if(!ccSelectedRace || !ccSelectedClass) { alert('Select race and class!'); return; }
  const nameVal = document.getElementById('name-input').value.trim();
  const name = nameVal || rng.pick(['Alaric','Brynn','Corvus','Dagna','Emric','Faelan','Gorin','Hessa']);
  
  // Pass chosen god for cleric
  if((ccSelectedClass === 'cleric' || ccSelectedClass === 'warlock') && ccSelectedGod) {
    G._startingGod = ccSelectedGod;
  }
  
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('game-container').style.display = 'flex';
  
  initCanvas();
  startNewGame(ccSelectedRace, ccSelectedClass, name);
  startAnimLoop();
  // Force resize after layout settles
  setTimeout(() => { resizeCanvas(); renderAll(); }, 50);
}

// ─── INPUT HANDLING ──────────────────────────────────────────
document.addEventListener('keydown', handleKey);

function isVisible(el) {
  while(el) {
    if(el.style.display === 'none') return false;
    if(el.classList && el.classList.contains('hidden')) return false;
    el = el.parentElement;
  }
  return true;
}

function handleKey(e) {
  // Pre-game screens (title, char creation, help)
  if(!G || !G.player) {
    // Help screen — close with Escape or Enter
    const helpScreen = document.getElementById('help-screen');
    if(helpScreen && helpScreen.classList.contains('visible')) {
      if(e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); closeHelp(); }
      return;
    }

    // Char creation step 3 — Enter starts game, Escape goes back
    const ccStep3 = document.getElementById('cc-step3');
    if(ccStep3 && isVisible(ccStep3)) {
      if(e.key === 'Enter') { e.preventDefault(); startGame(); return; }
      if(e.key === 'Escape') { e.preventDefault(); ccBack(2); return; }
      return; // let typing work in name input
    }

    // Char creation steps 1 & 2 — number keys select, Escape goes back
    const ccScreen = document.getElementById('char-create-screen');
    if(ccScreen && isVisible(ccScreen)) {
      if(e.key === 'Escape') {
        e.preventDefault();
        const step1 = document.getElementById('cc-step1');
        if(step1 && isVisible(step1)) showTitleFromCC();
        else ccBack(1);
        return;
      }
      // Number keys to select race/class
      const num = parseInt(e.key);
      if(num >= 1 && num <= 9) {
        const step1 = document.getElementById('cc-step1');
        const step2 = document.getElementById('cc-step2');
        if(step1 && isVisible(step1)) {
          const raceGrid = document.getElementById('race-grid');
          const entries = raceGrid?._entries;
          if(entries && num <= entries.length) {
            e.preventDefault();
            ccSelectedRace = entries[num-1][0];
            buildRaceGrid();
            setTimeout(() => showCCStep(2), 200);
            return;
          }
        } else if(step2 && isVisible(step2)) {
          const classGrid = document.getElementById('class-grid');
          const entries = classGrid?._entries;
          if(entries && num <= entries.length) {
            e.preventDefault();
            ccSelectedClass = entries[num-1][0];
            buildClassGrid();
            setTimeout(() => showCCStep(3), 200);
            return;
          }
        }
      }
    }

    // Debug code detection
    if(e.key.length === 1 && e.key !== ' ') {
      debugTypedBuffer += e.key.toLowerCase();
      if(debugTypedBuffer.length > 10) debugTypedBuffer = debugTypedBuffer.slice(-10);
      if(debugTypedBuffer.endsWith('debug')) {
        DEBUG_MODE = true;
        debugTypedBuffer = '';
      }
    }

    // Arrow/Enter navigation for any visible clickable elements in the overlay
    const overlay = document.getElementById('overlay');
    if(overlay && !overlay.classList.contains('hidden')) {
      // Find all navigable elements: menu buttons AND char-option cards
      const btns = [...overlay.querySelectorAll('.menu-btn, .char-option')].filter(b => isVisible(b));
      if(btns.length > 0 && ['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Enter',' ','Tab'].includes(e.key)) {
        e.preventDefault();
        let sel = btns.findIndex(b => b.classList.contains('selected'));
        if(e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Tab') {
          btns.forEach(b => b.classList.remove('selected'));
          sel = (sel + 1) % btns.length;
          btns[sel].classList.add('selected');
          btns[sel].scrollIntoView({ block: 'nearest' });
        } else if(e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          btns.forEach(b => b.classList.remove('selected'));
          sel = sel <= 0 ? btns.length - 1 : sel - 1;
          btns[sel].classList.add('selected');
          btns[sel].scrollIntoView({ block: 'nearest' });
        } else if(e.key === 'Enter' || e.key === ' ') {
          if(sel >= 0) btns[sel].click();
          else { btns[0].classList.add('selected'); btns[0].click(); }
        }
      }
    }
    return;
  }
  if(G.restingActive) { G.restingActive = false; log('Rest interrupted.', 'info'); return; }
  if(G.gameOver) return;

  // Debug screen
  if(G.debugOpen) {
    if(e.key === 'Escape' || e.key === 'F2') closeDebugScreen();
    return;
  }
  if(e.key === 'F2' && DEBUG_MODE) {
    e.preventDefault();
    openDebugScreen();
    return;
  }
  if(e.key === 'F1') {
    e.preventDefault();
    if(typeof tilesetReady !== 'undefined' && tilesetReady) {
      useTileset = !useTileset;
      localStorage.setItem('baal_tileset', useTileset);
      flash(useTileset ? 'Tileset mode' : 'ASCII mode');
    } else {
      flash('Tileset not loaded');
    }
    renderAll();
    return;
  }
  if(e.key === 'PageUp' || e.key === 'PageDown') {
    e.preventDefault();
    if(typeof CELL_SIZE !== 'undefined') {
      CELL_SIZE = e.key === 'PageUp'
        ? Math.min(MAX_CELL_SIZE, CELL_SIZE + ZOOM_STEP)
        : Math.max(MIN_CELL_SIZE, CELL_SIZE - ZOOM_STEP);
      localStorage.setItem('baal_zoom', CELL_SIZE);
      renderAll();
    }
    return;
  }

  // Stair-find mode (Shift+X, then < or > to cycle stairs, Enter to auto-travel)
  if(G.stairFindMode) {
    e.preventDefault();
    if(e.key === 'Escape') {
      G.stairFindMode = false;
      const li = document.getElementById('look-info');
      if(li) li.style.display = 'none';
      log('Stair-find cancelled.', 'info');
      renderAll();
      return;
    }
    if(e.key === '>' || e.key === '.') {
      // Cycle to next down stair
      const stairs = findStairs('down');
      if(stairs.length === 0) { log('No discovered stairs down.', 'info'); return; }
      G._stairIdx = ((G._stairIdx || 0) + 1) % stairs.length;
      G.lookX = stairs[G._stairIdx].x; G.lookY = stairs[G._stairIdx].y;
      log(`Stairs down (${G._stairIdx+1}/${stairs.length})`, 'system');
      renderLookCursor();
      return;
    }
    if(e.key === '<' || e.key === ',') {
      // Cycle to next up stair
      const stairs = findStairs('up');
      if(stairs.length === 0) { log('No discovered stairs up.', 'info'); return; }
      G._stairIdx = ((G._stairIdx || 0) + 1) % stairs.length;
      G.lookX = stairs[G._stairIdx].x; G.lookY = stairs[G._stairIdx].y;
      log(`Stairs up (${G._stairIdx+1}/${stairs.length})`, 'system');
      renderLookCursor();
      return;
    }
    if(e.key === 'Enter') {
      G.stairFindMode = false;
      const li = document.getElementById('look-info');
      if(li) li.style.display = 'none';
      if(G.lookX !== undefined && G.lookY !== undefined) {
        startAutoTravel(G.lookX, G.lookY);
      }
      return;
    }
    return;
  }

  // Look mode
  if(G.lookMode) {
    e.preventDefault();
    const lookMoves = {
      'ArrowUp': [0,-1], 'ArrowDown': [0,1], 'ArrowLeft': [-1,0], 'ArrowRight': [1,0],
      'k': [0,-1], 'j': [0,1], 'h': [-1,0], 'l': [1,0],
      'y': [-1,-1], 'u': [1,-1], 'b': [-1,1], 'n': [1,1],
      '8': [0,-1], '2': [0,1], '4': [-1,0], '6': [1,0],
    };
    if(e.key === 'Escape' || e.key === 'l') { exitLookMode(); return; }
    if(lookMoves[e.key]) { moveLook(...lookMoves[e.key]); return; }
    return;
  }

  // Attack mode — force-attack in a direction
  if(G.attackMode) {
    e.preventDefault();
    const atkMoves = {
      'ArrowUp': [0,-1], 'ArrowDown': [0,1], 'ArrowLeft': [-1,0], 'ArrowRight': [1,0],
      'k': [0,-1], 'j': [0,1], 'h': [-1,0], 'l': [1,0],
      'y': [-1,-1], 'u': [1,-1], 'b': [-1,1], 'n': [1,1],
      '8': [0,-1], '2': [0,1], '4': [-1,0], '6': [1,0],
      '7': [-1,-1], '9': [1,-1], '1': [-1,1], '3': [1,1],
      'Numpad4': [-1,0], 'Numpad6': [1,0], 'Numpad8': [0,-1], 'Numpad2': [0,1],
      'Numpad7': [-1,-1], 'Numpad9': [1,-1], 'Numpad1': [-1,1], 'Numpad3': [1,1],
    };
    if(e.key === 'Escape' || e.key === 'x') { G.attackMode = false; log('Attack cancelled.', 'info'); renderAll(); return; }
    if(atkMoves[e.key]) {
      G.attackMode = false;
      forceAttack(...atkMoves[e.key]);
      return;
    }
    return;
  }

  // Reach mode — lunge attack at 2-tile range
  if(G.reachMode) {
    e.preventDefault();
    const reachMoves = {
      'ArrowUp': [0,-1], 'ArrowDown': [0,1], 'ArrowLeft': [-1,0], 'ArrowRight': [1,0],
      'k': [0,-1], 'j': [0,1], 'h': [-1,0], 'l': [1,0],
      'y': [-1,-1], 'u': [1,-1], 'b': [-1,1], 'n': [1,1],
      '8': [0,-1], '2': [0,1], '4': [-1,0], '6': [1,0],
      '7': [-1,-1], '9': [1,-1], '1': [-1,1], '3': [1,1],
      'Numpad4': [-1,0], 'Numpad6': [1,0], 'Numpad8': [0,-1], 'Numpad2': [0,1],
      'Numpad7': [-1,-1], 'Numpad9': [1,-1], 'Numpad1': [-1,1], 'Numpad3': [1,1],
    };
    if(e.key === 'Escape') { G.reachMode = false; log('Lunge cancelled.', 'info'); renderAll(); return; }
    if(reachMoves[e.key]) {
      G.reachMode = false;
      reachAttack(...reachMoves[e.key]);
      return;
    }
    return;
  }

  // Screen-specific keys
  if(G.mutOpen) {
    if(e.key === 'Escape' || e.key === 'm' || e.key === '`' || e.key === '~') closeMutScreen();
    return;
  }
  if(G.invOpen) { handleInvKey(e); return; }
  if(G.spellOpen) { handleSpellKey(e); return; }
  if(G.consumeMenuOpen) {
    if(e.key === 'Escape') closeConsumeMenu();
    return;
  }
  if(G.identifyMenuOpen) {
    if(e.key === 'Escape') closeIdentifyMenu();
    return;
  }
  if(G.pickupModalOpen) {
    if(e.key === 'Escape') { closePickupModal(); return; }
    if(e.key === '*') { pickupModalAll(); return; }
    const sc = e.key.charCodeAt(0);
    if(sc >= 97 && sc <= 122) {
      const idx = sc - 97;
      if(G.pickupModalItems && G.pickupModalItems[idx]) pickupModalPick(idx);
    }
    return;
  }
  if(G.companionChatOpen) {
    if(e.key === 'Escape') { closeCompanionChat(); return; }
    const sc = e.key.charCodeAt(0);
    if(sc >= 97 && sc <= 122) {
      const idx = sc - 97;
      const p = G.player;
      if(p.companions.length > 1 && p.companions[idx]) { pickCompanionChat(idx); }
      else if(p.companions.length === 1 && e.key === 'a') { companionToggleFollow(p.companions[0].id || p.companions[0].name); }
    }
    return;
  }
  if(G.alignmentOpen) {
    if(e.key === 'Escape' || e.key === 'a' || e.key === 'A') closeAlignmentScreen();
    return;
  }
  if(G.godOpen) {
    if(e.key === 'Escape') closeGodScreen();
    return;
  }
  if(G.inShop) {
    if(e.key === 'Escape') { closeShop(); return; }
    // Letter keys to buy items
    const sc = e.key.charCodeAt(0);
    if(sc >= 97 && sc <= 122) {
      const idx = sc - 97;
      if(G.shopItems && G.shopItems[idx]) buyItem(idx);
    }
    return;
  }
  if(document.getElementById('help-screen').classList.contains('visible')) {
    if(e.key === 'Escape' || e.key === '?') closeHelp();
    return;
  }
  
  const p = G.player;
  if(p.status.paralyzed > 0) {
    if(e.key !== 'Escape') { log('You are paralyzed!', 'warning'); endTurn(); }
    return;
  }

  // Berserk — can only move and attack, nothing else
  if(p.status.berserk > 0) {
    const berserkAllowed = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
      'h','j','k','l','y','u','b','n','1','2','3','4','5','6','7','8','9',
      'Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6','Numpad7','Numpad8','Numpad9',
      '.','Escape','Tab'];
    if(!berserkAllowed.includes(e.key)) {
      log('You are in a berserker rage! You can only move and attack!', 'warning');
      return;
    }
  }

  // Movement keys
  const moveKeys = {
    'ArrowUp': [0,-1], 'ArrowDown': [0,1], 'ArrowLeft': [-1,0], 'ArrowRight': [1,0],
    'h': [-1,0], 'j': [0,1], 'k': [0,-1], 'l': [1,0],
    'y': [-1,-1], 'u': [1,-1], 'b': [-1,1], 'n': [1,1],
    '4': [-1,0], '6': [1,0], '8': [0,-1], '2': [0,1],
    '7': [-1,-1], '9': [1,-1], '1': [-1,1], '3': [1,1],
    'Numpad4': [-1,0], 'Numpad6': [1,0], 'Numpad8': [0,-1], 'Numpad2': [0,1],
    'Numpad7': [-1,-1], 'Numpad9': [1,-1], 'Numpad1': [-1,1], 'Numpad3': [1,1],
  };
  
  const key = e.key;

  // Numpad 0 → auto-explore (check e.code since e.key is '0' with numlock)
  if(e.code === 'Numpad0') {
    e.preventDefault();
    G.autoExploreActive = !G.autoExploreActive;
    if(G.autoExploreActive) { log('Auto-explore activated.', 'system'); setTimeout(autoExploreStep, 50); }
    else { log('Auto-explore stopped.', 'system'); }
    return;
  }

  // Cancel auto-explore, auto-travel, or resting on any movement key
  if(moveKeys[key] && (G.autoExploreActive || G.restingActive || G.autoTravelPath)) {
    e.preventDefault();
    G.autoExploreActive = false;
    G.restingActive = false;
    G.autoTravelPath = null;
    log('Stopped.', 'info');
    return;
  }

  if(moveKeys[key]) {
    e.preventDefault();
    const [dx, dy] = moveKeys[key];
    const moved = tryMove(dx, dy);
    if(moved) endTurn();
    return;
  }
  
  switch(key) {
    case '.': case '5': case 'Numpad5':
      e.preventDefault();
      endTurn();
      break;
    case 'R':
      e.preventDefault();
      startResting();
      break;
    case 'l': case 'L':
      if(!G.lookMode) enterLookMode();
      break;
    case 'm': case '`': case '~':
      openMutScreen();
      break;
    case '>':
      descend();
      break;
    case '<':
      ascend();
      break;
    case ',':
      pickupItems();
      break;
    case 'i': case 'I':
      openInventory();
      break;
    case 'z': case 'Z':
      openSpellScreen();
      break;
    case 'g': case 'G':
      prayGod();
      break;
    case 'e':
      eatFood();
      break;
    case 'E':
      openInventory();
      break;
    case 'q': case 'Q':
      drinkPotion();
      break;
    case 'r':
      readScroll();
      break;
    case 'f': case 'F':
      fireRanged();
      break;
    case 's': case 'S':
      searchArea();
      break;
    case 'o': case 'O': case 'Numpad0': case 'Insert':
      G.autoExploreActive = !G.autoExploreActive;
      if(G.autoExploreActive) {
        log('Auto-explore activated.', 'system');
        setTimeout(autoExploreStep, 50);
      } else {
        log('Auto-explore stopped.', 'system');
      }
      break;
    case 'v': case 'V':
      throwItem();
      break;
    case 'x':
      G.attackMode = true;
      log('Attack mode — choose a direction to strike.', 'info');
      break;
    case 'X':
      G.stairFindMode = true;
      G._stairIdx = -1;
      G.lookX = G.player.x; G.lookY = G.player.y;
      log('STAIR FIND — Press > for stairs down, < for stairs up, Enter to travel, ESC to cancel.', 'system');
      break;
    case 'p':
      if(G.player.equipped.weapon?.reach) {
        G.reachMode = true;
        log('Lunge — choose a direction to strike at range.', 'info');
      } else {
        log('You need a reach weapon (spear, halberd) to lunge.', 'warning');
      }
      break;
    case 'T':
      turnUndead();
      break;
    case 'c': case 'C':
      openCompanionChat();
      break;
    case 'Tab':
      e.preventDefault();
      autoAttack();
      break;
    case 'a':
      openAlignmentScreen();
      break;
    case '?':
      showHelp();
      break;
    case 'Escape':
      G.autoExploreActive = false;
      if(G.throwMenuOpen) closeThrowMenu();
      break;
  }

  renderAll();
}

function handleInvKey(e) {
  const p = G.player;
  if(e.key === 'Escape') { closeInventory(); return; }

  // Action keys operate on the currently selected item
  if(G.invSelectedIdx !== undefined && G.invSelectedIdx !== null) {
    const idx = G.invSelectedIdx;
    const item = p.inventory[idx];
    if(item) {
      switch(e.key) {
        case 'w': equipFromInv(idx); return;
        case 't': unequipFromInv(idx); return;
        case 'u': useFromInv(idx); return;
        case 'd': dropFromInv(idx); return;
      }
    }
  }

  // Letter keys select an inventory slot
  const charCode = e.key.charCodeAt(0);
  if(charCode >= 97 && charCode <= 122) {
    const idx = charCode - 97;
    const item = p.inventory[idx];
    if(!item) return;
    G.invSelectedIdx = idx;
    showItemDetail(item, idx);
  }
}

function handleSpellKey(e) {
  if(e.key === 'Escape') { closeSpellScreen(); return; }
  const p = G.player;
  const spells = [...p.spells];
  if(p.cls === 'fightingman') spells.push('power_strike', 'steady_aim');
  
  const charCode = e.key.charCodeAt(0);
  if(charCode >= 97 && charCode <= 122) {
    const idx = charCode - 97;
    if(spells[idx]) castSpell(spells[idx]);
  }
}

function eatFood() {
  const foods = G.player.inventory.filter(i => i.type === 'food');
  if(foods.length === 0) { log('No food in inventory!', 'warning'); return; }
  if(foods.length === 1) { useItem(foods[0]); return; }
  openConsumeMenu('food');
}

function drinkPotion() {
  const potions = G.player.inventory.filter(i => i.type === 'potion');
  if(potions.length === 0) { log('No potions!', 'warning'); return; }
  if(potions.length === 1) { useItem(potions[0]); return; }
  openConsumeMenu('potion');
}

function openConsumeMenu(itemType) {
  const p = G.player;
  const items = p.inventory.filter(i => i.type === itemType);
  const title = itemType === 'food' ? 'EAT WHAT?' : 'DRINK WHAT?';
  let html = `<div style="font-family:'VT323',monospace;padding:10px;">
    <h2 style="color:var(--amber);font-size:26px;margin-bottom:10px;">${title}</h2>`;
  items.forEach((item, i) => {
    const key = String.fromCharCode(97 + i);
    const dname = getItemDisplayName(item);
    const realIdx = p.inventory.indexOf(item);
    const itemGlyph = useTileset ? spriteHTML(typeof getItemWorldTile === 'function' ? (getItemWorldTile(item) || getItemTile(item)) : 231, typeof getItemWorldTile === 'function' && getItemWorldTile(item) !== undefined ? 'world' : 'classic', 18) : `<span style="color:${item.color||'var(--white)'}">${item.glyph||'?'}</span>`;
    html += `<div style="padding:5px 8px;cursor:pointer;font-size:18px;border-bottom:1px solid var(--border);" onclick="consumeMenuPick(${realIdx})">
      <span style="color:var(--amber)">${key})</span>
      <span style="margin-left:6px;">${itemGlyph} ${dname}</span>
    </div>`;
  });
  html += `<button class="menu-btn" onclick="closeConsumeMenu()" style="margin-top:10px">Cancel (ESC)</button></div>`;
  G.consumeMenuOpen = true;
  const modal = document.getElementById('modal');
  document.getElementById('modal-content').innerHTML = html;
  modal.style.display = 'flex';
  renderInlineSprites(document.getElementById('modal-content'));
}
window.consumeMenuPick = function(idx) {
  const item = G.player.inventory[idx];
  closeConsumeMenu();
  if(item) useItem(item);
};
function closeConsumeMenu() {
  G.consumeMenuOpen = false;
  document.getElementById('modal').style.display = 'none';
}
window.closeConsumeMenu = closeConsumeMenu;

function openIdentifyMenu() {
  const p = G.player;
  const unidentified = p.inventory.filter(i => !i.identified && (i.type === 'potion' || i.type === 'scroll' || i.type === 'ring' || i.type === 'amulet' || i.type === 'wand'));
  if(unidentified.length === 0) {
    log('Nothing to identify.', 'info');
    return;
  }
  let html = `<div style="font-family:'VT323',monospace;padding:10px;">
    <h2 style="color:var(--amber);font-size:26px;margin-bottom:10px;">IDENTIFY WHAT?</h2>`;
  unidentified.forEach((item, i) => {
    const key = String.fromCharCode(97 + i);
    const dname = getItemDisplayName(item);
    const realIdx = p.inventory.indexOf(item);
    const itemGlyph = useTileset ? spriteHTML(typeof getItemWorldTile === 'function' ? (getItemWorldTile(item) || getItemTile(item)) : 231, typeof getItemWorldTile === 'function' && getItemWorldTile(item) !== undefined ? 'world' : 'classic', 18) : `<span style="color:${item.color||'var(--white)'}">${item.glyph||'?'}</span>`;
    html += `<div style="padding:5px 8px;cursor:pointer;font-size:18px;border-bottom:1px solid var(--border);" onclick="identifyMenuPick(${realIdx})">
      <span style="color:var(--amber)">${key})</span>
      <span style="margin-left:6px;">${itemGlyph} ${dname}</span>
    </div>`;
  });
  html += `<button class="menu-btn" onclick="closeIdentifyMenu()" style="margin-top:10px">Cancel (ESC)</button></div>`;
  G.identifyMenuOpen = true;
  const modal = document.getElementById('modal');
  document.getElementById('modal-content').innerHTML = html;
  modal.style.display = 'flex';
  renderInlineSprites(document.getElementById('modal-content'));
}
window.identifyMenuPick = function(idx) {
  const item = G.player.inventory[idx];
  closeIdentifyMenu();
  if(item) {
    identifyItem(item);
    log(`Identified: ${item.name}!`, 'good');
    gainPiety('identifying_items', 2);
    if(item.cursed) log(`Warning: it is cursed!`, 'warning');
  }
};
function closeIdentifyMenu() {
  G.identifyMenuOpen = false;
  document.getElementById('modal').style.display = 'none';
}
window.closeIdentifyMenu = closeIdentifyMenu;

function readScroll() {
  const scrolls = G.player.inventory.filter(i => i.type === 'scroll');
  if(scrolls.length === 0) { log('No scrolls!', 'warning'); return; }
  // Open inventory filtered to scrolls for now
  openInventory();
}

function startResting() {
  const p = G.player;
  if(p.hp >= p.maxHp && p.mp >= p.maxMp) { log('You are fully recovered.', 'info'); return; }
  if(p.status.poisoned > 0) { log('You cannot rest while poisoned!', 'warning'); return; }
  const vis = G.level?.monsters.some(m => G.level.visible?.has(`${m.x},${m.y}`));
  if(vis) { log('You cannot rest with enemies nearby!', 'warning'); return; }
  G.restingActive = true;
  log('You begin to rest...', 'info');
  doRestTick();
}

function doRestTick() {
  if(!G.restingActive || G.gameOver) return;
  const p = G.player;
  const vis = G.level?.monsters.some(m => G.level.visible?.has(`${m.x},${m.y}`));
  if(vis) { G.restingActive = false; log('Your rest is interrupted!', 'warning'); return; }
  if(p.status.poisoned > 0) { G.restingActive = false; log('Cannot rest while poisoned!', 'warning'); return; }
  if(p.hp >= p.maxHp && p.mp >= p.maxMp) { G.restingActive = false; log('You feel fully recovered.', 'good'); return; }
  endTurn();
  if(G.restingActive) setTimeout(doRestTick, 25);
}

function autoAttack() {
  const target = getNearestMonster();
  if(!target) { log('No enemies nearby.', 'info'); return; }
  attackMonster(target);
  endTurn();
}

// ─── COMPANION CHAT ──────────────────────────────────────────
function openCompanionChat() {
  const p = G.player;
  if(p.companions.length === 0) {
    log('You have no companions to speak with.', 'info');
    return;
  }
  if(p.companions.length === 1) {
    openCompanionOrder(p.companions[0]);
    return;
  }
  // Multiple companions — pick one
  let html = `<div style="font-family:'VT323',monospace;padding:10px;">
    <h2 style="color:var(--amber);font-size:26px;margin-bottom:10px;">⚔ SPEAK WITH WHOM?</h2>`;
  p.companions.forEach((comp, i) => {
    const key = String.fromCharCode(97 + i);
    const mode = comp.stayPut ? '<span style="color:#cc8833">[STAYING]</span>' : '<span style="color:#44ff88">[FOLLOWING]</span>';
    html += `<div style="padding:5px 8px;cursor:pointer;font-size:18px;border-bottom:1px solid var(--border);" onclick="pickCompanionChat(${i})">
      <span style="color:var(--amber)">${key})</span>
      <span style="color:var(--white);margin-left:6px;">${comp.name}</span>
      <span style="margin-left:8px;font-size:14px;">${mode}</span>
      <span style="color:var(--gray);margin-left:8px;font-size:14px;">${comp.hp}/${comp.maxHp} HP</span>
    </div>`;
  });
  html += `<button class="menu-btn" onclick="closeCompanionChat()" style="margin-top:10px">Cancel (ESC)</button></div>`;
  G.companionChatOpen = true;
  const modal = document.getElementById('modal');
  document.getElementById('modal-content').innerHTML = html;
  modal.style.display = 'flex';
}

window.pickCompanionChat = function(idx) {
  const comp = G.player.companions[idx];
  closeCompanionChat();
  if(comp) openCompanionOrder(comp);
};

function openCompanionOrder(comp) {
  const mode = comp.stayPut ? 'STAYING PUT' : 'FOLLOWING';
  const toggleLabel = comp.stayPut ? 'Follow me' : 'Stay here';
  const toggleColor = comp.stayPut ? 'var(--green)' : 'var(--amber)';
  const lvl = comp.compLevel || 1;
  const wpnInfo = comp.equippedWeapon ? `Weapon: ${comp.equippedWeapon.name}` : 'Weapon: bare fists';
  const weapons = G.player.inventory.filter(i => i.type === 'weapon' && !i.cursed);
  let wpnOptions = '';
  if(weapons.length > 0) {
    wpnOptions = `<div style="padding:8px;cursor:pointer;border-bottom:1px solid var(--border);font-size:18px;" onclick="companionGiveWeapon('${comp.id || comp.name}')">
      <span style="color:var(--cyan)">b) Give weapon</span>
    </div>`;
  }
  let html = `<div style="font-family:'VT323',monospace;padding:10px;">
    <h2 style="color:var(--amber);font-size:26px;margin-bottom:6px;">⚔ ${comp.name}</h2>
    <p style="font-family:'Share Tech Mono';font-size:13px;color:var(--gray);margin-bottom:12px;">${comp.hp}/${comp.maxHp} HP — Level ${lvl} — ${wpnInfo}<br>Currently: <span style="color:var(--white)">${mode}</span></p>
    <div style="padding:8px;cursor:pointer;border-bottom:1px solid var(--border);font-size:18px;" onclick="companionToggleFollow('${comp.id || comp.name}')">
      <span style="color:${toggleColor}">a) ${toggleLabel}</span>
    </div>
    ${wpnOptions}
    <button class="menu-btn" onclick="closeCompanionChat()" style="margin-top:10px">Cancel (ESC)</button>
  </div>`;
  G.companionChatOpen = true;
  const modal = document.getElementById('modal');
  document.getElementById('modal-content').innerHTML = html;
  modal.style.display = 'flex';
}

window.companionToggleFollow = function(compId) {
  const comp = G.player.companions.find(c => (c.id || c.name) === compId);
  closeCompanionChat();
  if(!comp) return;
  comp.stayPut = !comp.stayPut;
  if(comp.stayPut) {
    log(`${comp.name}: "Understood. I'll hold this position."`, 'info');
  } else {
    log(`${comp.name}: "Right behind you."`, 'info');
  }
};

window.companionGiveWeapon = function(compId) {
  const comp = G.player.companions.find(c => (c.id || c.name) === compId);
  closeCompanionChat();
  if(!comp) return;
  const weapons = G.player.inventory.filter(i => i.type === 'weapon' && !i.cursed);
  if(weapons.length === 0) { log('You have no weapons to give.', 'info'); return; }
  // Show weapon selection modal
  let html = `<div style="font-family:'VT323',monospace;padding:10px;">
    <h2 style="color:var(--amber);font-size:22px;margin-bottom:10px;">Give weapon to ${comp.name}</h2>`;
  weapons.forEach((w, i) => {
    const key = String.fromCharCode(97 + i);
    html += `<div style="padding:5px 8px;cursor:pointer;font-size:16px;border-bottom:1px solid var(--border);" onclick="doGiveWeapon('${compId}', ${i})">
      <span style="color:var(--amber)">${key})</span> <span style="color:var(--cyan)">${w.name}</span>
    </div>`;
  });
  html += `<button class="menu-btn" onclick="closeCompanionChat()" style="margin-top:10px">Cancel (ESC)</button></div>`;
  G.companionChatOpen = true;
  const modal = document.getElementById('modal');
  document.getElementById('modal-content').innerHTML = html;
  modal.style.display = 'flex';
};

window.doGiveWeapon = function(compId, wpnIdx) {
  const comp = G.player.companions.find(c => (c.id || c.name) === compId);
  const weapons = G.player.inventory.filter(i => i.type === 'weapon' && !i.cursed);
  const weapon = weapons[wpnIdx];
  closeCompanionChat();
  if(!comp || !weapon) return;
  // Return old weapon to player inventory if any
  if(comp.equippedWeapon) {
    G.player.inventory.push(comp.equippedWeapon);
    log(`${comp.name} returns the ${comp.equippedWeapon.name}.`, 'info');
  }
  // Remove from player inventory and give to companion
  G.player.inventory = G.player.inventory.filter(i => i !== weapon);
  comp.equippedWeapon = weapon;
  comp.atk = [weapon.dmg]; // Use weapon's damage dice
  log(`${comp.name} wields the ${weapon.name}!`, 'good');
  renderAll();
};

function closeCompanionChat() {
  G.companionChatOpen = false;
  document.getElementById('modal').style.display = 'none';
}
window.closeCompanionChat = closeCompanionChat;

// ─── SAVE / QUIT SYSTEM ──────────────────────────────────────
const SAVE_KEY = 'baal_save_v3';

function saveGame() {
  if(!G.player || G.gameOver) return;
  try {
    // Serialize relevant state (Sets -> arrays)
    const saveData = {
      floor: G.floor,
      turn: G.turn,
      player: G.player,
      messages: G.messages.slice(-100),
      killedBosses: G.killedBosses,
      joinedNPCs: G.joinedNPCs,
      templeSpawned: G.templeSpawned,
      godFledFrom: G.godFledFrom,
      ascending: G.ascending,
      // Identification state
      identifiedPotions: [...GAME_IDENTIFIED_POTIONS],
      identifiedScrolls: [...GAME_IDENTIFIED_SCROLLS],
      identifiedRings: [...GAME_IDENTIFIED_RINGS],
      identifiedAmulets: [...GAME_IDENTIFIED_AMULETS],
      identifiedWands: [...GAME_IDENTIFIED_WANDS],
      potionColors: GAME_POTION_COLORS,
      scrollLabels: GAME_SCROLL_LABELS,
      ringLooks: GAME_RING_LOOKS,
      amuletLooks: GAME_AMULET_LOOKS,
      wandLooks: GAME_WAND_LOOKS,
      foundUniques: [...(G.foundUniques || [])],
      branch: G.branch,
      branchFloor: G.branchFloor,
      branchReturnFloor: G.branchReturnFloor,
      branchReturnPos: G.branchReturnPos,
      completedBranches: G.completedBranches || [],
      collectedRunes: G.collectedRunes || [],
      savedAt: Date.now()
    };
    // Level: tiles as flat array, explored/visible as arrays
    if(G.level) {
      saveData.level = {
        tiles: G.level.tiles,
        items: G.level.items,
        monsters: G.level.monsters,
        npcs: G.level.npcs,
        rooms: G.level.rooms,
        startPos: G.level.startPos,
        altarGods: G.level.altarGods,
        portalBranches: G.level.portalBranches || null,
        explored: [...G.level.explored]
      };
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch(e) { console.warn('Save failed:', e); }
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch(e) { return false; }
}

function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

function continueGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) { log('No save found.', 'warning'); return; }
    const data = JSON.parse(raw);

    // Restore identification state
    GAME_POTION_COLORS = data.potionColors || {};
    GAME_SCROLL_LABELS = data.scrollLabels || {};
    GAME_RING_LOOKS = data.ringLooks || {};
    GAME_AMULET_LOOKS = data.amuletLooks || {};
    GAME_WAND_LOOKS = data.wandLooks || {};
    GAME_IDENTIFIED_POTIONS = new Set(data.identifiedPotions || []);
    GAME_IDENTIFIED_SCROLLS = new Set(data.identifiedScrolls || []);
    GAME_IDENTIFIED_RINGS = new Set(data.identifiedRings || []);
    GAME_IDENTIFIED_AMULETS = new Set(data.identifiedAmulets || []);
    GAME_IDENTIFIED_WANDS = new Set(data.identifiedWands || []);

    G = {
      floor: data.floor,
      turn: data.turn,
      player: data.player,
      messages: data.messages || [],
      killedBosses: data.killedBosses || [],
      joinedNPCs: data.joinedNPCs || [],
      templeSpawned: data.templeSpawned || false,
      godFledFrom: data.godFledFrom || null,
      ascending: data.ascending || false,
      gameOver: false,
      won: false,
      targeting: false,
      targetX: 0, targetY: 0,
      targetCallback: null,
      selectedInvItem: null,
      shopItems: [],
      ghostSpawnChance: 0.15,
      altarGods: {},
      seenMonsters: new Set(),
      seenItems: new Set(),
      lookMode: false,
      lookX: 0, lookY: 0,
      _pendingAltarGods: {},
      noiseTimer: 0,
      restingActive: false,
      consumeMenuOpen: false,
      identifyMenuOpen: false,
      alignmentOpen: false,
      debugOpen: false,
      attackMode: false,
      reachMode: false,
      autoExploreActive: false,
      foundUniques: new Set(data.foundUniques || []),
      branch: data.branch || null,
      branchFloor: data.branchFloor || 0,
      branchReturnFloor: data.branchReturnFloor || 0,
      branchReturnPos: data.branchReturnPos || null,
      mainDungeonLevel: null, // branch re-entry would need to regenerate
      completedBranches: data.completedBranches || [],
      collectedRunes: data.collectedRunes || [],
    };

    // Backward compat: alignment field for old saves
    if(G.player.alignment === undefined) G.player.alignment = 0;

    // Restore level
    if(data.level) {
      G.level = data.level;
      G.level.explored = new Set(data.level.explored);
      G.level.visible = new Set();
    } else {
      G.level = generateLevel(G.floor);
      const [sx, sy] = G.level.startPos;
      G.player.x = sx; G.player.y = sy;
    }

    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('game-container').style.display = 'flex';
    initCanvas();
    computeFOV();
    renderAll();
    startAnimLoop();
    setTimeout(() => { resizeCanvas(); renderAll(); }, 50);
    log('Welcome back. The dungeon awaits.', 'system');
  } catch(e) {
    console.error('Load failed:', e);
    alert('Save file corrupted. Starting new game.');
    deleteSave();
  }
}

function quitToTitle() {
  if(!G.player || G.gameOver) return;
  saveGame();
  G = {};
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('title-screen').style.display = 'block';
  document.getElementById('char-create-screen').style.display = 'none';
  // Show continue button
  const cb = document.getElementById('continue-btn');
  if(cb) cb.style.display = hasSave() ? 'block' : 'none';
}

function giveUp() {
  if(!G.player || G.gameOver) return;
  if(!confirm('Give up this run? This cannot be undone — your character will be lost forever.')) return;
  deleteSave();
  saveGhost(G.player);
  G.gameOver = true;
  const p = G.player;
  document.getElementById('modal-content').innerHTML = `
    <h1 style="color:var(--red)">YOU GAVE UP</h1>
    <h2>${p.name} the ${RACES[p.race].name} ${CLASSES[p.cls].name}</h2>
    <p style="color:var(--gray)">Abandoned on floor ${G.floor} after ${G.turn} turns.</p>
    <p style="color:var(--gray)">Your ghost will wander these halls...</p>
    <button class="menu-btn" onclick="location.reload()">Play Again</button>
  `;
  document.getElementById('modal').style.display = 'flex';
}
window.quitToTitle = quitToTitle;
window.giveUp = giveUp;
window.continueGame = continueGame;

// ─── DEBUG ──────────────────────────────────────────────────

function openDebugScreen() {
  if(!DEBUG_MODE) return;
  const el = document.getElementById('debug-screen');
  el.classList.add('visible');
  G.debugOpen = true;

  const content = document.getElementById('debug-content');

  // Build monster dropdown options
  const monsterKeys = Object.keys(MONSTER_TEMPLATES);
  const monsterOpts = monsterKeys.map(k => `<option value="${k}">${MONSTER_TEMPLATES[k].name}</option>`).join('');

  // Build item dropdown options
  const itemKeys = Object.keys(ITEM_TEMPLATES);
  const itemOpts = itemKeys.map(k => `<option value="${k}">${ITEM_TEMPLATES[k].name}</option>`).join('');

  // Build god dropdown options
  const godOpts = Object.entries(GODS).map(([k,g]) => `<option value="${k}">${g.name}</option>`).join('');

  content.innerHTML = `
    <div class="debug-section">
      <h3>Spawning</h3>
      <div class="debug-row">
        <label>Monster:</label>
        <select id="debug-monster-sel">${monsterOpts}</select>
        <button class="debug-btn" onclick="debugSpawnMonster()">Spawn</button>
      </div>
      <div class="debug-row">
        <label>Item:</label>
        <select id="debug-item-sel">${itemOpts}</select>
        <button class="debug-btn" onclick="debugSpawnItem()">Spawn</button>
      </div>
    </div>
    <div class="debug-section">
      <h3>Alignment & Faith</h3>
      <div class="debug-row">
        <label>Alignment:</label>
        <input type="number" id="debug-align-val" value="${G.player.alignment}" min="-100" max="100">
        <button class="debug-btn" onclick="debugSetAlignment()">Set</button>
      </div>
      <div class="debug-row">
        <label>God:</label>
        <select id="debug-god-sel"><option value="">(none)</option>${godOpts}</select>
        <button class="debug-btn" onclick="debugSetGod()">Set</button>
      </div>
      <div class="debug-row">
        <label>Piety:</label>
        <input type="number" id="debug-piety-val" value="${G.player.piety || 0}" min="0" max="100">
        <button class="debug-btn" onclick="debugSetPiety()">Set</button>
      </div>
    </div>
    <div class="debug-section">
      <h3>Player</h3>
      <div class="debug-row">
        <button class="debug-btn" onclick="debugGiveGold()">+1000 Gold</button>
        <button class="debug-btn" onclick="debugFullHeal()">Full Heal</button>
        <button class="debug-btn" onclick="debugRevealMap()">Reveal Map</button>
        <button class="debug-btn" onclick="debugToggleGodMode()">Toggle God Mode</button>
      </div>
      <div class="debug-row">
        <label>Level:</label>
        <input type="number" id="debug-level-val" value="${G.player.level}" min="1" max="20">
        <button class="debug-btn" onclick="debugSetLevel()">Set Level</button>
      </div>
    </div>
    <div class="debug-section">
      <h3>Dungeon</h3>
      <div class="debug-row">
        <label>Go to Floor:</label>
        <input type="number" id="debug-floor-val" value="${G.floor}" min="1" max="16">
        <button class="debug-btn" onclick="debugGoToFloor()">Go</button>
      </div>
      <div class="debug-row">
        <button class="debug-btn" onclick="debugGrantRune()">Grant Rune + Ascending</button>
      </div>
    </div>
    <div style="margin-top:8px;color:#666;font-size:12px;">God mode: ${G.player.status.godmode ? '<span style="color:#ff8800">ON</span>' : 'OFF'}</div>
  `;
}

function closeDebugScreen() {
  document.getElementById('debug-screen').classList.remove('visible');
  G.debugOpen = false;
}

function debugSpawnMonster() {
  const key = document.getElementById('debug-monster-sel').value;
  const template = MONSTER_TEMPLATES[key];
  if(!template) return;
  const p = G.player;
  // Find an adjacent empty tile
  const dirs = [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
  for(const [dx,dy] of dirs) {
    const nx = p.x+dx, ny = p.y+dy;
    if(nx < 0 || ny < 0 || nx >= G.level.tiles[0].length || ny >= G.level.tiles.length) continue;
    const tile = G.level.tiles[ny][nx];
    if(tile === TILE.WALL) continue;
    if(G.level.monsters.some(m => m.x === nx && m.y === ny)) continue;
    const monster = createMonster(key, template, nx, ny, G.floor);
    G.level.monsters.push(monster);
    log(`[DEBUG] Spawned ${template.name} at (${nx},${ny})`, 'system');
    closeDebugScreen();
    renderAll();
    return;
  }
  log('[DEBUG] No adjacent empty tile to spawn monster.', 'warning');
}

function debugSpawnItem() {
  const key = document.getElementById('debug-item-sel').value;
  const template = ITEM_TEMPLATES[key];
  if(!template) return;
  const item = { ...template, id: `item_debug_${Date.now()}`, x:G.player.x, y:G.player.y };
  if(item.type === 'ring' || item.type === 'amulet' || item.type === 'wand') item.templateKey = key;
  G.level.items.push(item);
  log(`[DEBUG] Spawned ${template.name} at your feet.`, 'system');
  closeDebugScreen();
  renderAll();
}

function debugSetAlignment() {
  const val = parseInt(document.getElementById('debug-align-val').value);
  if(isNaN(val)) return;
  G.player.alignment = Math.max(-100, Math.min(100, val));
  log(`[DEBUG] Alignment set to ${G.player.alignment}`, 'system');
  closeDebugScreen();
  updateSidePanel();
  renderAll();
}

function debugSetGod() {
  const key = document.getElementById('debug-god-sel').value;
  if(key === '') {
    G.player.god = null;
    G.player.piety = 0;
    log('[DEBUG] God cleared.', 'system');
  } else {
    joinGod(key);
    log(`[DEBUG] Set god to ${GODS[key].name}`, 'system');
  }
  closeDebugScreen();
  updateSidePanel();
  renderAll();
}

function debugSetPiety() {
  const val = parseInt(document.getElementById('debug-piety-val').value);
  if(isNaN(val)) return;
  G.player.piety = Math.max(0, Math.min(100, val));
  log(`[DEBUG] Piety set to ${G.player.piety}`, 'system');
  closeDebugScreen();
  updateSidePanel();
}

function debugGiveGold() {
  G.player.gold += 1000;
  log('[DEBUG] +1000 gold.', 'system');
  closeDebugScreen();
  updateSidePanel();
}

function debugFullHeal() {
  const p = G.player;
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  p.hunger = p.maxHunger || 1000;
  // Clear all negative statuses
  for(const k of Object.keys(p.status)) {
    if(typeof p.status[k] === 'number' && p.status[k] > 0) p.status[k] = 0;
  }
  log('[DEBUG] Full heal + status clear.', 'system');
  closeDebugScreen();
  updateSidePanel();
  renderAll();
}

function debugRevealMap() {
  const tiles = G.level.tiles;
  for(let y = 0; y < tiles.length; y++) {
    for(let x = 0; x < tiles[0].length; x++) {
      G.level.explored.add(`${x},${y}`);
    }
  }
  log('[DEBUG] Map revealed.', 'system');
  closeDebugScreen();
  renderAll();
}

function debugToggleGodMode() {
  if(!G.player.status.godmode) {
    G.player.status.godmode = true;
    log('[DEBUG] God mode ON — you are invincible.', 'system');
  } else {
    G.player.status.godmode = false;
    log('[DEBUG] God mode OFF.', 'system');
  }
  closeDebugScreen();
}

function debugSetLevel() {
  const val = parseInt(document.getElementById('debug-level-val').value);
  if(isNaN(val) || val < 1) return;
  G.player.level = val;
  // Recalculate HP/MP for new level
  log(`[DEBUG] Player level set to ${val}`, 'system');
  closeDebugScreen();
  updateSidePanel();
}

function debugGoToFloor() {
  const targetFloor = parseInt(document.getElementById('debug-floor-val').value);
  if(isNaN(targetFloor) || targetFloor < 1 || targetFloor > 16) return;
  G.floor = targetFloor;
  G.level = generateLevel(G.floor);
  const [sx, sy] = G.level.startPos;
  G.player.x = sx; G.player.y = sy;
  G.player.companions.forEach(c => { c.x = sx + 1; c.y = sy; });
  computeFOV();
  log(`[DEBUG] Teleported to floor ${targetFloor}.`, 'system');
  flash(`FLOOR ${G.floor}`);
  closeDebugScreen();
  renderAll();
}

function debugGrantRune() {
  const hasRune = G.player.inventory.some(i => i.type === 'quest_item');
  if(!hasRune) {
    G.player.inventory.push({
      type: 'quest_item', name: 'Rune of Baal', sym: '⚿', color: '#ff4444',
      desc: 'The ancient rune pulses with dark power. Escape to the surface!',
      id: `rune_debug_${Date.now()}`
    });
  }
  G.ascending = true;
  log('[DEBUG] Rune of Baal granted. ASCENDING mode activated.', 'system');
  closeDebugScreen();
  updateSidePanel();
  renderAll();
}

// ─── ENTRY POINT ─────────────────────────────────────────────
window.addEventListener('load', () => {
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('title-screen').style.display = 'block';
  document.getElementById('char-create-screen').style.display = 'none';
  // Show continue button if save exists
  const cb = document.getElementById('continue-btn');
  if(cb) cb.style.display = hasSave() ? 'block' : 'none';
  // Load tileset for tile mode
  if(typeof loadTileset === 'function') loadTileset();
});

// Expose functions needed by HTML onclick
window.showCharCreate = showCharCreate;
window.showHelp = showHelp;
window.closeHelp = closeHelp;
window.showTitleFromCC = showTitleFromCC;
window.ccBack = ccBack;
window.startGame = startGame;
window.joinGod = joinGod;
window.abandonGod = abandonGod;
window.useGodAbility = useGodAbility;
window.closeGodScreen = closeGodScreen;
window.buyItem = buyItem;
window.closeShop = closeShop;
window.closeMutScreen = closeMutScreen;
window.openGodScreen = openGodScreen;
window.equipFromInv = equipFromInv;
window.unequipFromInv = unequipFromInv;
window.useFromInv = useFromInv;
window.dropFromInv = dropFromInv;
window.openGodDetail = openGodDetail;
window.closeAlignmentScreen = closeAlignmentScreen;
window.closeDebugScreen = closeDebugScreen;
window.debugSpawnMonster = debugSpawnMonster;
window.debugSpawnItem = debugSpawnItem;
window.debugSetAlignment = debugSetAlignment;
window.debugSetGod = debugSetGod;
window.debugSetPiety = debugSetPiety;
window.debugGiveGold = debugGiveGold;
window.debugFullHeal = debugFullHeal;
window.debugRevealMap = debugRevealMap;
window.debugToggleGodMode = debugToggleGodMode;
window.debugSetLevel = debugSetLevel;
window.debugGoToFloor = debugGoToFloor;
window.debugGrantRune = debugGrantRune;

