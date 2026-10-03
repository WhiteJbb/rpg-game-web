import type { PotionId } from '../types'

export interface Potion {
  id: PotionId
  name: string
  hp: number
  mp: number
  price: number
}

export const POTIONS: Potion[] = [
  { id: 'hp-s', name: 'HP 포션(소)', hp: 60, mp: 0, price: 25 },
  { id: 'hp-m', name: 'HP 포션(중)', hp: 200, mp: 0, price: 90 },
  { id: 'hp-l', name: 'HP 포션(대)', hp: 600, mp: 0, price: 300 },
  { id: 'mp', name: 'MP 포션', hp: 0, mp: 60, price: 70 },
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
  { id: 'fireball', name: '파이어볼', mp: 8, power: 22, price: 0, effect: 'burn', chance: 0.35, desc: '가끔 화상' },
  { id: 'wind-cutter', name: '윈드커터', mp: 4, power: 16, price: 200, effect: 'pierce', chance: 1, desc: '마법 저항 관통' },
  { id: 'ice-spear', name: '아이스스피어', mp: 12, power: 36, price: 450, effect: 'chill', chance: 1, desc: '적 공격 약화' },
  { id: 'lightning-bolt', name: '라이트닝볼트', mp: 20, power: 65, price: 1400, effect: 'stun', chance: 0.35, desc: '가끔 기절' },
  { id: 'meteor', name: '메테오', mp: 38, power: 130, price: 4500, effect: 'burn', chance: 1, desc: '반드시 화상' },
]

export interface Equip {
  id: string
  name: string
  slot: 'weapon' | 'armor'
  str: number
  def: number
  int: number
  agi?: number
  crit?: number
  luck?: number
  price: number
  /** 이 보스를 처음 쓰러뜨리면 얻는 전용 장비 (상점에서 팔지 않는다) */
  dropFrom?: string
}

export const EQUIPS: Equip[] = [
  { id: 'wooden-stick', name: '나무막대기', slot: 'weapon', str: 3, def: 0, int: 0, price: 40 },
  { id: 'bronze-sword', name: '청동검', slot: 'weapon', str: 8, def: 0, int: 0, price: 250 },
  { id: 'steel-sword', name: '강철검', slot: 'weapon', str: 16, def: 0, int: 2, price: 900 },
  { id: 'magic-staff', name: '마법지팡이', slot: 'weapon', str: 4, def: 0, int: 16, price: 1800 },
  { id: 'mithril-sword', name: '미스릴소드', slot: 'weapon', str: 30, def: 0, int: 5, price: 3000 },
  { id: 'cloth', name: '천옷', slot: 'armor', str: 0, def: 3, int: 0, price: 40 },
  { id: 'leather-armor', name: '가죽갑옷', slot: 'armor', str: 0, def: 8, int: 0, price: 250 },
  { id: 'plate-armor', name: '판금갑옷', slot: 'armor', str: 0, def: 18, int: 0, price: 1000 },
  { id: 'magic-robe', name: '마법로브', slot: 'armor', str: 0, def: 10, int: 12, price: 2000 },
  { id: 'mithril-armor', name: '미스릴갑옷', slot: 'armor', str: 0, def: 34, int: 3, price: 3500 },
  { id: 'ogre-club', name: '오우거의 몽둥이', slot: 'weapon', str: 13, def: 0, int: 0, price: 0, dropFrom: 'ogre' },
  { id: 'wolf-pelt', name: '늑대왕의 가죽', slot: 'armor', str: 0, def: 13, int: 0, agi: 8, price: 0, dropFrom: 'werewolf' },
  { id: 'spirit-robe', name: '정령의 로브', slot: 'armor', str: 0, def: 22, int: 16, price: 0, dropFrom: 'elf-queen' },
  { id: 'vampire-sword', name: '흡혈귀의 검', slot: 'weapon', str: 38, def: 0, int: 8, crit: 10, price: 0, dropFrom: 'vampire-lord' },
]

export const equipWorth = (e: Equip) => e.str + e.def + e.int + (e.agi ?? 0) + (e.crit ?? 0) + (e.luck ?? 0)

const find = <T extends { id: string }>(list: T[], id: string, kind: string): T => {
  const x = list.find((x) => x.id === id)
  if (!x) throw new Error(`unknown ${kind}: ${id}`)
  return x
}
export const potionById = (id: string) => find(POTIONS, id, 'potion')
export const spellById = (id: string) => find(SPELLS, id, 'spell')
export const equipById = (id: string) => find(EQUIPS, id, 'equip')
