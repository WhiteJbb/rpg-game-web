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
  accessory: string | null
  /** 전직한 직업 (없으면 null) */
  job: 'warrior' | 'mage' | 'rogue' | null
  /** 장비별 강화 단계 */
  upgrades: Record<string, number>
}

export interface RegionProgress {
  kills: number
  bossDefeated: boolean
  secretDefeated?: boolean
}

export interface Battle {
  monsterId: string
  regionId: string
  isBoss: boolean
  monsterHp: number
  /** 몬스터가 힘을 모으는 중 — 다음 턴에 강한 공격이 온다 */
  charging: string | null
  /** 몬스터 화상: 매 턴 피해 */
  burn: { turns: number; dmg: number } | null
  /** 몬스터 빙결: 남은 턴 동안 공격이 약해진다 */
  chill: number
  /** 몬스터 기절: 다음 턴을 쉰다 */
  stunned: boolean
  /** 도적의 독: 몬스터가 매 턴 피해 */
  venom: { turns: number; dmg: number } | null
  /** 마법사의 명상: 다음 마법이 강해진다 */
  focus: boolean
  /** 플레이어 중독: 남은 턴 */
  poison: number
  /** 이번 전투에서 피해를 입었는가 (무피해 퀘스트용) */
  damaged: boolean
}

export type StatusKind = 'burn' | 'chill' | 'stun' | 'poison' | 'venom'

export interface QuestState {
  progress: number
  claimed: boolean
}

export interface Victory {
  exp: number
  gold: number
  drops: PotionId[]
  levelUps: number
  /** 보스를 처음 쓰러뜨렸을 때의 지역 id */
  bossFirst: string | null
  /** 보스가 떨어뜨린 전용 장비 */
  equipDrop: string | null
  /** 숨은 보스를 처음 쓰러뜨렸는가 */
  secretFirst: boolean
}

/** 한 번의 액션으로 일어난 일. UI가 순서대로 연출한다. */
export type GameEvent =
  | { t: 'encounter'; monsterId: string }
  | { t: 'event'; eventId: string }
  | { t: 'eventResult'; text: string; gold: number; hp: number; mp: number; exp: number; potion: PotionId | null; levelUps: number }
  | { t: 'status'; target: 'monster' | 'player'; kind: StatusKind }
  | { t: 'burnTick'; dmg: number; monsterHp: number }
  | { t: 'venomTick'; dmg: number; monsterHp: number }
  | { t: 'skill'; job: 'warrior' | 'mage' | 'rogue'; dmg: number; monsterHp: number; mp: number }
  | { t: 'jobChanged'; job: 'warrior' | 'mage' | 'rogue'; cost: number }
  | { t: 'poisonTick'; dmg: number; playerHp: number }
  | { t: 'monsterStunned' }
  | { t: 'questClaimed'; id: string }
  | { t: 'respec'; cost: number; points: number }
  | { t: 'upgraded'; id: string; level: number }
  | { t: 'newCycle'; cycle: number }
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
  /** 회차 (0 = 1회차). 오를수록 몬스터가 강해진다. */
  cycle: number
  player: Player
  progress: Record<string, RegionProgress>
  battle: Battle | null
  /** 탐색 중 만난 사건. 선택을 해야 다음으로 넘어간다. */
  pending: { eventId: string; regionId: string } | null
  quests: Record<string, QuestState>
  record: { wins: number; defeats: number }
  events: GameEvent[]
  cleared: boolean
}

export type Action =
  | { type: 'explore'; regionId: string }
  | { type: 'challengeBoss'; regionId: string; secret?: boolean }
  | { type: 'attack' }
  | { type: 'cast'; spellId: string }
  | { type: 'defend' }
  | { type: 'skill' }
  | { type: 'usePotion'; potionId: PotionId }
  | { type: 'flee' }
  | { type: 'buyPotion'; potionId: PotionId }
  | { type: 'buySpell'; spellId: string }
  | { type: 'buyEquip'; equipId: string }
  | { type: 'equip'; equipId: string }
  | { type: 'allocate'; stat: StatKey; amount: number }
  | { type: 'rest' }
  | { type: 'slot'; bet: number }
  | { type: 'choose'; index: number }
  | { type: 'claimQuest'; questId: string }
  | { type: 'respec' }
  | { type: 'changeJob'; job: 'warrior' | 'mage' | 'rogue' }
  | { type: 'upgradeEquip'; equipId: string }
  | { type: 'newCycle' }
