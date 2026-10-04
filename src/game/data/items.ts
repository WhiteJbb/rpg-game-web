import type { PotionId } from '../types'

export interface Potion {
  id: PotionId
  name: string
  hp: number
  mp: number
  /** 최대치 대비 최소 회복 비율. 레벨이 높아져도 포션이 쓸모 있게 한다 */
  pct: number
  price: number
}

export const POTIONS: Potion[] = [
  { id: 'hp-s', name: 'HP 포션(소)', hp: 60, mp: 0, pct: 0.1, price: 25 },
  { id: 'hp-m', name: 'HP 포션(중)', hp: 200, mp: 0, pct: 0.25, price: 90 },
  { id: 'hp-l', name: 'HP 포션(대)', hp: 600, mp: 0, pct: 0.5, price: 300 },
  { id: 'mp', name: 'MP 포션', hp: 0, mp: 60, pct: 0.2, price: 70 },
]

export interface Spell {
  id: string
  name: string
  mp: number
  power: number
  price: number
  /** burn 화상 / chill 빙결 / stun 기절 / pierce 저항 관통 */
  effect: 'burn' | 'chill' | 'stun' | 'pierce'
  /** 효과가 걸릴 확률 (pierce는 항상) */
  chance: number
  desc: string
}

export const SPELLS: Spell[] = [
  { id: 'fireball', name: '파이어볼', mp: 8, power: 28, price: 0, effect: 'burn', chance: 0.35, desc: '가끔 화상' },
  { id: 'wind-cutter', name: '윈드커터', mp: 4, power: 19, price: 200, effect: 'pierce', chance: 1, desc: '마법 저항 관통' },
  { id: 'ice-spear', name: '아이스스피어', mp: 12, power: 44, price: 450, effect: 'chill', chance: 1, desc: '적 공격 약화' },
  { id: 'lightning-bolt', name: '라이트닝볼트', mp: 20, power: 58, price: 1400, effect: 'stun', chance: 0.35, desc: '가끔 기절' },
  { id: 'meteor', name: '메테오', mp: 38, power: 90, price: 4500, effect: 'burn', chance: 1, desc: '반드시 화상' },
]

export interface Equip {
  id: string
  name: string
  slot: 'weapon' | 'armor' | 'accessory'
  str: number
  def: number
  int: number
  agi?: number
  crit?: number
  luck?: number
  price: number
  /** 이 보스를 처음 쓰러뜨리면 얻는 전용 장비 (상점에서 팔지 않는다) */
  dropFrom?: string
  /** 이 회차(0부터)에 들어서야 상점에 나온다 */
  cycle?: number
}

export const EQUIPS: Equip[] = [
  // 무기 — 힘 위주, 치명 위주, 지력 위주로 갈린다
  { id: 'wooden-stick', name: '나무막대기', slot: 'weapon', str: 3, def: 0, int: 0, price: 40 },
  { id: 'apprentice-wand', name: '견습생의 완드', slot: 'weapon', str: 0, def: 0, int: 8, price: 220 },
  { id: 'bronze-sword', name: '청동검', slot: 'weapon', str: 8, def: 0, int: 0, price: 250 },
  { id: 'hunting-dagger', name: '사냥용 단검', slot: 'weapon', str: 5, def: 0, int: 0, agi: 4, crit: 6, price: 380 },
  { id: 'steel-sword', name: '강철검', slot: 'weapon', str: 16, def: 0, int: 2, price: 900 },
  { id: 'battle-axe', name: '전투도끼', slot: 'weapon', str: 23, def: 0, int: 0, price: 1600 },
  { id: 'magic-staff', name: '마법지팡이', slot: 'weapon', str: 4, def: 0, int: 16, price: 1800 },
  { id: 'assassin-blade', name: '암살자의 칼날', slot: 'weapon', str: 18, def: 0, int: 0, agi: 6, crit: 12, price: 2800 },
  { id: 'mithril-sword', name: '미스릴소드', slot: 'weapon', str: 30, def: 0, int: 5, price: 3000 },
  { id: 'archmage-staff', name: '대마법사의 지팡이', slot: 'weapon', str: 6, def: 0, int: 30, price: 3600 },
  { id: 'ogre-club', name: '오우거의 몽둥이', slot: 'weapon', str: 13, def: 0, int: 0, price: 0, dropFrom: 'ogre' },
  { id: 'vampire-sword', name: '흡혈귀의 검', slot: 'weapon', str: 38, def: 0, int: 8, crit: 10, price: 0, dropFrom: 'vampire-lord' },
  { id: 'night-blade', name: '밤을 가르는 검', slot: 'weapon', str: 90, def: 0, int: 60, crit: 16, price: 0, dropFrom: 'night-avatar' },
  { id: 'dragonslayer-sword', name: '용살자의 대검', slot: 'weapon', str: 70, def: 0, int: 0, price: 9000, cycle: 1 },
  { id: 'star-staff', name: '별의 지팡이', slot: 'weapon', str: 10, def: 0, int: 70, price: 9500, cycle: 1 },
  { id: 'shadow-fang', name: '그림자 송곳니', slot: 'weapon', str: 44, def: 0, int: 0, agi: 12, crit: 24, price: 9000, cycle: 1 },
  { id: 'sun-greatsword', name: '태양의 대검', slot: 'weapon', str: 115, def: 0, int: 0, price: 26000, cycle: 2 },
  { id: 'sun-staff', name: '태양의 지팡이', slot: 'weapon', str: 16, def: 0, int: 115, price: 27000, cycle: 2 },
  { id: 'eclipse-dagger', name: '일식의 단검', slot: 'weapon', str: 72, def: 0, int: 0, agi: 18, crit: 34, price: 26000, cycle: 2 },
  // 방어구
  { id: 'cloth', name: '천옷', slot: 'armor', str: 0, def: 3, int: 0, price: 40 },
  { id: 'leather-armor', name: '가죽갑옷', slot: 'armor', str: 0, def: 8, int: 0, price: 250 },
  { id: 'scout-cloak', name: '정찰병의 망토', slot: 'armor', str: 0, def: 6, int: 0, agi: 6, price: 400 },
  { id: 'chainmail', name: '사슬갑옷', slot: 'armor', str: 0, def: 13, int: 0, price: 650 },
  { id: 'plate-armor', name: '판금갑옷', slot: 'armor', str: 0, def: 20, int: 0, price: 1300 },
  { id: 'magic-robe', name: '마법로브', slot: 'armor', str: 0, def: 10, int: 12, price: 2000 },
  { id: 'mithril-armor', name: '미스릴갑옷', slot: 'armor', str: 0, def: 34, int: 3, price: 3500 },
  { id: 'archmage-robe', name: '대마법사의 로브', slot: 'armor', str: 0, def: 18, int: 24, price: 3800 },
  { id: 'wolf-pelt', name: '늑대왕의 가죽', slot: 'armor', str: 0, def: 13, int: 0, agi: 8, price: 0, dropFrom: 'werewolf' },
  { id: 'spirit-robe', name: '정령의 로브', slot: 'armor', str: 0, def: 22, int: 16, price: 0, dropFrom: 'elf-queen' },
  { id: 'dragon-scale', name: '고룡의 비늘갑옷', slot: 'armor', str: 0, def: 46, int: 6, agi: 6, price: 0, dropFrom: 'ancient-dragon' },
  { id: 'hero-plate', name: '용사의 갑주', slot: 'armor', str: 0, def: 78, int: 0, price: 10000, cycle: 1 },
  { id: 'starlight-robe', name: '별빛 로브', slot: 'armor', str: 0, def: 42, int: 54, price: 10500, cycle: 1 },
  { id: 'sun-plate', name: '태양의 갑주', slot: 'armor', str: 0, def: 125, int: 0, price: 28000, cycle: 2 },
  { id: 'dawn-robe', name: '여명의 로브', slot: 'armor', str: 0, def: 68, int: 88, price: 29000, cycle: 2 },
  // 장신구 — 주 스텟이 아닌 민첩·치명·운을 채우는 자리
  { id: 'lucky-coin', name: '행운의 동전', slot: 'accessory', str: 0, def: 0, int: 0, luck: 8, price: 200 },
  { id: 'copper-ring', name: '구리 반지', slot: 'accessory', str: 3, def: 3, int: 0, price: 300 },
  { id: 'swift-boots', name: '바람의 장화', slot: 'accessory', str: 0, def: 0, int: 0, agi: 10, price: 700 },
  { id: 'hawk-pendant', name: '매의 눈 목걸이', slot: 'accessory', str: 0, def: 0, int: 0, crit: 12, price: 1000 },
  { id: 'sage-amulet', name: '현자의 부적', slot: 'accessory', str: 0, def: 0, int: 12, price: 1600 },
  { id: 'guardian-ring', name: '수호의 반지', slot: 'accessory', str: 6, def: 12, int: 0, price: 2200 },
  { id: 'clover-charm', name: '네잎클로버 부적', slot: 'accessory', str: 0, def: 0, int: 0, crit: 5, luck: 20, price: 2500 },
  { id: 'lich-crown', name: '망자의 왕관', slot: 'accessory', str: 0, def: 14, int: 30, luck: 8, price: 0, dropFrom: 'lich-king' },
  { id: 'hero-emblem', name: '영웅의 증표', slot: 'accessory', str: 12, def: 12, int: 12, agi: 8, crit: 8, price: 8000, cycle: 1 },
  { id: 'sun-crest', name: '태양의 문장', slot: 'accessory', str: 20, def: 20, int: 20, agi: 12, crit: 12, price: 24000, cycle: 2 },
]

export const SLOTS = [
  { id: 'weapon', name: '무기' },
  { id: 'armor', name: '방어구' },
  { id: 'accessory', name: '장신구' },
] as const

export const equipWorth = (e: Equip) => e.str + e.def + e.int + (e.agi ?? 0) + (e.crit ?? 0) + (e.luck ?? 0)

const find = <T extends { id: string }>(list: T[], id: string, kind: string): T => {
  const x = list.find((x) => x.id === id)
  if (!x) throw new Error(`unknown ${kind}: ${id}`)
  return x
}
export const potionById = (id: string) => find(POTIONS, id, 'potion')
export const spellById = (id: string) => find(SPELLS, id, 'spell')
export const equipById = (id: string) => find(EQUIPS, id, 'equip')
