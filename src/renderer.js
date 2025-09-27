// Entry point: wire modes, speed, start menu, and actions
import { applySpeedToCSSVars, SPEED, shuffle, createFlying, createDealingFlight, setFrontOnly, sleep } from './modes/shared.js';
import { createThreeCardMode } from './modes/three-card.js';
import { createOneOracleMode } from './modes/one-oracle.js';

(() => {
  const startBtn = document.getElementById('startBtn');
  const slots = Array.from(document.querySelectorAll('.slot'));
  const deckEl = document.getElementById('deck');
  const dimEl = document.getElementById('dim');
  const headerEl = document.querySelector('header');

  const startMenu = document.getElementById('startMenu');
  const btnThree = document.getElementById('btnThree');
  const btnOne = document.getElementById('btnOne');
  const actions = document.getElementById('actions');
  const btnMenu = document.getElementById('btnMenu');
  const btnRetry = document.getElementById('btnRetry');

  // fallback for back images
  Array.from(document.querySelectorAll('.face.back img')).forEach(img => {
    img.onerror = () => { img.src = BLANK_DATA_URI; };
  });

  // Apply initial 70% speed
  applySpeedToCSSVars(SPEED);

  // Show position labels on each slot
  const posMap = { past: '過去', present: '現在', future: '未来' };
  slots.forEach(s => {
    const pos = s.getAttribute('data-pos');
    const l = s.querySelector('.label');
    if (l) l.textContent = posMap[pos] || '';
  });

  let mode = null;
  let currentKind = 'three';

  function makeMode(kind) {
    const ctx = { startBtn, slots, deckEl, dimEl, blank: BLANK_DATA_URI };
    return kind === 'one' ? createOneOracleMode(ctx) : createThreeCardMode(ctx);
  }

  function switchMode(kind) {
    mode = makeMode(kind);
    mode.reset();
  }

  function showStartMenu() {
    actions.classList.remove('show');
    startMenu.style.display = 'flex';
  }
  function hideStartMenu() { startMenu.style.display = 'none'; }
  function showActions() { actions.classList.add('show'); }
  function hideActions() { actions.classList.remove('show'); }

  // Default mode prepared but not started; show start menu first
  switchMode('three');
  showStartMenu();

  // --- Settings UI (API Key) ---
  try {
    // Add Settings button inside Start Menu options
    const btnSettings = document.createElement('button');
    btnSettings.id = 'btnSettings';
    btnSettings.textContent = '設定';
    btnSettings.title = '設定 (OpenAI API Keyなど)';
    const optionsEl = startMenu ? startMenu.querySelector('.options') : null;
    if (optionsEl) optionsEl.appendChild(btnSettings);

    // Build modal
    const settings = document.createElement('div');
    settings.id = 'settings';
    settings.className = 'start-menu';
    settings.style.display = 'none';
    settings.setAttribute('aria-modal', 'true');
    settings.setAttribute('role', 'dialog');
    settings.innerHTML = `
      <div class="panel">
        <h2>設定</h2>
        <div class="options" style="gap:12px; align-items:stretch">
          <label style="display:flex;flex-direction:column;gap:6px">
            <span>OpenAI API Key</span>
            <input id="inpApiKey" type="password" placeholder="sk-..." />
          </label>
          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Model</span>
            <input id="inpModel" type="text" placeholder="gpt-4o-mini" />
          </label>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px">
            <button id="btnSettingsCancel">キャンセル</button>
            <button id="btnSettingsSave" class="primary">保存</button>
          </div>
        </div>
      </div>`;
    const stage = document.getElementById('stage') || document.body;
    stage.appendChild(settings);

    const inpApiKey = settings.querySelector('#inpApiKey');
    const inpModel = settings.querySelector('#inpModel');
    const btnSettingsCancel = settings.querySelector('#btnSettingsCancel');
    const btnSettingsSave = settings.querySelector('#btnSettingsSave');

    function loadSettings() {
      try {
        inpApiKey.value = localStorage.getItem('openai.apiKey') || '';
        inpModel.value = localStorage.getItem('openai.model') || 'gpt-4o-mini';
      } catch (_) {}
    }
    function openSettings() {
      loadSettings();
      // Hide start menu while editing settings
      try { startMenu.style.display = 'none'; } catch(_) {}
      settings.style.display = 'flex';
    }
    function closeSettings() {
      settings.style.display = 'none';
      // Return to start menu after closing settings
      try { showStartMenu(); } catch(_) {}
    }

    btnSettings?.addEventListener('click', openSettings);
    btnSettingsCancel?.addEventListener('click', closeSettings);
    btnSettingsSave?.addEventListener('click', () => {
      try {
        localStorage.setItem('openai.apiKey', inpApiKey.value.trim());
        localStorage.setItem('openai.model', inpModel.value.trim() || 'gpt-4o-mini');
      } catch (_) {}
      closeSettings();
    });

    // Keyboard shortcut: Ctrl+,
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); openSettings(); }
      if (e.key === 'Escape' && settings.style.display !== 'none') { e.preventDefault(); closeSettings(); }
    });

    // If main process triggers settings:open, open here (preload bridge)
    if (window.api && typeof window.api.onOpenSettings === 'function') {
      window.api.onOpenSettings(() => openSettings());
    }
  } catch (e) { /* ignore UI errors */ }

  // Start menu selections
  function startRun(kind) {
    currentKind = kind === 'one' ? 'one' : 'three';
    hideStartMenu();
    hideActions();
    switchMode(currentKind);
    setTimeout(() => mode && mode.start && mode.start(), 10);
  }
  if (btnThree) btnThree.onclick = () => startRun('three');
  if (btnOne) btnOne.onclick = () => startRun('one');

  // Bottom-right actions
  if (btnMenu) btnMenu.onclick = () => { if (mode && mode.reset) mode.reset(); showStartMenu(); };
  if (btnRetry) btnRetry.onclick = () => { hideActions(); switchMode(currentKind); setTimeout(() => mode && mode.start && mode.start(), 10); };

  // Legacy start button still works if present
  if (startBtn) startBtn.addEventListener('click', () => mode.start());

  // Reveal completion watcher
  const boardEl = document.querySelector('.board');
  const observer = new MutationObserver(() => {
    const revealed = boardEl.querySelectorAll('.card.revealed').length;
    if (currentKind === 'three' && revealed >= 3) showActions();
    if (currentKind === 'one' && revealed >= 1) showActions();
  });
  observer.observe(boardEl, { subtree: true, attributes: true, attributeFilter: ['class'] });
})();

// --- Dynamic UI and spreads override per UI.txt and tarot_spread_1to10.txt ---
(function(){
  const deckEl = document.getElementById('deck');
  const dimEl = document.getElementById('dim');
  const actions = document.getElementById('actions');
  const btnMenu = document.getElementById('btnMenu');
  const btnRetry = document.getElementById('btnRetry');
  const startMenu = document.getElementById('startMenu');
  let boardEl = document.querySelector('.board') || document.getElementById('board');

  if (!boardEl){
    boardEl = document.createElement('section');
    boardEl.className = 'board';
    const stage = document.getElementById('stage');
    stage.insertBefore(boardEl, startMenu);
  }

  function showActions(){ actions?.classList.add('show'); }
  function hideActions(){ actions?.classList.remove('show'); }
  function showStartMenu(){ actions?.classList.remove('show'); startMenu.style.display = 'flex'; showPanel('panelMain'); }
  function hideStartMenu(){ startMenu.style.display = 'none'; }

  function labelForSpread(n){
    switch(n){
      case 1: return '1枚（ワンオラクル）';
      case 2: return '2枚';
      case 3: return '3枚';
      case 4: return '4枚（十字）';
      case 5: return '5枚（十字＋中央）';
      case 6: return '6枚（2段×3）';
      case 7: return '7枚（ホースシュー）';
      case 8: return '8枚（相性）';
      case 9: return '9枚（3×3）';
      case 10: return '10枚（ケルト十字）';
      default: return `${n}枚`;
    }
  }

  // Replace start menu content
  function buildStartMenu(){
    if (!startMenu) return;
    startMenu.innerHTML = `
      <div class="panel" id="panelMain">
        <h2>スタートメニュー</h2>
        <div class="options">
          <button id="btnStart" class="primary">スタート</button>
          <button id="btnSettings">設定</button>
          <button id="btnExit">終了</button>
        </div>
      </div>
      <div class="panel" id="panelSpread" style="display:none">
        <h2>カード枚数を選択</h2>
        <div class="options">
          <div class="spread-grid">
            ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="spreadOpt" data-count="${n}">${labelForSpread(n)}</button>`).join('')}
          </div>
          <div class="row"><button id="btnSpreadBack">戻る</button></div>
        </div>
      </div>
      <div class="panel" id="panelSettings" style="display:none">
        <h2>設定</h2>
        <div class="settings">
          <label>アニメ速度（50%〜120%）
            <input id="speedRange" type="range" min="0.5" max="1.2" step="0.05" />
          <span id="speedVal"></span>
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
            <span>OpenAI API Key</span>
            <input id="inpApiKey" type="password" placeholder="sk-..." />
          </label>
          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Model</span>
            <input id="inpModel" type="text" placeholder="gpt-4o-mini" />
          </label>
        </div>
        <div class="options">
          <button id="btnSaveSettings" class="primary">保存して戻る</button>
          <button id="btnCancelSettings">戻る</button>
        </div>
      </div>
      <div class="panel" id="panelExit" style="display:none">
        <h2>終了しますか？</h2>
        <div class="options">
          <button id="btnExitYes" class="primary">はい</button>
          <button id="btnExitNo">いいえ</button>
        </div>
      </div>`;
    wireStartMenu();
  }

  function showPanel(id){
    const panels = Array.from(startMenu.querySelectorAll('.panel'));
    panels.forEach(p => p.style.display = 'none');
    const t = startMenu.querySelector(`#${id}`);
    if (t) t.style.display = 'block';
  }

  function wireStartMenu(){
    const btnStart = startMenu.querySelector('#btnStart');
    const btnSettings = startMenu.querySelector('#btnSettings');
    const btnExit = startMenu.querySelector('#btnExit');
    const btnSpreadBack = startMenu.querySelector('#btnSpreadBack');
    const btnExitYes = startMenu.querySelector('#btnExitYes');
    const btnExitNo = startMenu.querySelector('#btnExitNo');
    const speedRange = startMenu.querySelector('#speedRange');
    const speedVal = startMenu.querySelector('#speedVal');
    const inpApiKey = startMenu.querySelector('#inpApiKey');
    const inpModel = startMenu.querySelector('#inpModel');
    const btnSaveSettings = startMenu.querySelector('#btnSaveSettings');
    const btnCancelSettings = startMenu.querySelector('#btnCancelSettings');

    // Start button: go to spread selection (count + topic)
    if (btnStart) btnStart.onclick = () => { showPanel('panelSpread'); };
    if (btnSettings) btnSettings.onclick = () => { showPanel('panelSettings'); initSettings(); };
    if (btnExit) btnExit.onclick = () => showPanel('panelExit');
    if (btnSpreadBack) btnSpreadBack.onclick = () => showPanel('panelMain');
    if (btnExitNo) btnExitNo.onclick = () => showPanel('panelMain');
    if (btnExitYes) btnExitYes.onclick = () => window.close();

    function initSettings(){
      const cur = parseFloat(localStorage.getItem('speedMult')||'0.7');
      if (speedRange){ speedRange.value = `${cur}`; }
      if (speedVal){ speedVal.textContent = `${Math.round(cur*100)}%`; }
      // Load OpenAI settings
      try {
        if (inpApiKey) inpApiKey.value = localStorage.getItem('openai.apiKey') || '';
        if (inpModel) inpModel.value = localStorage.getItem('openai.model') || 'gpt-4o-mini';
      } catch(_) {}
      speedRange?.addEventListener('input', () => { speedVal.textContent = `${Math.round(parseFloat(speedRange.value)*100)}%`; });
      btnSaveSettings?.addEventListener('click', () => {
        const v = parseFloat(speedRange.value);
        localStorage.setItem('speedMult', `${v}`);
        applySpeedToCSSVars(v);
        // Save OpenAI settings
        try {
          if (inpApiKey) localStorage.setItem('openai.apiKey', inpApiKey.value.trim());
          if (inpModel) localStorage.setItem('openai.model', (inpModel.value.trim()||'gpt-4o-mini'));
        } catch(_) {}
        showPanel('panelMain');
      });
      btnCancelSettings?.addEventListener('click', () => showPanel('panelMain'));
    }

    Array.from(startMenu.querySelectorAll('.spreadOpt')).forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.getAttribute('data-count')||'3',10);
        hideStartMenu();
        startSpread(n);
      });
    });
  }

  function clearBoard(){ boardEl.innerHTML = ''; boardEl.classList.add('absolute-board'); }

  function createSlot(){
    const slot = document.createElement('div'); slot.className = 'slot';
    const label = document.createElement('div'); label.className = 'label'; slot.appendChild(label);
    const card = document.createElement('div'); card.className = 'card hidden';
    const inner = document.createElement('div'); inner.className = 'inner';
    const back = document.createElement('div'); back.className = 'face back';
    const imgB = document.createElement('img'); imgB.src = '../img/back.png'; imgB.alt = 'back'; back.appendChild(imgB);
    const front = document.createElement('div'); front.className = 'face front';
    const imgF = document.createElement('img'); front.appendChild(imgF);
    inner.appendChild(back); inner.appendChild(front); card.appendChild(inner); slot.appendChild(card);
    const info = document.createElement('div'); info.className = 'info'; slot.appendChild(info);
    return slot;
  }

  function getLayout(n){
    const C=(x,y,rot=0)=>({left:x,top:y,rot});
    switch(n){
      case 1: return [C(50,50)];
      case 2: return [C(35,50), C(65,50)];
      case 3: return [C(30,50), C(50,50), C(70,50)];
      case 4: return [C(50,30), C(50,70), C(25,50), C(75,50)];
      case 5: return [
        // Increase vertical spacing between top and bottom cards
        C(50,50), C(50,20), C(50,80),
        { ...C(25,50), side: 'L' },
        { ...C(75,50), side: 'R' }
      ];
      case 6: return [
        { ...C(24,35), side: 'L' }, C(50,35), { ...C(76,35), side: 'R' },
        { ...C(24,75), side: 'L' }, C(50,75), { ...C(76,75), side: 'R' }
      ];
      case 7: {
        const cx=50, cy=55, r=32;
        const ang=[160,130,100,70,40,10,-10]; // left -> right
        return ang.map((a,i)=>{
          let rr = r;
          // Slightly pull positions 2–5 (index 1..4) toward center
          if (i>=1 && i<=4) rr = r * 0.9;
          let x = cx + rr*Math.cos(a*Math.PI/180);
          let y = cy + rr*Math.sin(a*Math.PI/180);
          // Raise the 7th card (index 6) a bit
          if (i===6) y -= 3;
          return C(x,y);
        });
      }
      case 8: return [
        { ...C(30,25), side: 'L' }, { ...C(30,45), side: 'L' }, { ...C(30,65), side: 'L' }, { ...C(30,85), side: 'L' },
        { ...C(70,25), side: 'R' }, { ...C(70,45), side: 'R' }, { ...C(70,65), side: 'R' }, { ...C(70,85), side: 'R' }
      ];
      case 9: return [
        { ...C(24,24), side: 'L' }, C(50,24), { ...C(76,24), side: 'R' },
        { ...C(24,50), side: 'L' }, C(50,50), { ...C(76,50), side: 'R' },
        { ...C(24,76), side: 'L' }, C(50,76), { ...C(76,76), side: 'R' }
      ];
      case 10: return [C(22,50), C(38,30), C(38,70), C(54,30), C(54,70), C(78,50), C(70,85), C(70,70), C(70,55), C(70,40)];
      default: return Array.from({length:n},(_,i)=>C(20+(i%5)*15, 35+Math.floor(i/5)*25));
    }
  }

  function positionSlots(slots, layout){
    // Read current card size from CSS vars to stay in sync with styling
    const rootStyles = getComputedStyle(document.documentElement);
    const w = parseFloat(rootStyles.getPropertyValue('--card-w')) || 143;
    const h = parseFloat(rootStyles.getPropertyValue('--card-h')) || 234;
    slots.forEach((s,i)=>{
      const p = layout[i]||{left:50,top:50,rot:0};
      s.style.position='absolute';
      const dx = (typeof p.dx === 'number') ? p.dx : (p.side ? (p.side==='L' ? w/2 : p.side==='R' ? -w/2 : 0) : 0);
      s.style.left=`calc(${p.left}% - ${w/2}px + ${dx}px)`; s.style.top=`calc(${p.top}% - ${h/2}px)`;
      // Apply base rotation via CSS variable so flip animation can compose with it
      const card = s.querySelector('.card');
      card.style.setProperty('--base-rot', p.rot ? `rotate(${p.rot}deg)` : 'rotate(0deg)');
    });
  }

  function buildSlots(n){
    clearBoard(); const slots=[]; for(let i=0;i<n;i++){ const sl=createSlot(); boardEl.appendChild(sl); slots.push(sl);} positionSlots(slots, getLayout(n)); return slots;
  }

  function draw(n){
    const deck = shuffle(TAROT_CARDS);
    // Skip the first 6 cards (moved to opposite side) and draw from the 7th
    return deck.slice(6, 6+n).map(c=>({...c, reversed: Math.random()<0.5}));
  }

  function ensureOppPile(){
    let opp = document.querySelector('#stage .oppile');
    if (!opp){
      const stage = document.getElementById('stage');
      opp = document.createElement('div');
      opp.className = 'oppile';
      stage.appendChild(opp);
    }
    return opp;
  }

  async function moveFirstSixToOpposite(){
    const opp = ensureOppPile();
    for (let i=0;i<6;i++){
      const fromEl = deckEl.querySelector('.pilecard:last-child') || deckEl;
      await createDealingFlight(fromEl, opp);
      // After flight, materialize a card on the oppile so it remains visible
      const pc = document.createElement('div');
      pc.className = 'pilecard';
      opp.appendChild(pc);
      await sleep(60);
    }
  }

  async function returnOppPile(opts = {}){
    // Default return is 30% faster
    const timeScale = Math.max(0.05, Math.min(4, opts.timeScale ?? 0.7));
    const opp = ensureOppPile();
    const cards = Array.from(opp.querySelectorAll('.pilecard'));
    for (let i = cards.length - 1; i >= 0; i--){
      const c = cards[i];
      const toEl = deckEl.querySelector('.pilecard:last-child') || deckEl;
      await createFlying(c, toEl, { timeScale });
      c.remove();
      await sleep(Math.round(50 * timeScale));
    }
  }

  async function returnAll(slots, opts = {}){
    // Default return is 30% faster
    const timeScale = Math.max(0.05, Math.min(4, opts.timeScale ?? 0.7));
    dimEl.classList.remove('active');
    const list = slots.filter(s => {
      const c = s.querySelector('.card');
      const info = s.querySelector('.info');
      return !c.classList.contains('hidden') || c.classList.contains('revealed') || (info && info.textContent.trim() !== '');
    });
    if (list.length === 0) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const slot = list[i];
      const cardEl = slot.querySelector('.card');
      const infoEl = slot.querySelector('.info');
      const imgEl = slot.querySelector('.face.front img');
      const toEl = deckEl.querySelector('.pilecard:last-child') || deckEl;
      cardEl.classList.remove('revealed');
      cardEl.classList.add('hidden');
      await createFlying(cardEl, toEl, { timeScale });
      cardEl.classList.remove('reversed');
      infoEl.textContent = '';
      infoEl.classList.remove('show');
      imgEl.src = BLANK_DATA_URI;
      slot.onclick = null; slot.style.cursor = '';
      await sleep(Math.round(60 * timeScale));
    }
  }

  async function deal(slots, picks){ for(let i=0;i<Math.min(slots.length,picks.length);i++){ const slot=slots[i]; const cardEl=slot.querySelector('.card'); const imgEl=slot.querySelector('.face.front img'); const fromEl=deckEl.querySelector('.pilecard:last-child')||deckEl; cardEl.classList.add('hidden'); await createDealingFlight(fromEl,cardEl); cardEl.classList.remove('hidden'); cardEl.classList.remove('revealed'); imgEl.src=BLANK_DATA_URI; setFrontOnly(slot, picks[i], picks[i].reversed, BLANK_DATA_URI); await sleep(100);} }

  function enableReveal(slots,picks,onComplete){ dimEl.classList.remove('active'); let revealed=0; for(let i=0;i<slots.length;i++){ const slot=slots[i]; const card=picks[i]; slot.onclick= async ()=>{ const cardEl=slot.querySelector('.card'); if(cardEl.classList.contains('revealed')) return; dimEl.classList.add('active'); await sleep(100); cardEl.classList.add('revealed'); const infoEl=slot.querySelector('.info'); const oriLabel = card.reversed ? '逆位置' : '正位置'; const base = card.reversed ? card.meaning.rev : card.meaning.up; infoEl.innerHTML = `<span class="name">${card.name} / ${card.en}</span><span class="ori">${oriLabel}</span><br>${base}`; infoEl.classList.add('show'); slot.onclick=null; slot.style.cursor=''; revealed++; if(revealed>=picks.length){ onComplete?.(); } }; slot.style.cursor='pointer'; } }

  let lastCount=3;
  async function startSpread(n){
    lastCount = n;
    hideActions();
    // Return currently shown cards before rebuilding
    const existingSlots = Array.from(boardEl.querySelectorAll('.slot'));
    await returnAll(existingSlots);
    await returnOppPile();
    await sleep(60);
    const slots = buildSlots(n);
    await sleep(60);
    // Move first six to opposite side, then deal from 7th
    await moveFirstSixToOpposite();
    const picks = draw(n);
    await deal(slots, picks);
    showActions();
    enableReveal(slots, picks);
  }

  // Override existing menu buttons
  if (btnMenu) btnMenu.onclick = () => { showStartMenu(); };
  if (btnRetry) btnRetry.onclick = async () => {
    hideActions();
    const existingSlots = Array.from(boardEl.querySelectorAll('.slot'));
    // Return faster (double speed => half duration)
    await returnAll(existingSlots, { timeScale: 0.5 });
    await returnOppPile({ timeScale: 0.5 });
    await sleep(60);
    const slots = buildSlots(lastCount);
    await sleep(60);
    await moveFirstSixToOpposite();
    const picks = draw(lastCount);
    await deal(slots, picks);
    showActions();
    enableReveal(slots, picks);
  };

  // Build new menu and show it
  buildStartMenu();
  startMenu.style.display = 'flex';

  // Post-build adjustments per request:
  // 1) Remove the visible title "スタートメニュー" from the main panel
  try {
    const mainTitle = startMenu.querySelector('#panelMain h2');
    if (mainTitle) mainTitle.remove();
  } catch {}

  // 2) In the "カード枚数を選択" screen, replace grid buttons with a dropdown and add a topic input
  try {
    const panelSpread = startMenu.querySelector('#panelSpread');
    const grid = panelSpread?.querySelector('.spread-grid');
    const row = panelSpread?.querySelector('.row') || (() => { const r=document.createElement('div'); r.className='row'; panelSpread?.querySelector('.options')?.appendChild(r); return r; })();
    if (grid) {
      // Create dropdown for count
      const lblCount = document.createElement('label'); lblCount.setAttribute('for','selectCount'); lblCount.textContent = '枚数';
      const sel = document.createElement('select'); sel.id = 'selectCount';
      [1,2,3,4,5,6,7,8,9,10].forEach(n=>{ const opt=document.createElement('option'); opt.value=`${n}`; opt.textContent = labelForSpread(n); sel.appendChild(opt); });
      // Create input for topic
      const lblTopic = document.createElement('label'); lblTopic.setAttribute('for','readingTopic'); lblTopic.textContent = '占う内容';
      const inp = document.createElement('input'); inp.id = 'readingTopic'; inp.type='text'; inp.placeholder='占う内容を入力';
      // Insert before row and remove grid
      const opts = panelSpread.querySelector('.options');
      opts.insertBefore(lblCount, row);
      opts.insertBefore(sel, row);
      opts.insertBefore(lblTopic, row);
      opts.insertBefore(inp, row);
      grid.remove();
      // Add start button
      const startBtn = document.createElement('button'); startBtn.id='btnSpreadStart'; startBtn.className='primary'; startBtn.textContent='開始';
      row.appendChild(startBtn);
      // Wire start button
      startBtn.addEventListener('click', () => {
        const n = parseInt(sel.value||'3',10);
        const topic = (inp.value||'').trim();
        try { localStorage.setItem('readingTopic', topic); } catch {}
        hideStartMenu();
        startSpread(n);
      });
    }
  } catch {}

  // Electron integration
  if (window.api?.onStartRun){ window.api.onStartRun(kind => { hideStartMenu(); startSpread(kind==='one'?1:3); }); }
  if (window.api?.onModeChange){ window.api.onModeChange(kind => { lastCount = (kind==='one')?1:3; }); }
})();
