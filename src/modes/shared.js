// Shared utilities for tarot animations

export const SPEED = 0.7; // 70% speed (relative to baseline)

export function applySpeedToCSSVars(mult = SPEED) {
  const root = document.documentElement;
  const base = {
    flip: 600, // ms
    fly: 360,  // ms
    info: 220, // ms
    dim: 250,  // ms
  };
  root.style.setProperty('--flip-duration', `${Math.round(base.flip * mult)}ms`);
  root.style.setProperty('--fly-duration', `${Math.round(base.fly * mult)}ms`);
  root.style.setProperty('--info-duration', `${Math.round(base.info * mult)}ms`);
  root.style.setProperty('--dim-duration', `${Math.round(base.dim * mult)}ms`);
}

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getCenterRect(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

function parseMsVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return fallback;
  if (v.endsWith('ms')) return parseFloat(v);
  if (v.endsWith('s')) return parseFloat(v) * 1000;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function createFlying(fromEl, toEl, opts = {}) {
  const timeScale = Math.max(0.05, Math.min(4, opts.timeScale ?? 1));
  const from = getCenterRect(fromEl);
  const to = getCenterRect(toEl);
  const fc = document.createElement('div');
  fc.className = 'flying-card';
  document.body.appendChild(fc);
  // Measure card half size dynamically from CSS
  const r = fc.getBoundingClientRect();
  const halfW = r.width / 2;
  const halfH = r.height / 2;
  const startX = from.x - halfW;
  const startY = from.y - halfH;
  const endX = to.x - halfW;
  const endY = to.y - halfH;
  // Place instantly at the deck position (no transition), then animate
  fc.style.transitionDuration = '0ms';
  fc.style.transform = `translate(${startX}px, ${startY}px)`;
  void fc.getBoundingClientRect();
  return new Promise(resolve => {
    let settled = false;
    requestAnimationFrame(() => {
      const fly = Math.round(parseMsVar('--fly-duration', 260) * timeScale);
      fc.style.transitionDuration = `${fly}ms`;
      fc.style.transform = `translate(${endX}px, ${endY}px)`;
    });
    const done = () => {
      if (settled) return;
      settled = true;
      fc.removeEventListener('transitionend', done);
      fc.remove();
      resolve();
    };
    fc.addEventListener('transitionend', done);
    const fly = Math.round(parseMsVar('--fly-duration', 260) * timeScale);
    setTimeout(done, fly + 240); // fallback guard
  });
}

// Two-step deal: slide out from deck then fly to slot
export function createDealingFlight(fromEl, toEl, opts = {}) {
  const timeScale = Math.max(0.05, Math.min(4, opts.timeScale ?? 1));
  const from = getCenterRect(fromEl);
  const to = getCenterRect(toEl);
  const fc = document.createElement('div');
  fc.className = 'flying-card';
  document.body.appendChild(fc);
  const r = fc.getBoundingClientRect();
  const halfW = r.width / 2;
  const halfH = r.height / 2;
  const startX = from.x - halfW;
  const startY = from.y - halfH;
  const endX = to.x - halfW;
  const endY = to.y - halfH;
  // Place instantly at the deck position
  fc.style.transitionDuration = '0ms';
  fc.style.transform = `translate(${startX}px, ${startY}px)`;
  // Compute an exit point slightly away from the deck in the direction of travel
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const exitDist = typeof opts.exitDist === 'number' ? opts.exitDist : 40;
  const exitX = from.x + ux * exitDist - halfW;
  const exitY = from.y + uy * exitDist - halfH;

  const flyMs = Math.round(parseMsVar('--fly-duration', 260) * timeScale);
  const step1Ms = Math.max(60, Math.round(flyMs * 0.35));
  const step2Ms = flyMs;

  return new Promise(resolve => {
    let phase = 0;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      fc.removeEventListener('transitionend', onEnd);
      fc.remove();
      resolve();
    };
    const onEnd = () => {
      if (phase === 0) {
        // Begin flight to destination
        phase = 1;
        fc.style.transitionDuration = `${step2Ms}ms`;
        // force reflow for duration change
        void fc.getBoundingClientRect();
        fc.style.transform = `translate(${endX}px, ${endY}px)`;
      } else {
        done();
      }
    };
    // Start step 1 on next frame
    requestAnimationFrame(() => {
      // Switch on transition and slide out of the deck
      fc.style.transitionDuration = `${step1Ms}ms`;
      fc.addEventListener('transitionend', onEnd);
      fc.style.transform = `translate(${exitX}px, ${exitY}px)`;
    });
    // Fallback guards
    setTimeout(() => { if (phase === 0) onEnd(); }, step1Ms + 180);
    setTimeout(done, step1Ms + step2Ms + 360);
  });
}

export function setFrontOnly(slotEl, card, reversed, blankDataURI) {
  const cardEl = slotEl.querySelector('.card');
  const imgEl = slotEl.querySelector('.face.front img');
  const infoEl = slotEl.querySelector('.info');
  cardEl.classList.remove('revealed', 'reversed');
  if (reversed) cardEl.classList.add('reversed');
  imgEl.onerror = () => { imgEl.src = blankDataURI; };
  imgEl.src = `../img/${card.file}`;
  infoEl.textContent = '';
  infoEl.classList.remove('show');
  // Store metadata for adviser integration
  try {
    slotEl.dataset.cardName = card.en || card.name || '';
    slotEl.dataset.cardJa = card.name || '';
    slotEl.dataset.position = reversed ? 'reversed' : 'upright';
    slotEl.dataset.slot = slotEl.getAttribute('data-pos') || '';
  } catch(_) {}
}

export function buildPositionText(card, pos, reversed) {
  const base = reversed ? card.meaning.rev : card.meaning.up;
  return base; // show explanation only
}
