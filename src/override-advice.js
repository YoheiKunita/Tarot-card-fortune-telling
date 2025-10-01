// Advice overlay + caching + resume button enhancements
(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function ensureResumeOnMenu(){
    try{
      const startMenu = qs('#startMenu'); if (!startMenu) return;
      const mainOpts = qs('#panelMain .options', startMenu) || qs('.panel .options', startMenu);
      if (!mainOpts) return;
      let resume = qs('#btnResume', startMenu);
      const hasBoard = !!qs('.board .slot');
      if (!resume){
        resume = document.createElement('button');
        resume.id = 'btnResume';
        resume.textContent = '元の画面に戻る';
        mainOpts.insertBefore(resume, mainOpts.firstChild);
        resume.addEventListener('click', () => { const sm = qs('#startMenu'); if (sm) sm.style.display = 'none'; });
      }
      resume.style.display = hasBoard ? '' : 'none';
    }catch(_){}
  }

  function injectAdviceOverride(){
    const old = qs('#btnAdvise');
    if (!old) return;
    const btn = old.cloneNode(true);
    old.parentNode.replaceChild(btn, old);
    const overlay = qs('#adviceOverlay');
    const content = qs('#adviceContent');
    const adviserOutEl = qs('#adviserOut');
    const btnClose = qs('#btnAdviceClose');
    if (btnClose) btnClose.onclick = () => { if (overlay) overlay.style.display = 'none'; };

    function readingKey(){
      const slotsAll = qsa('.board .slot');
      const revealedSlots = slotsAll.filter(sl => qs('.card', sl)?.classList.contains('revealed'));
      const topicEl = qs('#readingTopic');
      let q = '';
      try { q = (topicEl && topicEl.value) ? topicEl.value : (localStorage.getItem('readingTopic') || ''); } catch(_){ q=''; }
      const parts = revealedSlots.map(sl => `${sl.dataset.cardName||'Unknown'}|${(sl.dataset.position==='reversed')?'R':'U'}|${sl.dataset.slot||''}`);
      parts.sort();
      return `${q}::${parts.join(',')}`;
    }
    function loadAdviceMap(){ try { return JSON.parse(localStorage.getItem('adviceCache.map')||'{}'); } catch(_) { return {}; } }
    function saveAdviceMap(map){ try { localStorage.setItem('adviceCache.map', JSON.stringify(map)); } catch(_) {} }

    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        const slotsAll = qsa('.board .slot');
        const revealedSlots = slotsAll.filter(sl => qs('.card', sl)?.classList.contains('revealed'));
        if (!revealedSlots.length) {
          if (overlay && content) { content.textContent = 'カードをめくってからAIアドバイスを実行してください。'; overlay.style.display = 'flex'; }
          return;
        }
        const topicEl = qs('#readingTopic');
        let q = '';
        try { q = (topicEl && topicEl.value) ? topicEl.value : (localStorage.getItem('readingTopic') || ''); } catch(_){ q=''; }
        const cards = revealedSlots.map(sl => ({
          name: sl.dataset.cardName || 'Unknown',
          position: (sl.dataset.position === 'reversed') ? 'reversed' : 'upright',
          slot: sl.dataset.slot || '',
        }));
        const totalSlots = slotsAll.length;
        const spread = (totalSlots <= 1)
          ? { name: 'One Card', slots: ['present'] }
          : { name: 'Three Card', slots: ['past','present','future'] };
        let apiKey = '', model = 'gpt-4o-mini';
        try { apiKey = localStorage.getItem('openai.apiKey') || ''; model = localStorage.getItem('openai.model') || 'gpt-4o-mini'; } catch(_){}
        const backend = apiKey ? 'openai' : 'stub';

        if (overlay && content) { overlay.style.display = 'flex'; content.textContent = '生成中…'; }
        if (adviserOutEl) { adviserOutEl.style.display='none'; adviserOutEl.textContent=''; }

        const key = readingKey();
        const map = loadAdviceMap();
        if (map[key] && map[key].summary){ if (content) content.textContent = map[key].summary; return; }

        btn.disabled = true; btn.textContent = '生成中…';
        let res;
        try {
          res = await (window.adviser && window.adviser.generate ? window.adviser.generate({ question: q, cards, spread, backend, apiKey, model, locale: 'ja' }) : null);
        } catch (e) {
          res = null;
          try { console.warn('adviser.generate failed, will fallback:', e&&e.message?e.message:e); } catch {}
        }
        if (!res || !res.reading) {
          const mapped = cards.map(c => ({ cardName: c.name||'Unknown', position: c.position, meaning: `${c.name||'Card'} (${c.position||'upright'}) は『${q||'未指定のテーマ'}』に関して示唆があります。`, advice: 'まずは落ち着いて整理しましょう。' }));
          res = { valid: true, reading: { summary: `フォールバック生成: ${q||'ご相談'}について考えを整理しましょう。`, cards: mapped }, meta: { backend: 'stub' } };
        }
        const summary = res.reading && res.reading.summary ? String(res.reading.summary) : '要約を取得できませんでした';
        if (content) content.textContent = summary;
        map[key] = { summary, at: Date.now() };
        saveAdviceMap(map);
      } finally {
        btn.disabled = false; btn.textContent = 'AIアドバイス';
      }
    });
  }
  catch(_){}
})();

// Hide leftover advice when starting spread or retry (in case upstream code misses it)
(function(){
  try{
    const hideAdvice = () => {
      const a = document.getElementById('adviserOut'); if (a){ a.style.display='none'; a.textContent=''; }
      const o = document.getElementById('adviceOverlay'); if (o) o.style.display='none';
    };
    // Hook start menu open
    const btnMenu = document.getElementById('btnMenu'); if (btnMenu) btnMenu.addEventListener('click', hideAdvice);
    // Heuristic: when actions hide after retry, also hide advice
    const btnRetry = document.getElementById('btnRetry'); if (btnRetry) btnRetry.addEventListener('click', hideAdvice);
  }catch(_){ }
})();

// Robust re-hook: ensure our overlay advice handler survives button replacements
(function(){
  function qsa(sel, root=document){ try { return Array.from(root.querySelectorAll(sel)); } catch(_){ return []; } }
  function getOverlayParts(){
    return {
      overlay: document.getElementById('adviceOverlay'),
      content: document.getElementById('adviceContent'),
      out: document.getElementById('adviserOut'),
      close: document.getElementById('btnAdviceClose')
    };
  }
  function readingKey(){
    try {
      const slotsAll = qsa('.board .slot');
      const revealedSlots = slotsAll.filter(sl => sl.querySelector('.card')?.classList.contains('revealed'));
      const topicEl = document.getElementById('readingTopic');
      const q = (topicEl && topicEl.value) ? topicEl.value : (function(){ try { return localStorage.getItem('readingTopic') || '' } catch(_) { return '' } })();
      const parts = revealedSlots.map(sl => `${sl.dataset.cardName||'Unknown'}|${(sl.dataset.position==='reversed')?'R':'U'}|${sl.dataset.slot||''}`);
      parts.sort();
      return `${q}::${parts.join(',')}`;
    } catch(_){ return 'nokey'; }
  }
  function loadAdviceMap(){ try { return JSON.parse(localStorage.getItem('adviceCache.map')||'{}'); } catch(_) { return {}; } }
  function saveAdviceMap(map){ try { localStorage.setItem('adviceCache.map', JSON.stringify(map)); } catch(_) {} }

  async function handleClick(ev){
    ev.preventDefault();
    const parts = getOverlayParts();
    try {
      const slotsAll = qsa('.board .slot');
      const revealedSlots = slotsAll.filter(sl => sl.querySelector('.card')?.classList.contains('revealed'));
      if (!revealedSlots.length) {
        if (parts.overlay && parts.content) { parts.content.textContent = 'カードをめくってからAIアドバイスを実行してください。'; parts.overlay.style.display = 'flex'; }
        return;
      }
      const topicEl = document.getElementById('readingTopic');
      const q = (topicEl && topicEl.value) ? topicEl.value : (function(){ try { return localStorage.getItem('readingTopic') || '' } catch(_) { return '' } })();
      const cards = revealedSlots.map(sl => ({
        name: sl.dataset.cardName || 'Unknown',
        position: (sl.dataset.position === 'reversed') ? 'reversed' : 'upright',
        slot: sl.dataset.slot || '',
      }));
      const totalSlots = slotsAll.length;
      const spread = (totalSlots <= 1)
        ? { name: 'One Card', slots: ['present'] }
        : { name: 'Three Card', slots: ['past','present','future'] };
      let apiKey = '', model = 'gpt-4o-mini';
      try { apiKey = localStorage.getItem('openai.apiKey') || ''; model = localStorage.getItem('openai.model') || 'gpt-4o-mini'; } catch(_){ }
      const backend = apiKey ? 'openai' : 'stub';

      if (parts.overlay && parts.content) { parts.overlay.style.display = 'flex'; parts.content.textContent = '生成中…'; }
      if (parts.out) { parts.out.style.display='none'; parts.out.textContent=''; }

      const key = readingKey();
      const map = loadAdviceMap();
      if (map[key] && map[key].summary){ if (parts.content) parts.content.textContent = map[key].summary; return; }

      const btn = ev.currentTarget;
      if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
      let res;
      try {
        res = await (window.adviser && window.adviser.generate ? window.adviser.generate({ question: q, cards, spread, backend, apiKey, model, locale: 'ja' }) : null);
      } catch (e) { res = null; try { console.warn('adviser.generate failed, will fallback:', e&&e.message?e.message:e); } catch {} }
      if (!res || !res.reading) {
        const mapped = cards.map(c => ({ cardName: c.name||'Unknown', position: c.position, meaning: `${c.name||'Card'} (${c.position||'upright'}) は『${q||'未指定のテーマ'}』に関して示唆があります。`, advice: 'まずは落ち着いて整理しましょう。' }));
        res = { valid: true, reading: { summary: `フォールバック生成: ${q||'ご相談'}について考えを整理しましょう。`, cards: mapped }, meta: { backend: 'stub' } };
      }
      const summary = res.reading && res.reading.summary ? String(res.reading.summary) : '要約を取得できませんでした';
      if (parts.content) parts.content.textContent = summary;
      map[key] = { summary, at: Date.now() };
      saveAdviceMap(map);
    } finally {
      const btn = ev.currentTarget; if (btn) { btn.disabled = false; btn.textContent = 'AIアドバイス'; }
    }
  }

  function hookOnce(){
    const b = document.getElementById('btnAdvise');
    if (!b || b.getAttribute('data-overlay-hooked') === '1') return;
    const clone = b.cloneNode(true);
    clone.setAttribute('data-overlay-hooked','1');
    if (b.parentNode) b.parentNode.replaceChild(clone, b);
    clone.addEventListener('click', handleClick);
    const parts = getOverlayParts(); if (parts.close) parts.close.onclick = () => { if (parts.overlay) parts.overlay.style.display='none'; };
  }

  try {
    const target = document.getElementById('actions') || document.body;
    const mo = new MutationObserver(() => hookOnce());
    mo.observe(target, { childList: true, subtree: true });
    // initial attempts
    hookOnce(); setTimeout(hookOnce, 0); setTimeout(hookOnce, 100);
  } catch(_){ }
})();
