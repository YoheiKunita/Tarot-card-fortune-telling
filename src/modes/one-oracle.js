import { applySpeedToCSSVars, shuffle, createDealingFlight, createFlying, setFrontOnly, sleep } from './shared.js';

export function createOneOracleMode({ startBtn, slots, deckEl, dimEl, blank }) {
  applySpeedToCSSVars();
  const centerIndex = 1;
  const focusSlots = [slots[centerIndex]];

  function drawOne() {
    const deck = shuffle(TAROT_CARDS);
    return { ...deck[0], reversed: Math.random() < 0.5 };
  }

  async function returnCard() {
    const slot = focusSlots[0];
    const cardEl = slot.querySelector('.card');
    const infoEl = slot.querySelector('.info');
    const imgEl = slot.querySelector('.face.front img');
    const toEl = deckEl.querySelector('.pilecard:last-child') || deckEl;
    const hasShown = !cardEl.classList.contains('hidden') || cardEl.classList.contains('revealed') || infoEl.textContent.trim() !== '';
    dimEl.classList.remove('active');
    if (!hasShown) return;
    cardEl.classList.add('hidden');
    await createFlying(cardEl, toEl, { timeScale: 0.7 });
    cardEl.classList.remove('revealed', 'reversed');
    infoEl.textContent = '';
    infoEl.classList.remove('show');
    imgEl.src = blank;
    await sleep(60);
  }

  function hideOthers() {
    slots.forEach((s, idx) => {
      if (idx === centerIndex) return;
      const cardEl = s.querySelector('.card');
      const infoEl = s.querySelector('.info');
      const imgEl = s.querySelector('.face.front img');
      cardEl.classList.add('hidden');
      cardEl.classList.remove('revealed', 'reversed');
      infoEl.textContent = '';
      infoEl.classList.remove('show');
      imgEl.src = blank;
    });
  }

  function reset() {
    hideOthers();
    const slot = focusSlots[0];
    const cardEl = slot.querySelector('.card');
    const infoEl = slot.querySelector('.info');
    const imgEl = slot.querySelector('.face.front img');
    cardEl.classList.remove('revealed', 'reversed');
    cardEl.classList.add('hidden');
    infoEl.textContent = '';
    infoEl.classList.remove('show');
    imgEl.src = blank;
    dimEl.classList.remove('active');
    slot.onclick = null;
    slot.style.cursor = '';
  }

  async function start() {
    if (startBtn) startBtn.disabled = true;
    await returnCard();
    await sleep(100);
    const pick = drawOne();
    const slot = focusSlots[0];
    const cardEl = slot.querySelector('.card');
    const imgEl = slot.querySelector('.face.front img');
    const fromEl = deckEl.querySelector('.pilecard:last-child') || deckEl;
    cardEl.classList.add('hidden');
    await createDealingFlight(fromEl, cardEl);
    cardEl.classList.remove('hidden');
    cardEl.classList.remove('revealed');
    imgEl.src = blank;
    setFrontOnly(slot, pick, pick.reversed, blank);
    // click to reveal
    dimEl.classList.remove('active');
    slot.onclick = null;
    slot.style.cursor = 'pointer';
    slot.onclick = async () => {
      if (cardEl.classList.contains('revealed')) return;
      cardEl.classList.add('revealed');
      const infoEl = slot.querySelector('.info');
      const oriLabel = pick.reversed ? '逆位置' : '正位置';
      const base = pick.reversed ? pick.meaning.rev : pick.meaning.up;
      // Show only the explanation text, no label/prefix
      infoEl.innerHTML = `<span class="name">${pick.name} / ${pick.en}</span><span class="ori">${oriLabel}</span><br>${base}`;
      infoEl.classList.add('show');
      slot.onclick = null;
      slot.style.cursor = '';
    };
    setTimeout(() => { if (startBtn) startBtn.disabled = false; }, 200);
  }

  return { reset, start, id: 'one' };
}
