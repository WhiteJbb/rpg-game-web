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
}

export const SPELLS: Spell[] = [
  { id: 'fireball', name: '파이어볼', mp: 8, power: 22, price: 0 },
  { id: 'wind-cutter', name: '윈드커터', mp: 4, power: 16, price: 200 },
  { id: 'ice-spear', name: '아이스스피어', mp: 12, power: 36, price: 450 },
  { id: 'lightning-bolt', name: '라이트닝볼트', mp: 20, power: 65, price: 1400 },
  { id: 'meteor', name: '메테오', mp: 38, power: 130, price: 4500 },
]

export interface Equip {
  id: string
  name: string
  slot: 'weapon' | 'armor'
  str: number
  def: number
  int: number
  price: number
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
]

const find = <T extends { id: string }>(list: T[], id: string, kind: string): T => {
  const x = list.find((x) => x.id === id)
  if (!x) throw new Error(`unknown ${kind}: ${id}`)
  return x
}
export const potionById = (id: string) => find(POTIONS, id, 'potion')
export const spellById = (id: string) => find(SPELLS, id, 'spell')
export const equipById = (id: string) => find(EQUIPS, id, 'equip')
