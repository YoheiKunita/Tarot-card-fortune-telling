// Major Arcana (22 cards). File names assume images like img/00-fool.jpg ...
// If images are missing, the app will show a blank placeholder.

const TAROT_CARDS = [
  { id: '00-fool',            num: 0,  name: '愚者',           en: 'The Fool',           file: '00-fool.png',
    meaning: { up: '自由・純粋・新しい旅立ち・可能性', rev: '無計画・軽率・不安定・迷走' } },
  { id: '01-magician',        num: 1,  name: '魔術師',         en: 'The Magician',       file: '01-magician.png',
    meaning: { up: '創造・始まり・意志・スキルの発揮', rev: '未熟・準備不足・誤魔化し' } },
  { id: '02-highpriestess',   num: 2,  name: '女教皇',         en: 'The High Priestess', file: '02-highpriestess.png',
    meaning: { up: '直感・静けさ・内省・知恵', rev: '無関心・秘密・抑圧・優柔不断' } },
  { id: '03-empress',         num: 3,  name: '女帝',           en: 'The Empress',        file: '03-empress.png',
    meaning: { up: '豊かさ・愛・実り・育成', rev: '浪費・過保護・停滞' } },
  { id: '04-emperor',         num: 4,  name: '皇帝',           en: 'The Emperor',        file: '04-emperor.png',
    meaning: { up: '秩序・安定・責任・統率力', rev: '支配・頑固・権威主義' } },
  { id: '05-hierophant',      num: 5,  name: '法王',           en: 'The Hierophant',     file: '05-hierophant.png',
    meaning: { up: '伝統・学び・助言・倫理', rev: '形式主義・独善・固執' } },
  { id: '06-lovers',          num: 6,  name: '恋人',           en: 'The Lovers',         file: '06-lovers.png',
    meaning: { up: '選択・調和・愛・価値の一致', rev: '不一致・迷い・優柔不断' } },
  { id: '07-chariot',         num: 7,  name: '戦車',           en: 'The Chariot',        file: '07-chariot.png',
    meaning: { up: '前進・勝利・意志の力・突破', rev: '空回り・暴走・制御不能' } },
  { id: '08-strength',        num: 8,  name: '力',             en: 'Strength',           file: '08-strength.png',
    meaning: { up: '勇気・忍耐・内的な強さ', rev: '弱腰・焦り・自信喪失' } },
  { id: '09-hermit',          num: 9,  name: '隠者',           en: 'The Hermit',         file: '09-hermit.png',
    meaning: { up: '探求・熟考・孤独の知恵', rev: '孤立・閉塞・行き詰まり' } },
  { id: '10-wheel',           num: 10, name: '運命の輪',       en: 'Wheel of Fortune',   file: '10-wheel.png',
    meaning: { up: '転機・流れ・幸運・循環', rev: '不運・タイミングの悪さ' } },
  { id: '11-justice',         num: 11, name: '正義',           en: 'Justice',            file: '11-justice.png',
    meaning: { up: '公正・均衡・因果応報', rev: '不公平・偏り・誤判断' } },
  { id: '12-hangedman',       num: 12, name: '吊るされた男',   en: 'The Hanged Man',     file: '12-hangedman.png',
    meaning: { up: '献身・視点の転換・停滞の意味', rev: '無駄な犠牲・固執' } },
  { id: '13-death',           num: 13, name: '死神',           en: 'Death',              file: '13-death.png',
    meaning: { up: '終わりと再生・刷新・脱皮', rev: '惰性・拒否・変化を恐れる' } },
  { id: '14-temperance',      num: 14, name: '節制',           en: 'Temperance',         file: '14-temperance.png',
    meaning: { up: '調和・バランス・節度・融合', rev: '不調和・偏り・浪費' } },
  { id: '15-devil',           num: 15, name: '悪魔',           en: 'The Devil',          file: '15-devil.png',
    meaning: { up: '執着・誘惑・依存・影の欲求', rev: '解放・断ち切りの兆し' } },
  { id: '16-tower',           num: 16, name: '塔',             en: 'The Tower',          file: '16-tower.png',
    meaning: { up: '崩壊・ショック・覚醒の雷', rev: '回避・小さな損失で学ぶ' } },
  { id: '17-star',            num: 17, name: '星',             en: 'The Star',           file: '17-star.png',
    meaning: { up: '希望・癒やし・信頼・インスピレーション', rev: '失望・自信喪失・現実逃避' } },
  { id: '18-moon',            num: 18, name: '月',             en: 'The Moon',           file: '18-moon.png',
    meaning: { up: '不安・潜在意識・想像力・曖昧さ', rev: '霧が晴れる・誤解解消' } },
  { id: '19-sun',             num: 19, name: '太陽',           en: 'The Sun',            file: '19-sun.png',
    meaning: { up: '成功・喜び・明朗・活力', rev: '一時的停滞・過信への注意' } },
  { id: '20-judgement',       num: 20, name: '審判',           en: 'Judgement',          file: '20-judgement.png',
    meaning: { up: '復活・評価・呼び覚まし', rev: '迷い・先延ばし・過去への固執' } },
  { id: '21-world',           num: 21, name: '世界',           en: 'The World',          file: '21-world.png',
    meaning: { up: '完成・到達・統合・達成', rev: '未完・最後の一歩・停滞' } }
];

// Transparent 1x1 PNG data URI for blank fallback
const BLANK_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHgwJ/lrKM9QAAAABJRU5ErkJggg==';

// Ensure availability from ES modules that may not see top-level const bindings
try {
  if (typeof window !== 'undefined') {
    window.TAROT_CARDS = TAROT_CARDS;
    window.BLANK_DATA_URI = BLANK_DATA_URI;
  }
} catch {}
