import { equipById, type Equip } from './data/items'
import type { Player, StatKey } from './types'

export const POINTS_PER_LEVEL = 4
export const MAX_LEVEL = 99
export const CRIT_MULT = 1.75
export const DEFEND_MULT = 0.4
export const CHARGE_MULT = 2
export const DEATH_GOLD_LOSS = 0.2
export const SLOT_SYMBOLS = 5 // 0번 심볼이 잭팟(왕관)
export const EVENT_CHANCE = 0.15
export const SMASH_MULT = 1.6 // 전사 강타
export const SMASH_PIERCE = 0.5
export const MEDITATE_MP = 0.35 // 마법사 명상으로 돌아오는 MP 비율
export const FOCUS_MULT = 1.5
export const VENOM_TURNS = 3
export const VENOM_RATIO = 0.2
export const BURN_TURNS = 3
export const BURN_RATIO = 0.3 // 맞힌 피해 대비 턴당 화상 피해
export const CHILL_TURNS = 2
export const CHILL_MULT = 0.7
export const POISON_TURNS = 3
export const POISON_RATIO = 0.06 // 최대 HP 대비 턴당 독 피해
export const PIERCE_RES = 0.3

export const expToNext = (level: number) => Math.round(28 * Math.pow(level, 1.42))
export const WARRIOR_HP = 1.1
export const MAGE_MP_COST = 0.8
export const ROGUE_DODGE = 0.1
export const maxHp = (p: Player) => Math.round((100 + (p.level - 1) * 18) * (p.job === 'warrior' ? WARRIOR_HP : 1))
/** 마법의 실제 MP 소모 (마법사는 덜 든다) */
export const spellCost = (p: Player, mp: number) => (p.job === 'mage' ? Math.ceil(mp * MAGE_MP_COST) : mp)
/** 두 번째 전직부터 드는 비용 */
export const jobChangeCost = (p: Player) => (p.job ? p.level * 50 : 0)

export const MAX_UPGRADE = 10
export const UPGRADE_BONUS = 0.15 // 강화 1단계당 장비 수치 증가율

/** 강화가 반영된 장비 수치 */
export const equipStat = (p: Player, e: Equip, stat: StatKey) => Math.round((e[stat] ?? 0) * (1 + UPGRADE_BONUS * (p.upgrades[e.id] ?? 0)))

/** 다음 강화 단계의 비용. 보스 장비는 상점가가 없어 고정 기준가를 쓴다. */
export const upgradeCost = (p: Player, e: Equip) => Math.max(50, Math.round((e.dropFrom ? 2500 : e.price) * 0.5 * ((p.upgrades[e.id] ?? 0) + 1)))

/** 기본 스텟 + 착용 장비 보너스 */
export function totalStat(p: Player, stat: StatKey): number {
  let v = p.stats[stat]
  for (const id of [p.weapon, p.armor, p.accessory]) if (id) v += equipStat(p, equipById(id), stat)
  return v
}

// 지력을 찍지 않으면 MP가 적어, 전사·도적의 기술은 전투당 한두 번이 한계다
export const maxMp = (p: Player) => Math.round(40 + (p.level - 1) * 2 + totalStat(p, 'int') * 2.5)
export const WIN_MP_REGEN = 0.25 // 승리할 때마다 돌아오는 MP 비율
export const attackPower = (p: Player) => totalStat(p, 'str') * 2
export const defensePower = (p: Player) => totalStat(p, 'def') * 1.5
export const SPELL_INT_SCALE = 0.04
export const spellPower = (p: Player, base: number) => base * (1 + totalStat(p, 'int') * SPELL_INT_SCALE)

// 확률 스텟은 전부 상한이 있다 (원작의 회피 100% 무적 문제 방지)
export const dodgeChance = (p: Player) =>
  p.job === 'rogue' ? Math.min(0.55, totalStat(p, 'agi') * 0.01 + ROGUE_DODGE) : Math.min(0.45, totalStat(p, 'agi') * 0.01)
export const critChance = (p: Player) => Math.min(0.6, 0.05 + totalStat(p, 'crit') * 0.015)
export const fleeChance = (p: Player) => Math.min(0.9, 0.5 + totalStat(p, 'agi') * 0.01)
export const goldBonus = (p: Player) => 1 + Math.min(0.5, totalStat(p, 'luck') * 0.01)
export const dropBonus = (p: Player) => 1 + Math.min(1, totalStat(p, 'luck') * 0.02)
export const slotRefundChance = (p: Player) => Math.min(0.1, totalStat(p, 'luck') * 0.005)

/** 방어가 아무리 높아도 피해가 0이 되지 않는 감쇠식 */
export const mitigate = (raw: number, def: number) => Math.max(1, Math.round((raw * raw) / (raw + def)))

/** 마법 저항은 비율로 깎는다 (저항 100이면 절반). 저항 높은 적에게는 관통 마법이 의미가 있다. */
export const resist = (raw: number, res: number) => Math.max(1, Math.round((raw * 100) / (100 + res)))

export const restCost = (p: Player) => p.level * 6
export const respecCost = (p: Player) => p.level * 40

/** 슬롯머신 배당 (베팅액 배수). 기대값은 운 환급을 포함해도 1 미만이다. */
export function slotMultiplier(reels: [number, number, number]): number {
  const [a, b, c] = reels
  if (a === b && b === c) return a === 0 ? 20 : 8
  if (a === b || b === c || a === c) return 1
  return 0
}
