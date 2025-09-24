import { applySpeedToCSSVars, shuffle, createDealingFlight, createFlying, setFrontOnly, buildPositionText, sleep } from './shared.js';

export function createThreeCardMode({ startBtn, slots, deckEl, dimEl, blank }) {
  applySpeedToCSSVars();

  function drawCards(n = slots.length) {
    const deck = shuffle(TAROT_CARDS);
    return deck.slice(0, n).map(c => ({ ...c, reversed: Math.random() < 0.5 }));
  }

  function setInfo(slot, card) {
    const infoEl = slot.querySelector('.info');
    const pos = slot.getAttribute('data-pos');
    const oriLabel = card.reversed ? '逆位置' : '正位置';
    const text = buildPositionText(card, pos, card.reversed);
    infoEl.innerHTML = `<span class="name">${card.name} / ${card.en}</span><span class="ori">${oriLabel}</span><br>${text}`;
    infoEl.classList.add('show');
  }

  function revealInSlot(slot, card) {
    const cardEl = slot.querySelector('.card');
    if (cardEl.classList.contains('revealed')) return;
    cardEl.classList.add('revealed');
    setInfo(slot, card);
    dimEl.classList.add('active');
    slot.onclick = null;
    slot.style.cursor = '';
  }

  async function returnCardsToDeck() {
    const needReturn = slots.some(slot => slot.querySelector('.card').classList.contains('revealed') || slot.querySelector('.info').textContent.trim() !== '');
    dimEl.classList.remove('active');
    if (!needReturn) return;
    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i];
      const cardEl = slot.querySelector('.card');
      const infoEl = slot.querySelector('.info');
      const imgEl = slot.querySelector('.face.front img');
      const toEl = deckEl.querySelector('.pilecard:last-child') || deckEl;
      const rectRef = cardEl;
      cardEl.classList.add('hidden');
      await createFlying(rectRef, toEl);
      cardEl.classList.remove('revealed', 'reversed');
      infoEl.textContent = '';
      infoEl.classList.remove('show');
      imgEl.src = blank;
      slot.onclick = null;
      slot.style.cursor = '';
      await sleep(60);
    }
  }

  async function dealFromDeck(picks) {
    const count = Math.min(slots.length, picks.length);
    for (let i = 0; i < count; i++) {
      const slot = slots[i];
      const cardEl = slot.querySelector('.card');
      const imgEl = slot.querySelector('.face.front img');
      const toEl = cardEl;
      const fromEl = deckEl.querySelector('.pilecard:last-child') || deckEl;
      cardEl.classList.add('hidden');
      await createDealingFlight(fromEl, toEl);
      cardEl.classList.remove('hidden');
      cardEl.classList.remove('revealed');
      imgEl.src = blank;
      setFrontOnly(slot, picks[i], picks[i].reversed, blank);
      await sleep(120);
    }
  }

  function enableClickReveal(picks) {
    dimEl.classList.remove('active');
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      slot.onclick = null;
      slot.style.cursor = 'pointer';
      slot.onclick = () => {
        const card = picks[i];
        revealInSlot(slot, card);
      };
    }
  }

  function reset() {
    for (const slot of slots) {
      const cardEl = slot.querySelector('.card');
      const infoEl = slot.querySelector('.info');
      const imgEl = slot.querySelector('.face.front img');
      cardEl.classList.remove('revealed', 'reversed');
      cardEl.classList.add('hidden');
      infoEl.textContent = '';
      infoEl.classList.remove('show');
      imgEl.src = blank;
      slot.onclick = null;
      slot.style.cursor = '';
    }
    dimEl.classList.remove('active');
  }

  async function start() {
    if (startBtn) startBtn.disabled = true;
    await returnCardsToDeck();
    await sleep(100);
    const picks = drawCards();
    await dealFromDeck(picks);
    enableClickReveal(picks);
    setTimeout(() => { if (startBtn) startBtn.disabled = false; }, 200);
  }

  return { reset, start, id: 'three' };
}
