export type StatKey = 'str' | 'agi' | 'def' | 'int' | 'crit' | 'luck'
export type PotionId = 'hp-s' | 'hp-m' | 'hp-l' | 'mp'
export type Rng = () => number

export interface Player {
  name: string
  level: number
  exp: number
  hp: number
  mp: number
  gold: number
  stats: Record<StatKey, number>
  points: number
  potions: Record<PotionId, number>
  spells: string[]
  owned: string[]
  weapon: string | null
  armor: string | null
}

export interface RegionProgress {
  kills: number
  bossDefeated: boolean
}

export interface Battle {
  monsterId: string
  regionId: string
  isBoss: boolean
  monsterHp: number
  /** 몬스터가 힘을 모으는 중 — 다음 턴에 강한 공격이 온다 */
  charging: string | null
}

export interface Victory {
  exp: number
  gold: number
  drops: PotionId[]
  levelUps: number
  /** 보스를 처음 쓰러뜨렸을 때의 지역 id */
  bossFirst: string | null
}

/** 한 번의 액션으로 일어난 일. UI가 순서대로 연출한다. */
export type GameEvent =
  | { t: 'encounter'; monsterId: string }
  | { t: 'treasure'; gold: number }
  | { t: 'spring'; hp: number; mp: number }
  | { t: 'playerAttack'; dmg: number; crit: boolean; monsterHp: number }
  | { t: 'playerSpell'; spellId: string; dmg: number; monsterHp: number; mp: number }
  | { t: 'playerDefend'; mp: number }
  | { t: 'potion'; potionId: PotionId; hp: number; mp: number }
  | { t: 'fleeFail' }
  | { t: 'fled' }
  | { t: 'monsterCharge'; skill: string }
  | { t: 'monsterAttack'; skill: string | null; dmg: number; dodged: boolean; playerHp: number; monsterHp: number }
  | ({ t: 'victory' } & Victory)
  | { t: 'defeat'; goldLost: number }
  | { t: 'slot'; reels: [number, number, number]; bet: number; payout: number; refunded: boolean }
  | { t: 'rest'; cost: number }
  | { t: 'bought'; id: string }
  | { t: 'error'; text: string }

export interface GameState {
  version: 1
  player: Player
  progress: Record<string, RegionProgress>
  battle: Battle | null
  events: GameEvent[]
  cleared: boolean
}

export type Action =
  | { type: 'explore'; regionId: string }
  | { type: 'challengeBoss'; regionId: string }
  | { type: 'attack' }
  | { type: 'cast'; spellId: string }
  | { type: 'defend' }
  | { type: 'usePotion'; potionId: PotionId }
  | { type: 'flee' }
  | { type: 'buyPotion'; potionId: PotionId }
  | { type: 'buySpell'; spellId: string }
  | { type: 'buyEquip'; equipId: string }
  | { type: 'equip'; equipId: string }
  | { type: 'allocate'; stat: StatKey; amount: number }
  | { type: 'rest' }
  | { type: 'slot'; bet: number }
